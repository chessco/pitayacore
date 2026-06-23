import { IStorageProvider } from './storage.provider.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class R2StorageProvider implements IStorageProvider {
  async uploadFile(
    path: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    // Stub for R2 integration
    console.log(`[R2] Uploading to ${path} (${mimeType})`);
    return `https://r2.pitayacode.io/${path}`;
  }

  async deleteFile(path: string): Promise<void> {
    console.log(`[R2] Deleting ${path}`);
  }

  async getFileUrl(path: string): Promise<string> {
    return `https://r2.pitayacode.io/${path}`;
  }
}
