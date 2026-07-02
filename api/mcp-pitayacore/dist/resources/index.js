import { ListResourcesRequestSchema, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
export function registerResources(server, api) {
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: [
            { uri: 'pitaya://tenants', name: 'List tenants', mimeType: 'application/json' },
            { uri: 'pitaya://tenants/{id}', name: 'Tenant details', mimeType: 'application/json' },
            { uri: 'pitaya://agents', name: 'List agents', mimeType: 'application/json' },
            { uri: 'pitaya://conversations', name: 'Active conversations', mimeType: 'application/json' },
            { uri: 'pitaya://conversations/{id}', name: 'Conversation messages', mimeType: 'application/json' },
            { uri: 'pitaya://channels', name: 'Communication channels', mimeType: 'application/json' },
            { uri: 'pitaya://channels/{id}', name: 'Channel detail', mimeType: 'application/json' },
            { uri: 'pitaya://skills', name: 'Skills list', mimeType: 'application/json' },
            { uri: 'pitaya://analytics/dashboard', name: 'Dashboard KPIs', mimeType: 'application/json' },
        ],
    }));
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const uri = request.params.uri;
        let data;
        if (uri === 'pitaya://tenants') {
            data = await api.get('/api/tenants');
        }
        else if (uri === 'pitaya://agents') {
            data = await api.get('/api/agents');
        }
        else if (uri === 'pitaya://conversations') {
            data = await api.get('/api/agent-inbox/conversations');
        }
        else if (uri === 'pitaya://channels') {
            data = await api.get('/api/communication/channels');
        }
        else if (uri === 'pitaya://skills') {
            data = await api.get('/api/skills');
        }
        else if (uri === 'pitaya://analytics/dashboard') {
            data = await api.get('/api/analytics/dashboard');
        }
        else if (uri.startsWith('pitaya://tenants/')) {
            const id = uri.replace('pitaya://tenants/', '');
            data = await api.get(`/api/tenants/${id}`);
        }
        else if (uri.startsWith('pitaya://conversations/')) {
            const id = uri.replace('pitaya://conversations/', '');
            const messages = await api.get(`/api/agent-inbox/conversations/${id}/messages`);
            data = { id, messages };
        }
        else if (uri.startsWith('pitaya://channels/')) {
            const id = uri.replace('pitaya://channels/', '');
            data = await api.get(`/api/communication/channels/${id}`);
        }
        else {
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
//# sourceMappingURL=index.js.map