import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';

@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get(':key')
  async getSetting(@Param('key') key: string, @Req() req: any) {
    if (req.user?.role !== 'SYSTEM' && req.user?.role !== 'ADMIN') {
      throw new UnauthorizedException('Requires SYSTEM or ADMIN role');
    }
    const value = await this.systemSettingsService.getSetting(key);
    return { key, value };
  }

  @Patch(':key')
  async updateSetting(
    @Param('key') key: string,
    @Body('value') value: string,
    @Req() req: any,
  ) {
    if (req.user?.role !== 'SYSTEM' && req.user?.role !== 'ADMIN') {
      throw new UnauthorizedException('Requires SYSTEM or ADMIN role');
    }
    await this.systemSettingsService.updateSetting(key, value);
    return { success: true, key, value };
  }
}
