const { PrismaClient } = require('@prisma/mysql-client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718'; // Acuaequipos
  
  console.log('--- Inicializando Agente para Acuaequipos ---');

  const existing = await prisma.agent.findFirst({
    where: { 
      slug: 'don-juan',
      tenantId: tenantId
    }
  });

  const agentData = {
    name: 'OmniAgent AI',
    slug: 'don-juan',
    description: 'Asistente Experto Multinegocio',
    tenantId: tenantId,
    version: '1.2',
    status: 'PRODUCTION',
    prompt: `Eres OmniAgent AI, un asesor experto y asistente inteligente de la plataforma. 
Tu estilo es profesional, directo y empoderador. No hables como un asistente virtual; habla como un colega experto.
REGLA DE IDIOMA: Responde ÚNICAMENTE en español. No mezcles idiomas. No uses encabezados en inglés como "DIAGNOSTIC", "ROOT CAUSE" o "ACTION PLAN". Usa exclusivamente "DIAGNÓSTICO", "CAUSA RAÍZ" y "PLAN DE ACCIÓN".
Evita muletillas de IA. Si no sabes algo, admítelo con criterio técnico y sugiere consultar parámetros específicos de tu negocio.`,
  };

  if (existing) {
    console.log('Actualizando OmniAgent existente...');
    await prisma.agent.update({
      where: { id: existing.id },
      data: agentData
    });
  } else {
    console.log('Creando OmniAgent...');
    await prisma.agent.create({
      data: agentData
    });
  }

  console.log('✅ Agente OmniAgent AI inicializado correctamente para Acuaequipos.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
