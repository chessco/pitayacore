import { PrismaClient } from '@prisma/mysql-client';

const prisma = new PrismaClient();

const verticalsData = [
  { slug: 'vision', name: 'Vision', description: 'SaaS creativo impulsado por IA' },
  { slug: 'aquaculture', name: 'Aquaculture', description: 'PitayaCore SaaS' },
  { slug: 'political', name: 'Political', description: 'Mando SaaS' },
  { slug: 'jewelry', name: 'Jewelry', description: 'LuxuryOS SaaS' },
  { slug: 'legal', name: 'Legal', description: 'LegalAI SaaS' },
  { slug: 'lumo', name: 'Lumo', description: 'Educación' }
];

const featuresData = [
  'VISION', 'VISION_ANALYSIS', 'OCR', 'BRAND_STUDIO', 'CHARACTER_STUDIO',
  'IMAGE_GENERATION', 'VIDEO_GENERATION', 'CREATIVE_CHAT', 'ASSET_LIBRARY',
  'CAMPAIGNS', 'AGENTS', 'WORKFLOWS', 'SOCIAL_SUITE', 'AUDIENCE_STUDIO',
  'CAMPAIGN_STUDIO', 'CONTENT_STUDIO', 'SOCIAL_PUBLISHER', 'SOCIAL_ANALYTICS',
  'SOCIAL_MEMORY', 'SOCIAL_OPTIMIZER', 'SOCIAL_TRENDS'
];

const agentsData = [
  { slug: 'vision-analyst', name: 'Vision Analyst', description: 'Especialista en análisis visual.', category: 'VISION', defaultModel: 'gemini-1.5-pro' },
  { slug: 'creative-director', name: 'Creative Director', description: 'Especialista creativo.', category: 'CREATIVE', defaultModel: 'gemini-1.5-pro' },
  { slug: 'marketing-strategist', name: 'Marketing Strategist', description: 'Especialista en campañas.', category: 'MARKETING', defaultModel: 'gemini-1.5-pro' },
  { slug: 'brand-guardian', name: 'Brand Guardian', description: 'Especialista en cumplimiento de marca.', category: 'BRAND', defaultModel: 'gemini-1.5-pro' },
  { slug: 'campaign-planner', name: 'Campaign Planner', description: 'Especialista en planeación de campañas.', category: 'MARKETING', defaultModel: 'gemini-1.5-pro' },
  { slug: 'pitayacore-architect', name: 'PitayaCore Architect', description: 'Especialista en arquitectura SaaS.', category: 'ENGINEERING', defaultModel: 'gemini-1.5-pro' }
];

// Reutilizamos el data de registryData anterior, ajustado a lo que pide el Sprint 1:
const registryData = [
  {
    suite: { name: 'Vision Suite', slug: 'vision-suite', description: 'Capacidades visuales.' },
    skills: [
      { slug: 'vision-analysis', name: 'Vision Analysis', description: 'Analiza imágenes.', actions: ['analyze_image', 'classify_image', 'visual_summary', 'detect_patterns'] },
      { slug: 'ocr-analysis', name: 'OCR Analysis', description: 'Extracción de texto.', actions: ['extract_text', 'document_reading', 'structured_extraction'] },
      { slug: 'logo-detection', name: 'Logo Detection', description: 'Detección de logos.', actions: ['detect_logo', 'identify_brand', 'competitor_detection'] },
      { slug: 'brand-compliance', name: 'Brand Compliance', description: 'Validación de branding.', actions: ['validate_branding', 'visual_guidelines_check'] },
      { slug: 'ad-analysis', name: 'Ad Analysis', description: 'Análisis de anuncios.', actions: ['analyze_ad', 'engagement_review', 'conversion_review'] },
      { slug: 'creative-review', name: 'Creative Review', description: 'Revisión creativa.', actions: ['quality_review', 'improvement_suggestions', 'content_scoring'] }
    ]
  },
  {
    suite: { name: 'Creative Suite', slug: 'creative-suite', description: 'Contenido multimedia.' },
    skills: [
      { slug: 'image-generation', name: 'Image Generation', description: 'Generación de imágenes', actions: ['generate_image', 'edit_image', 'upscale_image'] },
      { slug: 'video-generation', name: 'Video Generation', description: 'Generación de videos', actions: ['generate_video', 'edit_video'] },
      { slug: 'character-training', name: 'Character Training', description: 'Entrenamiento de personajes', actions: ['create_character', 'train_lora', 'update_character'] },
      { slug: 'prompt-engine', name: 'Prompt Engine', description: 'Motor de prompts', actions: ['generate_prompt', 'optimize_prompt', 'validate_prompt'] },
      { slug: 'asset-search', name: 'Asset Search', description: 'Búsqueda de activos', actions: ['search_assets', 'semantic_asset_search'] }
    ]
  }
];

