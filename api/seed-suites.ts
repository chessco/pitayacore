import { PrismaClient } from '@prisma/mysql-client';

const prisma = new PrismaClient();

const registryData = [
  {
    suite: { name: 'Vision Suite', slug: 'vision-suite', description: 'Capacidades visuales.' },
    skills: [
      {
        slug: 'vision-analysis', name: 'Vision Analysis', description: 'Analiza imágenes y contenido visual.',
        actions: ['analyze_image', 'classify_image', 'detect_patterns', 'visual_summary']
      },
      {
        slug: 'ocr-analysis', name: 'OCR Analysis', description: 'Extracción de texto y lectura de documentos.',
        actions: ['extract_text', 'document_reading', 'structured_extraction']
      },
      {
        slug: 'logo-detection', name: 'Logo Detection', description: 'Detección de logos e identificación de marca.',
        actions: ['detect_logo', 'identify_brand', 'competitor_detection']
      },
      {
        slug: 'brand-compliance', name: 'Brand Compliance', description: 'Validación de branding.',
        actions: ['validate_branding', 'visual_guidelines_check']
      },
      {
        slug: 'ad-analysis', name: 'Ad Analysis', description: 'Análisis de anuncios y conversiones.',
        actions: ['analyze_ad', 'conversion_review', 'engagement_review']
      }
    ]
  },
  {
    suite: { name: 'Knowledge Suite', slug: 'knowledge-suite', description: 'Capacidades documentales y RAG.' },
    skills: [
      {
        slug: 'knowledge-search', name: 'Knowledge Search', description: 'Búsqueda en base de conocimiento.',
        actions: ['rag_search', 'semantic_search', 'document_lookup']
      },
      {
        slug: 'knowledge-ingestion', name: 'Knowledge Ingestion', description: 'Ingesta de conocimiento.',
        actions: ['document_ingestion', 'embedding_generation', 'chunk_generation']
      },
      {
        slug: 'memory-retrieval', name: 'Memory Retrieval', description: 'Recuperación de memoria.',
        actions: ['memory_lookup', 'context_retrieval', 'semantic_memory']
      },
      {
        slug: 'document-intelligence', name: 'Document Intelligence', description: 'Inteligencia documental.',
        actions: ['summarize_document', 'extract_entities', 'classify_document']
      }
    ]
  },
  {
    suite: { name: 'Analytics Suite', slug: 'analytics-suite', description: 'Predicción y análisis.' },
    skills: [
      {
        slug: 'forecast-engine', name: 'Forecast Engine', description: 'Motor de pronósticos.',
        actions: ['forecast', 'trend_prediction', 'demand_projection']
      },
      {
        slug: 'recommendation-engine', name: 'Recommendation Engine', description: 'Motor de recomendaciones.',
        actions: ['optimization', 'recommendations', 'scenario_generation']
      },
      {
        slug: 'kpi-engine', name: 'KPI Engine', description: 'Motor de KPIs.',
        actions: ['calculate_kpis', 'benchmark_analysis', 'trend_monitoring']
      },
      {
        slug: 'anomaly-detection', name: 'Anomaly Detection', description: 'Detección de anomalías.',
        actions: ['detect_anomalies', 'identify_risks', 'threshold_alerts']
      }
    ]
  },
  {
    suite: { name: 'Monitoring Suite', slug: 'monitoring-suite', description: 'Monitoreo y alertas.' },
    skills: [
      {
        slug: 'monitoring-engine', name: 'Monitoring Engine', description: 'Motor de monitoreo.',
        actions: ['monitor_metric', 'monitor_device', 'monitor_event']
      },
      {
        slug: 'alert-engine', name: 'Alert Engine', description: 'Motor de alertas.',
        actions: ['trigger_alert', 'escalation', 'notification_dispatch']
      },
      {
        slug: 'event-engine', name: 'Event Engine', description: 'Motor de eventos.',
        actions: ['event_detection', 'event_classification', 'event_correlation']
      }
    ]
  },
  {
    suite: { name: 'Marketing Suite', slug: 'marketing-suite', description: 'Marketing y crecimiento.' },
    skills: [
      {
        slug: 'marketing-intelligence', name: 'Marketing Intelligence', description: 'Inteligencia de marketing.',
        actions: ['market_analysis', 'trend_detection', 'audience_analysis']
      },
      {
        slug: 'competitor-intelligence', name: 'Competitor Intelligence', description: 'Inteligencia de competidores.',
        actions: ['website_analysis', 'competitor_analysis', 'positioning_analysis']
      },
      {
        slug: 'content-generator', name: 'Content Generator', description: 'Generador de contenido.',
        actions: ['blog_generation', 'social_generation', 'campaign_generation']
      }
    ]
  },
  {
    suite: { name: 'Sales Suite', slug: 'sales-suite', description: 'Ventas y CRM.' },
    skills: [
      {
        slug: 'crm-intelligence', name: 'CRM Intelligence', description: 'Inteligencia de CRM.',
        actions: ['lead_scoring', 'opportunity_scoring', 'pipeline_analysis']
      },
      {
        slug: 'proposal-generator', name: 'Proposal Generator', description: 'Generador de propuestas.',
        actions: ['quotation_generation', 'proposal_generation', 'scope_generation']
      },
      {
        slug: 'sales-coach', name: 'Sales Coach', description: 'Coach de ventas.',
        actions: ['objection_handling', 'negotiation_support', 'meeting_preparation']
      }
    ]
  },
  {
    suite: { name: 'Creative Suite', slug: 'creative-suite', description: 'Contenido multimedia.' },
    skills: [
      {
        slug: 'creative-generation', name: 'Creative Generation', description: 'Generación creativa.',
        actions: ['image_generation', 'video_generation', 'avatar_generation']
      },
      {
        slug: 'prompt-engine', name: 'Prompt Engine', description: 'Motor de prompts.',
        actions: ['prompt_creation', 'prompt_optimization', 'prompt_validation']
      },
      {
        slug: 'creative-review', name: 'Creative Review', description: 'Revisión creativa.',
        actions: ['quality_review', 'improvement_suggestions', 'content_scoring']
      }
    ]
  },
  {
    suite: { name: 'Communication Suite', slug: 'communication-suite', description: 'Mensajería y notificaciones.' },
    skills: [
      {
        slug: 'email-sender', name: 'Email Sender', description: 'Envíos por email.',
        actions: ['send_email', 'schedule_email']
      },
      {
        slug: 'whatsapp-messaging', name: 'WhatsApp Messaging', description: 'Mensajería de WhatsApp.',
        actions: ['send_message', 'send_template', 'send_campaign']
      },
      {
        slug: 'notification-center', name: 'Notification Center', description: 'Centro de notificaciones.',
        actions: ['push_notification', 'alert_dispatch', 'user_notification']
      }
    ]
  },
  {
    suite: { name: 'Engineering Suite', slug: 'engineering-suite', description: 'Arquitectura y desarrollo.' },
    skills: [
      {
        slug: 'saas-architect', name: 'SaaS Architect', description: 'Arquitecto SaaS.',
        actions: ['architecture_design', 'module_design', 'entity_design']
      },
      {
        slug: 'architecture-auditor', name: 'Architecture Auditor', description: 'Auditor de arquitectura.',
        actions: ['audit_architecture', 'audit_multitenancy', 'audit_rbac']
      },
      {
        slug: 'workflow-designer', name: 'Workflow Designer', description: 'Diseñador de flujos de trabajo.',
        actions: ['workflow_creation', 'workflow_validation', 'workflow_optimization']
      },
      {
        slug: 'code-analysis', name: 'Code Analysis', description: 'Análisis de código.',
        actions: ['static_analysis', 'dependency_analysis', 'quality_review']
      }
    ]
  },
  {
    suite: { name: 'Platform Suite', slug: 'platform-suite', description: 'Capacidades del sistema.' },
    skills: [
      {
        slug: 'feature-flag-manager', name: 'Feature Flag Manager', description: 'Gestor de Feature Flags.',
        actions: ['enable_feature', 'disable_feature', 'validate_feature']
      },
      {
        slug: 'tenant-manager', name: 'Tenant Manager', description: 'Gestor de Tenants.',
        actions: ['tenant_validation', 'tenant_configuration', 'tenant_audit']
      },
      {
        slug: 'usage-monitor', name: 'Usage Monitor', description: 'Monitor de uso.',
        actions: ['usage_tracking', 'quota_tracking', 'cost_tracking']
      }
    ]
  }
];

