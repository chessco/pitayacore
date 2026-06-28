import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { VISION_AGENTS } from './vision-agents.constants';

@Injectable()
export class AgentRegistryBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AgentRegistryBootstrapService.name);

  constructor(private readonly db: DatabaseService) {}

  async onApplicationBootstrap() {
    this.logger.log('Bootstrapping Vision Agents into Agent Registry...');

    try {
      // 1. Ensure Feature flag exists
      await this.db.mysql.feature.upsert({
        where: { name: 'VISION_AGENTS_ENABLED' },
        update: {},
        create: { name: 'VISION_AGENTS_ENABLED' },
      });

      // 2. Upsert each agent into the registry
      for (const agent of VISION_AGENTS) {
        // Ensure skills are created in the system if they don't exist
        const skillIds: string[] = [];
        for (const skillSlug of agent.metadata.recommendedSkills) {
          const existingSkill = await this.db.mysql.skill.findUnique({
            where: { slug: skillSlug },
          });

          if (existingSkill) {
            skillIds.push(existingSkill.id);
          }
        }

        const agentTemplate = await this.db.mysql.agentTemplate.upsert({
          where: { slug: agent.slug },
          update: {
            name: agent.name,
            description: agent.description,
            category: agent.category,
            systemPrompt: agent.systemPrompt,
            metadata: agent.metadata as any,
          },
          create: {
            name: agent.name,
            slug: agent.slug,
            description: agent.description,
            category: agent.category,
            systemPrompt: agent.systemPrompt,
            metadata: agent.metadata as any,
            status: 'ACTIVE',
            defaultModel: 'gpt-4o',
          },
        });

        // Map skills
        for (const skillId of skillIds) {
          await this.db.mysql.agentTemplateSkill.upsert({
            where: {
              agentTemplateId_skillId: {
                agentTemplateId: agentTemplate.id,
                skillId: skillId,
              },
            },
            update: {},
            create: {
              agentTemplateId: agentTemplate.id,
              skillId: skillId,
            },
          });
        }
      }

      this.logger.log(
        `Successfully bootstrapped ${VISION_AGENTS.length} foundational Vision agents.`,
      );
    } catch (error) {
      this.logger.error('Failed to bootstrap Vision Agents:', error);
    }
  }
}
