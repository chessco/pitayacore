import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Injectable()
export class JobsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const tenantId = getTenantId();
    return this.db.mysql.job.findMany({ 
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: any) {
    const tenantId = getTenantId();
    return this.db.mysql.job.create({
      data: {
        ...data,
        tenantId,
        status: 'PENDING'
      }
    });
  }
}
