import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { WhatsappWebProvider } from '../communication/providers/whatsapp-web/whatsapp-web.provider';

@Injectable()
export class AudiencesService {
  constructor(
    private db: DatabaseService,
    private readonly whatsapp: WhatsappWebProvider,
  ) {}

  async createAudience(
    tenantId: string,
    data: { name: string; description?: string },
  ) {
    return this.db.mysql.audience.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async getAudiences(tenantId: string) {
    return this.db.mysql.audience.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAudience(tenantId: string, id: string) {
    const audience = await this.db.mysql.audience.findFirst({
      where: { id, tenantId },
    });
    if (!audience) throw new NotFoundException('Audience not found');
    return audience;
  }

  async updateAudience(
    tenantId: string,
    id: string,
    data: { name?: string; description?: string },
  ) {
    const audience = await this.getAudience(tenantId, id);
    return this.db.mysql.audience.update({
      where: { id: audience.id },
      data: {
        name: data.name?.trim() ? data.name.trim() : undefined,
        description:
          data.description !== undefined ? data.description : undefined,
      },
    });
  }

  async deleteAudience(tenantId: string, id: string) {
    const audience = await this.getAudience(tenantId, id);
    return this.db.mysql.audience.delete({
      where: { id: audience.id },
    });
  }

  async getMembers(tenantId: string, audienceId: string) {
    await this.getAudience(tenantId, audienceId);
    return this.db.mysql.audienceMember.findMany({
      where: { audienceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMember(tenantId: string, audienceId: string, data: any) {
    await this.getAudience(tenantId, audienceId);

    if (!data.email?.trim() && !data.phone?.trim()) {
      throw new Error('Se requiere correo electrónico o teléfono');
    }

    if (data.phone) {
      data.phone = data.phone.split(',')[0].replace(/[^\d+]/g, '');
    }

    if (!data.email?.trim() && data.phone?.trim()) {
      const cleanPhone = data.phone.replace(/[^\d]/g, '');
      data.email = `${cleanPhone || Math.random().toString(36).substring(7)}@no-email.whatsapp`;
    }

    // Check if exists
    const existing = await this.db.mysql.audienceMember.findUnique({
      where: { audienceId_email: { audienceId, email: data.email } },
    });

    if (existing) {
      return this.db.mysql.audienceMember.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.db.mysql.audienceMember.create({
      data: {
        ...data,
        audienceId,
      },
    });
  }

  async importMembersFromTsv(
    tenantId: string,
    audienceId: string,
    tsvData: string,
  ) {
    await this.getAudience(tenantId, audienceId);

    const rows = tsvData.split('\n').filter((r) => r.trim());
    if (rows.length === 0) return { success: false, message: 'No data' };

    // Asume the first row is headers if it doesn't contain an email pattern
    let headers = rows[0].split('\t').map((h) => h.trim().toLowerCase());
    let dataRows = rows;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const firstRowHasEmail = headers.some((h) => emailRegex.test(h));

    if (firstRowHasEmail) {
      // No headers found, use generic ones
      headers = headers.map((_, i) => `col_${i}`);
    } else {
      // Has headers, so skip first row
      dataRows = rows.slice(1);
    }

    let importedCount = 0;
    const errors = [];

    for (const row of dataRows) {
      const cols = row.split('\t').map((c) => c.trim());

      // Find email column
      let emailIdx = headers.findIndex(
        (h) => h.includes('email') || h.includes('correo'),
      );
      if (emailIdx === -1) {
        // Find first column that looks like an email
        emailIdx = cols.findIndex((c) => emailRegex.test(c));
      }

      // Try to find name and phone
      const nameIdx = headers.findIndex(
        (h) =>
          h.includes('nombre') || h.includes('contacto') || h.includes('name'),
      );
      const phoneIdx = headers.findIndex(
        (h) =>
          h.includes('tel') ||
          h.includes('phone') ||
          h.includes('cel') ||
          h.includes('móvil') ||
          h.includes('movil'),
      );

      const rawEmail = emailIdx !== -1 ? cols[emailIdx] : null;
      const rawPhone = phoneIdx !== -1 ? cols[phoneIdx] : null;

      let email =
        rawEmail && emailRegex.test(rawEmail) ? rawEmail.toLowerCase() : null;
      const phone =
        rawPhone && rawPhone.trim()
          ? rawPhone.split(',')[0].replace(/[^\d+]/g, '')
          : null;

      if (!email && !phone) {
        errors.push(
          `Row ignored: No valid email or phone found (${row.substring(0, 30)}...)`,
        );
        continue;
      }

      if (!email && phone) {
        // Generate dummy email to satisfy DB unique constraint based on phone
        const cleanPhone = phone.replace(/[^\d]/g, '');
        email = `${cleanPhone || Math.random().toString(36).substring(7)}@no-email.whatsapp`;
      }

      if (!email) {
        continue;
      }

      const firstName = nameIdx !== -1 ? cols[nameIdx] : null;

      // Extract metadata (everything else)
      const metadata: any = {};
      headers.forEach((h, idx) => {
        if (
          idx !== emailIdx &&
          idx !== nameIdx &&
          idx !== phoneIdx &&
          cols[idx]
        ) {
          metadata[h] = cols[idx];
        }
      });

      try {
        await this.db.mysql.audienceMember.upsert({
          where: { audienceId_email: { audienceId, email } },
          create: {
            audienceId,
            email,
            firstName,
            phone,
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
          },
          update: {
            firstName: firstName || undefined,
            phone: phone || undefined,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          },
        });
        importedCount++;
      } catch (err) {
        errors.push(`Error saving ${email}`);
      }
    }

    return { success: true, importedCount, errors };
  }

  async updateMember(
    tenantId: string,
    audienceId: string,
    memberId: string,
    data: any,
  ) {
    await this.getAudience(tenantId, audienceId);

    if (data.phone) {
      data.phone = data.phone.split(',')[0].replace(/[^\d+]/g, '');
    }

    if (!data.email?.trim() && data.phone?.trim()) {
      const cleanPhone = data.phone.replace(/[^\d]/g, '');
      data.email = `${cleanPhone || Math.random().toString(36).substring(7)}@no-email.whatsapp`;
    }

    return this.db.mysql.audienceMember.update({
      where: { id: memberId, audienceId },
      data: {
        email: data.email,
        firstName: data.firstName,
        phone: data.phone,
      },
    });
  }

  async removeMember(tenantId: string, audienceId: string, memberId: string) {
    await this.getAudience(tenantId, audienceId);
    return this.db.mysql.audienceMember.delete({
      where: { id: memberId, audienceId },
    });
  }

  async updateMemberStatus(
    tenantId: string,
    audienceId: string,
    memberId: string,
    status: string,
  ) {
    await this.getAudience(tenantId, audienceId);
    return this.db.mysql.audienceMember.update({
      where: { id: memberId, audienceId },
      data: { status },
    });
  }

  /**
   * Validates whether a member's phone number is registered on WhatsApp,
   * using the tenant's first connected (READY) WhatsApp line, and persists
   * the result in the member's status:
   *   - not registered -> WA_INVALID ("Solo Correo")
   *   - registered     -> clears a previous WA_INVALID back to SUBSCRIBED,
   *                       but never overrides UNSUBSCRIBED / EMAIL_BOUNCED marks.
   */
  async checkWhatsApp(tenantId: string, audienceId: string, memberId: string) {
    await this.getAudience(tenantId, audienceId);

    const member = await this.db.mysql.audienceMember.findFirst({
      where: { id: memberId, audienceId },
    });
    if (!member) throw new NotFoundException('Contacto no encontrado');
    if (!member.phone?.trim()) {
      throw new BadRequestException(
        'El contacto no tiene un número de teléfono para validar.',
      );
    }

    const channelId = this.whatsapp.getFirstReadyChannel(tenantId);
    if (!channelId) {
      throw new BadRequestException(
        'No hay una línea de WhatsApp conectada. Conecta una línea antes de validar.',
      );
    }

    let registered: boolean;
    let serialized: string | undefined;
    try {
      ({ registered, serialized } = await this.whatsapp.getNumberId(
        tenantId,
        channelId,
        member.phone,
      ));
    } catch {
      throw new BadRequestException(
        'No se pudo validar el número con WhatsApp. Verifica que la línea siga conectada.',
      );
    }

    let status = member.status;
    if (!registered) {
      status = 'WA_INVALID';
    } else if (member.status === 'WA_INVALID') {
      status = 'SUBSCRIBED';
    }

    const updated = await this.db.mysql.audienceMember.update({
      where: { id: member.id },
      data: { status },
    });

    return { registered, serialized, status: updated.status };
  }

  /**
   * Validates every member of an audience that has a phone number against
   * WhatsApp, sequentially (to avoid overloading the single live session),
   * applying the same status rules as the per-member check. Returns a summary.
   */
  async checkWhatsAppBulk(tenantId: string, audienceId: string) {
    await this.getAudience(tenantId, audienceId);

    const channelId = this.whatsapp.getFirstReadyChannel(tenantId);
    if (!channelId) {
      throw new BadRequestException(
        'No hay una línea de WhatsApp conectada. Conecta una línea antes de validar.',
      );
    }

    const members = await this.db.mysql.audienceMember.findMany({
      where: { audienceId },
    });

    let registered = 0;
    let invalid = 0;
    let skipped = 0;
    let failed = 0;

    for (const member of members) {
      if (!member.phone?.trim()) {
        skipped++;
        continue;
      }

      let isRegistered: boolean;
      try {
        ({ registered: isRegistered } = await this.whatsapp.getNumberId(
          tenantId,
          channelId,
          member.phone,
        ));
      } catch {
        failed++;
        continue;
      }

      let status = member.status;
      if (!isRegistered) {
        status = 'WA_INVALID';
      } else if (member.status === 'WA_INVALID') {
        status = 'SUBSCRIBED';
      }

      // Only write when the status actually changes.
      if (status !== member.status) {
        await this.db.mysql.audienceMember.update({
          where: { id: member.id },
          data: { status },
        });
      }

      if (isRegistered) registered++;
      else invalid++;
    }

    return {
      total: members.length,
      checked: registered + invalid,
      registered,
      invalid,
      skipped,
      failed,
    };
  }

  /**
   * Imports a batch of leads (e.g. from the PitayaMapLeads Chrome extension)
   * into an audience for the tenant. The audience is reused if one already
   * exists with the same name, otherwise it is created. Core fields
   * (name/email/phone) are mapped to columns; every other field (website,
   * address, instagram, category, rating, …) is preserved in `metadata`.
   */
  async importLeads(
    tenantId: string,
    body: { leads: any[]; campaign?: string },
  ) {
    const leads = body?.leads;
    if (!Array.isArray(leads) || leads.length === 0) {
      throw new BadRequestException('No hay leads para importar');
    }

    const name =
      body.campaign?.trim() ||
      `Google Maps ${new Date().toISOString().slice(0, 10)}`;

    // Reuse an audience with the same name for this tenant, or create it.
    let audience = await this.db.mysql.audience.findFirst({
      where: { tenantId, name },
    });
    if (!audience) {
      audience = await this.db.mysql.audience.create({
        data: {
          tenantId,
          name,
          description: 'Importado desde PitayaMapLeads',
        },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Field names treated as core (excluded from metadata), case-insensitive.
    const reserved = new Set([
      'name',
      'nombre',
      'email',
      'correo',
      'phone',
      'telefono',
      'teléfono',
      'tel',
    ]);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      if (!lead || typeof lead !== 'object') {
        skipped++;
        continue;
      }

      const firstName =
        (lead.name || lead.Name || lead.nombre || lead.Nombre || '')
          .toString()
          .trim() || null;

      const rawPhone = (
        lead.phone ||
        lead.Phone ||
        lead.telefono ||
        ''
      ).toString();
      const phone = rawPhone.trim()
        ? rawPhone.split(',')[0].replace(/[^\d+]/g, '')
        : null;

      const rawEmail = (lead.email || lead.Email || lead.correo || '')
        .toString()
        .trim();
      let email =
        rawEmail && emailRegex.test(rawEmail) ? rawEmail.toLowerCase() : null;

      if (!email && !phone) {
        skipped++;
        continue;
      }
      if (!email && phone) {
        const cleanPhone = phone.replace(/[^\d]/g, '');
        email = `${cleanPhone || Math.random().toString(36).substring(7)}@no-email.whatsapp`;
      }

      // Everything that isn't a core field is preserved as metadata.
      const metadata: Record<string, any> = {};
      for (const [k, v] of Object.entries(lead)) {
        if (v === null || v === undefined || v === '') continue;
        if (reserved.has(k.toLowerCase())) continue;
        metadata[k] = v;
      }

      try {
        await this.db.mysql.audienceMember.upsert({
          where: { audienceId_email: { audienceId: audience.id, email } },
          create: {
            audienceId: audience.id,
            email,
            firstName,
            phone,
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
          },
          update: {
            firstName: firstName || undefined,
            phone: phone || undefined,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          },
        });
        imported++;
      } catch {
        errors.push(`Error al guardar ${email}`);
      }
    }

    return {
      success: true,
      message: `${imported} contacto(s) importados/actualizados${
        skipped ? `, ${skipped} omitidos` : ''
      }.`,
      audienceId: audience.id,
      imported,
      skipped,
      errors,
    };
  }
}
