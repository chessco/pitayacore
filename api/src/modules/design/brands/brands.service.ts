import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class BrandsService {
  constructor(private readonly db: DatabaseService) {}

  async findByTenant(tenantId: string) {
    return this.db.mysql.brand.findMany({
      where: { tenantId },
      include: { themes: true },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.db.mysql.brand.findFirst({
      where: { id, tenantId },
      include: { themes: true },
    });
  }

  async create(tenantId: string, data: any) {
    return this.db.mysql.brand.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    return this.db.mysql.brand.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async delete(id: string, tenantId: string) {
    return this.db.mysql.brand.deleteMany({
      where: { id, tenantId },
    });
  }
}
