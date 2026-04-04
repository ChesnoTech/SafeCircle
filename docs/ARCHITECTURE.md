# SafeCircle — System Architecture

> Bilingual: English primary, Russian below each section (Русский перевод ниже каждого раздела)
>
> **Constraint: 100% free / open-source stack. Zero cost to launch.**

---

## Why Supabase as the Core

Instead of stitching together 10 separate services, **Supabase** gives us everything in one free platform:

| Need | Traditional (paid) | Supabase (free) |
|------|--------------------|-----------------|
| Database | AWS RDS ($50+/mo) | PostgreSQL + PostGIS included |
| Auth | Auth0 ($23+/mo) | Supabase Auth (50k MAU free) |
| Realtime | Pusher ($25+/mo) | Supabase Realtime (WebSocket) |
| File storage | S3 ($0.023/GB) | Supabase Storage (1GB free) |
| API layer | Custom + hosting | Auto-generated REST + realtime |
| Row-level security | Custom middleware | Built-in RLS policies |

This eliminates the need for Redis, separate auth service, separate storage service, and most of the backend API code. We write **database functions + security policies** and Supabase handles the rest.

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ iOS App      │  │ Android App  │  │ Web Dashboard        │  │
│  │ (React       │  │ (React       │  │ (Next.js on Vercel)  │  │
│  │  Native /    │  │  Native /    │  │ Admin + Law Enforce. │  │
│  │  Expo)       │  │  Expo)       │  │ FREE hosting         │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE (free tier — all-in-one)                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ PostgreSQL   │  │ Supabase     │  │ Supabase Storage     │  │
│  │ + PostGIS    │  │ Auth         │  │ (1GB free)           │  │
│  │              │  │              │  │                      │  │
│  │ Users        │  │ Email OTP    │  │ Photos               │  │
│  │ Reports      │  │ Phone OTP   │  │ Evidence             │  │
│  │ Geo data     │  │ Social      │  │ Documents            │  │
│  │ Patterns     │  │ JWT auto    │  │ Signed URLs          │  │
│  ├──────────────┤  └──────────────┘  └──────────────────────┘  │
│  │ Supabase     │                                               │
│  │ Realtime     │  Row-Level Security (RLS) = built-in API     │
│  │              │  No backend code needed for CRUD              │
│  │ WebSocket    │  Database functions for business logic        │
│  │ Pub/Sub      │                                               │
│  │ Presence     │  Edge Functions (Deno) for complex logic      │
│  └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          │                     │                     │
          ▼                     ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  FCM (free)      │ │ Cloudflare       │ │ FREE SERVICES        │
