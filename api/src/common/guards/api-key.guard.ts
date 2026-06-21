import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.headers['x-internal-key'];
    const tenantId = request.headers['x-tenant-id'];

    const validApiKey = this.configService.get<string>('INTERNAL_API_KEY');

    if (apiKey && apiKey === validApiKey) {
      // Mock a system user for the request if authenticated via API key
      request.user = {
        userId: 'system-api',
        email: 'system@pitayacore.ai',
        role: 'SYSTEM',
        tenantId: tenantId // Pass the tenant ID from header
      };
      return true;
    }

    return false;
  }
}
