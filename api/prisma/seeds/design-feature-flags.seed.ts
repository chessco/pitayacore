/**
 * Design Suite Feature Flags Seed
 *
 * Run with:
 *   npx ts-node api/prisma/seeds/design-feature-flags.seed.ts
 *
 * Or integrate into your existing seed runner.
 */

import { PrismaClient } from '@prisma/mysql-client';

const prisma = new PrismaClient();

const DESIGN_FEATURES = [
  {
    name: 'Design Suite',
    slug: 'DESIGN_SUITE',
    description: 'Master feature flag for the entire Design Suite (Brand Engine + Theme Engine + White Label)',
    status: 'ACTIVE',
  },
  {
    name: 'Theme Engine',
    slug: 'THEME_ENGINE',
    description: 'Enables theme creation, activation, versioning, and rollback capabilities',
    status: 'ACTIVE',
  },
  {
    name: 'Brand Engine',
    slug: 'BRAND_ENGINE',
    description: 'Enables the Brand Engine — brand identity management and AI-powered brand analysis',
    status: 'ACTIVE',
  },
  {
    name: 'White Label',
    slug: 'WHITE_LABEL',
    description: 'Enables white-label configuration per tenant (logo, app name, colors, login screen, etc.)',
    status: 'ACTIVE',
  },
  {
    name: 'Theme Sync',
    slug: 'THEME_SYNC',
    description: 'Enables incremental theme synchronization with manifest and checksum validation',
    status: 'ACTIVE',
  },
  {
    name: 'Theme Cache',
    slug: 'THEME_CACHE',
    description: 'Enables server-side theme token caching for offline-capable client applications',
    status: 'ACTIVE',
  },
];

const DESIGN_PERMISSIONS = [
  { key: 'DESIGN_ADMIN', resource: 'design', action: 'admin', description: 'Full access to all Design Suite features' },
  { key: 'THEME_MANAGER', resource: 'design', action: 'manage_themes', description: 'Create, edit, activate, and delete themes' },
  { key: 'BRAND_MANAGER', resource: 'design', action: 'manage_brands', description: 'Create, edit, and delete brands' },
  { key: 'WHITE_LABEL_MANAGER', resource: 'design', action: 'manage_white_label', description: 'Configure white-label settings' },
  { key: 'THEME_VIEWER', resource: 'design', action: 'view_themes', description: 'Read-only access to themes and design tokens' },
];

async function main() {
  console.log('🎨 Seeding Design Suite feature flags...');

  for (const feature of DESIGN_FEATURES) {
    const existing = await prisma.feature.findUnique({ where: { name: feature.name } });
    if (!existing) {
      await prisma.feature.create({ data: feature });
      console.log(`  ✅ Feature flag created: ${feature.slug}`);
    } else {
      console.log(`  ⏭️  Feature flag already exists: ${feature.slug}`);
    }
  }

  console.log('\n🔐 Seeding Design Suite permissions...');

  for (const perm of DESIGN_PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { key: perm.key } });
    if (!existing) {
      await prisma.permission.create({ data: perm });
      console.log(`  ✅ Permission created: ${perm.key}`);
    } else {
      console.log(`  ⏭️  Permission already exists: ${perm.key}`);
    }
  }

  console.log('\n✨ Design Suite seed completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