│                  │ │ (free tier)      │ │                      │
│ Push to iOS +    │ │                  │ │ Resend (email)       │
│ Android          │ │ CDN              │ │ OpenStreetMap (maps) │
│ Unlimited        │ │ DDoS protection  │ │ TensorFlow.js (AI)  │
│                  │ │ DNS + SSL        │ │ GitHub Actions (CI)  │
└──────────────────┘ └──────────────────┘ └──────────────────────┘
```

---

## Русский: Обзор архитектуры верхнего уровня

- **Клиенты**: iOS, Android (React Native / Expo) + веб-панель (Next.js на Vercel, бесплатно)
- **Ядро**: Supabase (бесплатный тариф) — PostgreSQL + PostGIS, аутентификация, realtime WebSocket, хранилище файлов, автоматический REST API
- **Push-уведомления**: Firebase Cloud Messaging (бесплатно, безлимитно)
- **CDN + защита**: Cloudflare (бесплатно) — DNS, SSL, DDoS защита
- **Бесплатные сервисы**: Resend (email), OpenStreetMap (карты), TensorFlow.js (AI), GitHub Actions (CI/CD)
- **Стоимость запуска: $0**

---

## Component Details

### 1. Mobile App (React Native)

**Responsibilities:**
- User registration and authentication
- Report submission (missing person, lost/found, community intelligence)
- Receiving and displaying push notifications with photos
- Real-time sighting feed via WebSocket
- In-app messaging for lost & found coordination
- Offline support: reports queued locally and submitted when connectivity returns

**Key Screens:**
- Home (active alerts near you)
- Report (missing person / lost item / suspicious activity)
- Map view (sightings, reports, found items)
- My Reports (status tracking)
- Settings (notification radius, categories, language)

---

### Русский: Мобильное приложение

- Регистрация и аутентификация
- Подача отчётов (пропавшие, потери/находки, подозрительная активность)
- Приём push-уведомлений с фото
- Лента наблюдений в реальном времени (WebSocket)
- Сообщения для координации возврата находок
- Офлайн-режим: отчёты ставятся в очередь и отправляются при восстановлении связи

---

### 2. Backend — Supabase + Edge Functions

**Key insight**: Supabase auto-generates a REST API from your database schema. Combined with Row-Level Security (RLS) policies, most CRUD operations need **zero backend code**.

**What Supabase handles for free:**
- Auth (registration, login, OTP, JWT) — no auth-service needed
- REST API for all tables — no report-service needed
- Realtime subscriptions — no WebSocket server needed
- File storage with signed URLs — no storage service needed
- Database functions (PL/pgSQL) — business logic runs in the database

**What still needs custom code (Supabase Edge Functions — free):**

| Function | Responsibility |
|----------|---------------|
| `send-alert` | PostGIS radius query → batch FCM push with photo |
| `match-items` | Compare new found items against lost items (geo + category + time) |
| `aggregate-patterns` | Cluster anonymous reports into intelligence patterns |
| `forward-to-authority` | Package aggregated intelligence for law enforcement |
| `send-email` | Transactional emails via Resend (free 100/day) |

**What we DON'T need anymore:**
- ~~auth-service~~ → Supabase Auth
- ~~report-service~~ → Supabase auto REST API + RLS
- ~~notification-service~~ → Edge Function + FCM
- ~~Redis~~ → Supabase Realtime handles pub/sub; PostgreSQL handles caching
- ~~S3 / MinIO~~ → Supabase Storage
- ~~Express.js / Fastify server~~ → Edge Functions (Deno runtime, free)

---

### Русский: Бэкенд — Supabase + Edge Functions

- **Supabase** автоматически генерирует REST API из схемы БД — большинство CRUD операций не требуют кода
- **Row-Level Security** — политики безопасности на уровне строк заменяют middleware
- **Edge Functions** (Deno, бесплатно) — только для сложной логики: отправка оповещений, сопоставление находок, агрегация паттернов
- **Не нужны**: отдельный сервер, Redis, S3, auth-сервис — всё встроено в Supabase

---

### 3. Database Layer

#### PostgreSQL + PostGIS

**Core Tables:**

```sql
-- Users
users (id, phone, email, name, location, created_at, credibility_score)

-- Missing Person Reports
missing_reports (id, reporter_id, photo_url, name, age, description_json,
                 last_seen_location GEOGRAPHY, alert_radius_km, status,
                 created_at, expires_at)

-- Sightings
sightings (id, report_id, spotter_id, location GEOGRAPHY,
           confidence, photo_url, created_at)

-- Lost & Found
lost_items (id, reporter_id, category, description, photo_url,
            lost_location GEOGRAPHY, lost_time, reward, status)

found_items (id, finder_id, category, description, photo_url,
             found_location GEOGRAPHY, found_time, status)

-- Community Intelligence
intel_reports (id, category, description, location GEOGRAPHY,
              created_at)
-- NOTE: no reporter_id — anonymous by design

-- Aggregated Patterns
patterns (id, category, location GEOGRAPHY, report_count,
          first_seen, last_seen, status, forwarded_to_authority)