async function main() {
  const firstTenant = await prisma.tenant.findFirst();
  if (!firstTenant) {
    console.error('No tenants found. Please create a tenant before seeding skills.');
    process.exit(1);
  }
  const tenantId = firstTenant.id;

  let totalSuites = 0;
  let totalSkills = 0;
  let totalActions = 0;

  for (const group of registryData) {
    // Upsert Suite
    const suite = await prisma.suite.upsert({
      where: { slug: group.suite.slug },
      update: {
        name: group.suite.name,
        description: group.suite.description
      },
      create: {
        slug: group.suite.slug,
        name: group.suite.name,
        description: group.suite.description
      }
    });
    totalSuites++;

    for (const s of group.skills) {
      // Look for skill by slug or by id (some old seeds might have used the slug as the id)
      let skill = await prisma.skill.findFirst({
        where: { OR: [ { slug: s.slug }, { id: s.slug } ] }
      });

      if (skill) {
        skill = await prisma.skill.update({
          where: { id: skill.id },
          data: {
            slug: s.slug,
            name: s.name,
            description: s.description,
            suiteId: suite.id,
            category: group.suite.slug
          }
        });
      } else {
        skill = await prisma.skill.create({
          data: {
            tenantId,
            slug: s.slug,
            name: s.name,
            description: s.description,
            suiteId: suite.id,
            category: group.suite.slug,
            status: 'PRODUCTION'
          }
        });
      }
      totalSkills++;

      // Create Actions
      // Delete existing to idempotently re-insert them
      await prisma.skillAction.deleteMany({
        where: { skillId: skill.id }
      });

      for (const action of s.actions) {
        await prisma.skillAction.create({
          data: {
            skillId: skill.id,
            action: action,
            description: `Action ${action} for ${s.name}`
          }
        });
        totalActions++;
      }
      
      // Upsert a default Provider configuration just as an example (since prompt asks for it)
      // "No acoplar ninguna Skill a un proveedor específico. Usar Provider Pattern."
      // Let's add an empty config for OpenAI just to show capability
      await prisma.skillProvider.upsert({
        where: {
          skillId_provider: { skillId: skill.id, provider: 'openai' }
        },
        update: {},
        create: {
          skillId: skill.id,
          provider: 'openai',
          configuration: {}
        }
      });
    }
  }

  console.log('| Suite | Skills |');
  console.log('|-------|--------|');
  for (const group of registryData) {
    console.log(`| ${group.suite.name} | ${group.skills.length} |`);
  }
  
  console.log(`\nTotal Suites: ${totalSuites}`);
  console.log(`Total Skills: ${totalSkills}`);
  console.log(`Total Actions: ${totalActions}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
