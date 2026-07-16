import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Inbox } from './Inbox';
import { TenantProvider } from '../../contexts/TenantContext';

// Mock global fetch
window.fetch = vi.fn();

// Mock Socket.io
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

const jsonResponse = (data: any) => ({ ok: true, json: async () => data });

/**
 * URL-aware fetch mock. The Inbox mounts several independent requests
 * (agents, conversations, message history, AI analysis) whose order is an
 * implementation detail, so we route by URL instead of relying on the call
 * sequence. Tests pass a map of conversations/messages to control the data.
 */
const installFetchMock = (options: {
  conversations?: any[];
  messages?: any[];
} = {}) => {
  const { conversations = [], messages = [] } = options;
  (window.fetch as any).mockImplementation((url: string, init?: any) => {
    // Order matters: check the most specific paths first.
    if (url.includes('/messages')) {
      // Sending a message is a POST; fetching history is a GET.
      if (init?.method === 'POST') return Promise.resolve(jsonResponse({ success: true }));
      return Promise.resolve(jsonResponse(messages));
    }
    if (url.includes('/api/agents')) return Promise.resolve(jsonResponse([]));
    if (url.includes('/api/agent-inbox/conversations')) return Promise.resolve(jsonResponse(conversations));
    if (url.includes('/api/ai/analyze-conversation')) return Promise.resolve(jsonResponse({}));
    return Promise.resolve(jsonResponse([]));
  });
};

describe('Inbox Component Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('flowApiKey', 'test_api_key_2026');
    localStorage.setItem('flowUrl', 'http://localhost:3003');
  });

  it('sends the correct x-api-key and x-tenant-id headers when fetching conversations', async () => {
    installFetchMock();

    render(
      <TenantProvider>
        <Inbox setActiveTab={() => {}} />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/agent-inbox/conversations'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test_api_key_2026',
            'x-tenant-id': 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718'
          })
        })
      );
    });
  });

  it('sends a message with correct headers and body', async () => {
    installFetchMock({
      conversations: [{ id: 'conv_1', contact: { phoneNumber: '123' }, messages: [] }],
      messages: [],
    });

    const { container } = render(
      <TenantProvider>
        <Inbox setActiveTab={() => {}} />
      </TenantProvider>
    );

    // Wait for conversations to load and select one
    const contacts = await screen.findAllByText('123');
    fireEvent.click(contacts[0]);

    // Type and send
    const input = screen.getByPlaceholderText(/Escribe un mensaje/i);
    fireEvent.change(input, { target: { value: 'Hello Flow' } });

    const sendButton = container.querySelector('.lucide-send')!.closest('button');
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Hello Flow' }),
          headers: expect.objectContaining({
            'x-api-key': 'test_api_key_2026',
            'x-tenant-id': 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718'
          })
        })
      );
    });
  });
});
