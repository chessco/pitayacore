# Social Intelligence Suite (SIS)

AI-driven, reusable social intelligence for PitayaCore. Collects public social
content, normalizes it, analyzes it with a 7-agent AI pipeline, and exposes it
to any vertical (Mando, AcuaCore, LuxuryOS…).

> **Add-only & decoupled.** This module does not modify any existing module,
> route, API, guard, or table. It integrates only through public exported
> services (`AiService` for embeddings) and its own domain-event bus. Its Prisma
> models use a scalar `tenantId` column with **no relation to `Tenant`**, so the
> existing schema is untouched.

## Status

| PR  | Scope                                             | State |
| --- | ------------------------------------------------- | ----- |
| PR1 | Foundation, schema, event bus, token crypto       | ✅    |
| PR2 | Facebook connector, connector CRUD, collector     | ✅    |
| PR3 | 7-agent AI pipeline, embeddings, content read API | ✅    |
| PR4 | Alert engine (configurable rules + generated alerts) | ✅  |
| PR5 | Analytics API + Knowledge Suite integration + trends | ✅  |
| PR6 | Sentinel AI dashboard (frontend)                  | ⏳ planned |
| PR7 | Mando adapter                                      | ⏳ planned |

## Required environment variables

Add these to `api/.env` (never commit real values — `.env` is gitignored):

| Var                      | Required | Default  | Purpose                                              |
| ------------------------ | -------- | -------- | ---------------------------------------------------- |
| `SIS_TOKEN_ENC_KEY`      | yes\*    | —        | Key for AES-256-GCM encryption of connector tokens.  |
| `FACEBOOK_GRAPH_VERSION` | no       | `v21.0`  | Graph API version.                                   |
| `FACEBOOK_APP_ID`        | no       | —        | Meta App id (reserved for future token exchange).    |
| `FACEBOOK_APP_SECRET`    | no       | —        | Meta App secret (reserved for future token exchange).|
| `SIS_TOPIC_CATALOG`      | no       | brief default | Comma-separated topic catalog for classification. |
| `SIS_KB_AUTOFEED_RISK`   | no       | `HIGH,CRITICAL` | Risk levels auto-fed to Knowledge Suite (`NONE` disables). |
| `SIS_TREND_MIN_SCORE`    | no       | `3`      | Min rise (current−previous) to emit `TREND_DETECTED`. |

\* Required as soon as a connector account is created (tokens cannot be encrypted without it). `GEMINI_API_KEY` (already used by PitayaCore) powers analysis + embeddings.

## Database

New MySQL models (in `api/prisma/mysql.prisma`): `SocialConnectorAccount`,
`SocialContentItem`, `SocialContentAnalysis`, `SocialAlertRule`, `SocialAlert`.
Embeddings reuse the existing Postgres `VectorRecord` table with `refType = 'SOCIAL'`.

Apply the additive schema (does **not** affect existing tables):

```bash
cd api
npx prisma db push  --schema=prisma/mysql.prisma
npx prisma generate --schema=prisma/mysql.prisma
```

## HTTP API

All routes live under `/social-intelligence` and are tenant-scoped via the
`x-tenant-id` header (global `CombinedAuthGuard` applies as everywhere else).

| Method | Path                                       | Description                              |
| ------ | ------------------------------------------ | ---------------------------------------- |
| GET    | `/social-intelligence/health`              | Liveness (public).                       |
| GET    | `/social-intelligence/connectors/supported`| List implemented source types.           |
| POST   | `/social-intelligence/connectors`          | Create a connector account (token encrypted). |
| GET    | `/social-intelligence/connectors`          | List connector accounts (token redacted).|
| GET    | `/social-intelligence/connectors/:id`      | Get one connector account.               |
| PATCH  | `/social-intelligence/connectors/:id`      | Update a connector account.              |
| DELETE | `/social-intelligence/connectors/:id`      | Delete a connector account.              |
| POST   | `/social-intelligence/connectors/:id/verify`| Validate credentials against the provider.|
| POST   | `/social-intelligence/connectors/:id/collect`| Trigger a collection run.               |
| GET    | `/social-intelligence/content`             | List collected content (+analysis). Query: `source`, `status`, `limit`. |
| GET    | `/social-intelligence/content/:id`         | Get one item with its analysis.          |
| POST   | `/social-intelligence/content/:id/analyze` | (Re)run the AI pipeline for one item.    |
| POST   | `/social-intelligence/alert-rules`         | Create an alert rule.                     |
| GET    | `/social-intelligence/alert-rules`         | List alert rules.                         |
| GET    | `/social-intelligence/alert-rules/:id`     | Get one alert rule.                       |
| PATCH  | `/social-intelligence/alert-rules/:id`     | Update an alert rule.                     |
| DELETE | `/social-intelligence/alert-rules/:id`     | Delete an alert rule.                     |
| GET    | `/social-intelligence/alerts`              | List generated alerts. Query: `status`, `severity`, `limit`. |
| GET    | `/social-intelligence/alerts/:id`          | Get one alert.                            |
| PATCH  | `/social-intelligence/alerts/:id/status`   | Set status: `OPEN`/`ACKNOWLEDGED`/`RESOLVED`. |
| GET    | `/social-intelligence/analytics/overview`  | Dashboard summary. Query: `windowDays`.   |
| GET    | `/social-intelligence/analytics/sentiment` | Sentiment distribution.                   |
| GET    | `/social-intelligence/analytics/topics`    | Top topics. Query: `windowDays`, `limit`. |
| GET    | `/social-intelligence/analytics/trends`    | Rising topics (current vs previous window). |
| GET    | `/social-intelligence/analytics/activity`  | Item counts by source.                    |
| GET    | `/social-intelligence/analytics/recommendations` | Recent recommendations.             |
| GET    | `/social-intelligence/analytics/alerts`    | Alert counts by severity/status.          |
| POST   | `/social-intelligence/knowledge/ingest/:contentItemId` | Push an analyzed item into Knowledge Suite. |

