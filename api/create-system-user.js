const { PrismaClient } = require('./node_modules/@prisma/mysql-client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO SCRIPT DE CONFIGURACIÓN ---');
  
  // 1. Log existing database status
  try {
    const tenants = await prisma.tenant.findMany();
    console.log('TENANTS IN DB:', JSON.stringify(tenants.map(t => ({ id: t.id, name: t.name })), null, 2));
    
    const existingAgents = await prisma.agent.findMany();
    console.log('AGENTS IN DB BEFORE SEED:', JSON.stringify(existingAgents.map(a => ({ id: a.id, slug: a.slug, name: a.name, tenantId: a.tenantId })), null, 2));
  } catch (err) {
    console.error('Error logging DB status:', err.message);
  }

  // 2. Seed Tenants & Users
  const email = 'system@pitayacode.io';
  const name = 'System Admin';
  const password = process.env.SYSTEM_PASSWORD || 'pitaya123';
  const role = 'SYSTEM';
  const tenantId = 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718'; 
  const hashedPassword = await bcrypt.hash(password, 10);

  // Buscar el tenant por ID, por nombre o simplemente el primero disponible
  let tenant = await prisma.tenant.findFirst({
    where: { OR: [{ id: tenantId }, { name: { contains: 'Acua' } }] }
  });

  if (!tenant) tenant = await prisma.tenant.findFirst();
  
  if (!tenant) {
    console.log('⚠️ No hay tenants, creando uno de sistema...');
    tenant = await prisma.tenant.create({
      data: { id: 'sys-tenant', name: 'Sistema PitayaCore' }
    });
  }

  const resolvedTenantId = tenant.id;
  console.log(`Resolved Tenant for admin and agents: ${tenant.name} (${resolvedTenantId})`);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        tenantId: resolvedTenantId,
        status: 'ACTIVE'
      }
    });
    console.log('✅ Usuario SYSTEM creado con éxito.');
  } else {
    console.log('✅ Usuario SYSTEM ya existe.');
  }

  // 3. Seed Agents (Safe Upsert by Slug)
  console.log('--- SEMBRANDO AGENTES ---');
  
  // Workspace Assistant Agent
  const existingWorkspaceAgent = await prisma.agent.findUnique({
    where: { slug: 'workspace-assistant' }
  });

  if (!existingWorkspaceAgent) {
    await prisma.agent.create({
      data: {
        name: 'Asistente de Workspace',
        slug: 'workspace-assistant',
        description: 'Asistente que gestiona y analiza las notas, documentos e ideas del Workspace.',
        prompt: 'Eres el Asistente de Workspace de PitayaCore AI. Tu función es analizar notas, documentos e ideas del Workspace para responder preguntas, resumir información y extraer conocimiento clave de forma proactiva.',
        tenantId: resolvedTenantId,
        version: '1.0',
        status: 'PRODUCTION',
        isActive: true,
        config: {}
      }
    });
    console.log('✅ Agente Asistente de Workspace creado.');
  } else {
    await prisma.agent.update({
      where: { slug: 'workspace-assistant' },
      data: {
        tenantId: resolvedTenantId,
        isActive: true,
        status: 'PRODUCTION'
      }
    });
    console.log('✅ Agente Asistente de Workspace actualizado y asignado.');
  }

  // Don Juan Agent
  const existingDonJuanAgent = await prisma.agent.findUnique({
    where: { slug: 'don-juan' }
  });

  if (!existingDonJuanAgent) {
    await prisma.agent.create({
      data: {
        name: 'Don Juan Camarón',
        slug: 'don-juan',
        description: 'Asesor Técnico Senior en Acuacultura',
        prompt: `Eres Don Juan Camarón, un asesor senior técnico experto en acuacultura. 
Tu estilo es profesional, directo y empoderador. No hables como un asistente virtual; habla como un colega experto.
REGLA DE IDIOMA: Responde ÚNICAMENTE en español. No mezcles idiomas. No uses encabezados en inglés como "DIAGNOSTIC", "ROOT CAUSE" o "ACTION PLAN". Usa exclusivamente "DIAGNÓSTICO", "CAUSA RAÍZ" y "PLAN DE ACCIÓN".
Evita muletillas de IA. Si no sabes algo, admítelo con criterio técnico y sugiere consultar parámetros específicos.`,
        tenantId: resolvedTenantId,
        version: '1.7',
        status: 'PRODUCTION',
        isActive: true,
        config: {}
      }
    });
    console.log('✅ Agente Don Juan Camarón creado.');
  } else {
    await prisma.agent.update({
      where: { slug: 'don-juan' },
      data: {
        tenantId: resolvedTenantId,
        isActive: true,
        status: 'PRODUCTION'
      }
    });
    console.log('✅ Agente Don Juan Camarón actualizado y asignado.');
  }

  const agents = await prisma.agent.findMany();
  console.log('AGENTS_IN_PROD:', JSON.stringify(agents.map(a => ({ id: a.id, slug: a.slug, name: a.name, tenantId: a.tenantId, status: a.status })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
