import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../../common/database/database.service';

export interface AlertQuery {
  status?: string;
  severity?: string;
  limit?: number;
}

/** Read + lifecycle management for generated alerts. Tenant-scoped. */
@Injectable()
export class AlertsService {
  constructor(private readonly db: DatabaseService) {}

  list(tenantId: string, query: AlertQuery) {
    return this.db.mysql.socialAlert.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.limit ?? 50, 200),
    });
  }

  async get(tenantId: string, id: string) {
    const alert = await this.db.mysql.socialAlert.findFirst({
      where: { id, tenantId },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.get(tenantId, id);
    return this.db.mysql.socialAlert.update({
      where: { id },
      data: { status },
    });
  }
}
