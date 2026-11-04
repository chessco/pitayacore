import { WhatsappWebProvider } from './whatsapp-web.provider';
import { MessageMedia } from 'whatsapp-web.js';

jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn(),
  LocalAuth: jest.fn(),
  MessageMedia: { fromUrl: jest.fn() },
}));

describe('WhatsappWebProvider outgoing messages', () => {
  const tenantId = 'tenant-1';
  const channelId = 'channel-1';
  const key = `${tenantId}:${channelId}`;
  let provider: WhatsappWebProvider;

  const makeClient = () => ({
    getNumberId: jest.fn(),
    sendMessage: jest.fn(),
  });

  const registerClient = (client: ReturnType<typeof makeClient>) => {
    (provider as any).clients.set(key, client);
  };

  beforeEach(() => {
    provider = new WhatsappWebProvider(
      { getSessionDataPath: jest.fn() } as any,
      { publish: jest.fn() } as any,
    );
    jest.clearAllMocks();
  });

  it('fails clearly when the channel is not connected', async () => {
    await expect(
      provider.sendMessage(tenantId, channelId, '6442221844', 'Hola'),
    ).rejects.toThrow('No active WhatsApp client');
  });

  it('rejects a recipient without digits before calling WhatsApp', async () => {
    const client = makeClient();
    registerClient(client);

    await expect(
      provider.sendMessage(tenantId, channelId, 'sin-numero', 'Hola'),
    ).rejects.toThrow('Número de teléfono inválido');
    expect(client.getNumberId).not.toHaveBeenCalled();
  });

  it('normalizes a Mexican number and accepts the message without waiting for a late acknowledgement', async () => {
    const client = makeClient();
    client.getNumberId.mockResolvedValue({ _serialized: '203396917276682@lid' });
    client.sendMessage.mockResolvedValue({
      id: { _serialized: 'message-1' },
      to: '203396917276682@lid',
    });
    registerClient(client);

    await expect(
      provider.sendMessage(tenantId, channelId, '6442221844', 'Hola'),
    ).resolves.toEqual({
      id: { _serialized: 'message-1' },
      to: '203396917276682@lid',
      accepted: true,
    });
    expect(client.getNumberId).toHaveBeenCalledWith('526442221844');
    expect(client.sendMessage).toHaveBeenCalledWith('203396917276682@lid', 'Hola');
  });

  it('tries the legacy Mexican prefix if the current prefix is not resolved', async () => {
    const client = makeClient();
    client.getNumberId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _serialized: 'legacy@c.us' });
    client.sendMessage.mockResolvedValue({ id: { _serialized: 'message-2' }, to: 'legacy@c.us' });
    registerClient(client);

    await provider.sendMessage(tenantId, channelId, '6442221844', 'Hola');

    expect(client.getNumberId).toHaveBeenNthCalledWith(1, '526442221844');
    expect(client.getNumberId).toHaveBeenNthCalledWith(2, '5216442221844');
  });

  it('reports an unregistered number and does not send a message', async () => {
    const client = makeClient();
    client.getNumberId.mockResolvedValue(null);
    registerClient(client);

    await expect(
      provider.sendMessage(tenantId, channelId, '6442221844', 'Hola'),
    ).rejects.toThrow('no está registrado en WhatsApp');
    expect(client.sendMessage).not.toHaveBeenCalled();
  });

  it('propagates a real provider failure so the caller can notify the user', async () => {
    const client = makeClient();
    client.getNumberId.mockResolvedValue({ _serialized: 'client@lid' });
    client.sendMessage.mockRejectedValue(new Error('WhatsApp Web disconnected'));
    registerClient(client);

    await expect(
      provider.sendMessage(tenantId, channelId, '6442221844', 'Hola'),
    ).rejects.toThrow('WhatsApp Web disconnected');
  });

  it('fails media sends without an image before trying WhatsApp', async () => {
    const client = makeClient();
    registerClient(client);

    await expect(
      provider.sendMedia(tenantId, channelId, '6442221844', {}),
    ).rejects.toThrow('No image provided');
  });

  it('sends native media with its caption and reports acceptance', async () => {
    const client = makeClient();
    const media = { mimetype: 'image/png' };
    (MessageMedia.fromUrl as jest.Mock).mockResolvedValue(media);
    client.getNumberId.mockResolvedValue({ _serialized: 'client@lid' });
    client.sendMessage.mockResolvedValue({ id: { _serialized: 'image-1' }, to: 'client@lid' });
    registerClient(client);

    await expect(
      provider.sendMedia(tenantId, channelId, '6442221844', {
        imageUrl: 'https://example.test/qr.png',
        caption: 'Tu orden',
      }),
    ).resolves.toEqual({ id: { _serialized: 'image-1' }, to: 'client@lid', accepted: true });
    expect(client.sendMessage).toHaveBeenCalledWith('client@lid', media, { caption: 'Tu orden' });
  });
});
