import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class SystemSettingsService {
  constructor(private db: DatabaseService) {}

  async getSetting(key: string): Promise<string | null> {
    const setting = await this.db.mysql.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value || null;
  }

  async updateSetting(key: string, value: string): Promise<void> {
    await this.db.mysql.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
