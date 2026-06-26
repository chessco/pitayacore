import { IStorageProvider } from './storage.provider.interface';
import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class R2StorageProvider implements IStorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || 'vision';
    this.publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-eae10fe69e894fbfbde5fcfdfdf73ed5.r2.dev';

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async uploadFile(
    path: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const filename = `${path}/${randomUUID()}.${mimeType.split('/')[1] || 'png'}`;
    this.logger.log(`Uploading ${filename} to R2...`);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);

      const url = `${this.publicUrl}/${filename}`;
      this.logger.log(`Uploaded to: ${url}`);
      return url;
    } catch (error) {
      this.logger.error('Error uploading to R2', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const key = path.replace(`${this.publicUrl}/`, '');
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      this.logger.log(`Deleted from R2: ${key}`);
    } catch (error) {
      this.logger.error('Error deleting from R2', error);
    }
  }

  async getFileUrl(path: string): Promise<string> {
    return `${this.publicUrl}/${path}`;
  }
}