A `@Cron` job (`CollectorService.pollActiveConnectors`, every 30 min) collects
from every `ACTIVE` connector; failures are isolated per account.

## Domain events (`SisEventBus`)

Self-contained bus (Node `EventEmitter`), namespaced under `social-intelligence.`.
Import `SocialIntelligenceModule` and inject `SisEventBus` to subscribe.

| Constant                 | Name                                    | Emitted when                    |
| ------------------------ | --------------------------------------- | ------------------------------- |
| `CONTENT_COLLECTED`      | `social-intelligence.content.collected` | A new item is persisted.        |
| `CONTENT_ANALYZED`       | `social-intelligence.content.analyzed`  | Analysis completes.             |
| `TOPIC_DETECTED`         | `social-intelligence.topic.detected`    | A topic is found on an item.    |
| `ALERT_GENERATED`        | `social-intelligence.alert.generated`   | An alert rule fires.            |
| `TREND_DETECTED`         | `social-intelligence.trend.detected`    | A topic is rising (windowed).   |
| `RECOMMENDATION_GENERATED`| `social-intelligence.recommendation.generated` | Analysis produced recommendations. |

## AI pipeline (7 agents)

Run per item after collection, as a single structured-output call for
cost/latency (organized per-agent so any agent can be split out later):

1. Language detection · 2. Summarization · 3. Sentiment (POSITIVE/NEGATIVE/NEUTRAL/MIXED)
· 4. Topic classification (configurable catalog) · 5. Named-entity recognition
· 6. Risk classification (LOW/MEDIUM/HIGH/CRITICAL) · 7. Recommendation generator
(suggested human actions — **never auto-executed**).

Embeddings are generated via `AiService.getEmbedding` and stored in the existing
`VectorRecord` (`refType='SOCIAL'`). Embedding storage is best-effort and never
blocks analysis.

## Alert engine (PR4)

Rules are fully configurable per tenant. **Per-item** rules evaluate reactively
when an item is analyzed (via the `CONTENT_ANALYZED` event); **windowed** rules
evaluate every 15 minutes (`@Cron`) across tenants. Every firing creates a
`SocialAlert` and emits `ALERT_GENERATED`. Alerts are de-duplicated
(one per rule+item; one per rule+topic/window for windowed rules).

| `type`               | Mode      | `params`                                   | Fires when |
| -------------------- | --------- | ------------------------------------------ | ---------- |
| `CRITICAL_KEYWORDS`  | per-item  | `{ keywords: string[], severity? }`        | Content/summary contains any keyword. |
| `NEGATIVE_SENTIMENT` | per-item  | `{ scoreThreshold?, severity? }`           | Sentiment is NEGATIVE or score ≤ threshold (default -0.3). |
| `COMMENT_VOLUME`     | per-item  | `{ threshold, severity? }`                 | A post's public comment count ≥ threshold. |
| `MENTION_SPIKE`      | windowed  | `{ windowMinutes?, threshold, source?, severity? }` | Items collected in the window ≥ threshold. |
| `EMERGING_TOPIC`     | windowed  | `{ windowMinutes?, threshold, severity? }` | A topic appears ≥ threshold times in the window. |

`severity` (LOW/MEDIUM/HIGH/CRITICAL) is optional; each type has a sensible
default. Pure matching logic lives in `alerts/alert-matchers.ts` and is unit-tested.

Example rule body:

```json
{ "name": "Palabras críticas", "type": "CRITICAL_KEYWORDS",
  "params": { "keywords": ["corrupción", "fraude"], "severity": "CRITICAL" } }
```

## Analytics & Knowledge integration (PR5)

**Analytics** (`/social-intelligence/analytics/*`) are read-only aggregations for
the Sentinel dashboard (PR6) and Mando adapter (PR7). Scalar fields use Prisma
`groupBy`; JSON fields (topics/entities/recommendations) are aggregated in memory
over a bounded recent slice (cap 2000 rows, documented). `trends` compares a
topic's frequency in the current window vs the previous equal-length window; a
`@Cron` (every 3h) emits `TREND_DETECTED` for rising topics above
`SIS_TREND_MIN_SCORE` (default 3).

**Knowledge Suite** integration is via the public `KnowledgeIngestionService`
only (never writing KB tables directly). Analyzed items are ingested as KB
documents (summary + topics + entities + source). Auto-feed is opt-in by risk
level via `SIS_KB_AUTOFEED_RISK` (default `HIGH,CRITICAL`; `NONE` disables);
manual ingestion is always available via `POST /knowledge/ingest/:contentItemId`.

## Extending with a new network

1. Implement `ISocialConnector` (see `connectors/facebook/facebook.connector.ts`).
2. Add it to the `SOCIAL_CONNECTORS` factory in `social-intelligence.module.ts`.

Nothing else in the collector, pipeline, or core changes (Open/Closed).
