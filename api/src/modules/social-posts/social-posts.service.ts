import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SocialPostsService {
  private readonly logger = new Logger(SocialPostsService.name);

  constructor(private readonly db: DatabaseService) {}

  async create(tenantId: string, data: any) {
    const post = await this.db.mysql.socialPost.create({
      data: {
        tenantId,
        platform: data.platform,
        content: data.content,
        mediaUrls: data.mediaUrls || [],
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });
    return post;
  }

  async findAll(tenantId: string) {
    return this.db.mysql.socialPost.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(tenantId: string, id: string) {
    return this.db.mysql.socialPost.delete({
      where: { id, tenantId },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPosts() {
    this.logger.log('Checking for scheduled social posts...');
    const now = new Date();
    
    try {
      const postsToPublish = await this.db.mysql.socialPost.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lte: now },
        },
      });

      if (postsToPublish.length === 0) {
        return;
      }

      this.logger.log(`Found ${postsToPublish.length} posts to publish.`);

      for (const post of postsToPublish) {
        // SIMULATE API CALL TO FACEBOOK/INSTAGRAM
        this.logger.log(`[SIMULATION] Publishing post ${post.id} to ${post.platform}`);
        this.logger.log(`[SIMULATION] Content: ${post.content}`);
        
        await this.db.mysql.socialPost.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });
        
        this.logger.log(`Successfully published post ${post.id}`);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled posts', error);
    }
  }
}
