# PitayaCore MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Build an MCP server that exposes PitayaCore's REST API as tools and resources for AI agents.

**Architecture:** TypeScript MCP server using `@modelcontextprotocol/sdk` with `StdioServerTransport`. Authenticates via `x-api-key` header. Resources for read-only data, Tools for actions. Runs as a child process via opencode.json.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `node:fetch`

## Global Constraints

- No secrets committed to git — use env vars (`INTERNAL_API_KEY`, `API_URL`)
- All destructive tools require explicit `{ confirm: true }` flag
- Every API request includes `x-api-key` and `x-tenant-id` headers
- Resources use `pitaya://` URI scheme
- Default tenant ID: `edd1ac37-5ff9-4e46-bc7f-fff3c414d718`

---

### Task 1: Scaffold MCP project

**Files:**
- Create: `api/mcp-pitayacore/package.json`
- Create: `api/mcp-pitayacore/tsconfig.json`
- Modify: `api/.gitignore` (add mcp-pitayacore/dist, mcp-pitayacore/node_modules if needed — covered by root gitignore)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "mcp-pitayacore",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.14.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.0.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create directory structure**

```
api/mcp-pitayacore/src/
├── index.ts
├── api-client.ts
├── types.ts
├── resources/
│   └── index.ts
└── tools/
    └── index.ts
```

- [ ] **Step 4: Install dependencies and verify build**

```bash
cd api/mcp-pitayacore
npm install
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add api/mcp-pitayacore/
git commit -m "feat(mcp): scaffold project structure"
```

---

### Task 2: Create API client

**Files:**
- Create: `api/mcp-pitayacore/src/api-client.ts`
- Create: `api/mcp-pitayacore/src/types.ts`

- [ ] **Step 1: Create `types.ts`**

```typescript
export interface McpConfig {
  apiUrl: string;
  apiKey: string;
  defaultTenantId: string;
}

export interface ApiError {
  status: number;
  message: string;
}
```

- [ ] **Step 2: Create `api-client.ts`**

```typescript
import { McpConfig, ApiError } from './types.js';

export class ApiClient {
  private config: McpConfig;

  constructor(config: McpConfig) {
    this.config = config;
  }

  private headers(tenantId?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'x-tenant-id': tenantId || this.config.defaultTenantId,
    };
  }

  async get(path: string, tenantId?: string): Promise<any> {
    const url = `${this.config.apiUrl}${path}`;
    const res = await fetch(url, { headers: this.headers(tenantId) });
    if (!res.ok) throw new Error(`GET ${url}: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async post(path: string, body?: any, tenantId?: string): Promise<any> {
    const url = `${this.config.apiUrl}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(tenantId),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${url}: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async patch(path: string, body: any, tenantId?: string): Promise<any> {
    const url = `${this.config.apiUrl}${path}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.headers(tenantId),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${url}: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async delete(path: string, tenantId?: string): Promise<any> {
    const url = `${this.config.apiUrl}${path}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.headers(tenantId),
    });
    if (!res.ok) throw new Error(`DELETE ${url}: ${res.status} ${await res.text()}`);
    return res.json();
  }
}
```

- [ ] **Step 3: Verify build**

```bash
cd api/mcp-pitayacore
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add api/mcp-pitayacore/src/api-client.ts api/mcp-pitayacore/src/types.ts
git commit -m "feat(mcp): api client with auth headers"
```

---

### Task 3: Create MCP server entry point

**Files:**
- Create: `api/mcp-pitayacore/src/resources/index.ts`
- Create: `api/mcp-pitayacore/src/tools/index.ts`
- Create: `api/mcp-pitayacore/src/index.ts`

- [ ] **Step 1: Create `resources/index.ts`**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ApiClient } from '../api-client.js';

export function registerResources(server: Server, api: ApiClient): void {
  server.setRequestHandler('resources/list', async () => ({
    resources: [
      { uri: 'pitaya://tenants', name: 'List tenants', mimeType: 'application/json' },
      { uri: 'pitaya://tenants/{id}', name: 'Tenant details', mimeType: 'application/json' },
      { uri: 'pitaya://agents', name: 'List agents', mimeType: 'application/json' },
      { uri: 'pitaya://conversations', name: 'Active conversations', mimeType: 'application/json' },
      { uri: 'pitaya://channels', name: 'Communication channels', mimeType: 'application/json' },
      { uri: 'pitaya://skills', name: 'Skills list', mimeType: 'application/json' },
    ],
  }));

  server.setRequestHandler('resources/read', async (request) => {
    const uri = request.params.uri;
    let data: any;

    if (uri === 'pitaya://tenants') {
      data = await api.get('/api/tenants');
    } else if (uri === 'pitaya://agents') {
      data = await api.get('/api/agents');
    } else if (uri === 'pitaya://conversations') {
      data = await api.get('/api/agent-inbox/conversations');
    } else if (uri === 'pitaya://channels') {
      data = await api.get('/api/communication/channels');
    } else if (uri === 'pitaya://skills') {
      data = await api.get('/api/skills');
    } else if (uri.startsWith('pitaya://tenants/')) {
      const id = uri.replace('pitaya://tenants/', '');
      data = await api.get(`/api/tenants/${id}`);
    } else {
      throw new Error(`Unknown resource: ${uri}`);
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }],
    };
  });
}
```

- [ ] **Step 2: Create `tools/index.ts`**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
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
  ];

  server.setRequestHandler('tools/list', async () => ({ tools }));

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

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
```