```

**Key Indexes:**
- `GIST` indexes on all `GEOGRAPHY` columns for spatial queries
- `B-tree` indexes on `status`, `category`, `created_at`

#### No Redis Needed

Supabase Realtime replaces Redis pub/sub. PostgreSQL handles everything else:
- Sessions → Supabase Auth (JWT, stateless)
- Cache → PostgreSQL materialized views for hot data
- Rate limiting → PostgreSQL window functions or Edge Function in-memory counters
- Geo lookups → PostGIS spatial indexes (faster than Redis geo-sorted sets for complex queries)

#### Query Optimization (Critical for Free Tier)

Supabase free tier has limited compute. Every query must be optimized:

**Spatial indexes — the most important optimization:**
```sql
-- GIST indexes on ALL geography columns — without these, geo queries scan every row
CREATE INDEX idx_missing_reports_location ON missing_reports USING GIST (last_seen_location);
CREATE INDEX idx_sightings_location ON sightings USING GIST (location);
CREATE INDEX idx_lost_items_location ON lost_items USING GIST (lost_location);
CREATE INDEX idx_found_items_location ON found_items USING GIST (found_location);
CREATE INDEX idx_intel_reports_location ON intel_reports USING GIST (location);
```

**Composite indexes for common query patterns:**
```sql
-- "Active alerts near me" — the most frequent query
CREATE INDEX idx_missing_active_location ON missing_reports
  USING GIST (last_seen_location)
  WHERE status = 'active';

-- "Recent found items in my area"
CREATE INDEX idx_found_recent ON found_items (created_at DESC)
  WHERE status = 'available';

-- Pattern aggregation by category and location
CREATE INDEX idx_intel_category_location ON intel_reports
  USING GIST (location)
  INCLUDE (category, created_at);
```

**Materialized views for expensive aggregations:**
```sql
-- Pre-compute active alert counts by region (refresh every 5 min)
CREATE MATERIALIZED VIEW active_alerts_summary AS
SELECT
  ST_SnapToGrid(last_seen_location::geometry, 0.01) AS grid_cell,
  COUNT(*) AS alert_count,
  MAX(created_at) AS latest
FROM missing_reports
WHERE status = 'active'
GROUP BY grid_cell;

CREATE INDEX idx_alerts_summary_grid ON active_alerts_summary USING GIST (grid_cell);
```

**Query patterns to avoid:**
```sql
-- BAD: scans every user to find nearby ones
SELECT * FROM users WHERE ST_DWithin(location, $1, $2);

-- GOOD: use spatial index + limit
SELECT * FROM users
WHERE ST_DWithin(location, $1, $2)
  AND last_active_at > NOW() - INTERVAL '30 days'
ORDER BY ST_Distance(location, $1)
LIMIT 5000;

-- BAD: N+1 queries for report + photos
SELECT * FROM reports WHERE id = $1;
SELECT * FROM media WHERE report_id = $1;

-- GOOD: single query with join
SELECT r.*, json_agg(m.*) AS media
FROM reports r
LEFT JOIN media m ON m.report_id = r.id
WHERE r.id = $1
GROUP BY r.id;
```

**Connection pooling:**
- Supabase uses PgBouncer (built-in) — connection pooling is automatic
- Use `?pgbouncer=true` in connection string for Edge Functions

**Partitioning for scale (when needed later):**
```sql
-- Partition reports by country for global deployment
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  country_code TEXT NOT NULL,
  ...
) PARTITION BY LIST (country_code);

