# SafeCircle — System Architecture

> Bilingual: English primary, Russian below each section (Русский перевод ниже каждого раздела)
>
> **Constraints:**
> - 100% free and open-source software
> - Self-hosted — runs on any server, any country
> - Compliant with Russian data localization law (242-ФЗ)
> - Zero software licensing costs

---

## Why Self-Hosted

Russian Federal Law 242-ФЗ requires personal data of Russian citizens to be stored on servers physically located in Russia. This rules out hosted services like Supabase Cloud, AWS, Firebase Hosting, Vercel, etc. for storing user data.

**Our approach**: every component is open-source and self-hostable. The entire platform runs from a single `docker-compose up` command on any Linux server — in Russia, Egypt, or anywhere else.

**What's still allowed from foreign services** (no user data stored):
- **FCM** — push notifications only relay through Google, no user data stored there
- **GitHub** — code hosting only, no user data
- **Cloudflare** — CDN/proxy only, data passes through but is not stored
- **OpenStreetMap** — map tiles, no user data

---

### Русский: Почему самохостинг

Федеральный закон 242-ФЗ требует хранение персональных данных граждан РФ на серверах, расположенных в России. Это исключает облачные сервисы (Supabase Cloud, AWS, Vercel) для хранения данных пользователей.

**Наш подход**: все компоненты — свободное ПО, развёртываются одной командой `docker-compose up` на любом сервере — в России, Египте или где угодно.

**Разрешено использовать** (данные пользователей не хранятся): FCM (push-уведомления), GitHub (только код), Cloudflare (проксирование), OpenStreetMap (карты).

---

## Tech Stack — All Free, All Open-Source

