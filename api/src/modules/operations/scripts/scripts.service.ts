import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Injectable()
export class ScriptsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const tenantId = getTenantId();
    return this.db.mysql.script.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any) {
    const tenantId = getTenantId();
    return this.db.mysql.script.create({
      data: {
        name: data.name,
        language: data.language || 'NODEJS',
        content: data.content || '',
        tenantId,
        version: '1.0',
      },
    });
  }

  async findOne(id: string) {
    return this.db.mysql.script.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return this.db.mysql.script.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.language && { language: data.language }),
      },
    });
  }
}
