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
| PR4 | Alert engine                                       | ⏳ planned |
| PR5 | Analytics + Knowledge Suite integration           | ⏳ planned |
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
| `ALERT_GENERATED`        | `social-intelligence.alert.generated`   | (PR4) An alert fires.           |
| `TREND_DETECTED`         | `social-intelligence.trend.detected`    | (PR5) A trend is detected.      |
| `RECOMMENDATION_GENERATED`| `social-intelligence.recommendation.generated` | (PR5) Recommendations produced. |

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

## Extending with a new network

1. Implement `ISocialConnector` (see `connectors/facebook/facebook.connector.ts`).
2. Add it to the `SOCIAL_CONNECTORS` factory in `social-intelligence.module.ts`.

Nothing else in the collector, pipeline, or core changes (Open/Closed).
