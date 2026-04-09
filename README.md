# SafeCircle

International community-powered safety platform. Missing persons, lost & found, anonymous intel. Instant alerts. Zero delay.

## What SafeCircle Does

### Missing Person Instant Alert
Report a missing person with photo + name. Push notification goes to every SafeCircle user within the geographic radius - INSTANTLY. 2-phase flow: Phase 1 sends alert in <15s, Phase 2 adds details.

### Lost & Found with Smart Matching
Structured lost/found reports with category, color, brand. PostgreSQL scoring function automatically matches found items to lost reports. Verification quiz proves ownership.

### Community Intelligence
Anonymous reports of suspicious behavior. Pattern aggregation across time and geography helps detect threats early.

### Resolution Stories
When cases resolve, users can share their reunification story. Public feed of success stories builds community trust.

## Tech Stack - 100% Free, Self-Hosted

> Compliant with data localization laws. No vendor lock-in. No cloud dependencies.

| Layer | Technology |
|-------|-----------|
| Mobile | React Native / Expo (iOS + Android) |
| Backend | Node.js + Fastify |
| Database | PostgreSQL 16 + PostGIS 3 |
| Cache & Queues | Valkey (Redis) + BullMQ |
| File Storage | MinIO (S3-compatible) |
| Realtime | Socket.IO |
| Push Notifications | Firebase Cloud Messaging (HTTP v1) |
| i18n | Custom engine with EN/AR/RU (7 languages planned) |
| Reverse Proxy | Caddy (auto-SSL) |
| Deployment | Docker Compose |

## Features

### Completed (Sprint 1-3)

- **Real-time alerts** - Socket.IO region-based rooms, geographic grid cells
- **Config-driven architecture** - zero hardcoded values, all env vars
- **Input validation** - JSON Schema on all endpoints
- **International platform** - 14 target countries, 7 languages
- **2-phase missing reports** - photo-first for instant alerts, details later
- **Structured L&F matching** - color/brand/category scoring in PostgreSQL
- **Push notification infrastructure** - BullMQ queue, FCM HTTP v1, urgency tiers
- **Verification quiz** - ownership proof with fuzzy matching (2/3 to pass)
- **Resolution & stories** - reunited/returned flow with public celebration feed
- **User roles** - citizen/moderator/officer/authority/admin
- **Full i18n** - English, Arabic (Egyptian dialect), Russian across all screens
- **RTL support** - Arabic layout mirroring
- **Language selector** - in-app language picker with 7 options
- **Onboarding flow** - language, location, notification permissions

### Planned

- Map clustering for dense alert areas
- Offline caching and draft reports
- Moderation tools
- Email verification
- In-app messaging between finder/reporter
- Web dashboard for law enforcement
- Credibility scoring system

## Project Structure

```
SafeCircle/
├── backend/
│   ├── src/
│   │   ├── config/         # Environment-driven configuration
│   │   ├── plugins/        # Fastify plugins (db, auth, redis, storage, queue)
│   │   ├── routes/         # API endpoints
│   │   ├── utils/          # Helpers (geo, notifications)
│   │   └── workers/        # BullMQ workers (alert-sender)
│   └── migrations/         # SQL migrations
├── mobile/
│   ├── app/                # Expo Router screens
│   │   ├── (tabs)/         # Tab navigation (home, map, report, profile)
│   │   ├── report/         # Report screens (missing, lost, found, suspicious)
│   │   └── alert/          # Alert detail
│   ├── lib/                # Shared utilities (api, config, i18n, socket, store)
│   └── locales/            # Translation files (en, ar, ru)
├── docker-compose.yml
└── docs/                   # Design docs, competitor research
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)

### Backend
```bash
# Start infrastructure (PostgreSQL, Redis, MinIO, Caddy)
docker-compose up -d

# Run migrations
docker exec -i safecircle-postgres psql -U safecircle -d safecircle < backend/migrations/001_initial.sql
docker exec -i safecircle-postgres psql -U safecircle -d safecircle < backend/migrations/002_verification_resolution.sql
docker exec -i safecircle-postgres psql -U safecircle -d safecircle < backend/migrations/003_device_tokens_and_roles.sql

# Start API
cd backend && npm install && npm run dev
```

### Mobile
```bash
cd mobile && npm install && npx expo start
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| POST | /api/reports/missing | Report missing person |
| GET | /api/reports/missing/nearby | Get nearby alerts |
| PATCH | /api/reports/missing/:id | Update report (2-phase) |
| POST | /api/items/lost | Report lost item |
| POST | /api/items/found | Report found item (auto-match) |
| POST | /api/intel | Submit anonymous intel |
| POST | /api/sightings | Report sighting |
| PUT | /api/notifications/token | Register FCM token |
| PUT | /api/notifications/preferences | Update notification prefs |
| POST | /api/verification/items/:id/claim | Start ownership claim |
| POST | /api/verification/claims/:id/verify | Submit verification answers |
| POST | /api/reports/:id/resolve | Mark resolved + share story |
| GET | /api/stories | Public success stories feed |
| GET | /api/health | Health check |

## Internationalization

The app supports 7 languages with full RTL support:

| Code | Language | Status |
|------|----------|--------|
| en | English | Complete |
| ar | Arabic (Egyptian dialect) | Complete |
| ru | Russian | Complete |
| es | Spanish | Planned |
| fr | French | Planned |
| tr | Turkish | Planned |
| pt | Portuguese | Planned |

## Target Countries

Egypt, Russia, Saudi Arabia, UAE, India, Turkey, Mexico, Brazil, Nigeria, Kenya, Philippines, Morocco, Tunisia, Pakistan

## Author

[Ayoub Mohamed Samir](https://chesnotech.github.io) - SafeCircle creator since 2019

## License

All rights reserved.
