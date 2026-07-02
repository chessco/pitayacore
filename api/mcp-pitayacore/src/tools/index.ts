import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from '../api-client.js';

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
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const args = (rawArgs ?? {}) as Record<string, any>;

    try {
      switch (name) {
        case 'health_check': {
          const apiUrl = process.env.API_URL || 'https://pitayacore-api.pitayacode.io';
          const res = await fetch(`${apiUrl}/`);
          return { content: [{ type: 'text', text: `API health: ${res.status} ${res.statusText}` }] };
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
