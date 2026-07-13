export interface SocialProvider {
  authenticate(
    tenantId: string,
  ): Promise<{ success: boolean; url?: string; token?: string }>;
  publish(
    tenantId: string,
    content: string,
    mediaUrls: string[],
    metadata?: any,
  ): Promise<{
    success: boolean;
    externalId?: string;
    url?: string;
    error?: string;
  }>;
  schedule(
    tenantId: string,
    content: string,
    mediaUrls: string[],
    scheduledAt: Date,
    metadata?: any,
  ): Promise<{ success: boolean; externalId?: string; error?: string }>;
  delete(
    tenantId: string,
    externalId: string,
  ): Promise<{ success: boolean; error?: string }>;
  metrics(tenantId: string, externalId: string): Promise<any>;
  comments(tenantId: string, externalId: string): Promise<any[]>;
  reactions(tenantId: string, externalId: string): Promise<any>;
  analytics(tenantId: string, startDate: Date, endDate: Date): Promise<any>;
}