CREATE TABLE reports_eg PARTITION OF reports FOR VALUES IN ('EG');
CREATE TABLE reports_ru PARTITION OF reports FOR VALUES IN ('RU');
```

---

### Русский: Слой данных

- **PostgreSQL + PostGIS**: пользователи, отчёты о пропавших, наблюдения, потери/находки, анонимные отчёты, агрегированные паттерны
- **Пространственные индексы** (GIST) на всех географических колонках — критически важно для производительности
- **Redis не нужен**: Supabase Realtime заменяет pub/sub, JWT — stateless сессии, материализованные представления — кэш
- **Оптимизация запросов**: составные индексы, частичные индексы, материализованные представления, пулинг соединений (PgBouncer встроен)
- **Партиционирование**: по стране для глобального масштабирования

---

### 4. Real-Time Layer — Supabase Realtime + FCM

#### Supabase Realtime (free, built-in)

No separate WebSocket server needed. Supabase Realtime listens to database changes:

```javascript
// Client subscribes to new alerts near them
supabase
  .channel('alerts')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'missing_reports' },
    (payload) => {
      // Check if alert is within user's radius (client-side filter)
      if (isWithinRadius(payload.new.last_seen_location, userLocation, userRadius)) {
        showAlert(payload.new);
      }
    }
  )
  .subscribe();
```

**Channels:**
- `missing_reports` table changes → new alerts
- `sightings` table changes → sighting updates for active reports
- `found_items` table changes → new found items
- `messages` table changes → chat messages

#### Push Notification Flow (free)

```
Report submitted (Supabase auto-API)
    │
    ▼
Database trigger fires
    │
    ▼
Calls Edge Function "send-alert" (free)
    │
    ▼
PostGIS query: find users within radius
    │
    ▼
Batch FCM push with photo URL (free, unlimited)
    │
    ▼
Supabase Realtime auto-broadcasts to connected clients (free)
```

> **No SMS needed for MVP**: Push notifications + in-app realtime covers 99% of cases. SMS costs money — add later when revenue exists.

---

### Русский: Слой реального времени

- **Supabase Realtime** (бесплатно, встроено) — подписка на изменения таблиц заменяет отдельный WebSocket сервер
- **Push-уведомления**: триггер БД → Edge Function → PostGIS запрос → пакетный FCM push (бесплатно, безлимитно)
- **SMS не нужен для MVP**: push + realtime покрывают 99% случаев

---

### 5. Security Architecture

#### Authentication — Supabase Auth (free, 50k MAU)
- **Email OTP** (free) — primary auth method for MVP, no SMS costs
- **Phone OTP** — add later when budget allows (Twilio/MessageBird costs per SMS)
- **Social login** — Google, Apple, GitHub (free)
- **JWT** — automatic, managed by Supabase, short expiry + refresh tokens
- **Biometric** — device-level (Expo SecureStore), no server cost
- **Row-Level Security (RLS)** — database-level access control, users can only see/edit their own reports

```sql
-- Example RLS policy: users can only update their own reports
CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE USING (auth.uid() = reporter_id);

-- Anyone can view active missing person alerts
CREATE POLICY "Public can view active alerts" ON missing_reports
  FOR SELECT USING (status = 'active');

