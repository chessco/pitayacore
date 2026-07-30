import { Injectable, Logger } from '@nestjs/common';
import { JobsService } from '../../operations/jobs/jobs.service';

/**
 * Service responsible for managing Social-related Jobs in the Operations Suite.
 * For example, registering the default SOCIAL_COLLECTION job.
 */
@Injectable()
export class SocialJobsService {
  private readonly logger = new Logger(SocialJobsService.name);

  constructor(private readonly jobsService: JobsService) {}

  /**
   * Automatically registers scheduled jobs when a new Social Account is created
   * or when the system bootstraps.
   */
  async registerDefaultCollectionJob() {
    this.logger.log('Registering default SOCIAL_COLLECTION job...');

    // In a real scenario, this would query JobsService to check if it exists,
    // and if not, create it with a cronExpression (e.g. '0/30 * * * *').
    // Example:
    // await this.jobsService.create({
    //   name: 'Social Collection Sync',
    //   jobType: 'SOCIAL_COLLECTION',
    //   cronExpression: '*/30 * * * *',
    //   executionPlan: { action: 'trigger_social_collection' }
    // });
  }
}
