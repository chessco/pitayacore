import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyGuard } from './api-key.guard';
import { IS_PUBLIC_KEY } from './public.decorator';
import { firstValueFrom, isObservable } from 'rxjs';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  private readonly logger = new Logger(CombinedAuthGuard.name);
  private jwtGuard: CanActivate;

  constructor(
    private readonly apiKeyGuard: ApiKeyGuard,
    private readonly reflector: Reflector,
  ) {
    const JwtGuardClass = AuthGuard('jwt');
    this.jwtGuard = new JwtGuardClass();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const url = request.url;

    // 0. Special bypass for main admin via headers (highest priority)
    const xUserRole = request.headers['x-user-role'];
    if (xUserRole === 'ADMIN' || xUserRole === 'SYSTEM') {
      // Importante: Adjuntar un objeto de usuario mínimo para que los controladores no fallen
      request.user = {
        role: xUserRole,
        tenantId:
          request.headers['x-tenant-id'] ||
          'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
        email: 'system@pitayacode.io',
      };
      console.log('BYPASS AUTH:', {
        url,
        role: xUserRole,
        tenantId: request.user.tenantId,
      });
      return true;
    }

    // 1. Try API Key authentication first
    try {
      const isApiKeyValid = await this.apiKeyGuard.canActivate(context);
      if (isApiKeyValid) {
        this.logger.debug(`Authenticated via API Key for ${url}`);
        return true;
      }
    } catch (error) {
      this.logger.error(`API Key validation error: ${error.message}`);
    }

    // 2. Try JWT authentication
    try {
      const result = this.jwtGuard.canActivate(context);

      let canActivateJwt: boolean;
      if (typeof result === 'boolean') {
        canActivateJwt = result;
      } else if (isObservable(result)) {
        canActivateJwt = await firstValueFrom(result);
      } else {
        canActivateJwt = await result;
      }

      if (!canActivateJwt) {
        this.logger.warn(`JWT validation failed for ${url} (returned false)`);
        throw new UnauthorizedException('Authentication failed');
      }

      this.logger.debug(
        `Authenticated via JWT for ${url}. User: ${request.user ? request.user.email : 'MISSING'}`,
      );
      return true;
    } catch (error) {
      const authHeader = request.headers['authorization'];
      this.logger.warn(
        `JWT validation failed for ${url}: ${error.message}. Auth Header: ${authHeader ? 'Present' : 'Missing'}`,
      );
      throw error;
    }
  }
}
