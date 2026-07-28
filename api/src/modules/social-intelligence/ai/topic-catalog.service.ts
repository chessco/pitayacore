import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Configurable topic catalog for classification (Agent 4). Defaults to the
 * catalog in the SIS brief; override via the `SIS_TOPIC_CATALOG` env var
 * (comma-separated). Per-tenant catalogs can layer on top of this later without
 * changing callers.
 */
@Injectable()
export class TopicCatalogService {
  static readonly DEFAULT: string[] = [
    'Seguridad',
    'Agua',
    'Economía',
    'Educación',
    'Salud',
    'Movilidad',
    'Infraestructura',
    'Corrupción',
    'Servicios Públicos',
    'Campaña',
    'Gobierno',
    'Otros',
  ];

  constructor(private readonly config: ConfigService) {}

  getCatalog(): string[] {
    const raw = this.config.get<string>('SIS_TOPIC_CATALOG');
    if (!raw) return TopicCatalogService.DEFAULT;
    const parsed = raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return parsed.length ? parsed : TopicCatalogService.DEFAULT;
  }
}
