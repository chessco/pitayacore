import { PrismaClient } from '@prisma/mysql-client';
import { VISION_AGENTS } from '../src/modules/agent-templates/vision-agents.constants';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding foundational Vision agents...');

  await prisma.feature.upsert({
    where: { name: 'VISION_AGENTS_ENABLED' },
    update: {},
    create: { name: 'VISION_AGENTS_ENABLED' },
  });

  for (const agent of VISION_AGENTS) {
    console.log(`Upserting agent template: ${agent.name} (${agent.slug})`);

    const agentTemplate = await prisma.agentTemplate.upsert({
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

    for (const skillSlug of agent.metadata.recommendedSkills) {
      const existingSkill = await prisma.skill.findUnique({
        where: { slug: skillSlug },
      });

      if (existingSkill) {
        await prisma.agentTemplateSkill.upsert({
          where: {
            agentTemplateId_skillId: {
              agentTemplateId: agentTemplate.id,
              skillId: existingSkill.id,
            },
          },
          update: {},
          create: {
            agentTemplateId: agentTemplate.id,
            skillId: existingSkill.id,
          },
        });
      }
    }
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
