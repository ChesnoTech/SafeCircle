# SafeCircle

Community-powered safety platform. Instant alerts. Zero delay.

## The Problem

People use Facebook to find lost children, lost wallets, missing persons. But social media posts get buried in hours. No geographic targeting. No permanence. No instant alerts.
Social media is not designed for safety.

## What SafeCircle Does

### :rotating_light: Missing Person Instant Alert

Mother loses child in a shopping mall. She reports through the app.
Push notification WITH PHOTO goes to every SafeCircle user within the geographic radius — INSTANTLY. Parking areas, surrounding streets, exits. Thousands of eyes activated in seconds.

### :package: Lost & Found

Permanent, searchable database with geographic targeting.
Lost wallet? Lost phone? Lost documents? Posts never get buried.
Geographic radius matching — found items near where you lost them.

### :mag: Community Intelligence

Anonymous reports of suspicious behavior. Not accusations — intelligence. 50 people report aggressive behavior from the same person → automatic flag for authorities. Pattern aggregation across time and geography.

### :bar_chart: Behavioral Analysis

Historical pattern matching with solved cases. Speeds up investigation by narrowing suspect pools. Not used for accusations — used to accelerate justice.

### :trophy: Reward Program

Citizens who provide information that helps solve cases or find missing persons receive recognition and rewards.

## How It's Different

| Feature | Facebook | Citizen App | SafeCircle |
|---------|----------|-------------|------------|
| Missing child instant alert | :x: | Limited | :white_check_mark: Geographic push with photo |
| Lost & found database | :x: Posts buried | :x: | :white_check_mark: Permanent, searchable |
| Community intelligence | :x: | :x: | :white_check_mark: Anonymous pattern aggregation |
| Works in developing countries | :white_check_mark: | :x: US only | :white_check_mark: Designed for global use |
| Behavioral analysis | :x: | :x: | :white_check_mark: Historical patterns |

## Market

- Citizen App (US only): $400M+ valuation
- Amber Alert: government-only, slow
- No platform combines all these layers globally

## Tech Stack (Planned) — 100% Free, Open-Source, Self-Hosted

> Compliant with Russian data localization law (242-ФЗ). No vendor lock-in.

| Layer | Technology | License |
|-------|-----------|---------|
| Mobile | React Native / Expo | MIT |
| Backend | Node.js + Fastify | MIT |
| Database | PostgreSQL 16 + PostGIS 3 | Free |
| Cache & Queues | Redis / Valkey + BullMQ | BSD-3 |
| File Storage | MinIO (S3-compatible) | AGPL-3 |
| Realtime | Socket.IO | MIT |
| Auth | Passport.js + JWT + bcrypt | MIT |
| Push Notifications | Firebase Cloud Messaging | Free (unlimited) |
| Reverse Proxy | Caddy (auto-SSL) | Apache-2 |
| Maps | OpenStreetMap + Leaflet | ODbL / BSD-2 |
| CI/CD | GitHub Actions | Free (public repo) |
| Monitoring | Prometheus + Grafana | Apache-2 |
| Deployment | Docker Compose | Apache-2 |

> **Dev cost: $0** (runs locally). **Production: ~500 ₽/мес (~$5)** for a Russian VPS.
> All software is free forever — you only pay for server hardware.

## Documentation

| Document | Description |
|----------|-------------|
| [Feature Specification](docs/CONCEPT.md) | Detailed feature spec for all modules (EN/RU) |
| [System Architecture](docs/ARCHITECTURE.md) | Technical architecture overview (EN/RU) |
| [User Scenarios](docs/SCENARIOS.md) | 4 detailed user scenarios (EN/RU) |
| [Data Model](docs/DATA-MODEL.md) | Complete data model — 200+ fields extracted from 2019 brainstorming (EN/RU) |
| [Localization Guide](docs/LOCALIZATION.md) | Country adaptation guide — Egypt & Russia profiles, expansion checklist (EN/RU) |

### Reference Data (Egypt — first country profile)

| Dataset | Records | Source |
|---------|---------|--------|
| [Administrative Divisions](data/reference/egypt/administrative-divisions.json) | 27 governorates, 47+ districts | CAPMAS 2014 |
| [Governorates (Bilingual)](data/reference/egypt/governorates-bilingual.json) | 27 entries (AR/EN) | CAPMAS 2014 |
| [Neighborhoods](data/reference/egypt/neighborhoods.json) | 157 areas (Alexandria) | Brainstorming 2019 |
| [Vehicle Registration](data/reference/egypt/vehicles.json) | 27 license types, 158 traffic units | Brainstorming 2019 |
| [Education System](data/reference/egypt/education.json) | 9 levels, 16 job categories | Brainstorming 2019 |
| [Driver's Licenses](data/reference/egypt/driver-licenses.json) | 12 types | Brainstorming 2019 |

## Status

- [x] Concept design
- [x] Feature specification
- [x] Data model (extracted from 2019 brainstorming, modernized)
- [x] Country profile: Egypt (reference implementation)
- [x] Country profile: Russia (documented)
- [ ] Prototype
- [ ] MVP
- [ ] Beta testing

## Author

[Ayoub Mohamed Samir](https://chesnotech.github.io) — Moscow, Russia
Conceived 2019

## License

All rights reserved. Concept documentation only.
