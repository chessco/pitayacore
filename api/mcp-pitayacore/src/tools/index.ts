import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from '../api-client.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export function registerTools(server: Server, api: ApiClient): void {
  const tools = [
    {
      name: 'health_check',
      description: 'Check if the PitayaCore API is reachable',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'list_tenants',
      description: 'List all tenants in the platform',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'create_tenant',
      description: 'Create a new tenant',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Tenant name' },
          plan: { type: 'string', description: 'Plan type (e.g. FREE, PRO)' },
        },
        required: ['name'],
      },
    },
    {
      name: 'list_agents',
      description: 'List all agents for the tenant',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'create_agent',
      description: 'Create a new AI agent',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          prompt: { type: 'string', description: 'System prompt for the agent' },
        },
        required: ['name', 'slug', 'prompt'],
      },
    },
    {
      name: 'deploy_agent',
      description: 'Deploy an agent to production. Requires confirm: true.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Agent ID' },
          confirm: { type: 'boolean', description: 'Must be true to proceed' },
        },
        required: ['id', 'confirm'],
      },
    },
    {
      name: 'initialize_whatsapp',
      description: 'Initialize a WhatsApp session for a channel',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
        },
        required: ['channelId'],
      },
    },
    {
      name: 'disconnect_whatsapp',
      description: 'Disconnect a WhatsApp session. Requires confirm: true.',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
          confirm: { type: 'boolean' },
        },
        required: ['channelId', 'confirm'],
      },
    },
    {
      name: 'list_conversations',
      description: 'List active inbox conversations',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'assign_conversation',
      description: 'Assign an agent to a conversation',
      inputSchema: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' },
          agentId: { type: 'string' },
        },
        required: ['conversationId', 'agentId'],
      },
    },
    {
      name: 'create_skill',
      description: 'Create a new skill',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          prompt: { type: 'string' },
        },
        required: ['name', 'description', 'prompt'],
      },
    },
    {
      name: 'update_skill_prompt',
      description: 'Update a skill prompt',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          prompt: { type: 'string' },
        },
        required: ['id', 'prompt'],
      },
    },
    {
      name: 'search_kb',
      description: 'Search knowledge base documents',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
    {
      name: 'create_kb_document',
      description: 'Add a document to the knowledge base',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['title', 'content'],
      },
    },
    {
      name: 'search_vectors',
      description: 'Semantic vector search across indexed content',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['query'],
      },
    },
    {
      name: 'list_notes',
      description: 'List all workspace notes',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'create_note',
      description: 'Create a workspace note',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'content'],
      },
    },
    {
      name: 'list_documents',
      description: 'List all workspace documents',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'list_ideas',
      description: 'List all workspace ideas',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'create_idea',
      description: 'Create a workspace idea',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'IN_REVIEW', 'IMPLEMENTED', 'ARCHIVED'] },
          priority: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['title'],
      },
    },
    {
      name: 'generate_ideas_ai',
      description: 'Generate workspace ideas using AI',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Topic or description for AI to generate ideas' },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'search_workspace',
      description: 'Full-text search across notes, documents, and ideas',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
    {
      name: 'ask_workspace_ai',
      description: 'Ask the workspace AI assistant with context from all workspace items',
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string' },
        },
        required: ['question'],
      },
    },
    {
      name: 'create_script',
      description: 'Crea un script políglota (C# CS-Script, Node.js o Python). Puede ser SOLO LOCAL (para cálculos rápidos únicos o bucle local sin persistir en la nube) o PERSISTENTE EN NUBE (registrado en Operations y ejecutado por workers).',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del script sin extensión, ej: CalculadoraIMC, MercadoLibreScraper' },
          language: { type: 'string', description: 'Lenguaje del script: CSHARP, NODEJS o PYTHON', enum: ['CSHARP', 'NODEJS', 'PYTHON'] },
          code: { type: 'string', description: 'Código fuente completo del script' },
          target: { 
            type: 'string', 
            description: 'Alcance del script: "local" (ejecución única o local sin guardar en la nube), "cloud" (guardar en base de datos de Operations en la nube y workers), o "both" (ambos). Por defecto es "local".',
            enum: ['local', 'cloud', 'both']
          },
          description: { type: 'string', description: 'Descripción de lo que hace el script' },
          cron: { type: 'string', description: 'Expresión cron opcional para scheduling (ej: */5 * * * *)' },
          parameters: { type: 'object', description: 'Diccionario de parámetros a registrar en config.xml local' },
          autoRun: { type: 'boolean', description: 'Si es true (default para scripts locales), ejecuta inmediatamente el script para devolver el resultado al usuario' },
        },
        required: ['name', 'language', 'code'],
      },
    },
    {
      name: 'run_direct_code',
      description: 'Compila y ejecuta al vuelo un bloque de código C# (CS-Script css), Node.js (node) o Python (python) de un solo uso para cálculos rápidos (como IMC, velocidad de la luz, etc.) sin guardar nada en la nube',
      inputSchema: {
        type: 'object',
        properties: {
          language: { type: 'string', description: 'Lenguaje: CSHARP, NODEJS o PYTHON', enum: ['CSHARP', 'NODEJS', 'PYTHON'] },
          code: { type: 'string', description: 'Código fuente a ejecutar' },
        },
        required: ['language', 'code'],
      },
    },
    {
      name: 'run_script',
      description: 'Ejecuta un script políglota existente (C# con CS-Script css, Node.js con node, o Python con python) y retorna su salida',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del script (ej: CalculadoraIMC o con extensión .cs, .cjs, .py)' },
        },
        required: ['name'],
      },
    },
    {
      name: 'list_scripts',
      description: 'Lista todos los scripts registrados tanto en config.xml local como en la base de datos de Operations en la nube, mostrando si están ACTIVOS o APAGADOS y su frecuencia',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'toggle_script',
      description: 'Activa o desactiva scripts en config.xml para el servicio de Windows. Si name es "all" o "todos", activa o desactiva TODOS los scripts.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del script (ej: CalculadoraIMC, LightSpeedCalculator) o "all" para todos' },
          enable: { type: 'boolean', description: 'true para activar (encender), false para desactivar (apagar)' },
        },
        required: ['name', 'enable'],
      },
    },
    {
      name: 'view_script_log',
      description: 'Lee y muestra las últimas líneas del archivo de log de un script específico o del servicio general de Windows',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del script (ej: CalculadoraIMC) o "service" para el log del servicio general' },
          lines: { type: 'number', description: 'Número de líneas a mostrar (opcional, por defecto 30)' },
        },
        required: ['name'],
      },
    },
    {
      name: 'create_cs_script',
      description: 'Alias de compatibilidad para crear un script C# para CS-Script (css) y registrarlo en config.xml',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Script filename without extension, e.g. LightSpeedCalculator' },
          description: { type: 'string', description: 'Detailed description of what the script does' },
          cron: { type: 'string', description: 'Cron expression for scheduling in config.xml, e.g. */1 * * * *' },
          code: { type: 'string', description: 'Complete C# source code compatible with CS-Script (css)' },
          parameters: { type: 'object', description: 'Dictionary of parameters to store in the script XML section' },
        },
        required: ['name', 'code'],
      },
    },
    {
      name: 'run_cs_script',
      description: 'Alias de compatibilidad para ejecutar un script C# con CS-Script (css)',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Script name, e.g. LightSpeedCalculator' },
        },
        required: ['name'],
      },
    },
    {
      name: 'list_cs_scripts',
      description: 'Alias de compatibilidad para listar scripts de config.xml',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'register_backend_script',
      description: 'Registra un script en el backend de Operations (PitayaCore) en C# (CS-Script) o Node.js para ejecución persistente en workers',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre descriptivo del script, ej: CalculadoraVelocidadLuz' },
          language: { type: 'string', description: 'Lenguaje: CSHARP o NODEJS', enum: ['CSHARP', 'NODEJS', 'PYTHON'] },
          content: { type: 'string', description: 'Código fuente completo del script' },
          cronExpression: { type: 'string', description: 'Opcional: Expresión cron para crear un Job automático (ej: */5 * * * *)' },
          autoRun: { type: 'boolean', description: 'Si es true, dispara inmediatamente el Job en los workers activos' },
        },
        required: ['name', 'language', 'content'],
      },
    },
    {
      name: 'list_backend_scripts',
      description: 'Lista los scripts registrados en el backend de Operations',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'create_persistent_job',
      description: 'Crea un Job persistente en el backend vinculado a un script (C# o Node.js) con cron opcional',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del Job' },
          scriptId: { type: 'string', description: 'ID del script a ejecutar' },
          cronExpression: { type: 'string', description: 'Expresión cron (ej: */1 * * * * o null para manual)' },
          category: { type: 'string', description: 'Categoría (ej: SCRAPING, INTEGRATION, PROCESS)' },
          autoRun: { type: 'boolean', description: 'Si es true, ejecuta inmediatamente el Job en los workers' },
        },
        required: ['name', 'scriptId'],
      },
    },
    {
      name: 'run_backend_job',
      description: 'Dispara la ejecución inmediata de un Job existente en los workers activos',
      inputSchema: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'ID del Job a ejecutar' },
        },
        required: ['jobId'],
      },
    },
    {
      name: 'list_backend_workers',
      description: 'Lista los workers de Operations conectados y su estado de salud',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'update_backend_worker',
      description: 'Edita la configuración de un Worker registrado en Operations (nombre, tipo, versión)',
      inputSchema: {
        type: 'object',
        properties: {
          workerId: { type: 'string', description: 'ID del worker' },
          name: { type: 'string', description: 'Nuevo nombre para el worker' },
          workerType: { type: 'string', description: 'Tipo de worker: WINDOWS_NATIVE, NODEJS, PYTHON_CLI, DOCKER' },
          version: { type: 'string', description: 'Versión del worker' },
        },
        required: ['workerId'],
      },
    },
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const args = (rawArgs ?? {}) as Record<string, any>;

    try {
      switch (name) {
        case 'health_check': {
          const apiUrl = process.env.API_URL || 'https://pitayacore-api.pitayacode.io';
          let healthData: any = null;
          for (const path of ['/api/health', '/api/api/health', '/api/system/status', '/api/api/system/status']) {
            try {
              const res = await fetch(`${apiUrl}${path}`);
              if (res.ok) {
                healthData = await res.json();
                break;
              }
            } catch {
              // continue to next candidate
            }
          }
          if (!healthData) {
            try {
              const ping = await api.get('/api/tenants');
              healthData = { status: 'ok', reachable: true, tenantsCount: Array.isArray(ping) ? ping.length : 0 };
            } catch (err: any) {
              return { content: [{ type: 'text', text: `API health check falló: ${err.message}` }], isError: true };
            }
          }
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'healthy',
                service: 'PitayaCore API',
                apiUrl,
                ...healthData,
              }, null, 2),
            }],
          };
        }
        case 'list_tenants': {
          const data = await api.get('/api/tenants');
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'create_tenant': {
          const data = await api.post('/api/tenants', { name: args.name, plan: args.plan });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'list_agents': {
          const data = await api.get('/api/agents');
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'create_agent': {
          const data = await api.post('/api/agents', {
            name: args.name,
            slug: args.slug,
            prompt: args.prompt,
          });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'deploy_agent': {
          if (!args.confirm) throw new Error('Confirmation required. Set confirm: true.');
          const data = await api.post(`/api/agents/${args.id}/deploy`);
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'initialize_whatsapp': {
          const data = await api.post(`/api/communication/sessions/${args.channelId}/initialize`);
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'disconnect_whatsapp': {
          if (!args.confirm) throw new Error('Confirmation required. Set confirm: true.');
          const data = await api.delete(`/api/communication/sessions/${args.channelId}/disconnect`);
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'list_conversations': {
          const data = await api.get('/api/agent-inbox/conversations');
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'assign_conversation': {
          const data = await api.patch(`/api/agent-inbox/conversations/${args.conversationId}/assign`, {
            agentId: args.agentId,
          });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'create_skill': {
          const data = await api.post('/api/skills', {
            name: args.name,
            description: args.description,
            prompt: args.prompt,
          });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'update_skill_prompt': {
          const data = await api.patch(`/api/skills/${args.id}/prompt`, { prompt: args.prompt });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'search_kb': {
          const data = await api.get(`/api/knowledge-base?search=${encodeURIComponent(args.query)}`);
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'create_kb_document': {
          const data = await api.post('/api/knowledge-base', {
            title: args.title,
            content: args.content,
          });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'search_vectors': {
          const tenantId = process.env.DEFAULT_TENANT_ID || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';
          const data = await api.post(`/api/tenants/${tenantId}/search`, {
            query: args.query,
            limit: args.limit || 5,
          });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'list_notes': {
          const data = await api.get('/api/workspace/notes');
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'create_note': {
          const data = await api.post('/api/workspace/notes', {
            title: args.title,
            content: args.content,
            tags: args.tags,
          });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'list_documents': {
          const data = await api.get('/api/workspace/documents');
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'list_ideas': {
          const data = await api.get('/api/workspace/ideas');
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'create_idea': {
          const data = await api.post('/api/workspace/ideas', {
            title: args.title,
            description: args.description,
            status: args.status,
            priority: args.priority,
            category: args.category,
          });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'generate_ideas_ai': {
          const data = await api.post('/api/workspace/ideas/generate-ai', { prompt: args.prompt });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'search_workspace': {
          const data = await api.get(`/api/workspace/search?q=${encodeURIComponent(args.query)}`);
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'ask_workspace_ai': {
          const data = await api.post('/api/workspace/ai/ask', { question: args.question });
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'create_script':
        case 'create_cs_script': {
          const dir = process.env.CS_SCRIPTS_DIR || 'c:\\PitayaCode\\pitayacore\\cs_scripts';
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

          let lang = (args.language || 'CSHARP').toUpperCase();
          if (lang === 'C#' || lang === 'CS') lang = 'CSHARP';
          if (lang === 'NODE' || lang === 'JS' || lang === 'JAVASCRIPT') lang = 'NODEJS';
          if (lang === 'PY') lang = 'PYTHON';

          let ext = 'cs';
          if (lang === 'NODEJS') ext = 'cjs';
          else if (lang === 'PYTHON') ext = 'py';

          const scriptId = args.name.replace(/\.(cs|cjs|js|py)$/i, '');
          const scriptFileName = `${scriptId}.${ext}`;
          const scriptFile = path.join(dir, scriptFileName);
          const configFile = path.join(dir, 'config.xml');

          // 1. Escribir código local
          fs.writeFileSync(scriptFile, args.code, 'utf-8');

          // 2. Registrar en XML único
          if (!fs.existsSync(configFile)) {
            const defaultXml = `<?xml version="1.0" encoding="utf-8"?>
<PitayaScriptsConfig>
  <GlobalSettings>
    <DatabaseConnection>
      <Server>localhost</Server>
      <Port>3306</Port>
      <Database>pitayacore_db</Database>
      <User>root</User>
      <Password>luxury_pass</Password>
      <ConnectionString>Server=localhost;Database=pitayacore_db;Uid=root;Pwd=luxury_pass;</ConnectionString>
    </DatabaseConnection>
    <Paths>
      <BaseDir>${dir}</BaseDir>
      <LogsDir>${path.join(dir, 'logs')}</LogsDir>
      <DataDir>${path.join(dir, 'data')}</DataDir>
    </Paths>
  </GlobalSettings>
  <Scripts>
  </Scripts>
</PitayaScriptsConfig>`;
            fs.writeFileSync(configFile, defaultXml, 'utf-8');
          }

          let xml = fs.readFileSync(configFile, 'utf-8');
          const paramTags = Object.entries(args.parameters || {})
            .map(([k, v]) => `        <${k}>${v}</${k}>`)
            .join('\n');

          const scriptBlock = `    <Script id="${scriptId}" language="${lang}" enabled="true">
      <Description>${args.description || scriptId}</Description>
      <Cron>${args.cron || '*/1 * * * *'}</Cron>
      <Parameters>
${paramTags}
      </Parameters>
    </Script>`;

          const regex = new RegExp(`\\s*<Script id="${scriptId}"[\\s\\S]*?<\\/Script>`, 'i');
          if (regex.test(xml)) {
            xml = xml.replace(regex, '\n' + scriptBlock);
          } else {
            xml = xml.replace('</Scripts>', `${scriptBlock}\n  </Scripts>`);
          }
          fs.writeFileSync(configFile, xml, 'utf-8');

          // 3. Verificación de sintaxis
          let compileStatus = 'Guardado';
          try {
            if (lang === 'CSHARP') {
              execSync(`css -c "${scriptFile}"`, { encoding: 'utf-8', timeout: 20000, cwd: dir });
              compileStatus = 'Verificado y listo para CS-Script';
            } else if (lang === 'NODEJS') {
              execSync(`node -c "${scriptFile}"`, { encoding: 'utf-8', timeout: 10000, cwd: dir });
              compileStatus = 'Sintaxis Node.js verificada con éxito';
            } else if (lang === 'PYTHON') {
              execSync(`python -m py_compile "${scriptFile}"`, { encoding: 'utf-8', timeout: 10000, cwd: dir });
              compileStatus = 'Sintaxis Python verificada con éxito';
            }
          } catch (err: any) {
            compileStatus = `Guardado (Aviso de validación: ${err.message})`;
          }

          // 4. Registro persistente en Backend Operations (solo si target es 'cloud' o 'both')
          const target = (args.target || (args.registerInBackend ? 'cloud' : 'local')).toLowerCase();
          const shouldPersistInCloud = target === 'cloud' || target === 'both';

          let backendScript: any = null;
          let backendJob: any = null;
          let runOutput: string | null = null;

          if (shouldPersistInCloud) {
            try {
              backendScript = await api.post('/api/operations/scripts', {
                name: scriptId,
                language: lang,
                content: args.code,
              });

              if (args.cron) {
                backendJob = await api.post('/api/operations/jobs', {
                  name: `Job - ${scriptId}`,
                  jobType: 'INTEGRATION',
                  executionPlan: { scriptId: backendScript.id },
                  cronExpression: args.cron,
                });
              }
            } catch (e: any) {
              console.error('Error registrando en backend:', e.message);
            }
          }

          // 5. Ejecución (por defecto true si es script local para dar respuesta de una vez)
          const shouldAutoRun = args.autoRun !== undefined ? args.autoRun : (target === 'local');
          if (shouldAutoRun) {
            try {
              if (backendJob && target === 'cloud') {
                await api.post(`/api/operations/executions/${backendJob.id}/execute`);
                runOutput = 'Orden de ejecución enviada a los workers en el backend.';
              } else {
                const cmd = lang === 'CSHARP' ? `css "${scriptFile}"` : lang === 'NODEJS' ? `node "${scriptFile}"` : `python "${scriptFile}"`;
                runOutput = execSync(cmd, { encoding: 'utf-8', timeout: 35000, cwd: dir });
              }
            } catch (err: any) {
              runOutput = `Error en ejecución: ${err.message}`;
            }
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'created',
                scriptId,
                language: lang,
                scope: target === 'local' ? 'Solo Local (No persistido en la nube)' : 'Persistido en la nube',
                filePath: scriptFile,
                configXml: configFile,
                cron: args.cron || null,
                compileStatus,
                backendScript: backendScript ? { id: backendScript.id, name: backendScript.name } : 'No persistido en backend',
                backendJob: backendJob ? { id: backendJob.id } : null,
                executionResult: runOutput,
              }, null, 2),
            }],
          };
        }
        case 'run_direct_code': {
          let lang = (args.language || 'CSHARP').toUpperCase();
          if (lang === 'C#' || lang === 'CS') lang = 'CSHARP';
          if (lang === 'NODE' || lang === 'JS' || lang === 'JAVASCRIPT') lang = 'NODEJS';
          if (lang === 'PY') lang = 'PYTHON';

          const tmpDir = path.join(process.cwd(), '.tmp');
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

          const ext = lang === 'CSHARP' ? 'cs' : lang === 'NODEJS' ? 'cjs' : 'py';
          const tmpFile = path.join(tmpDir, `quick_${Date.now()}.${ext}`);
          fs.writeFileSync(tmpFile, args.code, 'utf-8');

          const cmd = lang === 'CSHARP' ? `css "${tmpFile}"` : lang === 'NODEJS' ? `node "${tmpFile}"` : `python "${tmpFile}"`;

          try {
            const output = execSync(cmd, { encoding: 'utf-8', timeout: 35000, cwd: tmpDir });
            try { fs.unlinkSync(tmpFile); } catch (e) {}
            return { content: [{ type: 'text', text: output }] };
          } catch (err: any) {
            const errorOutput = err.stdout || err.stderr || err.message;
            try { fs.unlinkSync(tmpFile); } catch (e) {}
            return { content: [{ type: 'text', text: `Error de ejecución directa:\n${errorOutput}` }], isError: true };
          }
        }
        case 'run_script':
        case 'run_cs_script': {
          const dir = process.env.CS_SCRIPTS_DIR || 'c:\\PitayaCode\\pitayacore\\cs_scripts';
          let targetPath = path.join(dir, args.name);

          if (!fs.existsSync(targetPath)) {
            const candidates = [
              path.join(dir, `${args.name}.cs`),
              path.join(dir, `${args.name}.cjs`),
              path.join(dir, `${args.name}.js`),
              path.join(dir, `${args.name}.py`),
            ];
            const found = candidates.find(c => fs.existsSync(c));
            if (found) {
              targetPath = found;
            } else {
              throw new Error(`El archivo de script no existe en ${dir} (probado .cs, .cjs, .js, .py): ${args.name}`);
            }
          }

          const ext = path.extname(targetPath).toLowerCase();
          let cmd = `css "${targetPath}"`;
          if (ext === '.cjs' || ext === '.js') {
            cmd = `node "${targetPath}"`;
          } else if (ext === '.py') {
            cmd = `python "${targetPath}"`;
          }

          try {
            const output = execSync(cmd, {
              encoding: 'utf-8',
              timeout: 45000,
              cwd: dir,
            });
            return { content: [{ type: 'text', text: output }] };
          } catch (err: any) {
            const errorOutput = err.stdout || err.stderr || err.message;
            return { content: [{ type: 'text', text: `Error de ejecución:\n${errorOutput}` }], isError: true };
          }
        }
        case 'toggle_script': {
          const dir = process.env.CS_SCRIPTS_DIR || 'c:\\PitayaCode\\pitayacore\\cs_scripts';
          const runnerPy = path.join(dir, 'runner.py');
          const isAll = !args.name || ['all', 'todos', '*'].includes(String(args.name).toLowerCase());
          const action = args.enable ? (isAll ? '--enable-all' : `--enable "${args.name}"`) : (isAll ? '--disable-all' : `--disable "${args.name}"`);

          try {
            const output = execSync(`python "${runnerPy}" ${action}`, {
              encoding: 'utf-8',
              timeout: 15000,
              cwd: dir,
            });
            return { content: [{ type: 'text', text: output.trim() }] };
          } catch (err: any) {
            const errOut = err.stdout || err.stderr || err.message;
            return { content: [{ type: 'text', text: `Error al cambiar estado: ${errOut}` }], isError: true };
          }
        }
        case 'view_script_log': {
          const dir = process.env.CS_SCRIPTS_DIR || 'c:\\PitayaCode\\pitayacore\\cs_scripts';
          const logsDir = path.join(dir, 'logs');
          const maxLines = args.lines || 35;
          let targetFile = path.join(logsDir, `${args.name}.log`);

          if (String(args.name).toLowerCase() === 'service') {
            targetFile = path.join(logsDir, 'service_output.log');
          }

          if (!fs.existsSync(targetFile)) {
            return { content: [{ type: 'text', text: `No existe log previo para '${args.name}' en ${targetFile}` }] };
          }

          try {
            const raw = fs.readFileSync(targetFile, 'utf-8');
            const lines = raw.split(/\r?\n/);
            const tail = lines.slice(-maxLines).join('\n');
            return { content: [{ type: 'text', text: tail || '(Log vacío)' }] };
          } catch (err: any) {
            return { content: [{ type: 'text', text: `Error al leer log: ${err.message}` }], isError: true };
          }
        }
        case 'list_scripts':
        case 'list_cs_scripts': {
          const dir = process.env.CS_SCRIPTS_DIR || 'c:\\PitayaCode\\pitayacore\\cs_scripts';
          const runnerPy = path.join(dir, 'runner.py');
          let cliOutput = '';
          try {
            cliOutput = execSync(`python "${runnerPy}" --list`, {
              encoding: 'utf-8',
              timeout: 10000,
              cwd: dir,
            });
          } catch (e: any) {
            cliOutput = e.stdout || e.message;
          }

          let backendScripts: any[] = [];
          try {
            backendScripts = await api.get('/api/operations/scripts');
          } catch (e) {}

          let outputText = `${cliOutput.trim()}\n\n`;
          if (backendScripts && backendScripts.length > 0) {
            outputText += "=== SCRIPTS REGISTRADOS EN LA NUBE (OPERATIONS BACKEND) ===\n";
            for (const bs of backendScripts) {
              outputText += ` -> [${bs.language}] ${bs.name} (ID: ${bs.id})\n`;
            }
          }

          return {
            content: [{
              type: 'text',
              text: outputText,
            }],
          };
        }
        case 'register_backend_script': {
          const lang = (args.language || 'CSHARP').toUpperCase();
          const script = await api.post('/api/operations/scripts', {
            name: args.name,
            language: lang,
            content: args.content,
          });

          let jobInfo: any = null;
          if (args.cronExpression || args.autoRun) {
            const job = await api.post('/api/operations/jobs', {
              name: `Job - ${args.name}`,
              jobType: 'INTEGRATION',
              executionPlan: { scriptId: script.id },
              cronExpression: args.cronExpression || null,
            });
            jobInfo = job;

            if (args.autoRun) {
              await api.post(`/api/operations/executions/${job.id}/execute`);
            }
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'success',
                message: `Script ${args.name} (${lang}) registrado persistentemente en PitayaCore Operations.`,
                script,
                job: jobInfo,
              }, null, 2),
            }],
          };
        }
        case 'list_backend_scripts': {
          const scripts = await api.get('/api/operations/scripts');
          return { content: [{ type: 'text', text: JSON.stringify(scripts, null, 2) }] };
        }
        case 'create_persistent_job': {
          const job = await api.post('/api/operations/jobs', {
            name: args.name,
            jobType: args.category || 'SCRAPING',
            executionPlan: { scriptId: args.scriptId },
            cronExpression: args.cronExpression || null,
          });

          if (args.autoRun) {
            await api.post(`/api/operations/executions/${job.id}/execute`);
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'success',
                message: `Job ${job.name} creado exitosamente con cron "${args.cronExpression || 'manual'}".`,
                job,
              }, null, 2),
            }],
          };
        }
        case 'run_backend_job': {
          const res = await api.post(`/api/operations/executions/${args.jobId}/execute`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'dispatched',
                message: `Orden de ejecución enviada a los workers para el Job ${args.jobId}.`,
                details: res,
              }, null, 2),
            }],
          };
        }
        case 'list_backend_workers': {
          const workers = await api.get('/api/operations/workers');
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(workers, null, 2),
            }],
          };
        }
        case 'update_backend_worker': {
          const res = await api.patch(`/api/operations/workers/${args.workerId}`, {
            ...(args.name && { name: args.name }),
            ...(args.workerType && { type: args.workerType, workerType: args.workerType }),
            ...(args.version && { version: args.version }),
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ status: 'success', message: 'Worker actualizado exitosamente', worker: res }, null, 2),
            }],
          };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    }
  });
}
