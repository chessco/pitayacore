import { PrismaClient } from '@prisma/mysql-client';

const prisma = new PrismaClient();

/**
 * Default provider registry for the Social Suite provider-management platform.
 * Run: `npx ts-node prisma/seeds/seed-providers.ts`
 * Idempotent (upsert by unique `code`).
 */
const PROVIDERS = [
  {
    code: 'FACEBOOK',
    displayName: 'Facebook',
    category: 'Social',
    version: 'v21.0',
    oauthEnabled: true,
    publishingEnabled: true,
    analyticsEnabled: true,
    realtimeEnabled: true,
    webhookEnabled: true,
    supportsRefreshToken: false,
    supportsMultipleAccounts: true,
    documentationUrl: 'https://developers.facebook.com/docs/graph-api',
    icon: 'facebook',
  },
  {
    code: 'INSTAGRAM',
    displayName: 'Instagram',
    category: 'Social',
    version: 'v21.0',
    oauthEnabled: true,
    publishingEnabled: true,
    analyticsEnabled: true,
    realtimeEnabled: false,
    webhookEnabled: true,
    supportsRefreshToken: false,
    supportsMultipleAccounts: true,
    documentationUrl: 'https://developers.facebook.com/docs/instagram-api',
    icon: 'instagram',
  },
  {
    code: 'X',
    displayName: 'X (Twitter)',
    category: 'Social',
    version: '2',
    oauthEnabled: true,
    publishingEnabled: true,
    analyticsEnabled: true,
    realtimeEnabled: true,
    webhookEnabled: false,
    supportsRefreshToken: true,
    supportsMultipleAccounts: true,
    documentationUrl: 'https://developer.twitter.com/en/docs',
    icon: 'x',
  },
  {
    code: 'LINKEDIN',
    displayName: 'LinkedIn',
    category: 'Social',
    version: 'v2',
    oauthEnabled: true,
    publishingEnabled: true,
    analyticsEnabled: true,
    realtimeEnabled: false,
    webhookEnabled: false,
    supportsRefreshToken: true,
    supportsMultipleAccounts: true,
    documentationUrl: 'https://learn.microsoft.com/en-us/linkedin/',
    icon: 'linkedin',
  },
  {
    code: 'TIKTOK',
    displayName: 'TikTok',
    category: 'Social',
    version: 'v2',
    oauthEnabled: true,
    publishingEnabled: true,
    analyticsEnabled: true,
    realtimeEnabled: false,
    webhookEnabled: false,
    supportsRefreshToken: true,
    supportsMultipleAccounts: false,
    documentationUrl: 'https://developers.tiktok.com/',
    icon: 'tiktok',
  },
  {
    code: 'YOUTUBE',
    displayName: 'YouTube',
    category: 'Video',
    version: 'v3',
    oauthEnabled: true,
    publishingEnabled: true,
    analyticsEnabled: true,
    realtimeEnabled: false,
    webhookEnabled: true,
    supportsRefreshToken: true,
    supportsMultipleAccounts: true,
    documentationUrl: 'https://developers.google.com/youtube/v3',
    icon: 'youtube',
  },
  {
    code: 'WHATSAPP_BUSINESS',
    displayName: 'WhatsApp Business',
    category: 'Messaging',
    version: 'v21.0',
    oauthEnabled: true,
    publishingEnabled: true,
    analyticsEnabled: false,
    realtimeEnabled: true,
    webhookEnabled: true,
    supportsRefreshToken: false,
    supportsMultipleAccounts: true,
    documentationUrl: 'https://developers.facebook.com/docs/whatsapp',
    icon: 'whatsapp',
  },
  {
    code: 'GOOGLE_NEWS',
    displayName: 'Google News',
    category: 'News',
    version: '1',
    oauthEnabled: false,
    publishingEnabled: false,
    analyticsEnabled: false,
    realtimeEnabled: false,
    webhookEnabled: false,
    supportsRefreshToken: false,
    supportsMultipleAccounts: false,
    documentationUrl: 'https://news.google.com/',
    icon: 'google-news',
  },
  {
    code: 'RSS',
    displayName: 'RSS Feeds',
    category: 'News',
    version: '2.0',
    oauthEnabled: false,
    publishingEnabled: false,
    analyticsEnabled: false,
    realtimeEnabled: false,
    webhookEnabled: false,
    supportsRefreshToken: false,
    supportsMultipleAccounts: true,
    documentationUrl: 'https://www.rssboard.org/rss-specification',
    icon: 'rss',
  },
  {
    code: 'WEBSITE',
    displayName: 'Websites',
    category: 'Web',
    version: '1',
    oauthEnabled: false,
    publishingEnabled: false,
    analyticsEnabled: false,
    realtimeEnabled: false,
    webhookEnabled: false,
    supportsRefreshToken: false,
    supportsMultipleAccounts: true,
    documentationUrl: null,
    icon: 'globe',
  },
  {
    code: 'BLOG',
    displayName: 'Blogs',
    category: 'Web',
    version: '1',
    oauthEnabled: false,
    publishingEnabled: false,
    analyticsEnabled: false,
    realtimeEnabled: false,
    webhookEnabled: false,
    supportsRefreshToken: false,
    supportsMultipleAccounts: true,
    documentationUrl: null,
    icon: 'book-open',
  },
];

async function main() {
  console.log(`Seeding ${PROVIDERS.length} social providers...`);
  for (const p of PROVIDERS) {
    await prisma.socialProvider.upsert({
      where: { code: p.code },
      update: { ...p, status: 'ACTIVE' },
      create: { ...p, status: 'ACTIVE' },
    });
    console.log(`  ✓ ${p.code} (${p.displayName})`);
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
