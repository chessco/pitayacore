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

  async getMany(keys: string[]): Promise<Record<string, string>> {
    try {
      const settings = await this.db.mysql.systemSetting.findMany({
        where: { key: { in: keys } },
      });
      const map: Record<string, string> = {};
      for (const s of settings) {
        map[s.key] = s.value;
      }
      return map;
    } catch {
      return {};
    }
  }

  async updateMany(entries: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      if (value !== undefined && value !== null) {
        await this.updateSetting(key, value);
      }
    }
  }
}
