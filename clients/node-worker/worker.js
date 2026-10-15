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
  let scriptLanguage = 'NODEJS';
  let scriptName = 'Script';
  
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
        scriptLanguage = (script.language || 'NODEJS').toUpperCase();
        scriptName = script.name || 'Script';
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
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Helper para resolver comando del runner
  const resolveCommand = (cmd) => {
    if (cmd === 'css' && process.platform === 'win32') {
      const userProfile = process.env.USERPROFILE || '';
      const dotnetCss = path.join(userProfile, '.dotnet', 'tools', 'css.exe');
      if (fs.existsSync(dotnetCss)) {
        return dotnetCss;
      }
    }
    return cmd;
  };
  
  const executeScript = () => {
    return new Promise((resolve) => {
      // Detección inteligente de lenguaje (por metadata o contenido)
      const isCSharp = scriptLanguage === 'CSHARP' || 
                       scriptLanguage === 'C#' || 
                       scriptContent.includes('//css_') || 
                       scriptContent.includes('using System;') || 
                       scriptContent.includes('namespace ') || 
                       scriptContent.includes('class Program') ||
                       (scriptContent.includes('Console.WriteLine') && !scriptContent.includes('console.log'));

      const isPython = scriptLanguage === 'PYTHON' || 
                       scriptLanguage === 'PY' || 
                       scriptContent.startsWith('#!/usr/bin/env python') || 
                       scriptContent.startsWith('# python');

      let ext = 'cjs';
      let cmd = 'node';
      let langLabel = 'Node.js';

      if (isCSharp) {
        ext = 'cs';
        cmd = resolveCommand('css');
        langLabel = 'C# (CS-Script)';

        // Garantizar que config.xml esté disponible en tmpDir para lecturas de DB/parámetros
        const candidateConfigs = [
          process.env.CS_SCRIPTS_CONFIG,
          path.resolve(process.cwd(), '../../cs_scripts/config.xml'),
          path.resolve(process.cwd(), '../cs_scripts/config.xml'),
          'C:\\PitayaCode\\pitayacore\\cs_scripts\\config.xml'
        ].filter(Boolean);

        for (const candidate of candidateConfigs) {
          if (fs.existsSync(candidate)) {
            try {
              const destXml = path.join(tmpDir, 'config.xml');
              fs.copyFileSync(candidate, destXml);
              console.log(chalk.gray(`   [CS] config.xml sincronizado en entorno de ejecución`));
              break;
            } catch (err) {}
          }
        }
      } else if (isPython) {
        ext = 'py';
        cmd = process.platform === 'win32' ? 'python' : 'python3';
        langLabel = 'Python';
      }

      // Use jobId in filename to avoid conflicts if it's a cron job, or executionId if it's manual
      const runId = cronExpression ? jobId : executionId;
      const scriptPath = path.join(tmpDir, `exec_${runId}.${ext}`);
      fs.writeFileSync(scriptPath, scriptContent, 'utf-8');
      console.log(chalk.gray(`   Script guardado: ${scriptPath} [${langLabel}]`));

      console.log(chalk.yellow(`   [>>] Iniciando ejecución (${langLabel})...`));
      const child = spawn(cmd, [scriptPath], {
        cwd: tmpDir,
        shell: true,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      child.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(chalk.white(text.trimEnd()));
      });

      let errorLog = '';
      child.stderr.on('data', (data) => {
        const text = data.toString();
        errorLog += text;
        console.error(chalk.red(text.trimEnd()));
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green.bold(`   [OK] Ejecución completada exitosamente.`));
          socket.emit('job.execution_completed', { executionId, workerId: WORKER_ID });
        } else {
          console.log(chalk.red.bold(`   [ERROR] Ejecución falló con código ${code}`));
          socket.emit('job.execution_failed', { executionId, workerId: WORKER_ID, error: errorLog });
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
