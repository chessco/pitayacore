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

  async heartbeat(workerId: string, status: string, health: any) {
    return this.db.mysql.worker.updateMany({
      where: { id: workerId },
      data: { status, health: typeof health === 'string' ? health : JSON.stringify(health), lastHeartbeat: new Date() },
    });
  }

  async create(data: any) {
    const tenantId = getTenantId();
    return this.db.mysql.worker.create({
      data: {
        name: data.name,
        type: data.workerType || 'WINDOWS_NATIVE',
        tenantId,
        status: 'OFFLINE',
        version: '1.0.0'
      }
    });
  }
}
