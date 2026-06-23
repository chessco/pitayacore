import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.get<string>(
      'feature',
      context.getHandler(),
    );
    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Bypass for ADMIN and SYSTEM
    if (user?.role === 'SYSTEM' || user?.role === 'ADMIN') {
      return true;
    }

    const tenantId = user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const featureFlag = await this.db.mysql.tenantFeature.findUnique({
      where: {
        tenantId_featureId: {
          tenantId,
          featureId: requiredFeature,
        },
      },
      include: { feature: true },
    });

    if (!featureFlag || !featureFlag.enabled) {
      const featureByName = await this.db.mysql.feature.findUnique({
        where: { name: requiredFeature },
      });
      if (featureByName) {
        const flagByName = await this.db.mysql.tenantFeature.findUnique({
          where: {
            tenantId_featureId: { tenantId, featureId: featureByName.id },
          },
        });
        if (flagByName?.enabled) return true;
      }

      throw new ForbiddenException(
        `Feature '${requiredFeature}' is not enabled for this tenant`,
      );
    }

    return true;
  }
}
