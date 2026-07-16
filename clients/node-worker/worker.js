import { io } from 'socket.io-client';
import { CronJob } from 'cron';
import chalk from 'chalk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';

dotenv.config();

const API_URL = process.env.API_URL || 'https://pitayacore-api.pitayacode.io';
const WS_URL = `${API_URL}/operations`;
const TENANT_ID = process.env.TENANT_ID;
const WORKER_ID = process.env.WORKER_ID;
const API_KEY = process.env.API_KEY;

if (!TENANT_ID || !WORKER_ID || !API_KEY) {
  console.error(chalk.red('Error: Falta configurar TENANT_ID, WORKER_ID o API_KEY en el archivo .env'));
  process.exit(1);
}

console.log(chalk.blue('='.repeat(50)));
console.log(chalk.blue.bold('🚀 PitayaCore - Worker Client (Node.js)'));
console.log(chalk.blue('='.repeat(50)));
console.log(chalk.gray(`Conectando a: ${WS_URL}`));
console.log(chalk.gray(`Worker ID:   ${WORKER_ID}`));
console.log(chalk.gray(`Tenant ID:   ${TENANT_ID}`));

const socket = io(WS_URL, {
  extraHeaders: {
    'x-tenant-id': TENANT_ID,
    'x-api-key': API_KEY
  }
});

let heartbeatInterval;
const activeJobs = new Map();

socket.on('connect', () => {
  console.log(chalk.green.bold('\n✓ Conectado exitosamente al servidor PitayaCore'));
  
  // Iniciar latidos (heartbeat)
  heartbeatInterval = setInterval(() => {
    socket.emit('worker_heartbeat', {
      workerId: WORKER_ID,
      status: 'ONLINE',
      health: {
        cpu: os.loadavg()[0],
        freemem: os.freemem(),
        totalmem: os.totalmem(),
        uptime: os.uptime()
      }
    });
  }, 10000); // Cada 10 segundos
});

socket.on('disconnect', () => {
  console.log(chalk.yellow('\n⚠ Desconectado del servidor. Intentando reconectar...'));
  clearInterval(heartbeatInterval);
});

socket.on('job.execute', async (payload) => {
  const { jobId, executionId, executionPlan, cronExpression } = payload;
  console.log(chalk.cyan(`\n⚡ Recibida orden de ejecución - Job: ${jobId}`));
  console.log(chalk.cyan(`   Execution ID: ${executionId}`));

  let scriptContent = '';
  
  if (executionPlan && executionPlan.scriptId) {
    try {
      console.log(chalk.gray(`   Descargando script: ${executionPlan.scriptId}...`));
      const response = await fetch(`${API_URL}/api/operations/scripts`, {
        headers: {
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY
        }
      });
      const scripts = await response.json();
      const script = scripts.find(s => s.id === executionPlan.scriptId);
      if (script) {
        scriptContent = script.content;
      } else {
        throw new Error('Script no encontrado en el servidor');
      }
    } catch (err) {
      console.error(chalk.red(`   Error descargando script: ${err.message}`));
      return;
    }
  } else {
    scriptContent = `console.log("Ejecutando Job ${jobId}"); setTimeout(() => console.log("Finalizado con éxito"), 2000);`;
  }

  const tmpDir = path.join(process.cwd(), '.tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }
  
  const executeScript = () => {
    return new Promise((resolve) => {
      // Use jobId in filename to avoid conflicts if it's a cron job, or executionId if it's manual
      const runId = cronExpression ? jobId : executionId;
      const scriptPath = path.join(tmpDir, `exec_${runId}.cjs`);
      fs.writeFileSync(scriptPath, scriptContent);
      console.log(chalk.gray(`   Script escrito en ${scriptPath}`));

      console.log(chalk.yellow(`   [>>] Iniciando ejecución...`));
      const child = spawn('node', [scriptPath]);

      child.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(chalk.white(text.trimEnd()));
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        console.error(chalk.red(text.trimEnd()));
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green.bold(`   [OK] Ejecución completada exitosamente.`));
        } else {
          console.log(chalk.red.bold(`   [ERROR] Ejecución falló con código ${code}`));
        }
        resolve(code);
      });
    });
  };

  if (cronExpression) {
    console.log(chalk.magenta(`   [CRON] Configurando bucle automático: ${cronExpression}`));
    
    // Stop old cron if exists
    if (activeJobs.has(jobId)) {
      console.log(chalk.magenta(`   [CRON] Deteniendo cron anterior para este Job`));
      activeJobs.get(jobId).job.stop();
    }

    let isRunning = false;
    let job;
    try {
      job = new CronJob(cronExpression, async () => {
        if (isRunning) {
          console.log(chalk.magenta(`   [CRON] Saltando ejecución porque la anterior aún no termina...`));
          return;
        }
        isRunning = true;
        console.log(chalk.magenta(`\n⏰ [CRON TICK] Ejecutando Job: ${jobId}...`));
        
        await executeScript();
        
        // Emit tick to update lastRunAt
        socket.emit('job.cron_tick', { jobId });
        
        isRunning = false;
      });
    } catch (err) {
      console.error(chalk.red(`   [CRON ERROR] Expresión Cron inválida "${cronExpression}": ${err.message}`));
      return;
    }
    
    activeJobs.set(jobId, { job, isRunning: false });
    job.start();
    
    // Execute immediately on registration to avoid waiting for the first tick
    const jobState = activeJobs.get(jobId);
    if (!jobState.isRunning) {
      jobState.isRunning = true;
      await executeScript();
      socket.emit('job.cron_tick', { jobId });
      jobState.isRunning = false;
    }
  } else {
    // Execute once
    await executeScript();
  }
});

socket.on('job.stop', (payload) => {
  const { jobId } = payload;
  console.log(chalk.yellow(`\n🛑 Recibida orden de detención - Job: ${jobId}`));
  
  if (activeJobs.has(jobId)) {
    const jobState = activeJobs.get(jobId);
    jobState.job.stop();
    activeJobs.delete(jobId);
    console.log(chalk.yellow(`   [CRON] Cron detenido exitosamente para el Job: ${jobId}`));
  } else {
    console.log(chalk.gray(`   [CRON] No se encontró un cron activo para el Job: ${jobId}`));
  }
});
