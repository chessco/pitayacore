import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(tenantId: string) {
    return this.db.mysql.skill.findMany({
      where: {
        OR: [
          { tenantId },
          { tenantId: 'global' }, // Global system skills
        ],
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.db.mysql.skill.findUnique({
      where: { id },
      include: { promptVersions: true },
    });
  }

  async updateStatus(id: string, status: string) {
    console.log(`[SkillsService] Updating skill ${id} status to: ${status}`);
    return this.db.mysql.skill.update({
      where: { id },
      data: { status } as any,
    });
  }

  async updatePrompt(id: string, prompt: string, tenantId: string) {
    const skill = await this.db.mysql.skill.findUnique({ where: { id } });
    if (!skill) throw new Error('Skill not found');

    const nextVersion = (parseFloat(skill.version) + 0.1).toFixed(1);

    // Create a new version
    await this.db.mysql.promptVersion.create({
      data: {
        skillId: id,
        content: prompt,
        version: nextVersion,
        isActive: true,
      },
    });

    // Update current skill
    return this.db.mysql.skill.update({
      where: { id },
      data: {
        prompt,
        version: nextVersion,
      },
    });
  }

  async findVersions(skillId: string) {
    return this.db.mysql.promptVersion.findMany({
      where: { skillId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async rollback(skillId: string, versionId: string) {
    const version = await this.db.mysql.promptVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) throw new Error('Version not found');

    return this.db.mysql.skill.update({
      where: { id: skillId },
      data: {
        prompt: version.content,
        version: version.version,
      },
    });
  }

  async create(data: {
    name: string;
    description: string;
    prompt: string;
    tenantId: string;
  }) {
    return this.db.mysql.skill.create({
      data: {
        ...data,
        version: '1.0',
      },
    });
  }
}
