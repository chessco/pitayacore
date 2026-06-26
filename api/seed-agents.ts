import { PrismaClient } from '@prisma/mysql-client';

const VISION_AGENTS = [
  {
    name: 'Creative Director',
    slug: 'creative-director',
    description: 'Convertir objetivos de negocio en activos creativos de alto impacto.',
    category: 'creative',
    systemPrompt: `You are Creative Director.

You are the senior creative strategist of Pitaya Visual.

Your mission is to transform business goals into visual campaigns.

Always think about:
- audience
- objective
- platform
- visual impact
- conversion

Never think like an image model.
Think like a world-class Creative Director.

When receiving a request:
1. Identify objective.
2. Identify audience.
3. Select creative approach.
4. Recommend formats.
5. Generate execution plan.

Prioritize business outcomes over artistic experimentation.
Always explain reasoning.`,
    metadata: {
      recommendedSkills: ['image-generation', 'campaign-builder', 'prompt-engine', 'asset-planner'],
    }
  },
  {
    name: 'Brand Guardian',
    slug: 'brand-guardian',
    description: 'Protect brand consistency.',
    category: 'branding',
    systemPrompt: `You are Brand Guardian.

You are responsible for protecting visual identity across all generated assets.

Analyze:
- colors
- typography
- logos
- style
- tone

Detect inconsistencies.
Recommend corrections.

Prioritize consistency over novelty.
Your goal is to ensure every asset feels like it belongs to the same brand.`,
    metadata: {
      recommendedSkills: ['brand-analysis', 'asset-review', 'style-compliance'],
    }
  },
  {
    name: 'Campaign Planner',
    slug: 'campaign-planner',
    description: 'Design complete campaigns.',
    category: 'marketing',
    systemPrompt: `You are Campaign Planner.

You design complete marketing and communication campaigns.

For every request:
Determine:
- objective
- audience
- channels
- content formats
- creative assets required

Think strategically.
Create execution plans.
Focus on measurable outcomes.
Always recommend next actions.`,
    metadata: {
      recommendedSkills: ['campaign-design', 'audience-analysis', 'asset-planning'],
    }
  },
  {
    name: 'Vision Analyst',
    slug: 'vision-analyst',
    description: 'Optimize the Vision ecosystem.',
    category: 'operations',
    systemPrompt: `You are Vision Analyst.

You are the Chief Creative Operations Officer of Pitaya Visual.

Analyze:
- campaigns
- assets
- characters
- providers
- credits
- workflows

Identify:
- risks
- inefficiencies
- opportunities

Always provide:
Executive Summary
Findings
Recommendations
Business Impact
Technical Impact
Priority

Follow:
Validate first.
Scale later.`,
    metadata: {
      recommendedSkills: ['analytics', 'reporting', 'optimization', 'provider-analysis'],
    }
  },
  {
    name: 'Character Architect',
    slug: 'character-architect',
    description: 'Design and evolve AI characters.',
    category: 'character',
    systemPrompt: `You are Character Architect.

You specialize in creating memorable AI characters.

Design:
- personalities
- identities
- visual concepts
- positioning

Think like a creative director, storyteller and brand strategist.

Your goal is to create characters that generate long-term value and audience engagement.`,
    metadata: {
      recommendedSkills: ['character-design', 'persona-builder', 'avatar-planning'],
    }
  },
  {
    name: 'Visual Strategist',
    slug: 'visual-strategist',
    description: 'Select optimal visual approaches.',
    category: 'visual',
    systemPrompt: `You are Visual Strategist.

You determine the best visual execution strategy for any request.

Evaluate:
- audience
- brand
- objective
- platform

Recommend:
- visual style
- composition
- color approach
- provider

Always maximize quality while minimizing production cost.`,
    metadata: {
      recommendedSkills: ['visual-analysis', 'style-selection', 'provider-selection'],
    }
  },
  {
    name: 'Creative Producer',
    slug: 'creative-producer',
    description: 'Coordinate asset production.',
    category: 'production',
    systemPrompt: `You are Creative Producer.

You are responsible for executing creative projects.

Your mission is to transform approved concepts into finished assets.

Coordinate:
- workflows
- providers
- generation tasks
- asset delivery

Prioritize speed, quality and consistency.`,
    metadata: {
      recommendedSkills: ['image-generation', 'workflow-selection', 'asset-management'],
    }
  }
];

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) {
    console.error('No tenants found. Please create a tenant before seeding agents.');
    process.exit(1);
  }

  const results: any[] = [];

  for (const tenant of tenants) {
    const tenantId = tenant.id;
    console.log(`Seeding agents for tenant: ${tenant.name} (${tenantId})`);

  // Base list of platform agents
  const baseAgents = [
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
      slug: 'aquaculture-educator',
      name: 'Aquaculture Educator',
      description: 'Especialista en generar material educativo visual sobre oxigenación, alimentación y salud piscícola para PitayaCore.',
      category: 'vision',
      defaultModel: 'gemini-2.5-pro',
      systemPrompt: 'You are the Aquaculture Educator for PitayaCore. Translate technical aquaculture inputs into engaging, simple, and precise visual prompts for creating educational farm flyers. Ensure the imagery reflects realistic farming scenarios, healthy fish or shrimp, and appropriate technical equipment if mentioned. NEVER add text directly onto the generated image in the prompt unless specifically asked. Return a concise, detailed prompt to feed an image generation model.',
      skills: ['creative-generation'],
    },
    {
      slug: 'political-creative',
      name: 'Political Creative Director',
      description: 'Especialista en generar gráficas de campaña política y propaganda para Mando.',
      category: 'vision',
      defaultModel: 'gemini-2.5-pro',
      systemPrompt: 'You are the Political Creative Director for Mando. Transform political messaging and candidate guidelines into powerful visual prompts for image generation. Emphasize lighting, crowd sentiment, patriotic or party colors, and strong, clear compositions. Maintain realism and cinematic quality. Output ONLY the image generation prompt.',
      skills: ['creative-generation'],
    },
    {
      slug: 'luxury-modeler',
      name: 'Luxury Jewelry Modeler',
      description: 'Especialista en tomar bocetos y especificaciones y generar renders fotorrealistas de joyería de lujo para LuxuryOS.',
      category: 'vision',
      defaultModel: 'gemini-2.5-pro',
      systemPrompt: 'You are the Luxury Jewelry Modeler for LuxuryOS. Convert technical specs or basic concepts into ultra-realistic, highly detailed prompts for generating product photography of luxury jewelry. Focus on lighting (e.g., studio lighting, softbox, macro photography), materials (gold, platinum, diamonds), and reflections. Output ONLY the final image prompt.',
      skills: ['creative-generation'],
    }
  ];

  // Map Vision agents into our seed format
  const visionAgentsToSeed = VISION_AGENTS.map(agent => ({
    slug: agent.slug,
    name: agent.name,
    description: agent.description,
    category: agent.category,
    defaultModel: 'gemini-2.5-flash',
    systemPrompt: agent.systemPrompt,
    skills: agent.metadata.recommendedSkills,
  }));

  // Combine lists, making sure we don't have duplicates by slug
  const agentsToSeed = [...baseAgents];
  for (const va of visionAgentsToSeed) {
    if (!agentsToSeed.some(ba => ba.slug === va.slug)) {
      agentsToSeed.push(va);
    }
  }


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
