import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionStorageProvider } from './session-storage-provider.interface';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FilesystemSessionStorageProvider implements SessionStorageProvider {
  private readonly logger = new Logger(FilesystemSessionStorageProvider.name);
  private readonly baseStoragePath: string;

  constructor(private readonly configService: ConfigService) {
    // Read base storage path from env, fallback to a local .storage folder
    this.baseStoragePath = this.configService.get<string>(
      'STORAGE_PATH',
      path.join(process.cwd(), '.storage'),
    );
  }

  getSessionDataPath(tenantId: string, provider: string): string {
    const sessionPath = path.join(
      this.baseStoragePath,
      provider,
      `tenant_${tenantId}`,
      `${provider}-web`,
    );

    // Ensure directory exists
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
      this.logger.debug(`Created session storage directory: ${sessionPath}`);
    }

    return sessionPath;
  }
}