| Layer | Technology | License | Replaces |
|-------|-----------|---------|----------|
| **Runtime** | Node.js 22+ | MIT | — |
| **API Framework** | Fastify | MIT | Express (faster, lower memory) |
| **Database** | PostgreSQL 16 + PostGIS 3 | PostgreSQL License (free) | — |
| **Cache & Pub/Sub** | Redis 7 (Valkey) | BSD-3 | — |
| **Object Storage** | MinIO | AGPL-3 (free to self-host) | S3, Supabase Storage |
| **WebSocket** | Socket.IO | MIT | Supabase Realtime |
| **Auth** | Passport.js + JWT | MIT | Supabase Auth, Auth0 |
| **Reverse Proxy** | Caddy | Apache-2 | Nginx (auto-SSL, simpler) |
| **Push Notifications** | FCM (API only) | Free (unlimited) | — |
| **Email** | Nodemailer + SMTP | MIT | Resend, SendGrid |
| **Maps** | OpenStreetMap + Leaflet | ODbL / BSD-2 | Google Maps |
| **Image Processing** | Sharp | Apache-2 | — |
| **Containerization** | Docker + Docker Compose | Apache-2 | Kubernetes (simpler) |
| **CI/CD** | GitHub Actions | Free (public repo) | — |
| **Mobile** | React Native / Expo | MIT | — |
| **Web Dashboard** | Next.js | MIT | — |
| **Monitoring** | Prometheus + Grafana | Apache-2 | Datadog, New Relic |

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ iOS App      │  │ Android App  │  │ Web Dashboard        │  │
│  │ (React       │  │ (React       │  │ (Next.js)            │  │
│  │  Native /    │  │  Native /    │  │ Admin + Law Enforce. │  │
│  │  Expo)       │  │  Expo)       │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  CADDY (reverse proxy — auto-SSL, free Let's Encrypt certs)    │
│  Rate limiting · HTTPS · Request routing · Static file serving  │
└────────────────────────────┬────────────────────────────────────┘
                             │
       ┌─────────────────────┼──────────────────────┐
       ▼                     ▼                      ▼
┌─────────────┐  ┌──────────────────┐  ┌───────────────────────┐
│ FASTIFY API │  │ SOCKET.IO        │  │ WORKER PROCESSES      │
│             │  │                  │  │                       │
│ REST API    │  │ Real-time alerts │  │ FCM push sender       │
│ Auth (JWT)  │  │ Sighting feed    │  │ Lost/found matcher    │
│ File upload │  │ Chat             │  │ Pattern aggregator    │
│ Moderation  │  │ Presence         │  │ Email sender          │
└──────┬──────┘  └────────┬─────────┘  └───────────┬───────────┘
       │                  │                         │
       ▼                  ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER (all self-hosted)               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ PostgreSQL   │  │ Redis /      │  │ MinIO                │  │
│  │ + PostGIS    │  │ Valkey       │  │ (S3-compatible)      │  │
│  │              │  │              │  │                      │  │
│  │ Users        │  │ Sessions     │  │ Photos               │  │
│  │ Reports      │  │ Cache        │  │ Evidence             │  │
│  │ Geo data     │  │ Pub/Sub      │  │ Documents            │  │
│  │ Patterns     │  │ Rate limits  │  │ Signed URLs          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Everything above runs on a single server via Docker Compose.**

---

### Русский: Обзор архитектуры

- **Клиенты**: iOS, Android (React Native / Expo) + веб-панель (Next.js)
- **Обратный прокси**: Caddy (автоматический SSL через Let's Encrypt, бесплатно)
- **API**: Fastify (Node.js) — REST API, аутентификация, загрузка файлов
- **Реальное время**: Socket.IO — оповещения, лента наблюдений, чат
- **Воркеры**: отправка FCM push, сопоставление находок, агрегация паттернов, email
- **Данные**: PostgreSQL + PostGIS, Redis/Valkey, MinIO — всё самохостится
- **Всё запускается одной командой** `docker-compose up` на любом сервере

---

## Docker Compose — Single Command Deployment

```yaml
# docker-compose.yml — the entire SafeCircle backend
version: '3.8'

services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: safecircle
      POSTGRES_USER: safecircle
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: valkey/valkey:8
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - miniodata:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://safecircle:${DB_PASSWORD}@postgres:5432/safecircle
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      JWT_SECRET: ${JWT_SECRET}
      FCM_KEY: ${FCM_KEY}
    depends_on:
      - postgres
      - redis
      - minio
    ports:
      - "3000:3000"

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data

volumes:
  pgdata:
  miniodata:
  caddy_data:
```

**To start everything**: `docker-compose up -d`
**To stop**: `docker-compose down`
**To backup database**: `docker exec safecircle-postgres pg_dump -U safecircle safecircle > backup.sql`

---

## Component Details

### 1. Mobile App (React Native / Expo)

**All free, open-source tools:**

| Tool | Purpose | Cost |
|------|---------|------|
| Expo | Development framework, OTA updates | Free |
| react-native-maps | Maps with OpenStreetMap tiles | Free |
| expo-notifications | Push notification handling | Free |
| expo-secure-store | Secure token storage (biometric) | Free |
| socket.io-client | Real-time connection | Free |
| expo-image-picker | Photo capture/selection | Free |
| expo-location | GPS location | Free |
| @tanstack/react-query | API state management & caching | Free |

**Key Screens:**
- Home (active alerts near you)
- Report (missing person / lost item / suspicious activity)
- Map view (OpenStreetMap — sightings, reports, found items)
- My Reports (status tracking)
- Settings (notification radius, categories, language)

**Offline support:**
- Reports queued in AsyncStorage when offline
- Auto-submit when connectivity returns
- Map tiles cached for offline viewing

---

### Русский: Мобильное приложение

- Все инструменты бесплатные и с открытым кодом
- Карты: OpenStreetMap (бесплатно навсегда, без API-ключей)
- Офлайн-режим: отчёты сохраняются локально и отправляются при подключении
- Push-уведомления через FCM (бесплатно)

---

### 2. Backend API (Fastify + Node.js)

**Why Fastify over Express:**
- 2-3x faster request handling
- Built-in JSON schema validation (important for report data)
- Lower memory usage (matters on cheap servers)
- TypeScript-first

**API Routes:**

```
POST   /auth/register          # Email + password or social login
POST   /auth/login             # Returns JWT
POST   /auth/refresh           # Refresh token

POST   /reports/missing        # Create missing person report → triggers alert
GET    /reports/missing/nearby  # PostGIS: active alerts near coordinates
PATCH  /reports/missing/:id    # Update status (resolved, expired)

POST   /reports/lost           # Report lost item
POST   /reports/found          # Report found item → triggers matching
GET    /reports/lost/matches   # Get matches for a lost item

POST   /reports/suspicious     # Anonymous report (no auth required for submission)
GET    /intel/patterns         # Aggregated patterns (moderator/law enforcement only)

POST   /sightings              # Report a sighting of missing person
GET    /sightings/:reportId    # All sightings for a report

POST   /upload                 # Upload photo to MinIO, returns signed URL
GET    /media/:id              # Serve photo via signed URL

GET    /users/me               # Profile
PATCH  /users/me/settings      # Notification preferences
```

**Worker Processes (background jobs):**

| Worker | Trigger | What It Does |
|--------|---------|-------------|
| `alert-sender` | New missing person report | PostGIS query → batch FCM push to users in radius |
| `item-matcher` | New found item report | Compare against all active lost items (geo + category + time) |
| `pattern-aggregator` | Cron (every 5 min) | Cluster anonymous reports into patterns, check thresholds |
| `email-sender` | Queue events | Send transactional emails via SMTP (free with any email account) |
| `report-expirer` | Cron (hourly) | Auto-expire old reports, auto-expand alert radius |

Workers use **BullMQ** (free, open-source) with Redis as the job queue.

---

### Русский: Бэкенд API

- **Fastify**: в 2-3 раза быстрее Express, меньше памяти (важно на дешёвых серверах)
- **REST API**: маршруты для отчётов, оповещений, наблюдений, загрузки файлов
- **Воркеры**: фоновые процессы на BullMQ (Redis) — отправка push, сопоставление находок, агрегация паттернов, email
- **Аутентификация**: Passport.js + JWT (бесплатно, self-hosted)

---

### 3. Database Layer

#### PostgreSQL 16 + PostGIS 3

**Core Tables:**

```sql
-- Users
users (id UUID, email TEXT, password_hash TEXT, name TEXT,
       location GEOGRAPHY, language TEXT, country TEXT,
       notification_radius_km INT, credibility_score INT,
       role TEXT, created_at TIMESTAMPTZ)

-- Missing Person Reports
missing_reports (id UUID, reporter_id UUID, photo_url TEXT,
                 name TEXT, age INT, description_json JSONB,
                 last_seen_location GEOGRAPHY, alert_radius_km INT,
                 status TEXT, country_extension JSONB,
                 created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ)

-- Sightings
sightings (id UUID, report_id UUID, spotter_id UUID,
           location GEOGRAPHY, confidence TEXT,
           photo_url TEXT, direction TEXT,
           created_at TIMESTAMPTZ)

-- Lost & Found
lost_items (id UUID, reporter_id UUID, category TEXT,
            description TEXT, photo_url TEXT,
            lost_location GEOGRAPHY, lost_time TIMESTAMPTZ,
            reward INT, status TEXT, created_at TIMESTAMPTZ)

found_items (id UUID, finder_id UUID, category TEXT,
             description TEXT, photo_url TEXT,
             found_location GEOGRAPHY, found_time TIMESTAMPTZ,
             status TEXT, created_at TIMESTAMPTZ)

-- Community Intelligence (ANONYMOUS — no reporter_id!)
intel_reports (id UUID, category TEXT, description TEXT,
              location GEOGRAPHY, created_at TIMESTAMPTZ)

-- Aggregated Patterns
patterns (id UUID, category TEXT, center GEOGRAPHY,
          report_count INT, first_seen TIMESTAMPTZ,
          last_seen TIMESTAMPTZ, status TEXT,
          forwarded_at TIMESTAMPTZ)

-- Matches (lost ↔ found)
matches (id UUID, lost_item_id UUID, found_item_id UUID,
         score FLOAT, status TEXT, created_at TIMESTAMPTZ)
```

#### Query Optimization

PostGIS spatial queries are the core of SafeCircle. Without proper indexes, they scan every row.

**Essential indexes:**
```sql
-- GIST indexes on ALL geography columns
CREATE INDEX idx_missing_location ON missing_reports USING GIST (last_seen_location);
CREATE INDEX idx_sightings_location ON sightings USING GIST (location);
CREATE INDEX idx_lost_location ON lost_items USING GIST (lost_location);
CREATE INDEX idx_found_location ON found_items USING GIST (found_location);
CREATE INDEX idx_intel_location ON intel_reports USING GIST (location);

-- Partial index: only active alerts (most common query)
CREATE INDEX idx_missing_active ON missing_reports
  USING GIST (last_seen_location)
  WHERE status = 'active';

-- Composite: recent found items
CREATE INDEX idx_found_recent ON found_items (created_at DESC)
  WHERE status = 'available';

-- Pattern detection: intel by category + location
CREATE INDEX idx_intel_cat_loc ON intel_reports
  USING GIST (location)
  INCLUDE (category, created_at);
```

**Materialized views (pre-computed, refreshed by cron worker):**
```sql
-- Active alert counts by region grid (for map heatmap)
CREATE MATERIALIZED VIEW active_alerts_grid AS
SELECT
  ST_SnapToGrid(last_seen_location::geometry, 0.01) AS cell,
  COUNT(*) AS alert_count,
  MAX(created_at) AS latest
FROM missing_reports WHERE status = 'active'
GROUP BY cell;

-- Refresh every 5 minutes via cron worker
REFRESH MATERIALIZED VIEW CONCURRENTLY active_alerts_grid;
```

**Query anti-patterns to avoid:**
```sql
-- BAD: no filter, scans all users
SELECT * FROM users WHERE ST_DWithin(location, $1, $2);

-- GOOD: filter by activity + limit
SELECT id, fcm_token FROM users
WHERE ST_DWithin(location, $1, $2)
  AND last_active_at > NOW() - INTERVAL '30 days'
  AND fcm_token IS NOT NULL
ORDER BY ST_Distance(location, $1)
LIMIT 5000;

-- BAD: N+1 queries
SELECT * FROM reports WHERE id = $1;
SELECT * FROM media WHERE report_id = $1;

-- GOOD: single query
SELECT r.*, json_agg(m.*) AS media
FROM reports r
LEFT JOIN media m ON m.report_id = r.id
WHERE r.id = $1 GROUP BY r.id;
```

**Connection pooling:**
- PgBouncer (free, open-source) in front of PostgreSQL
- Essential on low-memory servers — limits concurrent connections

**Partitioning (for multi-country scale):**
```sql
CREATE TABLE reports (...) PARTITION BY LIST (country_code);
CREATE TABLE reports_eg PARTITION OF reports FOR VALUES IN ('EG');
CREATE TABLE reports_ru PARTITION OF reports FOR VALUES IN ('RU');
```

#### Redis / Valkey

| Use | Why Not PostgreSQL |
|-----|--------------------|
| Session store | Faster for high-frequency reads |
| Pub/Sub (Socket.IO) | PostgreSQL LISTEN/NOTIFY has no persistence |
| BullMQ job queue | Designed for Redis, battle-tested |
| Rate limiting counters | Atomic INCR with TTL, very fast |
| Cache (active alerts) | Avoid hitting PostGIS for repeated queries |

> **Valkey** is the community fork of Redis (after Redis changed license in 2024). Fully compatible, truly open-source (BSD-3).

#### MinIO (S3-compatible object storage)

- Self-hosted, free, unlimited storage (disk-limited)
- S3-compatible API — same code works with AWS S3 later
- Signed URLs for secure photo access (time-limited)
- Photos stored as: `/{report_type}/{report_id}/{uuid}.webp`
- Sharp (Node.js) compresses uploads to WebP before storing — saves disk space

---

### Русский: Слой данных

- **PostgreSQL + PostGIS**: все данные, пространственные запросы с GIST индексами
- **Оптимизация**: частичные индексы (только активные оповещения), материализованные представления, PgBouncer для пулинга
- **Redis/Valkey**: сессии, pub/sub для Socket.IO, очередь задач (BullMQ), rate limiting, кэш
- **MinIO**: самохостинг хранилища файлов (фото, улики), S3-совместимый API, signed URLs
- **Партиционирование**: по стране для мультирегионального масштабирования

---

### 4. Real-Time Layer — Socket.IO + FCM

#### Socket.IO (self-hosted WebSocket)

```javascript
// Server: broadcast new alert to connected clients
io.on('connection', (socket) => {
  // Client joins a geographic room based on their location grid
  socket.join(`region:${getGridCell(socket.userLocation)}`);
});

// When new missing report is created:
function broadcastAlert(report) {
  const affectedCells = getGridCellsInRadius(report.location, report.radius_km);
  affectedCells.forEach(cell => {
    io.to(`region:${cell}`).emit('new_alert', {
      id: report.id,
      photo_url: report.photo_url,
      name: report.name,
      description: report.description,
      location: report.last_seen_location,
    });
  });
}
```

**Channels:**
- `region:{grid_cell}` — new alerts, found items in a geographic area
- `report:{id}` — sighting updates for a specific report
- `chat:{thread_id}` — lost & found coordination messaging

#### Push Notification Flow

```
Report submitted (POST /reports/missing)
    │
    ▼
Fastify validates & saves to PostgreSQL
    │
    ▼
Emits job to BullMQ queue "send-alert"
    │
    ▼
Worker picks up job:
  1. PostGIS query: SELECT fcm_token FROM users
     WHERE ST_DWithin(location, report.location, report.radius_km)
     AND fcm_token IS NOT NULL
  2. Batch FCM push (up to 500 per request, free, unlimited)
  3. Socket.IO broadcast to connected clients
    │
    ▼
Users receive push notification with photo
```

> **FCM is legal in Russia** — it only relays the notification through Google servers. User data (name, photo) is in the notification payload which is end-to-end encrypted. No user data is stored on Google servers.

> **No SMS for MVP**: push + in-app realtime is enough. SMS costs money — add later with a Russian SMS gateway (e.g., SMS.RU — cheap, local).

---

### Русский: Слой реального времени

- **Socket.IO** (самохостинг): подписка по географическим ячейкам, обновления наблюдений, чат
- **Push-уведомления**: BullMQ задача → PostGIS запрос → пакетный FCM push (бесплатно, безлимитно)
- **FCM легален в России**: данные пользователей не хранятся на серверах Google, только ретрансляция уведомлений
- **SMS не нужен для MVP**: push + Socket.IO достаточно. Позже можно добавить SMS.RU

---

### 5. Security Architecture

#### Authentication — Passport.js + JWT (self-hosted, free)

```
Registration:
  Email + password → bcrypt hash → store in PostgreSQL → return JWT

Login:
  Email + password → verify bcrypt → return JWT (15 min) + refresh token (30 days)

JWT payload:
  { user_id, role, country, iat, exp }

Middleware:
  Every API request → verify JWT → attach user to request
```

- **Email verification** — free (Nodemailer + any SMTP: Gmail, Yandex, Mail.ru)
- **Social login** — Passport strategies for Google, VK, Yandex (free)
- **Phone verification** — add later with SMS.RU (Russian SMS gateway, cheap)
- **Biometric** — device-level via Expo SecureStore (free)
- **Role-based access** — middleware checks `user.role` (user / moderator / law_enforcement / admin)

#### Data Protection
- **TLS** — Caddy auto-generates free Let's Encrypt certificates
- **Encryption at rest** — PostgreSQL with pgcrypto extension (free)
- **Anonymous reports** — `intel_reports` table has NO `reporter_id` column
- **Signed URLs** — MinIO generates time-limited URLs for photos
- **Password hashing** — bcrypt with salt rounds = 12

#### Anti-Abuse (all free)
- **Rate limiting** — Redis counters with TTL (express-rate-limit compatible)
- **hCaptcha** — free alternative to reCAPTCHA
- **Input validation** — Fastify JSON schema validation on every endpoint
- **File validation** — Sharp validates image files, strips EXIF metadata (privacy)
- **Database triggers** — auto-flag users with abnormal report frequency
- **Moderator queue** — reports above threshold flagged for human review

---

### Русский: Архитектура безопасности

- **Аутентификация**: Passport.js + JWT (самохостинг), bcrypt, email верификация через SMTP (Yandex/Mail.ru — бесплатно)
- **Соцвход**: Google, VK, Yandex — бесплатно через Passport.js
- **Защита данных**: TLS (Caddy + Let's Encrypt), pgcrypto, signed URLs, bcrypt
- **Анонимность**: таблица `intel_reports` не содержит `reporter_id` — структурная анонимность
- **Защита от злоупотреблений**: rate limiting (Redis), hCaptcha, валидация JSON-схем, стрипинг EXIF-метаданных

---

### 6. Deployment

#### Development — Local Machine ($0)

```bash
# Clone repo
git clone https://github.com/ChesnoTech/SafeCircle.git
cd SafeCircle

# Start all services locally
docker-compose up -d

# Database is at localhost:5432
# API is at localhost:3000
# MinIO console at localhost:9001
# Mobile app: expo start
```

Runs on any machine with Docker installed — Windows, macOS, Linux.

#### Production — Russian VPS

For Russian users, data must be on Russian servers. Cheapest options:

| Provider | Cheapest VPS | RAM | Disk | Enough for |
|----------|-------------|-----|------|------------|
| **Timeweb Cloud** | ~200 ₽/мес | 1 GB | 15 GB | Development/testing |
| **Selectel** | ~300 ₽/мес | 1 GB | 10 GB | Small MVP |
| **REG.RU** | ~350 ₽/мес | 1 GB | 10 GB | Small MVP |
| **VDSina** | ~200 ₽/мес | 1 GB | 15 GB | Development/testing |

> **Recommended for MVP**: 2 GB RAM, 20 GB SSD — ~500-700 ₽/мес (~$5-7). Runs PostgreSQL + Redis + MinIO + Fastify comfortably.

#### Production — Multi-Region (later)

```
Russia (ru.safecircle.app)          Egypt (eg.safecircle.app)
┌──────────────────────┐            ┌──────────────────────┐
│ Russian VPS          │            │ Egyptian VPS         │
│ PostgreSQL (RU data) │            │ PostgreSQL (EG data) │
│ Redis + MinIO        │            │ Redis + MinIO        │
│ Fastify API          │            │ Fastify API          │
└──────────┬───────────┘            └──────────┬───────────┘
           │                                    │
           └────────────┬───────────────────────┘
                        ▼
              Cloudflare (DNS routing)
              Routes users to nearest region
```

Each country's data stays on local servers. Only the DNS routing is global.

#### CI/CD — GitHub Actions (free for public repos)

```
Push to main
    │
    ▼
GitHub Actions:
  1. Run tests (Jest)
  2. Lint + type-check
  3. Build Docker image
  4. Push to GitHub Container Registry (free)
    │
    ▼
Server pulls new image:
  docker-compose pull && docker-compose up -d
```

#### Maps — OpenStreetMap + Leaflet (free forever)

| Tool | Purpose | Cost |
|------|---------|------|
| OpenStreetMap tiles | Map display | Free |
| Leaflet (web) | Interactive maps | Free |
| react-native-maps | Mobile maps | Free |
| Nominatim | Geocoding (address → coordinates) | Free, self-hostable |
| Overpass API | Geographic data queries | Free |

No API keys, no usage limits, no billing surprises.

#### Monitoring — Prometheus + Grafana (self-hosted, free)

- **Prometheus** — collects metrics from Fastify, PostgreSQL, Redis
- **Grafana** — dashboards for server health, API latency, active alerts
- Add to Docker Compose — zero additional cost

---

### Русский: Развёртывание

- **Разработка**: `docker-compose up` на локальной машине — $0
- **Продакшн Россия**: VPS от Timeweb/Selectel/REG.RU — от 200-700 ₽/мес
- **Данные в России**: PostgreSQL на российском сервере — соответствие 242-ФЗ
- **Мультирегион**: отдельный VPS на страну, DNS-маршрутизация через Cloudflare
- **CI/CD**: GitHub Actions → Docker образ → GitHub Container Registry → pull на сервер
- **Карты**: OpenStreetMap — бесплатно, без API-ключей, без лимитов
- **Мониторинг**: Prometheus + Grafana — самохостинг, бесплатно

---

## Total Cost Summary

| Phase | Software Cost | Server Cost | Total |
|-------|-------------|-------------|-------|
| **Development** | $0 | $0 (local) | **$0** |
| **MVP (Russia)** | $0 | ~500 ₽/мес (~$5) | **~$5/mo** |
| **Two countries** | $0 | ~1000 ₽/мес (~$10) | **~$10/mo** |
| **Scale** | $0 | Bigger servers | Server cost only |

> All software is free forever. The only cost is server hardware.
> For development and testing — everything runs locally, truly $0.

---

## Comparison: Hosted vs Self-Hosted

| Aspect | Supabase Cloud (previous plan) | Self-Hosted (current plan) |
|--------|-------------------------------|---------------------------|
| Legal in Russia | :x: 242-ФЗ violation | :white_check_mark: Data on Russian servers |
| Software cost | Free tier, then $25/mo | $0 forever |
| Server cost | $0 (managed) | ~$5/mo for VPS |
| Data sovereignty | Stored on AWS (US/EU) | Stored wherever you choose |
| Vendor lock-in | Tied to Supabase platform | Zero — all standard open-source |
| Control | Limited by platform | Full control |
| Scaling | Pay Supabase more | Add servers in any country |
| Complexity | Lower (managed) | Higher (but Docker Compose makes it simple) |
