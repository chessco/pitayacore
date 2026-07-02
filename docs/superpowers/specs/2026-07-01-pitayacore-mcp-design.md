# PitayaCore MCP Server — Design Doc

**Date**: 2026-07-01
**Status**: Draft

## Purpose

Create an MCP (Model Context Protocol) server that exposes PitayaCore's REST API as tools and resources, allowing AI agents (opencode, Claude Desktop, etc.) to interact with the platform programmatically.

## Architecture

```
┌─────────────┐     stdio JSON-RPC      ┌──────────────────┐     HTTPS      ┌──────────────┐
│ AI Agent     │ ◄────────────────────► │  mcp-pitayacore   │ ────────────► │  PitayaCore  │
│ (opencode)   │                        │  (MCP Server)     │               │  REST API    │
└─────────────┘                         └──────────────────┘               └──────────────┘
```

- **Transport**: `StdioServerTransport` (JSON-RPC over stdio)
- **Auth**: `x-api-key: <INTERNAL_API_KEY>` + `x-tenant-id: <id>` headers on every request
- **Config**: via environment variables (`API_URL`, `INTERNAL_API_KEY`, `DEFAULT_TENANT_ID`)

## Project Structure

```
api/mcp-pitayacore/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Entry point, starts MCP server
│   ├── api-client.ts         # HTTP client wrapper
│   ├── types.ts              # Shared types
│   ├── resources/
│   │   ├── index.ts          # Resource registrar
│   │   ├── tenants.ts        # pitaya://tenants/*
│   │   ├── agents.ts         # pitaya://agents/*
│   │   ├── conversations.ts  # pitaya://conversations/*
│   │   ├── channels.ts       # pitaya://channels/*
│   │   ├── skills.ts         # pitaya://skills/*
│   │   └── analytics.ts      # pitaya://analytics/*
│   └── tools/
│       ├── index.ts          # Tool registrar
│       ├── agents.ts         # create_agent, update_agent, deploy_agent
│       ├── skills.ts         # create_skill, update_skill
│       ├── whatsapp.ts       # initialize_whatsapp, disconnect_whatsapp
│       ├── inbox.ts          # assign_conversation, reply_conversation
│       ├── knowledge-base.ts # create_kb_document, search_kb
│       ├── tenants.ts        # create_tenant, update_tenant
│       ├── deploy.ts         # run_deploy
│       └── system.ts         # get_logs, health_check
```

## Resources

| URI | HTTP Mapping | Description |
|---|---|---|
| `pitaya://tenants` | `GET /api/tenants` | List all tenants |
| `pitaya://tenants/{id}` | `GET /api/tenants/{id}` | Tenant details |
| `pitaya://agents` | `GET /api/agents` | List agents for tenant |
| `pitaya://agents/{slug}` | `GET /api/agents/{slug}` | Agent by slug |
| `pitaya://conversations` | `GET /api/agent-inbox/conversations` | Active inbox conversations |
| `pitaya://conversations/{id}` | `GET /api/agent-inbox/conversations/{id}/messages` | Full conversation thread |
| `pitaya://channels` | `GET /api/communication/channels` | Communication channels |
| `pitaya://channels/{id}` | `GET /api/communication/channels/{id}` | Channel detail |
| `pitaya://skills` | `GET /api/skills` | Skills list |
| `pitaya://analytics/dashboard` | `GET /api/analytics/dashboard` | Dashboard KPIs |

## Tools

| Tool Name | HTTP | Description | Safety |
|---|---|---|---|
| `create_agent` | `POST /api/agents` | Create agent with name, slug, prompt | Normal |
| `update_agent` | `PATCH /api/agents/{id}` | Update agent prompt/config | Normal |
| `deploy_agent` | `POST /api/agents/{id}/deploy` | Deploy agent to production | Requires `{ confirm: true }` |
| `create_skill` | `POST /api/skills` | Create new skill | Normal |
| `update_skill` | `PATCH /api/skills/{id}/prompt` | Update skill prompt | Normal |
| `initialize_whatsapp` | `POST /api/communication/sessions/{channelId}/initialize` | Start WhatsApp session | Normal |
| `disconnect_whatsapp` | `DELETE /api/communication/sessions/{channelId}/disconnect` | Stop WhatsApp session | Requires `{ confirm: true }` |
| `assign_conversation` | `PATCH /api/agent-inbox/conversations/{id}/assign` | Assign agent to conversation | Normal |
| `reply_conversation` | `POST /api/conversations/{id}/reply` | Send reply in conversation | Normal |
| `search_kb` | `GET /api/knowledge-base?q=` | Search knowledge base | Normal |
| `create_kb_document` | `POST /api/knowledge-base` | Add document to KB | Normal |
| `search_vectors` | `POST /api/tenants/{tenantId}/search` | Semantic vector search | Normal |
| `run_deploy` | Execute deploy script | Run deploy_api_hetzner.ps1 | Requires `{ confirm: true, reason: "..." }` |
| `health_check` | `GET /` | Check API health | Normal |
| `get_logs` | `docker logs` via SSH | Fetch recent API logs | Normal |

## Auth Flow

Every API request includes:
```
x-api-key: <INTERNAL_API_KEY>
x-tenant-id: <DEFAULT_TENANT_ID>
```

The `INTERNAL_API_KEY` is read from env or from the tenant config. The MCP does not handle user-level auth — it acts as a SYSTEM-level integration.

## Safety & Confirmation

Tools that modify production state require an explicit confirmation flag:

```typescript
// Dangerous tool
const result = await server.callTool("deploy_agent", {
  id: "agent_123",
  confirm: true  // Required. Will error if missing.
});
```

Tools that are safe (read-only or non-destructive) work without confirmation.

## Error Handling

- Non-2xx responses from the API are returned as tool errors with the HTTP status and body
- Network errors surface as MCP errors with `isError: true`
- Missing `x-api-key` returns a clear configuration error

## Configuration (opencode.json)

```json
{
  "mcpServers": {
    "pitayacore": {
      "command": "node",
      "args": ["api/mcp-pitayacore/dist/index.js"],
      "env": {
        "API_URL": "https://pitayacore-api.pitayacode.io",
        "INTERNAL_API_KEY": "${INTERNAL_API_KEY}",
        "DEFAULT_TENANT_ID": "edd1ac37-5ff9-4e46-bc7f-fff3c414d718"
      }
    }
  }
}
```

## Implementation Order

1. Scaffold project (package.json, tsconfig, deps)
2. `api-client.ts` — HTTP client with auth headers
3. `index.ts` — MCP server setup + tool/resource registration
4. Resources (read-only, high value first): tenants → agents → conversations → channels → skills → analytics
5. Tools (write, safe first): health_check → agents CRUD → skills CRUD → inbox → whatsapp → knowledge-base → deploy
6. Safety confirmations on dangerous tools
7. Test with opencode

## Open Questions

- Should `run_deploy` shell out locally or call a webhook on the server?
  - Decision: shell out locally (run deploy script via child_process) to match existing dev workflow.
