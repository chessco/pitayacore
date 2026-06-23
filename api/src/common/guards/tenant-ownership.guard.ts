import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const paramsTenantId = request.params.tenantId;
    const headerTenantId = request.headers['x-tenant-id'];
    const userRole = request.headers['x-user-role']?.toUpperCase();

    if (!paramsTenantId) {
        return true; // No tenant context in URL, let other guards handle
    }

    // SYSTEM or ADMIN can bypass ownership check for operational purposes if needed,
    // though ideally they should also assume a tenant context.
    // For now, we enforce that if you are acting on a tenant resource via URL,
    // your context (header) must match the URL unless you are SYSTEM.
    if (userRole === 'SYSTEM') {
        return true;
    }

    if (paramsTenantId !== headerTenantId) {
      throw new ForbiddenException('You do not have permission to access resources for this tenant.');
    }

    return true;
  }
}
