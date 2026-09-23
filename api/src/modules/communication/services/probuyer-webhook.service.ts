import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface AuthorizationWebhookPayload {
  authorizationId: string;
  action: 'APPROVE' | 'APPROVE_PARTIAL' | 'REJECT';
  partialAmount?: number;
  responseNote?: string;
  authorizedByPhone?: string;
}

export interface WebhookExecutionResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
  url: string;
}

@Injectable()
export class ProBuyerWebhookService {
  private readonly logger = new Logger(ProBuyerWebhookService.name);

  /**
   * Envía el resultado estructurado de la autorización hacia el endpoint webhook de Pro Buyer.
   */
  async sendAuthorizationWebhook(params: {
    webhookUrl: string;
    webhookSecret: string;
    payload: AuthorizationWebhookPayload;
  }): Promise<WebhookExecutionResult> {
    const { webhookUrl, webhookSecret, payload } = params;

    if (
      !webhookUrl ||
      typeof webhookUrl !== 'string' ||
      !webhookUrl.startsWith('http')
    ) {
      return {
        success: false,
        error: 'URL de webhook inválida o no configurada.',
        url: webhookUrl || '',
      };
    }

    this.logger.log(
      `[ProBuyerWebhook] Enviando autorización ${payload.authorizationId} (${payload.action}) a ${webhookUrl}...`,
    );

    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-pitayacore-secret': webhookSecret || '',
          'User-Agent': 'PitayaCore-Agent-iCellShop/1.0',
        },
        timeout: 12000,
        validateStatus: () => true, // Capturar status codes para análisis detallado
      });

      const isOk = response.status >= 200 && response.status < 300;

      if (!isOk) {
        this.logger.warn(
          `[ProBuyerWebhook] Servidor respondió con código ${response.status}: ${JSON.stringify(response.data)}`,
        );
        return {
          success: false,
          statusCode: response.status,
          data: response.data,
          error:
            response.data?.error ||
            response.data?.message ||
            `Error HTTP ${response.status} devuelto por Pro Buyer`,
          url: webhookUrl,
        };
      }

      this.logger.log(
        `[ProBuyerWebhook] Webhook entregado con éxito (HTTP ${response.status}): ${JSON.stringify(response.data)}`,
      );

      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        url: webhookUrl,
      };
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Error de conexión de red al llamar al webhook';

      this.logger.error(
        `[ProBuyerWebhook] Excepción al llamar al webhook: ${errorMsg}`,
      );

      return {
        success: false,
        statusCode: err?.response?.status || 500,
        error: errorMsg,
        url: webhookUrl,
      };
    }
  }

  /**
   * Ejecuta una prueba de conexión (Ping) hacia la URL y con el secret proporcionados.
   */
  async testConnection(
    webhookUrl: string,
    webhookSecret: string,
  ): Promise<WebhookExecutionResult> {
    const testPayload: AuthorizationWebhookPayload = {
      authorizationId: 'test-ping-' + Date.now(),
      action: 'APPROVE',
      responseNote: 'PitayaCore Webhook Test Ping',
      authorizedByPhone: '5210000000000',
    };

    return this.sendAuthorizationWebhook({
      webhookUrl,
      webhookSecret,
      payload: testPayload,
    });
  }

  /**
   * Interpreta la respuesta del autorizador en lenguaje natural determinando la acción,
   * monto parcial (si aplica) y razón.
   */
  async interpretAuthorizerResponse(
    text: string,
    aiService?: any,
  ): Promise<{
    action: 'APPROVE' | 'APPROVE_PARTIAL' | 'REJECT' | 'AMBIGUOUS';
    partialAmount?: number;
    reason: string;
  }> {
    const raw = (text || '').trim();
    const clean = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Sin acentos

    // 1. RECHAZO CLARO
    if (
      /^(no|rechazado?|rechaza|no autorizado|negado|cancelar?|nel|noup?|denegado)\b/i.test(
        clean,
      )
    ) {
      return {
        action: 'REJECT',
        partialAmount: 0,
        reason: 'El autorizador rechazó la solicitud explícitamente.',
      };
    }

    // 2. MONTO PARCIAL DETECTADO (ej: "autorizo 300", "te autorizo $400", "solo 250", "deja en 500")
    const partialMatch = clean.match(
      /(?:autorizo|apruebo|solo|dale|deja(?:lo)? en|descuento de)?\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:pesos|mxn|\$)?/i,
    );
    const hasPartialKeyword =
      /(autorizo|apruebo|solo|dale|deja|pesos|\$)/i.test(clean);

    // Si contiene un número específico acompañado de intención
    if (
      partialMatch &&
      partialMatch[1] &&
      (hasPartialKeyword || /^\d+(\.\d{1,2})?$/.test(clean))
    ) {
      const amount = parseFloat(partialMatch[1]);
      if (amount > 0 && !/^(si|autorizado|aprobado)$/i.test(clean)) {
        return {
          action: 'APPROVE_PARTIAL',
          partialAmount: amount,
          reason: `El autorizador indicó un monto específico de $${amount}.`,
        };
      }
    }

    // 3. APROBACIÓN TOTAL CLARA (ej: "si", "sí", "autorizado", "aprobado", "adelante", "va", "dale")
    if (
      /^(si|ok|autorizado|aprobado|aprueba|aprobada|adelante|va|dale|listo|de acuerdo|yes|confirmo)\b/i.test(
        clean,
      )
    ) {
      return {
        action: 'APPROVE',
        reason: 'El autorizador aprobó la solicitud completa.',
      };
    }

    // 4. Fallback con IA si está disponible y la respuesta es más compleja/coloquial
    if (aiService) {
      try {
        const prompt = `Analiza la respuesta de un autorizador sobre una solicitud de descuento comercial:
Texto del autorizador: "${raw}"

Clasifica ESTRICTAMENTE en uno de estos valores:
- APPROVE: Si aprueba el descuento total (ej. "adelante", "dale el descuento", "está bien").
- APPROVE_PARTIAL: Si aprueba solo un monto específico menor (ej. "déjaselo en 200", "máximo 300 de descuento"). En este caso extrae "partialAmount" como número flotante.
- REJECT: Si niega o rechaza el descuento (ej. "no le bajes nada", "no nos da el margen", "imposible").
- AMBIGUOUS: Si no es una decisión clara o está preguntando algo (ej. "¿quién es?", "lo reviso al rato").

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{"action": "APPROVE" | "APPROVE_PARTIAL" | "REJECT" | "AMBIGUOUS", "partialAmount": number o null, "reason": "breve explicación"}`;

        const rawAiResult = await aiService.generateRaw(
          prompt,
          'gemini-2.5-flash',
        );
        const jsonMatch = rawAiResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (
            ['APPROVE', 'APPROVE_PARTIAL', 'REJECT', 'AMBIGUOUS'].includes(
              parsed.action,
            )
          ) {
            return {
              action: parsed.action,
              partialAmount: parsed.partialAmount
                ? Number(parsed.partialAmount)
                : undefined,
              reason: parsed.reason || 'Decisión evaluada por IA.',
            };
          }
        }
      } catch (aiErr: any) {
        this.logger.warn(
          `Fallback de IA falló en interpretación: ${aiErr.message}`,
        );
      }
    }

    // 5. AMBIGUO POR DEFECTO
    return {
      action: 'AMBIGUOUS',
      reason:
        'No se pudo identificar una decisión inequívoca de aprobación o rechazo.',
    };
  }
}
