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
      data: {
        status,
        health: typeof health === 'string' ? health : JSON.stringify(health),
        lastHeartbeat: new Date(),
      },
    });
  }

  async findOne(id: string) {
    const tenantId = getTenantId();
    return this.db.mysql.worker.findFirst({ where: { id, tenantId } });
  }

  async create(data: any) {
    const tenantId = getTenantId();
    return this.db.mysql.worker.create({
      data: {
        name: data.name,
        type: data.workerType || data.type || 'WINDOWS_NATIVE',
        tenantId,
        status: 'OFFLINE',
        version: data.version || '1.0.0',
      },
    });
  }

  async update(id: string, data: any) {
    return this.db.mysql.worker.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.workerType && { type: data.workerType }),
        ...(data.version && { version: data.version }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  async remove(id: string) {
    const tenantId = getTenantId();
    return this.db.mysql.worker.deleteMany({
      where: { id, tenantId },
    });
  }
}
