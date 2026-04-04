# SafeCircle — System Architecture

> Bilingual: English primary, Russian below each section (Русский перевод ниже каждого раздела)

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ iOS App      │  │ Android App  │  │ Web Dashboard        │  │
│  │ (React       │  │ (React       │  │ (React.js)           │  │
│  │  Native)     │  │  Native)     │  │ Admin + Law Enforce. │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  NGINX / Load Balancer                                  │   │
│  │  Rate limiting · SSL termination · Request routing      │   │
│  └────────────────────────────┬────────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  ALERT SERVICE   │ │ REPORT SERVICE   │ │ MATCHING SERVICE     │
│                  │ │                  │ │                      │
│ Missing persons  │ │ Lost & found     │ │ Lost/found matching  │
│ Instant push     │ │ Community intel  │ │ Pattern aggregation  │
│ Geo-radius       │ │ Anonymous tips   │ │ Behavioral analysis  │
│ notifications    │ │ Moderation queue │ │ Image similarity     │
└────────┬─────────┘ └────────┬─────────┘ └──────────┬───────────┘
         │                    │                       │
         ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ PostgreSQL   │  │ Redis        │  │ Object Storage       │  │
│  │ + PostGIS    │  │              │  │ (S3 / MinIO)         │  │
│  │              │  │ Sessions     │  │                      │  │
│  │ Users        │  │ Cache        │  │ Photos               │  │
│  │ Reports      │  │ Real-time    │  │ Evidence             │  │
│  │ Geo data     │  │ pub/sub      │  │ Documents            │  │
│  │ Patterns     │  │ Rate limits  │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  PUSH SERVICE    │ │ WEBSOCKET        │ │ EXTERNAL             │
│                  │ │ SERVER           │ │ INTEGRATIONS         │
│ Firebase Cloud   │ │                  │ │                      │
│ Messaging (FCM)  │ │ Real-time        │ │ Police API           │
│                  │ │ alert updates    │ │ SMS gateway          │
│ APNs fallback    │ │ Sighting feed    │ │ Email service        │
│                  │ │ Chat             │ │ Image recognition    │
└──────────────────┘ └──────────────────┘ └──────────────────────┘
```

---

## Русский: Обзор архитектуры верхнего уровня

- **Клиенты**: iOS, Android (React Native) + веб-панель (React.js) для администраторов и правоохранительных органов
- **API-шлюз**: NGINX с балансировкой нагрузки, ограничением частоты запросов, SSL
- **Микросервисы**: сервис оповещений, сервис отчётов, сервис сопоставления
- **Слой данных**: PostgreSQL + PostGIS, Redis, объектное хранилище (S3/MinIO)
- **Внешние сервисы**: FCM для push-уведомлений, WebSocket для реального времени, API полиции, SMS, email, распознавание изображений

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

### 2. Backend API (Node.js)

**Framework:** Express.js or Fastify

**Services:**

| Service | Responsibility |
|---------|---------------|
| `auth-service` | Registration, login, JWT tokens, identity verification |
| `alert-service` | Missing person reports, geographic push dispatch, sighting aggregation |
| `report-service` | Lost & found, community intelligence, moderation queue |
| `matching-service` | Lost/found geographic + visual matching, behavioral pattern analysis |
| `notification-service` | FCM push, SMS fallback, email, in-app |
| `moderation-service` | Report review, abuse detection, threshold monitoring |
| `analytics-service` | Behavioral analysis, pattern aggregation, authority dashboards |

**API Design:**
- RESTful for CRUD operations
- WebSocket for real-time updates
- GraphQL considered for complex queries (authority dashboard)

---

### Русский: Бэкенд API

- **Фреймворк**: Express.js или Fastify
- **Сервисы**: auth, alert, report, matching, notification, moderation, analytics
- **API**: REST для CRUD, WebSocket для реального времени, GraphQL для сложных запросов

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

#### Redis

- Session management
- Real-time pub/sub for WebSocket events
- Rate limiting counters
- Cache for hot data (active alerts, trending patterns)
- Geo-sorted sets for nearby user lookup

---

### Русский: Слой данных

- **PostgreSQL + PostGIS**: пользователи, отчёты о пропавших, наблюдения, потери/находки, анонимные отчёты, агрегированные паттерны
- **Пространственные индексы** (GIST) на всех географических колонках
- **Redis**: сессии, pub/sub, ограничение частоты, кэш активных оповещений, геосортированные наборы

---

### 4. Real-Time Layer

#### WebSocket Server

- **Technology**: Socket.IO or ws
- **Channels**:
  - `alert:{region}` — new missing person alerts for a geographic region
  - `sighting:{report_id}` — sighting updates for a specific report
  - `found:{region}` — new found items in a region
  - `chat:{thread_id}` — lost & found coordination messaging

#### Push Notification Flow

```
Report submitted
    │
    ▼
Alert Service validates report
    │
    ▼
PostGIS query: find users within radius
    │
    ▼
Batch FCM push with photo URL
    │
    ▼
Fallback: SMS for users without app active
    │
    ▼
WebSocket broadcast to connected clients
```

---

### Русский: Слой реального времени

- **WebSocket**: Socket.IO или ws — каналы по регионам, отчётам, чатам
- **Push-уведомления**: отчёт → валидация → PostGIS-запрос пользователей в радиусе → пакетный FCM push с фото → SMS-фоллбэк → WebSocket-трансляция

---

### 5. Security Architecture

#### Authentication
- Phone number verification (SMS OTP)
- JWT tokens with short expiry + refresh tokens
- Biometric authentication on device (optional)

#### Data Protection
- TLS 1.3 for all connections
- AES-256 encryption at rest for sensitive data
- Anonymous reports stored without any link to reporter identity
- Photo storage with signed URLs (time-limited access)

#### Anti-Abuse
- Rate limiting per user and per IP
- CAPTCHA on report submission after threshold
- Device fingerprinting for ban evasion detection
- Moderator queue for flagged content
- Automated abuse detection (spam patterns, coordinated false reports)

---

### Русский: Архитектура безопасности

- **Аутентификация**: SMS OTP, JWT с коротким сроком действия, биометрия (опционально)
- **Защита данных**: TLS 1.3, AES-256, анонимные отчёты без привязки к личности, signed URLs для фото
- **Защита от злоупотреблений**: rate limiting, CAPTCHA, отпечатки устройств, модераторская очередь, автоматическое обнаружение спама

---

### 6. Deployment

#### Target Infrastructure
- **Cloud**: AWS, GCP, or self-hosted (for countries with data sovereignty requirements)
- **Containerization**: Docker + Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK stack (Elasticsearch, Logstash, Kibana)

#### Scalability Considerations
- Horizontal scaling of API services behind load balancer
- Read replicas for PostgreSQL
- Redis Cluster for high-availability caching
- CDN for static assets and photo delivery
- Regional deployments for latency-sensitive push notifications

---

### Русский: Развёртывание

- **Облако**: AWS, GCP или самохостинг (для стран с требованиями к локализации данных)
- **Контейнеризация**: Docker + Kubernetes
- **CI/CD**: GitHub Actions
- **Мониторинг**: Prometheus + Grafana, ELK для логов
- **Масштабируемость**: горизонтальное масштабирование API, реплики чтения PostgreSQL, Redis Cluster, CDN для фото
