import { PrismaClient } from '@prisma/mysql-client';

const prisma = new PrismaClient();

async function main() {
  // Find a tenant to assign system agents to. Assuming the first tenant is the system tenant or use a predefined ID.
  const firstTenant = await prisma.tenant.findFirst();
  if (!firstTenant) {
    console.error('No tenants found. Please create a tenant before seeding agents.');
    process.exit(1);
  }
  const tenantId = firstTenant.id;

  const agentsToSeed = [
    {
      slug: 'ceo-advisor',
      name: 'CEO Advisor',
      description: 'Asistente ejecutivo para dirección estratégica, toma de decisiones, crecimiento empresarial y análisis de oportunidades.',
      category: 'business',
      defaultModel: 'gpt-5.5',
      systemPrompt: 'You are the CEO Advisor...',
      skills: ['crm-intelligence', 'competitor-intelligence', 'proposal-generator', 'saas-architect'],
    },
    {
      slug: 'marketing-strategist',
      name: 'Marketing Strategist',
      description: 'Especialista en marketing, posicionamiento, campañas, contenido y crecimiento.',
      category: 'marketing',
      defaultModel: 'gpt-5.5',
      systemPrompt: 'You are the Marketing Strategist...',
      skills: ['content-generator', 'vision-analysis', 'competitor-intelligence'],
    },
    {
      slug: 'creative-director',
      name: 'Creative Director',
      description: 'Director creativo encargado de campañas visuales, branding y generación de contenido multimedia.',
      category: 'creative',
      defaultModel: 'gpt-5.5',
      systemPrompt: 'You are the Creative Director...',
      skills: ['vision-analysis', 'creative-generation', 'brand-compliance'],
    },
    {
      slug: 'sales-advisor',
      name: 'Sales Advisor',
      description: 'Especialista en ventas, prospección, seguimiento comercial y cierre de oportunidades.',
      category: 'sales',
      defaultModel: 'gpt-5.5-mini',
      systemPrompt: 'You are the Sales Advisor...',
      skills: ['crm-intelligence', 'proposal-generator'],
    },
    {
      slug: 'pitayacore-architect',
      name: 'PitayaCore Architect',
      description: 'Arquitecto de software especializado en SaaS multi-tenant, DDD, agentes, workflows y escalabilidad.',
      category: 'engineering',
      defaultModel: 'gpt-5.5',
      systemPrompt: 'You are the PitayaCore Architect...',
      skills: ['saas-architect', 'pitayacore-auditor'],
    },
    {
      slug: 'pitayacore-auditor',
      name: 'PitayaCore Auditor',
      description: 'Auditor de arquitectura encargado de validar suites, módulos, RBAC, multi-tenancy, verticales y deuda técnica.',
      category: 'engineering',
      defaultModel: 'gpt-5.5',
      systemPrompt: 'You are the PitayaCore Auditor...',
      skills: ['architecture-audit', 'code-analysis'],
    },
    {
      slug: 'vision-analyst',
      name: 'Vision Analyst',
      description: 'Especialista en análisis visual, OCR, branding, publicidad y reconocimiento de contenido multimedia.',
      category: 'vision',
      defaultModel: 'gemini-2.5-pro',
      systemPrompt: 'You are the Vision Analyst...',
      skills: ['vision-analysis', 'ocr-analysis', 'logo-detection'],
    }
  ];

  const allRequiredSkills = Array.from(new Set(agentsToSeed.flatMap(a => a.skills)));
  
  // Create missing skills first
  for (const skillName of allRequiredSkills) {
    await prisma.skill.upsert({
      where: { id: skillName }, // Assuming skill ID can be the name or we need to find it
      update: {},
      create: {
        id: skillName,
        tenantId,
        name: skillName,
        description: `Auto-generated skill ${skillName}`,
        prompt: `System prompt for ${skillName}`,
        status: 'PRODUCTION'
      }
    });
  }

  const results: any[] = [];

  for (const data of agentsToSeed) {
    let statusMsg = 'Created';
    let agent = await prisma.agent.findUnique({
      where: { slug: data.slug }
    });

    if (agent) {
      statusMsg = 'Updated';
      agent = await prisma.agent.update({
        where: { slug: data.slug },
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          defaultModel: data.defaultModel,
          prompt: data.systemPrompt,
          status: 'PRODUCTION',
          isActive: true
        }
      });
    } else {
      agent = await prisma.agent.create({
        data: {
          tenantId,
          slug: data.slug,
          name: data.name,
          description: data.description,
          category: data.category,
          defaultModel: data.defaultModel,
          prompt: data.systemPrompt,
          status: 'PRODUCTION',
          isActive: true
        }
      });
    }

    // Upsert Configuration
    await prisma.agentConfiguration.upsert({
      where: { agentId: agent.id },
      update: {
        model: data.defaultModel,
        provider: data.defaultModel.includes('gemini') ? 'google' : 'openai'
      },
      create: {
        agentId: agent.id,
        model: data.defaultModel,
        provider: data.defaultModel.includes('gemini') ? 'google' : 'openai'
      }
    });

    // Sync Skills
    // First, clear existing to easily re-insert
    await prisma.agentSkill.deleteMany({
      where: { agentId: agent.id }
    });

    for (const skillName of data.skills) {
      // Find the skill
      const skill = await prisma.skill.findFirst({
        where: { name: skillName }
      });
      if (skill) {
        await prisma.agentSkill.create({
          data: {
            agentId: agent.id,
            skillId: skill.id
          }
        });
      }
    }

    results.push({ Agent: data.name, Status: statusMsg });
  }

  // Print results as Markdown table
  console.log('| Agent | Status |');
  console.log('|---|---|');
  results.forEach(r => console.log(`| ${r.Agent} | ${r.Status} |`));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
