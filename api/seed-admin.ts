import { PrismaClient } from '@prisma/mysql-client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@pitayacode.io';
  const name = 'Admin';
  const password = process.env.ADMIN_PASSWORD || 'pitaya123';
  const hashedPassword = await bcrypt.hash(password, 10);
  // Default tenant ID used in init-skills-fixed.ts
  const tenantId = 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';

  let tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Acuaequipos',
      }
    });
    console.log('Created tenant Acuaequipos');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: tenant.id,
        status: 'ACTIVE'
      }
    });
    console.log(`Created user admin@pitayacode.io with password ${password}`);
  } else {
    console.log('User admin@pitayacode.io already exists');
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });
    console.log(`Updated user admin@pitayacode.io password to ${password}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
