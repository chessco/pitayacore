import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { CapsulesService } from './capsules.service';
import { CreateCapsuleDto } from './dto/create-capsule.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { getTenantId } from '../../common/tenant/tenant.middleware';
import { Public } from '../../common/guards/public.decorator';

@Controller('capsules')
export class CapsulesController {
  constructor(private readonly capsulesService: CapsulesService) {}

  @Post()
  async create(@Body() dto: CreateCapsuleDto) {
    return this.capsulesService.create(dto);
  }

  @Public()
  @Get()
  async findAll(@Headers('x-tenant-id') tenantId?: string) {
    return this.capsulesService.findAll(tenantId);
  }

  @Get('analytics')
  async getAnalytics(@Headers('x-tenant-id') tenantId?: string) {
    return this.capsulesService.getAnalytics(tenantId);
  }

  @Public()
  @Get('journey/:conversationId')
  async getJourney(
    @Param('conversationId') conversationId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.capsulesService.getLeadJourney(
      conversationId,
      tenantId || getTenantId(),
    );
  }

  @Public()
  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    return this.capsulesService.findBySlug(slug);
  }

  @Public()
  @Post(':slug/chat')
  async chat(@Param('slug') slug: string, @Body() body: any) {
    return this.capsulesService.chat(slug, body);
  }

  @Public()
  @Post('leads')
  async createLead(@Body() dto: CreateLeadDto) {
    return this.capsulesService.createLead(dto);
  }

  @Public()
  @Get('public/og/:slug')
  async getOgMetadata(@Param('slug') slug: string) {
    return this.capsulesService.generateOgHtml(slug);
  }
}
