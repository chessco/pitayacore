import { Injectable } from '@nestjs/common';

/**
 * Top-level SIS service. Currently exposes module metadata / health; heavier
 * responsibilities live in the dedicated collector, pipeline, alert and
 * analytics services.
 */
@Injectable()
export class SocialIntelligenceService {
  health() {
    return {
      module: 'social-intelligence',
      status: 'ok',
      version: '0.1.0',
      sources: ['FACEBOOK'],
    };
  }
}
