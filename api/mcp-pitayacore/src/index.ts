#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PingRequestSchema } from '@modelcontextprotocol/sdk/types.js';
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

server.setRequestHandler(PingRequestSchema, async () => ({}));

const transport = new StdioServerTransport();
await server.connect(transport);
