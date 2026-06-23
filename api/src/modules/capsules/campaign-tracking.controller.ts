import { Controller, Get, Param, Query, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { CampaignService } from './campaign.service';
import { Public } from '../../common/guards/public.decorator';

@Controller('campaign-tracking')
export class CampaignTrackingController {
  constructor(private readonly campaignService: CampaignService) {}

  @Public()
  @Get('open/:id')
  async trackOpen(
    @Param('id') id: string,
    @Query('e') email: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Record the open event
    await this.campaignService.recordEvent(id, 'OPEN', email, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Return a 1x1 transparent PNG pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64',
    );
    res.set('Content-Type', 'image/png');
    res.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(pixel);
  }

  @Public()
  @Get('click/:id')
  async trackClick(
    @Param('id') id: string,
    @Query('e') email: string,
    @Query('redirect') redirect: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Record the click event
    await this.campaignService.recordEvent(id, 'CLICK', email, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Redirect to the final destination
    if (redirect) {
      return res.redirect(redirect);
    }

    // Fallback if no redirect is provided
    return res.redirect('/');
  }

  @Public()
  @Get('wa/:id')
  async trackWhatsApp(
    @Param('id') id: string,
    @Query('e') email: string,
    @Query('redirect') redirect: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Register the WhatsApp click engagement in CRM
    try {
      await this.campaignService.recordWhatsAppEvent(
        id,
        email || 'unknown@whatsapp',
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          channel: 'WHATSAPP',
        },
      );
    } catch (err) {
      // Don't block redirect on tracking error
      console.warn('[WA Tracking] Event recording failed:', err?.message);
    }

    if (redirect) {
      return res.redirect(redirect);
    }
    return res.redirect('/');
  }

  @Public()
  @Get('unsubscribe/:id')
  async trackUnsubscribe(
    @Param('id') id: string,
    @Query('e') email: string,
    @Res() res: Response,
  ) {
    if (email) {
      await this.campaignService.unsubscribeEmail(id, email);
    }

    // Return a simple HTML response
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <title>Suscripción Cancelada</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; text-align: center; padding: 50px; background-color: #f8fafc; color: #334155;">
          <div style="background-color: white; max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="width: 60px; height: 60px; background-color: #fee2e2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px;">✓</div>
            <h2 style="margin-top: 0; color: #0f172a;">Suscripción cancelada</h2>
            <p style="line-height: 1.6; color: #475569;">El correo <strong>${email}</strong> ha sido removido de nuestra lista exitosamente.</p>
            <p style="line-height: 1.6; color: #475569; font-size: 14px; margin-bottom: 0;">Ya no recibirás correos ni mensajes de WhatsApp de esta audiencia.</p>
          </div>
        </body>
      </html>
    `);
  }
}
