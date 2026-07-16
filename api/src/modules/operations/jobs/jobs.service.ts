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
    let plan = {};
    if (data.executionPlan) {
      plan = typeof data.executionPlan === 'string' ? JSON.parse(data.executionPlan) : data.executionPlan;
    } else if (data.payload) {
      plan = JSON.parse(data.payload);
    }
    return this.db.mysql.job.create({
      data: {
        name: data.name,
        category: data.jobType || 'SCRAPING',
        tenantId,
        version: '1.0',
        executionPlan: plan
      }
    });
  }
}
