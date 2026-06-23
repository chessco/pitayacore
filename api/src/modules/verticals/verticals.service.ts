import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class VerticalsService {
  constructor(private prisma: DatabaseService) {}

  async findAll() {
    return this.prisma.mysql.vertical.findMany({
      where: { status: 'ACTIVE' },
    });
  }

  async findBySlug(slug: string) {
    const vertical = await this.prisma.mysql.vertical.findUnique({
      where: { slug },
    });
    if (!vertical) {
      throw new NotFoundException(`Vertical ${slug} not found`);
    }
    return vertical;
  }

  async findTenantVerticals(tenantId: string) {
    const tenantVerticals = await this.prisma.mysql.tenantVertical.findMany({
      where: { tenantId },
      include: { vertical: true },
    });
    return tenantVerticals.map(tv => tv.vertical);
  }

  async assignVerticalToTenant(tenantId: string, verticalId: string) {
    return this.prisma.mysql.tenantVertical.upsert({
      where: {
        tenantId_verticalId: { tenantId, verticalId },
      },
      update: {},
      create: {
        tenantId,
        verticalId,
      },
    });
  }
}


