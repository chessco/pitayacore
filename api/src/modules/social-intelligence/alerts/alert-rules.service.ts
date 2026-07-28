import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/mysql-client';
import { DatabaseService } from '../../../common/database/database.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert-rule.dto';

/** CRUD for configurable alert rules. Tenant-scoped. */
@Injectable()
export class AlertRulesService {
  constructor(private readonly db: DatabaseService) {}

  create(tenantId: string, dto: CreateAlertRuleDto) {
    return this.db.mysql.socialAlertRule.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        params: (dto.params ?? {}) as Prisma.InputJsonValue,
        enabled: dto.enabled ?? true,
      },
    });
  }

  findAll(tenantId: string) {
    return this.db.mysql.socialAlertRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const rule = await this.db.mysql.socialAlertRule.findFirst({
      where: { id, tenantId },
    });
    if (!rule) throw new NotFoundException('Alert rule not found');
    return rule;
  }

  async update(tenantId: string, id: string, dto: UpdateAlertRuleDto) {
    await this.findOne(tenantId, id);
    return this.db.mysql.socialAlertRule.update({
      where: { id },
      data: {
        name: dto.name,
        enabled: dto.enabled,
        params:
          dto.params !== undefined
            ? (dto.params as Prisma.InputJsonValue)
            : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.db.mysql.socialAlertRule.delete({ where: { id } });
    return { deleted: true };
  }
}
