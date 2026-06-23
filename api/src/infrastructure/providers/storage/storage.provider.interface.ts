export interface IStorageProvider {
  uploadFile(path: string, buffer: Buffer, mimeType: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
}
