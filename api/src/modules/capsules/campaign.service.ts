import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { MailService } from '../../common/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { marked } from 'marked';

@Injectable()
export class CampaignService {
  constructor(
    private db: DatabaseService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  async createCampaign(tenantId: string, data: any) {
    return this.db.mysql.campaign.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async updateCampaign(tenantId: string, id: string, data: any, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    const where = isSystem || isGlobal ? { id } : { id, tenantId };

    const campaign = await this.db.mysql.campaign.findFirst({ where });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    return this.db.mysql.campaign.update({
      where: { id },
      data,
    });
  }

  async getCampaigns(tenantId: string, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    const where = isSystem || isGlobal ? {} : { tenantId };

    return this.db.mysql.campaign.findMany({
      where,
      include: {
        capsule: true,
        audienceList: {
          include: {
            _count: {
              select: { members: { where: { status: 'SUBSCRIBED' } } },
            },
          },
        },
      },
    });
  }

  async getCampaign(tenantId: string, id: string, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    const where = isSystem || isGlobal ? { id } : { id, tenantId };

    return this.db.mysql.campaign.findFirst({
      where,
      include: { capsule: true },
    });
  }

  async getWhatsAppCampaigns(tenantId: string, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    const where =
      isSystem || isGlobal
        ? { channel: 'WHATSAPP' as any }
        : { tenantId, channel: 'WHATSAPP' as any };

    return this.db.mysql.campaign.findMany({
      where,
      include: {
        capsule: true,
        audienceList: {
          include: {
            _count: {
              select: { members: { where: { status: 'SUBSCRIBED' } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendCampaign(tenantId: string, id: string, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    const where = isSystem || isGlobal ? { id } : { id, tenantId };

    const campaign = await this.db.mysql.campaign.findFirst({
      where,
      include: {
        capsule: true,
        tenant: true,
      },
    });
    if (!campaign) throw new Error('Campaign not found');

    const tenantBranding = (campaign.tenant?.brandingConfig as any) || {};
    const campaignConfig = (campaign.templateConfig as any) || {};

    // Merge: campaign config overrides tenant branding
    const config = { ...tenantBranding, ...campaignConfig };

    const primaryColor = config.primaryColor || '#001A41';
    const accentColor = config.accentColor || '#2563eb';
    const logoUrl = config.logoUrl || 'https://pitayacore.io/logo-white.png';
    const ctaText = config.ctaText || 'Explorar Cápsula Interactiva';
    const footerText =
      config.footerText ||
      '© 2026 Acuaequipos Capsulas Acuicolas. Todos los derechos reservados.';

    const emailBlocks = campaignConfig.blocks || [];
    const emailImageBlock = emailBlocks.find((b: any) => b.type === 'image');
    const emailHeroImage = emailImageBlock?.content?.url;
    const emailHeaderBlock = emailBlocks.find((b: any) => b.type === 'header');
    const emailHeaderTitle = emailHeaderBlock?.content?.title || campaign.name;

    // Extract hero image: priority 1: email block image, priority 2: branding config, priority 3: capsule hero block, priority 4: null
    const capsuleBlocks = (campaign.capsule?.contentBlocks as any[]) || [];
    const heroBlock = capsuleBlocks.find((b) => b.type === 'hero');
    const capsuleHeroImage =
      heroBlock?.data?.image || heroBlock?.data?.imageUrl;
    const heroImage =
      emailHeroImage || config.heroImage || capsuleHeroImage || null;

    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const apiUrl = this.configService.get('API_URL') || 'http://localhost:3014';

    // Helper to download external images and serve them locally
    const ensureLocalImage = async (url: string) => {
      if (!url) return url;
      if (url.startsWith(apiUrl) || url.startsWith('/')) {
        return url.startsWith('http')
          ? url
          : `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      }

      try {
        const crypto = require('crypto');
        const fs = require('fs');
        const path = require('path');

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let ext = '.png';
        try {
          ext = path.extname(new URL(url).pathname) || '.png';
        } catch (e) {}

        const hash = crypto.createHash('md5').update(url).digest('hex');
        const filename = `proxy_${hash}${ext}`;

        const uploadPath = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        const filePath = path.join(uploadPath, filename);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, buffer);
        }

        return `${apiUrl}/static/uploads/${filename}`;
      } catch (err) {
        console.warn(`Failed to proxy image ${url}:`, err.message);
        return url;
      }
    };

    const finalLogoUrl = await ensureLocalImage(logoUrl);
    const finalHeroImage = await ensureLocalImage(heroImage);

    console.log(
      `[CampaignService] Sending email. Logo: ${finalLogoUrl}, Hero: ${finalHeroImage}`,
    );

    // Parse Markdown content to HTML
    const formattedContent = marked.parse(campaign.content || '');

    // Tracking URLs
    const trackingPixelUrl = `${apiUrl}/api/campaign-tracking/open/${campaign.id}`;
    const trackingClickUrl = `${apiUrl}/api/campaign-tracking/click/${campaign.id}?redirect=`;

    // Send emails to the audience
    let emails: string[] = [];

    if (campaign.audienceId) {
      const members = await this.db.mysql.audienceMember.findMany({
        where: {
          audienceId: campaign.audienceId,
          status: { in: ['SUBSCRIBED', 'WA_INVALID'] },
        },
        select: { email: true },
      });
      emails = members.map((m) => m.email);
    } else if (campaign.audience) {
      emails = campaign.audience
        .split(/[,|\n]/)
        .filter((e: string) => e.trim());
    }

    if (emails.length > 0) {
      console.log(
        `Sending campaign "${campaign.name}" to ${emails.length} recipients: ${emails.join(', ')}`,
      );
      for (const email of emails) {
        const recipientEmail = email.trim();
        const trackingPixelWithEmail = `${trackingPixelUrl}?e=${encodeURIComponent(recipientEmail)}`;
        const finalCtaUrl = `${apiUrl}/api/campaign-tracking/click/${campaign.id}?e=${encodeURIComponent(recipientEmail)}&redirect=${encodeURIComponent(`${frontendUrl}/capsules/${campaign.capsule?.slug || ''}?campaignId=${campaign.id}`)}`;
        const unsubscribeUrl = `${apiUrl}/api/campaign-tracking/unsubscribe/${campaign.id}?e=${encodeURIComponent(recipientEmail)}`;

        await this.mailService.sendMail(
          recipientEmail,
          campaign.subject,
          `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${campaign.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                    <!-- Header with Gradient -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, ${primaryColor} 0%, #0044CC 100%); padding: 60px 40px;">
                            <img src="${finalLogoUrl}" alt="Logo" width="120" style="margin-bottom: 24px; display: block;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.02em; line-height: 1.2;">
                                ${emailHeaderTitle}
                            </h1>
                        </td>
                    </tr>

                    <!-- Optional Hero Image -->
                    ${
                      finalHeroImage
                        ? `
                    <tr>
                        <td style="padding: 0;">
                            <img src="${finalHeroImage}" alt="Hero" width="600" style="width: 100%; display: block; height: auto;">
                        </td>
                    </tr>
                    `
                        : ''
                    }

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 48px 40px;">
                            <div style="background-color: ${accentColor}; width: 40px; height: 4px; border-radius: 2px; margin-bottom: 32px;"></div>
                            
                            <p style="color: #334155; font-size: 18px; line-height: 1.6; margin: 0 0 24px 0; font-weight: 500;">
                                Hola Productor,
                            </p>
                            
                            <div style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 40px 0;">
                                ${formattedContent}
                            </div>
 
                            <!-- CTA Section -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="${finalCtaUrl}" 
                                           style="background-color: ${accentColor}; color: #ffffff; padding: 20px 40px; border-radius: 16px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 8px 16px rgba(37, 99, 235, 0.2);">
                                            ${ctaText}
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 48px; font-style: italic;">
                                Haz clic en el botón superior para acceder a la experiencia completa.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 40px; border-top: 1px solid #f1f5f9; text-align: center;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <div style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                                            Conectando la Acuacultura
                                        </div>
                                        <div style="color: #94a3b8; font-size: 12px;">
                                            ${footerText}
                                        </div>
                                    </td>
                                </tr>
                                <!-- Contact Bar -->
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #001A41; border-radius: 12px;">
                                            <tr>
                                                <td align="center" style="padding: 16px 10px; line-height: 2;">
                                                    <a href="https://acuaequipos.mx" style="text-decoration: none; color: #ffffff; font-size: 12px; display: inline-block; margin: 0 12px;">
                                                        🌐 acuaequipos.mx
                                                    </a>
                                                    <span style="color: #475569; display: inline-block;">|</span>
                                                    <a href="https://wa.me/526441102097" style="text-decoration: none; color: #ffffff; font-size: 12px; display: inline-block; margin: 0 12px;">
                                                        📞 (644) 110 2097
                                                    </a>
                                                    <span style="color: #475569; display: inline-block;">|</span>
                                                    <a href="https://wa.me/526441102097" style="text-decoration: none; color: #ffffff; font-size: 12px; display: inline-block; margin: 0 12px; font-weight: bold; color: #4ade80;">
                                                        💬 WhatsApp
                                                    </a>
                                                    <span style="color: #475569; display: inline-block;">|</span>
                                                    <a href="mailto:soportecomercial@acuaequipos.mx" style="text-decoration: none; color: #ffffff; font-size: 12px; display: inline-block; margin: 0 12px;">
                                                        ✉️ soportecomercial@acuaequipos.mx
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <p style="color: #cbd5e1; font-size: 11px; max-width: 400px; margin: 0 auto; line-height: 1.5;">
                                            Recibiste este correo porque estás registrado en nuestra plataforma de distribución de cápsulas de conocimiento.
                                            <br><br>
                                            <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">Cancelar mi suscripción (Unsubscribe)</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <!-- Tracking Pixel -->
                <img src="${trackingPixelWithEmail}" width="1" height="1" style="display:none !important;" />
            </td>
        </tr>
    </table>
</body>
</html>
          `,
        );
      }
    }

    return this.db.mysql.campaign.update({
      where: { id },
      data: {
        sentAt: new Date(),
      },
    });
  }

  async recordEvent(
    campaignId: string,
    type: 'OPEN' | 'CLICK',
    email: string,
    metadata?: any,
  ) {
    // 1. Create the event record
    const event = await this.db.mysql.campaignEvent.create({
      data: {
        campaignId,
        type,
        email,
        ip: metadata?.ip,
        userAgent: metadata?.userAgent,
      },
    });

    // 2. Increment counters in the Campaign
    const updateData: any = {};
    if (type === 'OPEN') updateData.opensCount = { increment: 1 };
    if (type === 'CLICK') updateData.clicksCount = { increment: 1 };

    const campaign = await this.db.mysql.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    // 2.5 Ensure a Lead record exists for this email
    if (email) {
      const existingLead = await this.db.mysql.lead.findFirst({
        where: { email, tenantId: campaign.tenantId },
      });

      // Parse user agent for telemetry
      const ua = metadata?.userAgent || '';
      const device = /mobile/i.test(ua)
        ? 'Móvil'
        : /tablet/i.test(ua)
          ? 'Tablet'
          : 'Desktop';
      const browser = /chrome|crios/i.test(ua)
        ? 'Chrome'
        : /safari/i.test(ua)
          ? 'Safari'
          : /firefox/i.test(ua)
            ? 'Firefox'
            : 'Desconocido';
      const os = /iphone|ipad|ipod/i.test(ua)
        ? 'iOS'
        : /android/i.test(ua)
          ? 'Android'
          : /windows/i.test(ua)
            ? 'Windows'
            : /mac/i.test(ua)
              ? 'macOS'
              : 'Linux';

      // 2.6 SYNC WITH CRM CONTACTS
      const existingContact = await this.db.mysql.contact.findFirst({
        where: { email, tenantId: campaign.tenantId },
      });

      if (!existingContact) {
        const contact = await this.db.mysql.contact.create({
          data: {
            email,
            name: email.split('@')[0],
            status: 'LEAD',
            tenantId: campaign.tenantId,
            metadata: {
              source: 'EMAIL_CAMPAIGN',
              campaignName: campaign.name,
              firstInteraction: type,
            },
          },
        });

        // AUTO-DEAL on CLICK for new contacts
        if (type === 'CLICK') {
          await this.db.mysql.deal.create({
            data: {
              title: `Oportunidad: ${campaign.name}`,
              value: 0,
              stage: 'NEW',
              status: 'OPEN',
              contactId: contact.id,
              tenantId: campaign.tenantId,
              metadata: {
                source: 'CAMPAIGN_AUTO_GEN',
                campaignId: campaign.id,
              },
            } as any,
          });
        }
      } else {
        // Log activity in existing contact
        await this.db.mysql.activity.create({
          data: {
            contactId: existingContact.id,
            tenantId: campaign.tenantId,
            type: 'CAMPAIGN',
            subject: `Interacción con Campaña: ${campaign.name}`,
            content: `El usuario realizó un ${type} desde un dispositivo ${device} (${os}).`,
          } as any,
        });

        // AUTO-DEAL on CLICK for existing contacts (if no open deal for this campaign exists)
        if (type === 'CLICK') {
          const existingDeal = await this.db.mysql.deal.findFirst({
            where: {
              contactId: existingContact.id,
              status: 'OPEN',
              metadata: { path: '$.campaignId', equals: campaign.id } as any,
            },
          });

          if (!existingDeal) {
            await this.db.mysql.deal.create({
              data: {
                title: `Oportunidad: ${campaign.name}`,
                value: 0,
                stage: 'NEW',
                status: 'OPEN',
                contactId: existingContact.id,
                tenantId: campaign.tenantId,
                metadata: {
                  source: 'CAMPAIGN_AUTO_GEN',
                  campaignId: campaign.id,
                },
              } as any,
            });
          }
        }
      }

      if (!existingLead) {
        console.log(
          `[CampaignService] Creating new lead with telemetry: ${email} (${device}/${os})`,
        );
        await this.db.mysql.lead.create({
          data: {
            email,
            name: email.split('@')[0],
            campaignId,
            capsuleId: campaign.capsuleId,
            tenantId: campaign.tenantId,
            metadata: {
              source: 'CAMPAIGN_EVENT',
              lastEvent: type,
              device,
              browser,
              os,
              ip: metadata?.ip,
              userAgent: ua,
            },
          },
        });
      } else {
        // Update telemetry on existing lead
        await this.db.mysql.lead.update({
          where: { id: existingLead.id },
          data: {
            metadata: {
              ...(existingLead.metadata as any),
              lastEvent: type,
              device,
              browser,
              os,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      }
    }

    // 3. Smart Follow-up Logic (Improvement #2)
    if (type === 'OPEN') {
      const openCount = await this.db.mysql.campaignEvent.count({
        where: { campaignId, email, type: 'OPEN' },
      });

      // If they open 3 times and haven't clicked yet, trigger AI Follow-up
      if (openCount === 3) {
        const hasClicked = await this.db.mysql.campaignEvent.findFirst({
          where: { campaignId, email, type: 'CLICK' },
        });

        if (!hasClicked) {
          console.log(
            `[AI Trigger] Lead ${email} is very interested (3 opens). Sending automated follow-up...`,
          );
          await this.triggerAutoFollowUp(campaignId, email);
        }
      }
    }

    return event;
  }

  private async triggerAutoFollowUp(campaignId: string, email: string) {
    try {
      const campaign = await this.db.mysql.campaign.findUnique({
        where: { id: campaignId },
        include: { capsule: true },
      });

      if (!campaign) return;

      console.log(
        `[AI] Generating high-conversion follow-up for ${email} regarding ${campaign.name}`,
      );

      // Record the system action in the event log
      await this.db.mysql.campaignEvent.create({
        data: {
          campaignId,
          type: 'FOLLOWUP_SENT',
          email,
          userAgent: 'PitayaCore AI Bot',
        },
      });

      // In a real scenario, this would call MailerService.send
    } catch (err) {
      console.error('Error in auto follow-up:', err);
    }
  }

  async unsubscribeEmail(campaignId: string, email: string) {
    const campaign = await this.db.mysql.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign || !campaign.audienceId) return;

    await this.db.mysql.audienceMember.updateMany({
      where: { audienceId: campaign.audienceId, email },
      data: { status: 'UNSUBSCRIBED' },
    });
  }

  async removeCampaign(tenantId: string, id: string, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    const where = isSystem || isGlobal ? { id } : { id, tenantId };

    const campaign = await this.db.mysql.campaign.findFirst({
      where,
    });

    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    if (campaign.sentAt && user?.role !== 'SYSTEM') {
      throw new ConflictException(
        'No se puede eliminar una campaña que ya ha sido enviada por correo.',
      );
    }

    return this.db.mysql.campaign.delete({
      where: { id },
    });
  }

  // ─── WhatsApp Channel Methods ───────────────────────────────────────────────

  async generateWhatsAppMessage(
    tenantId: string,
    campaignId: string,
  ): Promise<{ message: string }> {
    const campaign = await this.db.mysql.campaign.findFirst({
      where: { id: campaignId, tenantId },
      include: { capsule: true },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const capsuleUrl = `${frontendUrl}/capsules/${campaign.capsule?.slug || campaign.capsuleId}`;

    // Build a compact WhatsApp message from the capsule title and description
    const title = campaign.capsule?.title || campaign.name;
    const description = (
      campaign.capsule?.description ||
      campaign.content ||
      ''
    ).slice(0, 220);

    // Emoji mapping by common aquaculture topics
    const topicEmojiMap: Record<string, string> = {
      ostión: '\u{1F9AA}',
      camarón: '\u{1F990}',
      tilapia: '\u{1F41F}',
      salmón: '\u{1F420}',
      pesca: '\u{1F3A3}',
      microalgas: '\u{1F33F}',
      productividad: '\u{1F4C8}',
      nutrición: '\u{1F9EA}',
      bioseguridad: '\u{1F6E1}\u{FE0F}',
      default: '\u{1F41A}',
    };
    const topic = (campaign.capsule?.topic || '').toLowerCase();
    const emoji =
      Object.entries(topicEmojiMap).find(([key]) => topic.includes(key))?.[1] ||
      topicEmojiMap.default;

    const trackingUrl = `${this.configService.get('API_URL') || 'http://localhost:3014'}/api/campaign-tracking/wa/${campaign.id}/{{contactId}}`;

    const message = [
      `${emoji} *${title}*`,
      '',
      description,
      '',
      `\u{1F449} Ver cápsula:`,
      capsuleUrl,
    ]
      .join('\n')
      .slice(0, 500);

    // Persist the generated message in the campaign
    await this.db.mysql.campaign.update({
      where: { id: campaignId },
      data: { whatsappMessage: message },
    });

    return { message };
  }

  async getWhatsAppLinks(tenantId: string, campaignId: string) {
    const campaign = await this.db.mysql.campaign.findFirst({
      where: { id: campaignId, tenantId },
      include: { capsule: true },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    const apiUrl = this.configService.get('API_URL') || 'http://localhost:3014';
    const frontendUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const capsuleUrl = `${frontendUrl}/capsules/${campaign.capsule?.slug || campaign.capsuleId}`;

    // Use the stored whatsappMessage or generate a default
    const baseMessage =
      campaign.whatsappMessage ||
      [
        `\u{1F41A} *${campaign.capsule?.title || campaign.name}*`,
        '',
        (campaign.capsule?.description || '').slice(0, 220),
        '',
        `\u{1F449} Ver cápsula:`,
        capsuleUrl,
      ].join('\n');

    // Fetch audience members with phone numbers
    let members: any[] = [];
    if (campaign.audienceId) {
      members = await this.db.mysql.audienceMember.findMany({
        where: {
          audienceId: campaign.audienceId,
          status: { in: ['SUBSCRIBED', 'EMAIL_BOUNCED'] },
        },
      });
    }

    const links = members.map((member) => {
      // Build the tracking URL for this member (uses email as identifier)
      const trackingRedirect = encodeURIComponent(
        `${frontendUrl}/capsules/${campaign.capsule?.slug || campaign.capsuleId}?campaignId=${campaign.id}&channel=whatsapp`,
      );
      const trackingUrl = `${apiUrl}/api/campaign-tracking/wa/${campaign.id}?e=${encodeURIComponent(member.email)}&redirect=${trackingRedirect}`;

      // Replace {{capsuleUrl}} placeholder with the tracking URL
      const personalizedMessage = baseMessage.replace(
        /\{\{capsuleUrl\}\}/g,
        trackingUrl,
      );

      // Clean phone number (remove spaces, dashes, parens)
      const rawPhone = (member.phone || '').replace(/[^\d+]/g, '');
      const phone = rawPhone.startsWith('+')
        ? rawPhone
        : rawPhone
          ? `+52${rawPhone}`
          : null;

      const encodedMsg = encodeURIComponent(personalizedMessage);
      const waUrl = phone
        ? `https://wa.me/${phone.replace('+', '')}?text=${encodedMsg}`
        : `https://web.whatsapp.com/send?text=${encodedMsg}`;

      return {
        memberId: member.id,
        name:
          `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
          member.email,
        email: member.email,
        phone: phone || 'Sin teléfono',
        hasPhone: !!phone,
        waUrl,
        trackingUrl,
        message: personalizedMessage,
      };
    });

    // Update whatsappLinksCount
    await this.db.mysql.campaign.update({
      where: { id: campaignId },
      data: { whatsappLinksCount: links.length },
    });

    return {
      campaignId,
      campaignName: campaign.name,
      totalLinks: links.length,
      linksWithPhone: links.filter((l) => l.hasPhone).length,
      links,
    };
  }

  async recordWhatsAppEvent(campaignId: string, email: string, metadata?: any) {
    // Reuse existing recordEvent for CLICK (WhatsApp link click = engagement)
    return this.recordEvent(campaignId, 'CLICK', email, {
      ...metadata,
      channel: 'WHATSAPP',
    });
  }
}
