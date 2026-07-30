import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { ConnectorAccountsService } from './connector-accounts.service';
import { ConnectorRegistry } from './connector-registry.service';
import { CollectorService } from '../collection/collector.service';
import { CreateConnectorDto, UpdateConnectorDto } from './dto/connector.dto';

/**
 * Connector account management + collection triggers.
 * Tenant is resolved from the `x-tenant-id` header via AsyncLocalStorage,
 * matching the dominant PitayaCore convention.
 */
@Controller('social-intelligence/connectors')
export class ConnectorsController {
  constructor(
    private readonly accounts: ConnectorAccountsService,
    private readonly collector: CollectorService,
    private readonly registry: ConnectorRegistry,
  ) {}

  /** List the source types that currently have a connector implementation. */
  @Get('supported')
  supported() {
    return { supported: this.registry.supported() };
  }

  @Post()
  create(@Body() dto: CreateConnectorDto) {
    return this.accounts.create(getTenantId(), dto);
  }

  @Get()
  findAll() {
    return this.accounts.findAll(getTenantId());
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accounts.findOne(getTenantId(), id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConnectorDto) {
    return this.accounts.update(getTenantId(), id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accounts.remove(getTenantId(), id);
  }

  /** Validate stored credentials against the provider without collecting. */
  @Post(':id/verify')
  verify(@Param('id') id: string) {
    return this.collector.verifyConnector(getTenantId(), id);
  }

  /** Manually trigger a collection run for this connector. */
  @Post(':id/collect')
  collect(@Param('id') id: string) {
    return this.collector.collectForConnector(getTenantId(), id);
  }
}
