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

### Completed (Sprint 1-9)

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
- **Email verification** - 6-digit code on registration, auto-submit, resend flow
- **Credibility scoring** - event-based points (0-100), leaderboard, configurable weights
- **Content moderation** - flag/review/action system, role-based moderator access, ban/hide/remove
- **In-app messaging** - secure conversations between finders and reporters, real-time via Socket.IO
- **Map clustering** - supercluster-based marker grouping for dense alert areas
- **Offline caching** - AsyncStorage alert cache, draft reports, sync queue for offline-first usage
- **Multi-photo support** - up to 5 photos per missing person report, horizontal gallery in detail view
- **Messages tab** - dedicated bottom tab for conversation access
- **Sighting photos** - photo evidence for sightings, reuses report_photos infrastructure
- **Unified search** - ILIKE text search across missing/lost/found with optional geo filtering
- **Profile enhancements** - avatar upload, edit name/phone, search link in settings
- **Community analytics** - platform stats, geographic heatmap, trending areas API
- **Notification center** - push notification wiring with expo-notifications, FCM token registration, notification inbox with unread badges
- **Lost & Found matching UI** - item detail screen with auto-matched results, ownership verification quiz flow
- **Report sharing** - native share sheet for missing person alerts and lost/found items, deep link support (safecircle:// scheme)
- **Analytics dashboard** - stats cards on home screen, heatmap overlay toggle on map, trending areas ranked list
- **Resolution flow** - mark cases resolved with type/story/rating, success stories feed with celebrations
- **Notification preferences** - toggles for missing/L&F/intel alerts, radius selector, quiet hours
- **Lost & Found browse** - dedicated nearby items screen with lost/found tabs, category icons, distance
- **Law enforcement dashboard** - React/Vite web app with role-based auth, report viewer, moderation queue, search, analytics overview
- **Credibility leaderboard** - ranked top contributors with medal icons, personal score banner, report/sighting counts
- **Community intel view** - browse nearby intel reports with severity filters (urgent/high/medium/low), color-coded cards
- **Dashboard CSV export** - export filtered reports to CSV from law enforcement dashboard, status filter, BOM-prefixed UTF-8
- **Dark mode** - system/light/dark theme preference, persisted in AsyncStorage, dark color palette, ThemeProvider context

### Planned

- Offline map tiles

## Project Structure

```
SafeCircle/
├── backend/
│   ├── src/
│   │   ├── config/         # Environment-driven configuration
│   │   ├── plugins/        # Fastify plugins (db, auth, redis, storage, queue)
│   │   ├── routes/         # API endpoints (auth, reports, messaging, moderation, etc.)
│   │   ├── utils/          # Helpers (geo, notifications, credibility, moderation)
│   │   └── workers/        # BullMQ workers (alert-sender)
│   └── migrations/         # SQL migrations
├── mobile/
│   ├── app/                # Expo Router screens
│   │   ├── (tabs)/         # Tab navigation (home, map, report, profile)
│   │   ├── report/         # Report screens (missing, lost, found, suspicious)
│   │   ├── alert/          # Alert detail with sighting form
│   │   └── messages/       # Conversation list + chat
│   ├── lib/                # Shared utilities (api, config, i18n, socket, store)
│   └── locales/            # Translation files (en, ar, ru)
├── dashboard/
│   ├── src/
│   │   ├── components/     # React pages (Dashboard, Reports, Flags, Search)
│   │   ├── api.js          # API client with auth
│   │   ├── App.jsx         # Router + role-based access
│   │   └── styles.css      # Full CSS design system
│   └── index.html
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
docker exec -i safecircle-postgres psql -U safecircle -d safecircle < backend/migrations/004_email_verification.sql
docker exec -i safecircle-postgres psql -U safecircle -d safecircle < backend/migrations/005_credibility.sql
docker exec -i safecircle-postgres psql -U safecircle -d safecircle < backend/migrations/006_moderation.sql
docker exec -i safecircle-postgres psql -U safecircle -d safecircle < backend/migrations/007_messaging.sql
docker exec -i safecircle-postgres psql -U safecircle -d safecircle < backend/migrations/008_report_photos.sql
docker exec -i safecircle-postgres psql -U safecircle -d safecircle < backend/migrations/009_sighting_photos.sql
docker exec -i safecircle-postgres psql -U safecircle -d safecircle < backend/migrations/010_notification_log.sql

# Start API
cd backend && npm install && npm run dev
```

### Mobile
```bash
cd mobile && npm install && npx expo start
```

### Dashboard (Law Enforcement)
```bash
cd dashboard && npm install && npm run dev
# Opens at http://localhost:3001
# Login with an officer/authority/admin account
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register user (sends verification code) |
| POST | /api/auth/login | Login |
| POST | /api/auth/verify-email | Verify email with 6-digit code |
| POST | /api/auth/resend-code | Resend verification code |
| POST | /api/reports/missing | Report missing person |
| GET | /api/reports/missing/nearby | Get nearby alerts |
| PATCH | /api/reports/missing/:id | Update report (2-phase) |
| POST | /api/items/lost | Report lost item |
| POST | /api/items/found | Report found item (auto-match) |
| POST | /api/intel | Submit anonymous intel |
| POST | /api/reports/missing/:id/photos | Add photos to report (up to 5) |
| GET | /api/reports/missing/:id/photos | Get report photos |
| POST | /api/sightings | Report sighting |
| PUT | /api/notifications/token | Register FCM token |
| PUT | /api/notifications/preferences | Update notification prefs |
| POST | /api/verification/items/:id/claim | Start ownership claim |
| POST | /api/verification/claims/:id/verify | Submit verification answers |
| POST | /api/reports/:id/resolve | Mark resolved + share story |
| GET | /api/stories | Public success stories feed |
| GET | /api/credibility/score | Get credibility score + events |
| GET | /api/credibility/leaderboard | Top users by credibility |
| POST | /api/moderation/flags | Flag content |
| GET | /api/moderation/flags | List flags (moderator+) |
| PATCH | /api/moderation/flags/:id | Update flag status (moderator+) |
| POST | /api/moderation/flags/:id/action | Take action on flag (moderator+) |
| POST | /api/messaging/conversations | Start conversation |
| GET | /api/messaging/conversations | List my conversations |
| GET | /api/messaging/conversations/:id/messages | Get messages |
| POST | /api/messaging/conversations/:id/messages | Send message |
| POST | /api/sightings/:id/photos | Add photos to sighting |
| GET | /api/sightings/:id/photos | Get sighting photos |
| GET | /api/search | Unified search (missing/lost/found) |
| PATCH | /api/users/me | Update profile (name, phone, photo) |
| GET | /api/analytics/stats | Platform statistics |
| GET | /api/analytics/heatmap | Geographic heatmap data |
| GET | /api/analytics/trending | Trending areas |
| GET | /api/notifications/history | Notification inbox |
| PATCH | /api/notifications/history/:id/read | Mark notification read |
| PATCH | /api/notifications/history/read-all | Mark all read |
| GET | /api/items/lost/:id/matches | Get auto-matched found items |
| GET | /api/intel/nearby | Get intel reports near location |
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
