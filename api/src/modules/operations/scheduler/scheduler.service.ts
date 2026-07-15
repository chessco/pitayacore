import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/common/database/database.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  constructor(private readonly db: DatabaseService) {}
}
