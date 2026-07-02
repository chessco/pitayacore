import { McpConfig } from './types.js';
export declare class ApiClient {
    private config;
    constructor(config: McpConfig);
    private headers;
    get(path: string, tenantId?: string): Promise<any>;
    post(path: string, body?: any, tenantId?: string): Promise<any>;
    patch(path: string, body: any, tenantId?: string): Promise<any>;
    delete(path: string, tenantId?: string): Promise<any>;
}
//# sourceMappingURL=api-client.d.ts.map