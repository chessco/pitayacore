import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { ProviderRegistry } from '../providers/provider.registry';
import { HumanizerEngine } from '../humanizer/humanizer.engine';
import { SocialMemoryService } from '../memory/social-memory.service';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class PublisherEngine {
  private readonly logger = new Logger(PublisherEngine.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly providerRegistry: ProviderRegistry,
    private readonly humanizerEngine: HumanizerEngine,
    private readonly memoryService: SocialMemoryService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Complete Content Generation Flow (Copywriter + Designer + Humanizer + Compliance)
   */
  async generateContentPiece(
    tenantId: string,
    brandId: string,
    campaignId: string | null,
    contentType: string,
    title: string,
    topicPrompt: string,
  ) {
    this.logger.log(
      `Generating content piece '${title}' for tenant ${tenantId}`,
    );

    // 1. Fetch Brand settings
    const brand = await this.db.mysql.socialBrand.findFirst({
      where: { id: brandId, tenantId },
    });
    if (!brand) {
      throw new NotFoundException(`Brand ${brandId} not found`);
    }

    // Convert JSON fields
    const tone = brand.tone ? JSON.stringify(brand.tone) : 'profesional';
    const personality = brand.personality
      ? JSON.stringify(brand.personality)
      : 'empático';
    const prohibitedTerms = (brand.prohibitedTerms as string[]) || [];

    // 2. Call Copywriter Agent (LLM)
    const copywriterPrompt = `Actúa como Copywriter Agent de redes sociales para la marca '${brand.name}' (${brand.industry}).
Tono de la marca: ${tone}
Personalidad: ${personality}
Tema: "${topicPrompt}"
Tipo de contenido: ${contentType}
Genera una publicación atractiva y persuasiva para redes sociales.`;

    const rawContent = await this.aiService.generateRaw(
      copywriterPrompt,
      'gemini-2.5-flash',
    );

    // 3. Call Designer Agent (LLM) to suggest assets / visuals
    const designerPrompt = `Actúa como Designer Agent para la marca '${brand.name}'.
Propón 2-3 sugerencias de imágenes, carruseles o contenido visual para acompañar este post:
"${rawContent.substring(0, 150)}..."`;
    const designSuggestions = await this.aiService.generateRaw(
      designerPrompt,
      'gemini-2.5-flash',
    );

    // 4. Call Humanizer Engine
    const humanizedContent = await this.humanizerEngine.humanize(rawContent, {
      tone: brand.tone as string,
      personality: brand.personality as string,
      platform: 'LINKEDIN',
      country: brand.country || 'México',
      language: brand.language || 'es',
      ctaStyle: brand.ctaStyle || 'conversacional',
      allowedEmojis: (brand.allowedEmojis as string[]) || undefined,
      prohibitedTerms: prohibitedTerms,
    });

    // 5. Call Compliance Agent to audit content
    let status = 'APPROVED';
    const complianceChecks: string[] = [];

    for (const term of prohibitedTerms) {
      if (humanizedContent.toLowerCase().includes(term.toLowerCase())) {
        status = 'DRAFT';
        complianceChecks.push(`Contiene el término prohibido '${term}'`);
      }
    }

    const metadata = {
      designSuggestions,
      complianceChecks,
      compliancePassed: status === 'APPROVED',
    };

    // 6. Create Content Piece in MySQL
    const contentPiece = await this.db.mysql.socialContentPiece.create({
      data: {
        tenantId,
        brandId,
        campaignId,
        contentType,
        title,
        prompt: topicPrompt,
        rawContent,
        humanizedContent,
        mediaUrls: [],
        status,
        metadata,
      },
    });

    // 7. Index in semantic memory
    await this.memoryService.indexMemory(
      tenantId,
      contentPiece.id,
      'BRAND_MEMORY',
      `Marca: ${brand.name}. Título: ${title}. Contenido humanizado: ${humanizedContent}`,
    );

    return contentPiece;
  }

  /**
   * Queue content piece for scheduled publishing
   */
  async approveAndQueue(
    tenantId: string,
    contentId: string,
    provider: string,
    scheduledAt: Date,
  ) {
    const contentPiece = await this.db.mysql.socialContentPiece.findFirst({
      where: { id: contentId, tenantId },
    });
    if (!contentPiece) {
      throw new NotFoundException(`Content piece ${contentId} not found`);
    }

    // Update content piece status to APPROVED
    await this.db.mysql.socialContentPiece.update({
      where: { id: contentId },
      data: { status: 'APPROVED' },
    });

    // Create Queue item
    return this.db.mysql.publishingQueue.create({
      data: {
        tenantId,
        campaignId: contentPiece.campaignId,
        contentId: contentPiece.id,
        provider,
        scheduledAt,
        status: 'PENDING',
      },
    });
  }

  /**
   * Publish a specific queue item via Social Provider
   */
  async publishQueueItem(queueItemId: string): Promise<boolean> {
    const queueItem = await this.db.mysql.publishingQueue.findUnique({
      where: { id: queueItemId },
      include: { contentPiece: true },
    });

    if (!queueItem || queueItem.status !== 'PENDING') {
      return false;
    }

    // Mark as RUNNING
    await this.db.mysql.publishingQueue.update({
      where: { id: queueItemId },
      data: { status: 'RUNNING' },
    });

    try {
      const providerInstance = this.providerRegistry.getProvider(
        queueItem.provider,
      );
      const mediaUrls = (queueItem.contentPiece.mediaUrls as string[]) || [];

      // Execute actual mock publish
      const result = await providerInstance.publish(
        queueItem.tenantId,
        queueItem.contentPiece.humanizedContent ||
          queueItem.contentPiece.rawContent ||
          '',
        mediaUrls,
      );

      if (result.success) {
        // Update Queue success
        await this.db.mysql.publishingQueue.update({
          where: { id: queueItemId },
          data: {
            status: 'SUCCESS',
            publishedAt: new Date(),
            metadata: { externalId: result.externalId, url: result.url },
          },
        });

        // Update Content Piece published status
        await this.db.mysql.socialContentPiece.update({
          where: { id: queueItem.contentId },
          data: { status: 'PUBLISHED' },
        });

        // Seed initial mock analytics for this post
        await this.db.mysql.postAnalytics.create({
          data: {
            tenantId: queueItem.tenantId,
            campaignId: queueItem.campaignId,
            contentId: queueItem.contentId,
            provider: queueItem.provider,
            reach: Math.floor(Math.random() * 200) + 50,
            impressions: Math.floor(Math.random() * 300) + 70,
            engagement: Math.floor(Math.random() * 30) + 5,
            clicks: Math.floor(Math.random() * 10) + 1,
            ctr: parseFloat((Math.random() * 3 + 1).toFixed(2)),
            conversions: Math.floor(Math.random() * 2),
            cost: 0,
            roi: 0,
          },
        });

        // Index in Performance Memory
        await this.memoryService.indexMemory(
          queueItem.tenantId,
          queueItem.id,
          'PERFORMANCE_MEMORY',
          `Publicación exitosa en ${queueItem.provider}. Contenido: ${queueItem.contentPiece.title}`,
        );

        this.logger.log(
          `Queue item ${queueItemId} successfully published to ${queueItem.provider}`,
        );
        return true;
      } else {
        throw new Error(result.error || 'Failed to publish');
      }
    } catch (error) {
      const attempts = queueItem.attempts + 1;
      const failed = attempts >= 3;

      await this.db.mysql.publishingQueue.update({
        where: { id: queueItemId },
        data: {
          status: failed ? 'FAILED' : 'PENDING',
          attempts,
          error: error.message,
        },
      });

      this.logger.error(
        `Error publishing queue item ${queueItemId}: ${error.message}`,
      );
      return false;
    }
  }
}
