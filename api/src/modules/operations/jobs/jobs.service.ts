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

  async findActiveCronJobs(tenantId: string) {
    return this.db.mysql.job.findMany({
      where: {
        tenantId,
        isActive: true,
        cronExpression: { not: null }
      }
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
        executionPlan: plan,
        cronExpression: data.cronExpression || null
      }
    });
  }

  async update(id: string, data: any) {
    const tenantId = getTenantId();
    return this.db.mysql.job.update({
      where: { id, tenantId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.jobType && { category: data.jobType }),
        ...(data.cronExpression !== undefined && { cronExpression: data.cronExpression || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });
  }

  async remove(id: string) {
    const tenantId = getTenantId();
    // Delete related executions first
    await this.db.mysql.jobExecution.deleteMany({
      where: { jobId: id, tenantId }
    });
    return this.db.mysql.job.delete({
      where: { id, tenantId }
    });
  }

  async updateLastRun(id: string) {
    return this.db.mysql.job.update({
      where: { id },
      data: { lastRunAt: new Date() }
    });
  }
}
