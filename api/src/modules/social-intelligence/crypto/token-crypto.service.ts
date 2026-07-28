import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

/**
 * AES-256-GCM encryption for connector access tokens at rest.
 *
 * The key is derived (SHA-256) from the `SIS_TOKEN_ENC_KEY` env var, so it is
 * always 32 bytes regardless of the raw key length. Stored payload layout,
 * base64-encoded: [ 12-byte IV | 16-byte auth tag | ciphertext ].
 *
 * A versioned prefix (`v1:`) is kept so the scheme can evolve without breaking
 * previously-stored values.
 */
@Injectable()
export class TokenCryptoService {
  private readonly logger = new Logger(TokenCryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12;
  private readonly prefix = 'v1:';

  constructor(private readonly configService: ConfigService) {}

  private getKey(): Buffer {
    const raw = this.configService.get<string>('SIS_TOKEN_ENC_KEY');
    if (!raw) {
      throw new Error(
        'SIS_TOKEN_ENC_KEY is not configured — cannot encrypt/decrypt social connector tokens.',
      );
    }
    return createHash('sha256').update(raw).digest();
  }

  encrypt(plaintext: string): string {
    const key = this.getKey();
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, authTag, encrypted]).toString('base64');
    return `${this.prefix}${payload}`;
  }

  decrypt(stored: string): string {
    const key = this.getKey();
    const payload = stored.startsWith(this.prefix)
      ? stored.slice(this.prefix.length)
      : stored;
    const buffer = Buffer.from(payload, 'base64');
    const iv = buffer.subarray(0, this.ivLength);
    const authTag = buffer.subarray(this.ivLength, this.ivLength + 16);
    const ciphertext = buffer.subarray(this.ivLength + 16);
    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  /** True if a stored value uses this service's versioned format. */
  isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(this.prefix);
  }
}
