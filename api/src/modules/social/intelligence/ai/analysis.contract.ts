import { Type } from '@google/genai';

export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Named-entity types recognized by Agent 5. */
export type EntityType =
  | 'PERSON'
  | 'MUNICIPALITY'
  | 'COLONY'
  | 'INSTITUTION'
  | 'DEPENDENCY'
  | 'ORGANIZATION'
  | 'PARTY'
  | 'CANDIDATE';

export interface RecognizedEntity {
  /** One of EntityType, though the model may occasionally return other labels. */
  type: string;
  value: string;
}

/**
 * Combined output of the 7 analysis agents. Implemented as a single structured
 * Gemini call for cost/latency; the schema is organized per-agent so any agent
 * can later be split into its own call without touching consumers.
 */
export interface AnalysisResult {
  language: string; // Agent 1 — ISO code, e.g. "es"
  summary: string; // Agent 2
  sentiment: Sentiment; // Agent 3
  sentimentScore: number; // Agent 3 — -1..1
  topics: string[]; // Agent 4 — from the configured catalog
  entities: RecognizedEntity[]; // Agent 5
  riskLevel: RiskLevel; // Agent 6
  recommendations: string[]; // Agent 7 — suggested human actions (never auto-executed)
}

/** Gemini `responseSchema` mirroring AnalysisResult. */
export const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    language: { type: Type.STRING },
    summary: { type: Type.STRING },
    sentiment: {
      type: Type.STRING,
      enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED'],
    },
    sentimentScore: { type: Type.NUMBER },
    topics: { type: Type.ARRAY, items: { type: Type.STRING } },
    entities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          value: { type: Type.STRING },
        },
        required: ['type', 'value'],
      },
    },
    riskLevel: {
      type: Type.STRING,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'language',
    'summary',
    'sentiment',
    'sentimentScore',
    'topics',
    'entities',
    'riskLevel',
    'recommendations',
  ],
};
