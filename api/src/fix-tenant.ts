import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  console.log('--- Iniciando Corrección de Inquilino ---');

  try {
    const tenant = await prisma.tenant.findFirst({
      where: { name: { contains: 'Acuaequipos' } },
    });

    if (!tenant) {
      console.error('ERROR: No se encontró el inquilino Acuaequipos');
      return;
    }

    console.log(`ID Encontrado: ${tenant.id} (${tenant.name})`);

    const result = await prisma.user.update({
      where: { email: 'admin@pitayacode.io' },
      data: { tenantId: tenant.id },
    });

    console.log(`EXITO: Usuario ${result.email} vinculado correctamente.`);
  } catch (error) {
    console.error('Error durante la ejecución:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
