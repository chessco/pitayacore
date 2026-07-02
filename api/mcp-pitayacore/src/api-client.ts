import { McpConfig } from './types.js';

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
