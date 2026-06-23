import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AssetsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(tenantId: string) {
    const assets = await this.db.mysql.asset.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return assets.map((a) => {
      const meta: any = a.metadata ? JSON.parse(a.metadata as string) : {};
      return {
        id: a.id,
        type: a.type,
        title: a.name,
        url: a.storagePath,
        dimensions: meta.dimensions || '1024x1024',
        createdAt: a.createdAt,
      };
    });
  }

  async delete(tenantId: string, id: string) {
    return this.db.mysql.asset.delete({
      where: { id, tenantId },
    });
  }
}
