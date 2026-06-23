import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class TenantsService {
  constructor(private db: DatabaseService) {}

  async create(data: { name: string; plan?: 'FREE' | 'PRO' | 'ENTERPRISE' }) {
    return this.db.mysql.tenant.create({
      data: {
        name: data.name,
        plan: data.plan || 'FREE',
      },
    });
  }

  async findAll() {
    const tenants = await this.db.mysql.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const tenantsWithConsumption = await Promise.all(
      tenants.map(async (tenant) => {
        const consumption = await this.db.mysql.aiCostLog.aggregate({
          where: {
            tenantId: tenant.id,
            createdAt: { gte: firstDayOfMonth },
          },
          _sum: {
            tokensIn: true,
            tokensOut: true,
            costUsd: true,
          },
        });

        return {
          ...tenant,
          consumption: {
            totalTokens:
              (consumption._sum.tokensIn || 0) +
              (consumption._sum.tokensOut || 0),
            totalCost: consumption._sum.costUsd || 0,
            period: firstDayOfMonth.toISOString(),
          },
        };
      }),
    );

    return tenantsWithConsumption;
  }

  async getTenantConsumption(id: string) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const breakdown = await this.db.mysql.aiCostLog.groupBy({
      by: ['model'],
      where: {
        tenantId: id,
        createdAt: { gte: firstDayOfMonth },
      },
      _sum: {
        tokensIn: true,
        tokensOut: true,
        costUsd: true,
      },
    });

    return breakdown;
  }

  async findOne(id: string) {
    return this.db.mysql.tenant.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: any) {
    // If we are setting this tenant as default, reset others first
    if (data.isDefault === true) {
      await (this.db.mysql.tenant as any).updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }

    return (this.db.mysql.tenant as any).update({
      where: { id },
      data: {
        name: data.name,
        plan:
          data.plan?.toUpperCase() === 'ENTERPRISE'
            ? 'ENTERPRISE'
            : data.plan?.toUpperCase() === 'SCALE'
              ? 'PRO'
              : data.plan?.toUpperCase() === 'STARTER'
                ? 'FREE'
                : data.plan?.toUpperCase(),
        status:
          data.status?.toLowerCase() === 'active' ||
          data.status?.toLowerCase() === 'activo'
            ? 'ACTIVE'
            : data.status?.toLowerCase() === 'suspended' ||
                data.status?.toLowerCase() === 'suspendido'
              ? 'SUSPENDED'
              : 'ACTIVE',
        isDefault: data.isDefault,
        enabledModules: data.enabledModules,
        brandingConfig: data.brandingConfig,
      },
    });
  }

  async getGlobalAnalytics() {
    const [tenantCount, capsuleCount, leadCount, campaignStats] =
      await Promise.all([
        this.db.mysql.tenant.count(),
        this.db.mysql.capsule.count(),
        this.db.mysql.lead.count(),
        this.db.mysql.campaign.aggregate({
          _sum: {
            opensCount: true,
            clicksCount: true,
          },
        }),
      ]);

    const topTenants = await this.db.mysql.tenant.findMany({
      take: 5,
      include: {
        _count: {
          select: { capsules: true, users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const recentEvents = await this.db.mysql.campaignEvent.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: { name: true },
        },
      },
    });

    return {
      stats: {
        tenants: tenantCount,
        capsules: capsuleCount,
        leads: leadCount,
        opens: campaignStats._sum.opensCount || 0,
        clicks: campaignStats._sum.clicksCount || 0,
      },
      topTenants,
      recentEvents,
    };
  }
}
