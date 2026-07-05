import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../../common/database/database.service';
import { PublisherEngine } from '../publisher/publisher.engine';

@Injectable()
export class SocialSchedulerService {
  private readonly logger = new Logger(SocialSchedulerService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly publisherEngine: PublisherEngine,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPublishing() {
    this.logger.log('Checking publishing queue for scheduled social posts...');
    const now = new Date();

    try {
      const itemsToPublish = await this.db.mysql.publishingQueue.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: now },
        },
      });

      if (itemsToPublish.length === 0) {
        return;
      }

      this.logger.log(`Found ${itemsToPublish.length} social posts ready for publishing.`);

      for (const item of itemsToPublish) {
        this.logger.log(`Executing publication for queue item: ${item.id}`);
        await this.publisherEngine.publishQueueItem(item.id);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled social publishing queue', error);
    }
  }
}
