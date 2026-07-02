import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(private readonly db: DatabaseService) {}

  async createChannel(
    tenantId: string,
    data: { name: string; provider: string; configuration?: any },
  ) {
    this.logger.log(`Creating channel ${data.name} for tenant ${tenantId}`);
    return this.db.mysql.channel.create({
      data: {
        tenantId,
        name: data.name,
        provider: data.provider,
        status: 'DISCONNECTED',
        configuration: data.configuration || {},
      },
    });
  }

  async getChannels(tenantId: string) {
    return this.db.mysql.channel.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async getChannel(tenantId: string, id: string) {
    const channel = await this.db.mysql.channel.findFirst({
      where: { id, tenantId },
    });
    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }
    return channel;
  }

  async updateChannel(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      defaultAgentId?: string | null;
      configuration?: any;
    },
  ) {
    const channel = await this.getChannel(tenantId, id);

    // Merge configuration if provided
    let newConfig = channel.configuration;
    if (data.configuration) {
      newConfig = {
        ...(typeof channel.configuration === 'object'
          ? channel.configuration
          : {}),
        ...data.configuration,
      };
    }

    return this.db.mysql.channel.update({
      where: { id: channel.id },
      data: {
        name: data.name,
        defaultAgentId: data.defaultAgentId,
        configuration: newConfig,
      },
    });
  }

  async updateChannelStatus(tenantId: string, id: string, status: string) {
    return this.db.mysql.channel.update({
      where: { id, tenantId },
      data: { status },
    });
  }

  async deleteChannel(tenantId: string, id: string) {
    const channel = await this.getChannel(tenantId, id);
    await this.db.mysql.channel.delete({
      where: { id: channel.id },
    });
    return { success: true };
  }
}
