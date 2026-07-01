export interface SessionStorageProvider {
  /**
   * Returns the absolute path where session data should be stored.
   * For filesystem-based storage, this will be passed as `dataPath` to WhatsApp LocalAuth.
   */
  getSessionDataPath(tenantId: string, provider: string): string;
}