async function main() {
  console.log('Iniciando Foundation Sprint 1 Bootstrap...');
  
  const firstTenant = await prisma.tenant.findFirst();
  if (!firstTenant) {
    console.error('No tenants found. Se requiere al menos un tenant principal.');
    process.exit(1);
  }
  const tenantId = firstTenant.id;

  let counters = { verticals: 0, suites: 0, skills: 0, actions: 0, agents: 0, characters: 0, features: 0 };

  // 1. Features
  for (const f of featuresData) {
    await prisma.feature.upsert({
      where: { name: f },
      update: {},
      create: { name: f }
    });
    counters.features++;
  }

  // 2. Verticals
  const verticalMap = new Map();
  for (const v of verticalsData) {
    const vertical = await prisma.vertical.upsert({
      where: { slug: v.slug },
      update: { name: v.name, description: v.description },
      create: { slug: v.slug, name: v.name, description: v.description }
    });
    verticalMap.set(v.slug, vertical.id);
    counters.verticals++;
  }

  // 3. Suites & Skills
  for (const group of registryData) {
    const suite = await prisma.suite.upsert({
      where: { slug: group.suite.slug },
      update: { name: group.suite.name, description: group.suite.description },
      create: { slug: group.suite.slug, name: group.suite.name, description: group.suite.description }
    });
    counters.suites++;

    for (const s of group.skills) {
      let skill = await prisma.skill.findFirst({ where: { slug: s.slug } });
      if (skill) {
        skill = await prisma.skill.update({
          where: { id: skill.id },
          data: { name: s.name, description: s.description, suiteId: suite.id, category: group.suite.slug }
        });
      } else {
        skill = await prisma.skill.create({
          data: { tenantId, slug: s.slug, name: s.name, description: s.description, suiteId: suite.id, category: group.suite.slug, status: 'PRODUCTION' }
        });
      }
      counters.skills++;

      // Actions
      await prisma.skillAction.deleteMany({ where: { skillId: skill.id } });
      for (const action of s.actions) {
        await prisma.skillAction.create({
          data: { skillId: skill.id, action: action, description: `Action ${action}` }
        });
        counters.actions++;
      }
    }
  }

  // 4. Agent Templates
  for (const a of agentsData) {
    await prisma.agentTemplate.upsert({
      where: { slug: a.slug },
      update: { name: a.name, description: a.description, category: a.category, defaultModel: a.defaultModel },
      create: { slug: a.slug, name: a.name, description: a.description, category: a.category, defaultModel: a.defaultModel }
    });
    counters.agents++;
  }

  // 5. Characters
  const visionVerticalId = verticalMap.get('vision');
  if (visionVerticalId) {
    await prisma.character.upsert({
      where: { slug: 'alba' },
      update: { name: 'Alba', verticalId: visionVerticalId, status: 'active' },
      create: { tenantId, verticalId: visionVerticalId, slug: 'alba', name: 'Alba', status: 'active', systemPrompt: 'Alba is the Vision expert.' }
    });
    counters.characters++;
  }

  console.log('\n--- FOUNDATION METRICS ---');
  console.log(`Total Verticals:  ${counters.verticals}`);
  console.log(`Total Suites:     ${counters.suites}`);
  console.log(`Total Skills:     ${counters.skills}`);
  console.log(`Total Actions:    ${counters.actions}`);
  console.log(`Total Agents:     ${counters.agents}`);
  console.log(`Total Characters: ${counters.characters}`);
  console.log(`Total Features:   ${counters.features}`);
  console.log('--------------------------');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
