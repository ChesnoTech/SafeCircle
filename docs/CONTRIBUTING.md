# Contributing to SafeCircle

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Node.js 22+](https://nodejs.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)

### 1. Clone and setup

```bash
git clone https://github.com/ChesnoTech/SafeCircle.git
cd SafeCircle
cp .env.example .env
```

### 2. Start backend services

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL + PostGIS** on port 5432
- **Redis (Valkey)** on port 6379
- **MinIO** on port 9000 (console: 9001)
- **API** on port 3000
- **Caddy** on ports 80/443

### 3. Verify

```bash
# API health check
curl http://localhost:3000/api/health

# MinIO console
open http://localhost:9001  # minioadmin / minioadmin
```

### 4. Start mobile app

```bash
cd mobile
npm install
expo start
```

Scan the QR code with Expo Go on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## Project Structure

```
SafeCircle/
├── backend/
│   ├── src/
│   │   ├── index.js              # Fastify app entry point
│   │   ├── plugins/              # Database, auth, redis, storage plugins
│   │   ├── routes/               # API route handlers
│   │   │   ├── auth.js           # Register, login, refresh
│   │   │   ├── reports.js        # Missing person reports
│   │   │   ├── sightings.js      # Sighting reports
│   │   │   ├── lostfound.js      # Lost & found items
│   │   │   ├── intel.js          # Anonymous community intelligence
│   │   │   ├── upload.js         # File upload (photo processing)
│   │   │   └── users.js          # User profile & settings
│   │   └── workers/              # Background jobs (TODO)
│   ├── migrations/
│   │   └── 001_initial.sql       # Database schema
│   ├── Dockerfile
│   └── package.json
├── mobile/
│   ├── app/                      # Expo Router screens
│   │   ├── (tabs)/               # Tab navigation
│   │   │   ├── index.js          # Home — nearby alerts feed
│   │   │   ├── map.js            # Map view with alert markers
│   │   │   ├── report.js         # Report type selector
│   │   │   └── profile.js        # User profile & settings
│   │   ├── login.js              # Auth screen
│   │   └── _layout.js            # Root layout
│   ├── lib/
│   │   ├── api.js                # API client with auto-refresh
│   │   └── store.js              # Zustand state stores
│   ├── app.json
│   └── package.json
├── data/reference/               # Country reference data (JSON)
├── docs/                         # Documentation
├── docker-compose.yml
├── Caddyfile
└── .env.example
```

---

## Development Workflow

### Backend

The API auto-reloads on file changes (via `node --watch`). Edit files in `backend/src/` and the server restarts automatically.

```bash
# View API logs
docker-compose logs -f api

# Run SQL migration manually
docker exec -i safecircle-postgres psql -U safecircle safecircle < backend/migrations/001_initial.sql

# Connect to database
docker exec -it safecircle-postgres psql -U safecircle safecircle

# Connect to Redis
docker exec -it safecircle-redis valkey-cli
```

### Mobile

```bash
cd mobile
expo start          # Development server
expo start --clear  # Clear cache and restart
```

### Database

After modifying the schema, create a new migration file:
```
backend/migrations/002_add_feature.sql
```

---

## Code Style

- **JavaScript ES Modules** (`import`/`export`)
- **No TypeScript** for now (faster iteration in prototype phase)
- **Fastify JSON Schema** for request validation
- **SQL**: uppercase keywords, snake_case for identifiers

---

## Testing API

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'

# Get nearby alerts (no auth needed)
curl "http://localhost:3000/api/reports/missing/nearby?latitude=55.75&longitude=37.61"

# Submit anonymous intel report (no auth needed)
curl -X POST http://localhost:3000/api/intel/report \
  -H "Content-Type: application/json" \
  -d '{"category":"suspicious_vehicle","description":"White van near school","latitude":55.76,"longitude":37.64,"severity":"medium"}'
```

---

## License

All rights reserved. See LICENSE file.
