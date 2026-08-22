import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappWebProvider } from './providers/whatsapp-web/whatsapp-web.provider';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappProvider: WhatsappWebProvider) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard) // Valida que el header x-api-key o x-internal-key coincida con INTERNAL_API_KEY
  async sendWhatsAppMessage(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { to: string; content: string },
  ) {
    if (!tenantId) {
      throw new BadRequestException('El encabezado x-tenant-id es requerido');
    }

    if (!body.to || !body.content) {
      throw new BadRequestException(
        'Los campos "to" y "content" son requeridos en el cuerpo',
      );
    }

    // 1. Obtener el primer canal que esté listo (READY) para ese Tenant ID
    const channelId = this.whatsappProvider.getFirstReadyChannel(tenantId);
    if (!channelId) {
      throw new BadRequestException(
        `No hay ningún canal de WhatsApp activo/vinculado (READY) para el tenant ${tenantId}.`,
      );
    }

    try {
      // 2. Enviar el mensaje usando el proveedor de whatsapp-web.js
      const result = (await this.whatsappProvider.sendMessage(
        tenantId,
        channelId,
        body.to,
        body.content,
      )) as { id?: { _serialized?: string } } | undefined;

      return {
        success: true,
        messageId: result?.id?._serialized || 'SUCCESS',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