- [ ] **Step 3: Create `index.ts`**

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ApiClient } from './api-client.js';
import { registerResources } from './resources/index.js';
import { registerTools } from './tools/index.js';

const API_URL = process.env.API_URL || 'https://pitayacore-api.pitayacode.io';
const API_KEY = process.env.INTERNAL_API_KEY;
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';

if (!API_KEY) {
  console.error('ERROR: INTERNAL_API_KEY environment variable is required');
  process.exit(1);
}

const api = new ApiClient({ apiUrl: API_URL, apiKey: API_KEY, defaultTenantId: DEFAULT_TENANT_ID });

const server = new Server(
  { name: 'pitayacore-mcp', version: '1.0.0' },
  { capabilities: { resources: {}, tools: {} } },
);

registerResources(server, api);
registerTools(server, api);

server.setRequestHandler('ping', async () => ({}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 4: Verify build**

```bash
cd api/mcp-pitayacore
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Build and smoke test**

```bash
cd api/mcp-pitayacore
npm run build
node dist/index.js &
sleep 1
# Server should start without error (will exit when stdin closes)
kill %1 2>/dev/null
```

Expected: No crash, clean exit.

- [ ] **Step 6: Commit**

```bash
git add api/mcp-pitayacore/src/
git commit -m "feat(mcp): server entry point with resources and tools"
```

---

### Task 4: Add remaining resources (conversation details, channels, analytics)

**Files:**
- Modify: `api/mcp-pitayacore/src/resources/index.ts`

- [ ] **Step 1: Add conversation detail, channel detail, and analytics to resource list**

Update the `resources/list` handler to add:

```typescript
{ uri: 'pitaya://conversations/{id}', name: 'Conversation messages', mimeType: 'application/json' },
{ uri: 'pitaya://channels/{id}', name: 'Channel detail', mimeType: 'application/json' },
{ uri: 'pitaya://analytics/dashboard', name: 'Dashboard KPIs', mimeType: 'application/json' },
```

Update the `resources/read` handler to add the following cases after the existing ones:

```typescript
    } else if (uri.startsWith('pitaya://conversations/')) {
      const id = uri.replace('pitaya://conversations/', '');
      const messages = await api.get(`/api/agent-inbox/conversations/${id}/messages`);
      const conversation = { id, messages };
      data = conversation;
    } else if (uri.startsWith('pitaya://channels/')) {
      const id = uri.replace('pitaya://channels/', '');
      data = await api.get(`/api/communication/channels/${id}`);
    } else if (uri === 'pitaya://analytics/dashboard') {
      data = await api.get('/api/analytics/dashboard');
```

- [ ] **Step 2: Verify build**

```bash
cd api/mcp-pitayacore && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add api/mcp-pitayacore/src/resources/index.ts
git commit -m "feat(mcp): add conversation, channel, and analytics resources"
```

---

### Task 5: Add remaining tools (skills, KB, search, logs)

**Files:**
- Modify: `api/mcp-pitayacore/src/tools/index.ts`

- [ ] **Step 1: Add remaining tool definitions to the tools array**

```typescript
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
```

- [ ] **Step 2: Add handlers for each new tool in the switch statement**

```typescript
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
```

- [ ] **Step 3: Verify build**

```bash
cd api/mcp-pitayacore && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add api/mcp-pitayacore/src/tools/index.ts
git commit -m "feat(mcp): add skills, KB, search tools"
```

---

### Task 6: Build, configure and test

**Files:**
- Create: `api/mcp-pitayacore/.gitignore`
- Create: `api/mcp-pitayacore/README.md`

- [ ] **Step 1: Create `.gitignore`**

```
dist/
node_modules/
```

- [ ] **Step 2: Build the project**

```bash
cd api/mcp-pitayacore
npm run build
```

Expected: `dist/index.js` exists and is executable.

- [ ] **Step 3: Test with opencode.json entry (local)**

```json
{
  "mcpServers": {
    "pitayacore": {
      "command": "node",
      "args": ["api/mcp-pitayacore/dist/index.js"],
      "env": {
        "API_URL": "http://localhost:2014",
        "INTERNAL_API_KEY": "${INTERNAL_API_KEY}",
        "DEFAULT_TENANT_ID": "edd1ac37-5ff9-4e46-bc7f-fff3c414d718"
      }
    }
  }
}
```

- [ ] **Step 4: Verify the MCP server starts correctly**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"resources/list"}' | node api/mcp-pitayacore/dist/index.js
```

Expected: JSON-RPC response with the resources list.

- [ ] **Step 5: Commit**

```bash
git add api/mcp-pitayacore/.gitignore api/mcp-pitayacore/README.md
git commit -m "feat(mcp): build config and docs"
```
