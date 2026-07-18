import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { CapsulesService } from './capsules.service';
import { CampaignService } from './campaign.service';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';

@Controller('capsule-studio')
@UseGuards(CombinedAuthGuard, FeatureFlagGuard)
@RequireFeature('capsules')
export class CapsuleStudioController {
  constructor(
    private readonly capsulesService: CapsulesService,
    private readonly campaignService: CampaignService,
  ) {}

  @Get('capsules')
  findAll(@Request() req: any) {
    return this.capsulesService.findAll(req.user.tenantId, req.user);
  }

  @Post('capsules')
  create(@Request() req: any, @Body() body: any) {
    return this.capsulesService.create({
      ...body,
      tenantId: req.user.tenantId,
    });
  }

  @Get('capsules/:id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.capsulesService.findOne(id, req.user.tenantId, req.user);
  }

  @Patch('capsules/:id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.capsulesService.update(id, req.user.tenantId, body, req.user);
  }

  @Patch('capsules/:id/status')
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.capsulesService.updateStatus(
      id,
      req.user.tenantId,
      body.status,
      req.user,
    );
  }

  @Delete('capsules/:id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.capsulesService.remove(id, req.user.tenantId, req.user);
  }

  @Get('campaigns')
  getCampaigns(@Request() req: any) {
    return this.campaignService.getCampaigns(req.user.tenantId, req.user);
  }

  @Get('campaigns/whatsapp')
  getWhatsAppCampaigns(@Request() req: any) {
    return this.campaignService.getWhatsAppCampaigns(
      req.user.tenantId,
      req.user,
    );
  }

  @Post('campaigns')
  createCampaign(@Request() req: any, @Body() body: any) {
    return this.campaignService.createCampaign(req.user.tenantId, body);
  }

  @Patch('campaigns/:id')
  updateCampaign(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.campaignService.updateCampaign(
      req.user.tenantId,
      id,
      body,
      req.user,
    );
  }

  @Post('campaigns/:id/send')
  sendCampaign(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.sendCampaign(req.user.tenantId, id, req.user);
  }

  @Delete('campaigns/:id')
  removeCampaign(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.removeCampaign(req.user.tenantId, id, req.user);
  }

  @Get('analytics')
  getAnalytics(@Request() req: any) {
    return this.capsulesService.getAnalytics(req.user.tenantId);
  }

  @Get('branding')
  getBranding(@Request() req: any) {
    return this.capsulesService.getBranding(req.user.tenantId);
  }

  @Get('capsules/slug/:slug')
  async findBySlug(@Request() req: any, @Param('slug') slug: string) {
    return this.capsulesService.findBySlug(
      slug,
      req.user.tenantId,
      true,
      req.user,
    ); // true = includeDrafts
  }

  @Post('capsules/slug/:slug/chat')
  async chat(
    @Request() req: any,
    @Param('slug') slug: string,
    @Body() body: any,
  ) {
    // Reutilizar la lógica de chat existente pero permitiendo borradores
    return this.capsulesService.chat(
      slug,
      body,
      req.user.tenantId,
      true,
      req.user,
    ); // true = includeDrafts
  }

  @Post('branding')
  updateBranding(@Request() req: any, @Body() body: any) {
    return this.capsulesService.updateBranding(req.user.tenantId, body);
  }

  @Get('leads')
  getLeads(@Request() req: any) {
    return this.capsulesService.getLeads(req.user.tenantId);
  }

  @Delete('leads/:id')
  removeLead(@Request() req: any, @Param('id') id: string) {
    return this.capsulesService.removeLead(id, req.user.tenantId);
  }

  @Post('leads/:id/sync')
  syncLeadToCRM(@Request() req: any, @Param('id') id: string) {
    return this.capsulesService.syncLeadToCRM(id, req.user.tenantId);
  }

  // ─── WhatsApp Campaign Endpoints ──────────────────────────────────────────────

  @Post('campaigns/:id/whatsapp-message')
  generateWhatsAppMessage(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.generateWhatsAppMessage(req.user.tenantId, id);
  }

  @Patch('campaigns/:id/whatsapp-message')
  updateWhatsAppMessage(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    return this.campaignService.updateCampaign(
      req.user.tenantId,
      id,
      { whatsappMessage: body.message },
      req.user,
    );
  }

  @Get('campaigns/:id/whatsapp-links')
  getWhatsAppLinks(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.getWhatsAppLinks(req.user.tenantId, id);
  }

  @Post('campaigns/:id/send-whatsapp')
  startWhatsAppSend(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      imageBase64?: string;
      imageUrl?: string;
      minDelayMs?: number;
      maxDelayMs?: number;
    },
  ) {
    return this.campaignService.startWhatsAppSend(req.user.tenantId, id, body);
  }

  @Post('campaigns/:id/send-whatsapp-one')
  sendWhatsAppOne(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { memberId: string; imageBase64?: string; imageUrl?: string },
  ) {
    return this.campaignService.sendWhatsAppOne(
      req.user.tenantId,
      id,
      body.memberId,
      { imageBase64: body.imageBase64, imageUrl: body.imageUrl },
    );
  }

  @Get('campaigns/:id/send-whatsapp/status')
  getWhatsAppSendStatus(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.getWhatsAppSendStatus(req.user.tenantId, id);
  }

  @Post('campaigns/:id/send-whatsapp/stop')
  stopWhatsAppSend(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.stopWhatsAppSend(req.user.tenantId, id);
  }
}
