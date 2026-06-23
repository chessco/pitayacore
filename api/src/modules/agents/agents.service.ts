import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findBySlug(slug: string, tenantId: string) {
    return this.db.mysql.agent.findFirst({
      where: {
        slug,
        OR: [
          { tenantId },
          { tenantId: 'GLOBAL' }, // Soporte para agentes globales del sistema
        ],
        isActive: true,
      },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    prompt: string;
    tenantId: string;
  }) {
    return this.db.mysql.agent.create({
      data: {
        ...data,
        isActive: true,
      },
    });
  }

  async findAll(tenantId: string) {
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    const where = isGlobal
      ? {}
      : {
          OR: [{ tenantId }, { tenantId: 'GLOBAL' }],
        };

    return this.db.mysql.agent.findMany({ where });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      prompt: string;
      description: string;
      config: any;
    }>,
  ) {
    const updated = await this.db.mysql.agent.update({
      where: { id },
      data: {
        ...data,
        status: 'PRE_PRODUCTION', // Reset to draft when modified
      },
    });

    if (data.prompt) {
      await this.db.mysql.agentVersion.create({
        data: {
          agentId: id,
          prompt: data.prompt,
          version: updated.version,
          status: 'PRE_PRODUCTION',
        },
      });
    }

    return updated;
  }

  async updateStatus(id: string, status: string) {
    const agent = await this.db.mysql.agent.findUnique({ where: { id } });
    if (!agent) throw new Error('Agent not found');
    let version = agent.version;

    // Si se pasa a producción, subimos la versión menor
    if (status === 'PRODUCTION') {
      const v = parseFloat(version);
      version = (v + 0.1).toFixed(1);
    }

    const updated = await this.db.mysql.agent.update({
      where: { id },
      data: { status, version },
    });

    // Save as a production version
    await this.db.mysql.agentVersion.create({
      data: {
        agentId: id,
        prompt: updated.prompt,
        version: updated.version,
        status: status,
      },
    });

    return updated;
  }

  async findVersions(agentId: string) {
    return this.db.mysql.agentVersion.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async rollback(agentId: string, versionId: string) {
    const versionRecord = await this.db.mysql.agentVersion.findUnique({
      where: { id: versionId },
    });

    if (!versionRecord) throw new Error('Version not found');

    const agent = await this.db.mysql.agent.findUnique({
      where: { id: agentId },
    });
    if (!agent) throw new Error('Agent not found');

    // Al revertir, incrementamos la versión para que quede claro que es un nuevo estado
    const v = parseFloat(agent.version);
    const newVersion = (v + 0.1).toFixed(1);

    const updated = await this.db.mysql.agent.update({
      where: { id: agentId },
      data: {
        prompt: versionRecord.prompt,
        version: newVersion,
        status: 'PRODUCTION', // Al revertir solemos quererlo en producción de inmediato
      },
    });

    // Save the rollback as a new version entry
    await this.db.mysql.agentVersion.create({
      data: {
        agentId,
        prompt: updated.prompt,
        version: updated.version,
        status: 'PRODUCTION',
      },
    });

    return updated;
  }
}
