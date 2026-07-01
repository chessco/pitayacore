import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('communication/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  create(@Body() data: { name: string; provider: string; configuration?: any }) {
    const tenantId = getTenantId();
    return this.channelsService.createChannel(tenantId, data);
  }

  @Get()
  findAll() {
    const tenantId = getTenantId();
    return this.channelsService.getChannels(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.channelsService.getChannel(tenantId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: { name?: string; defaultAgentId?: string | null; configuration?: any }
  ) {
    const tenantId = getTenantId();
    return this.channelsService.updateChannel(tenantId, id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.channelsService.deleteChannel(tenantId, id);
  }
}
