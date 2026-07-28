import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * SIS domain event names. Namespaced under `social-intelligence.` so they can
 * never collide with the existing Communication-module event bus.
 */
export const SIS_EVENTS = {
  CONTENT_COLLECTED: 'social-intelligence.content.collected',
  CONTENT_ANALYZED: 'social-intelligence.content.analyzed',
  ALERT_GENERATED: 'social-intelligence.alert.generated',
  TOPIC_DETECTED: 'social-intelligence.topic.detected',
  TREND_DETECTED: 'social-intelligence.trend.detected',
  RECOMMENDATION_GENERATED: 'social-intelligence.recommendation.generated',
} as const;

export class SocialContentCollectedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly contentItemId: string,
    public readonly source: string,
    public readonly type: string,
  ) {}
}

export class SocialContentAnalyzedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly contentItemId: string,
    public readonly sentiment?: string,
    public readonly riskLevel?: string,
    public readonly topics?: string[],
  ) {}
}

export class SocialAlertGeneratedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly alertId: string,
    public readonly type: string,
    public readonly severity: string,
  ) {}
}

export class TopicDetectedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly topic: string,
    public readonly contentItemId: string,
  ) {}
}

export class TrendDetectedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly topic: string,
    public readonly score: number,
  ) {}
}

export class RecommendationGeneratedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly contentItemId: string,
    public readonly recommendations: string[],
  ) {}
}

/**
 * Self-contained event bus owned entirely by SIS.
 *
 * Deliberately wraps Node's built-in EventEmitter instead of the app-global
 * `@nestjs/event-emitter` (which is only wired inside the Communication
 * module). This keeps SIS fully decoupled and touches no shared infrastructure.
 * Any module that imports SocialIntelligenceModule can inject this bus to
 * subscribe to SIS domain events.
 */
@Injectable()
export class SisEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // SIS can accumulate several internal subscribers (pipeline, alerts,
    // analytics, external consumers). Raise the cap to avoid warnings.
    this.emitter.setMaxListeners(50);
  }

  publish<T>(event: string, payload: T): void {
    this.emitter.emit(event, payload);
  }

  on<T>(event: string, handler: (payload: T) => void | Promise<void>): void {
    this.emitter.on(event, (payload: T) => {
      void handler(payload);
    });
  }
}
