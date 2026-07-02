import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CommunicationEventBusService {
  private readonly logger = new Logger(CommunicationEventBusService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  publish(event: string, payload: any): void {
    this.logger.debug(`Publishing event: ${event}`);
    this.eventEmitter.emit(event, payload);
  }
}
