import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Injectable()
export class WorkersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const tenantId = getTenantId();
    return this.db.mysql.worker.findMany({ where: { tenantId } });
  }

  async heartbeat(workerId: string, status: string, health: string) {
    const tenantId = getTenantId();
    return this.db.mysql.worker.update({
      where: { id: workerId },
      data: { status, health, lastHeartbeat: new Date() },
    });
  }

  async create(data: any) {
    const tenantId = getTenantId();
    return this.db.mysql.worker.create({
      data: {
        ...data,
        tenantId,
        status: 'OFFLINE',
        health: 'UNKNOWN',
        version: '1.0.0'
      }
    });
  }
}