-- Anonymous intel reports: no reporter_id column = structural anonymity
-- No policy needed — there's nothing to leak
```

#### Data Protection
- TLS 1.3 — Supabase and Cloudflare handle this automatically (free)
- Encryption at rest — Supabase encrypts all data at rest (free)
- Anonymous reports — `intel_reports` table has no `reporter_id` column
- Signed URLs — Supabase Storage generates time-limited URLs for photos (free)

#### Anti-Abuse (free methods)
- Rate limiting — Supabase has built-in rate limiting; Edge Functions can add custom limits
- hCaptcha — free alternative to reCAPTCHA, on report submission
- RLS policies — prevent unauthorized data access at the database level
- Database triggers — auto-flag suspicious patterns (too many reports from one device)
- Moderator queue — simple table with RLS for moderator-only access

---

### Русский: Архитектура безопасности

- **Аутентификация**: Supabase Auth (бесплатно, 50k пользователей) — Email OTP, Google/Apple логин, JWT автоматически
- **Row-Level Security**: политики безопасности на уровне БД — пользователи видят только свои отчёты
- **Защита данных**: TLS 1.3 (автоматически), шифрование at rest (Supabase), signed URLs для фото
- **Защита от злоупотреблений**: rate limiting, hCaptcha (бесплатно), триггеры БД, модераторская очередь

---

### 6. Deployment — 100% Free

#### Free Tier Stack

| Service | Free Tier | What It Gives Us |
|---------|-----------|------------------|
| **Supabase** | 500MB DB, 1GB storage, 50k MAU | Database, auth, realtime, storage, edge functions |
| **Vercel** | 100GB bandwidth/mo | Web dashboard hosting, serverless functions |
| **Firebase (FCM only)** | Unlimited push | Push notifications to iOS + Android |
| **Cloudflare** | Unlimited bandwidth | CDN, DNS, SSL, DDoS protection |
| **GitHub Actions** | 2000 min/mo (public repo) | CI/CD, automated testing |
| **Resend** | 100 emails/day | Transactional emails |
| **Grafana Cloud** | 10k metrics, 50GB logs | Monitoring and dashboards |
| **Expo (EAS)** | 30 builds/mo | React Native builds for iOS + Android |

#### What This Supports

The free tier stack comfortably handles:
- **~10,000 users** (Supabase 50k MAU limit)
- **~500MB of reports** (Supabase DB limit)
- **~1GB of photos** (Supabase Storage; use Cloudflare R2 free 10GB for overflow)
- **Unlimited push notifications** (FCM)
- **Unlimited web traffic** (Cloudflare CDN)

That's enough for an MVP and early growth in one city or region.

#### When to Upgrade (paid tiers)

| Trigger | Action | Cost |
|---------|--------|------|
| >50k monthly users | Supabase Pro | $25/mo |
| >1GB photos | Cloudflare R2 | Free up to 10GB |
| Need SMS OTP | Add Twilio | ~$0.01/SMS |
| Need custom domain email | Resend Pro | $20/mo |
| Multiple regions | Self-host Supabase | Server cost only |

#### CI/CD Pipeline (GitHub Actions — free)

```
Push to main
    │
    ▼
Run tests (Jest + Playwright)
    │
    ▼
Lint + type-check
    │
    ├── Web dashboard → auto-deploy to Vercel (free)
    ├── Edge Functions → deploy to Supabase (free)
    └── Mobile → EAS Build queue (Expo, free tier)
```

#### Maps — OpenStreetMap + Leaflet (free, forever)

No Google Maps API fees. OpenStreetMap is community-maintained, free, and works globally:
- **react-native-maps** with OpenStreetMap tiles
- **Leaflet** for web dashboard
- **Nominatim** for geocoding (address → coordinates) — free, self-hostable
- Tile servers: free options include CARTO, Stamen, Thunderforest

---

### Русский: Развёртывание — 100% бесплатно

- **Supabase** (бесплатно): БД 500MB, хранилище 1GB, 50k пользователей, auth, realtime, edge functions
- **Vercel** (бесплатно): хостинг веб-панели
- **FCM** (бесплатно): безлимитные push-уведомления
- **Cloudflare** (бесплатно): CDN, DNS, SSL, защита от DDoS
- **GitHub Actions** (бесплатно): CI/CD
- **OpenStreetMap + Leaflet** (бесплатно): карты без платы за API
- **Хватает для**: ~10 000 пользователей, MVP, рост в одном городе
- **Платные тарифы нужны только** при масштабировании (>50k пользователей, >1GB фото)

---

## Total Cost Summary

| Phase | Monthly Cost | Supports |
|-------|-------------|----------|
| **MVP / Prototype** | **$0** | Up to 10k users, one region |
| **Early Growth** | **$25–50** | Up to 100k users, Supabase Pro |
| **Scale** | **$100–300** | Multiple regions, SMS, custom infra |
| **Enterprise** | Self-hosted | Unlimited, data sovereignty |
