import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class WhiteLabelService {
  constructor(private readonly db: DatabaseService) {}

  async findByTenant(tenantId: string) {
    return this.db.mysql.whiteLabel.findUnique({
      where: { tenantId },
    });
  }

  async updateOrCreate(tenantId: string, data: any) {
    const existing = await this.findByTenant(tenantId);
    if (existing) {
      return this.db.mysql.whiteLabel.update({
        where: { tenantId },
        data,
      });
    }

    return this.db.mysql.whiteLabel.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async getCombinedConfig(tenantId: string) {
    const whiteLabel = await this.findByTenant(tenantId);

    // Find active theme for this tenant
    const activeTheme = await this.db.mysql.theme.findFirst({
      where: { tenantId, isDefault: true },
      include: { tokens: true, assets: true },
    });

    return {
      whiteLabel: whiteLabel || {
        appName: 'PitayaCore AI',
        companyName: 'PitayaCode',
        logo: null,
        favicon: null,
        defaultLanguage: 'es',
        defaultMode: 'LIGHT',
      },
      activeTheme: activeTheme || {
        name: 'Default Pitaya Theme',
        mode: 'LIGHT',
        tokens: [
          { name: 'primary', value: '#003B71', type: 'color' },
          { name: 'primary-light', value: '#005EB8', type: 'color' },
          { name: 'primary-dark', value: '#002548', type: 'color' },
          { name: 'secondary', value: '#EAAA00', type: 'color' },
          { name: 'accent', value: '#EAAA00', type: 'color' },
          { name: 'background', value: '#F4F5F7', type: 'color' },
          { name: 'surface', value: '#FFFFFF', type: 'color' },
          { name: 'text-primary', value: '#0F172A', type: 'color' },
          { name: 'text-secondary', value: '#475569', type: 'color' },
          { name: 'border', value: '#E2E8F0', type: 'color' },
          { name: 'radius', value: '12px', type: 'radius' },
          { name: 'spacing', value: '16px', type: 'spacing' },
        ],
      },
    };
  }
}
