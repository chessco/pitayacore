import { ConfigService } from '@nestjs/config';
import { TokenCryptoService } from './token-crypto.service';

const configWith = (key?: string): ConfigService =>
  ({ get: () => key }) as unknown as ConfigService;

describe('TokenCryptoService', () => {
  it('round-trips a token', () => {
    const service = new TokenCryptoService(configWith('unit-test-key'));
    const token = 'EAAG-super-secret-page-token';
    const encrypted = service.encrypt(token);
    expect(encrypted).not.toContain(token);
    expect(service.isEncrypted(encrypted)).toBe(true);
    expect(service.decrypt(encrypted)).toBe(token);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const service = new TokenCryptoService(configWith('unit-test-key'));
    expect(service.encrypt('same')).not.toBe(service.encrypt('same'));
  });

  it('throws when the encryption key is missing', () => {
    const service = new TokenCryptoService(configWith(undefined));
    expect(() => service.encrypt('x')).toThrow(/SIS_TOKEN_ENC_KEY/);
  });
});
