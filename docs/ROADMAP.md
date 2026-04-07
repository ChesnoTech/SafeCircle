# SafeCircle — Implementation Roadmap

## Current State: Nothing runs end-to-end yet

The prototype code is scaffolded but has **never been executed**. No `package-lock.json` exists, no database has been migrated, no mobile app has connected to the backend.

## Critical Path (minimum viable demo)

```
Docker Compose boots → DB migration runs → /api/health responds
  → Auth works from mobile → Photo upload works
    → Missing report submits with real photo → Alerts visible on map
      → Sighting submission works
```

---

## Sprint Plan (7 sprints, ~5-6 months to closed beta)

### SPRINT 0: Foundation (2 weeks) — "Make it run"
| Task | Size | Files | Depends On |
|------|------|-------|------------|
| 0.1 Boot Docker infrastructure | S | `docker-compose.yml`, `001_initial.sql` | — |
| 0.2 `npm install` both projects, verify startup | S | `backend/package.json`, `mobile/package.json` | 0.1 |
| 0.3 Fix photo upload in mobile report forms | M | `mobile/lib/api.js`, all report forms | 0.1, 0.2 |
| 0.4 Set `EXPO_PUBLIC_API_URL` (localhost won't reach phone) | S | `mobile/.env` | 0.1 |
| 0.5 End-to-end smoke test of the core loop | M | Bug fixes across all files | 0.1–0.4 |

**Verification:** Register → Login → Report missing person with photo → See on home feed → See on map → Open detail → Submit sighting.

**Risks:**
- `react-native-maps` needs Google Maps API key (free tier requires billing account) — consider OpenStreetMap alternative
- Sharp native binaries on Alpine Docker may need extra packages
- PostGIS image is ~500MB pull

---

### SPRINT 1: Core Reliability (2 weeks) — "Real-time + error handling"
| Task | Size | Files | Depends On |
|------|------|-------|------------|
| 1.1 Connect Socket.IO on mobile | M | `mobile/lib/socket.js` (new), `_layout.js`, `index.js`, `alert/[id].js` | Sprint 0 |
| 1.2 Region-based Socket.IO rooms | M | `backend/src/routes/reports.js`, `backend/src/utils/geo.js` (new), `mobile/lib/socket.js` | 1.1 |
| 1.3 Error handling + loading states across all screens | M | All mobile screens | Sprint 0 |
| 1.4 Backend input validation hardening | S | All route files | Sprint 0 |

**Verification:** Two emulators — report on one appears on the other in <2s. Kill backend — graceful errors everywhere.

---

### SPRINT 2: Push Notifications + 2-Phase Reporting (3 weeks) — "The core loop"
| Task | Size | Files | Depends On |
|------|------|-------|------------|
| 2.1 FCM push notification backend (BullMQ worker) | L | `backend/src/workers/alert-sender.js` (new), `reports.js`, `index.js` | Sprint 0 |
| 2.2 FCM token registration on mobile | M | `mobile/lib/notifications.js` (new), `_layout.js` | 2.1 |
| 2.3 2-phase missing person report (camera-first, <15s) | L | `mobile/app/report/missing.js` (rewrite), `reports.js` (add field PATCH) | 0.3 |
| 2.4 Notification tier logic (CRITICAL/HIGH/MEDIUM/LOW) | M | `backend/src/workers/alert-sender.js`, `backend/src/utils/notifications.js` (new) | 2.1 |

**Verification:** Submit report for 5-year-old → push arrives on another phone within 5s with CRITICAL priority. Time 2-phase flow: photo-to-alert < 15 seconds.

---

### SPRINT 3: i18n + Map Upgrade (3 weeks) — "Russian, English, Arabic"
| Task | Size | Files | Depends On |
|------|------|-------|------------|
| 3.1 i18n infrastructure (~200 strings) | L | `mobile/lib/i18n.js` (new), `mobile/locales/**` (new), all screen files | — |
| 3.2 RTL support for Arabic | M | All mobile StyleSheet files | 3.1 |
| 3.3 Map clustering with Supercluster | M | `mobile/app/(tabs)/map.js` (rewrite) | Sprint 0 |
| 3.4 Map filter controls (type + time) | S | `mobile/app/(tabs)/map.js` | 3.3 |

**Verification:** Switch device to Russian → all screens Russian. Switch to Arabic → RTL layout everywhere. Seed 200+ reports → map clusters render in <2s.

---

### SPRINT 4: Offline + Credibility (2 weeks) — "Works without network"
| Task | Size | Files | Depends On |
|------|------|-------|------------|
| 4.1 Offline report queue with sync engine | L | `mobile/lib/sync.js` (new), `mobile/lib/offline-banner.js` (new), all report forms | Sprint 0 |
| 4.2 Cache nearby alerts locally | M | `mobile/app/(tabs)/index.js`, `mobile/lib/store.js` | 4.1 |
| 4.3 Credibility scoring backend logic | M | `backend/src/utils/credibility.js` (new), `reports.js`, `sightings.js` | Sprint 0 |
| 4.4 Report expiration worker (hourly cron) | S | `backend/src/workers/report-expirer.js` (new) | Sprint 0 |

**Verification:** Airplane mode → submit report → see "Pending" → network on → auto-syncs. Create user, resolve report → credibility = 55.

---

### SPRINT 5: Moderation + Security (2 weeks) — "Trust & safety"
| Task | Size | Files | Depends On |
|------|------|-------|------------|
| 5.1 Moderation backend endpoints | L | `backend/src/routes/moderation.js` (new) | 4.3 |
| 5.2 Counter-reporting from mobile | S | `mobile/app/alert/[id].js`, `reports.js` | 5.1 |
| 5.3 Security audit + hardening | M | `index.js`, `intel.js`, `auth.js`, `Caddyfile` | Sprint 0 |
| 5.4 Email verification flow | M | `backend/src/utils/email.js` (new), `auth.js`, `profile.js` | Sprint 0 |

**Verification:** Moderator can review queue via API. 3 users flag a report → auto-queued for review. XSS/SQLi attempts → blocked.

---

### SPRINT 6: Lost/Found + Messaging (3 weeks) — "Complete the second loop"
| Task | Size | Files | Depends On |
|------|------|-------|------------|
| 6.1 Match notification and display | M | `lostfound.js`, `mobile/app/match/[id].js` (new), `profile.js` | 2.1 |
| 6.2 Basic in-app messaging (text only) | L | `backend/src/routes/messages.js` (new), `mobile/app/chat/[threadId].js` (new) | 1.1, 6.1 |
| 6.3 Lost/found photo upload + map markers + search | M | `lost.js`, `found.js`, `map.js`, `lostfound.js` | 0.3, 3.3 |

---

### SPRINT 7: Pre-Launch Polish (2 weeks) — "Ready for beta"
| Task | Size | Files | Depends On |
|------|------|-------|------------|
| 7.1 Onboarding flow (language, location, notifications) | M | `mobile/app/onboarding.js` (new) | 3.1, 2.2 |
| 7.2 App icon, splash screen, branding | S | `mobile/app.json`, `mobile/assets/` | — |
| 7.3 Privacy policy + ToS (152-ФЗ compliant) | M | `docs/PRIVACY-POLICY.md`, `docs/TERMS-OF-SERVICE.md` | — |
| 7.4 Seed data and physical device testing | M | `backend/scripts/seed.js` (new) | Sprint 0 |
| 7.5 Roskomnadzor registration (start during Sprint 6!) | M | Non-code, legal/bureaucratic | 7.3 |

---

## Launch Checklist

### Technical
- [ ] Docker Compose runs on Russian VPS
- [ ] Daily database backups (`pg_dump`)
- [ ] HTTPS via Caddy with real domain
- [ ] FCM push works on physical devices
- [ ] Photo upload works on 3G
- [ ] All 3 languages display correctly
- [ ] Offline reports sync on reconnect
- [ ] Rate limiting prevents abuse

### Legal
- [ ] Roskomnadzor registration complete
- [ ] Privacy policy in app (EN/RU/AR)
- [ ] Terms of service in app
- [ ] Audit: anonymous intel reports contain zero identifying data

### Operational
- [ ] 2+ volunteer moderators recruited
- [ ] Support channel (Telegram)
- [ ] Incident response plan documented

---

## What to Defer (post-launch)

1. Web moderation dashboard (use API + Retool self-hosted)
2. Face recognition (152-ФЗ biometric complexity)
3. ML false-report detection (rule-based is enough for MVP)
4. SMS notifications (costs money, FCM is free)
5. Multi-country deployment (one Moscow district first)
6. Behavioral pattern aggregation (need data volume first)
7. Chat images/voice/read receipts
8. Reward system gamification

---

## Timeline Summary

| Sprint | Duration | Confidence | Milestone |
|--------|----------|------------|-----------|
| 0 Foundation | 2 weeks | HIGH | Working demo on emulator |
| 1 Core Reliability | 2 weeks | HIGH | Real-time alerts between devices |
| 2 Push + 2-Phase | 3 weeks | MEDIUM | Push notifications on real phone |
| 3 i18n + Map | 3 weeks | MEDIUM | Trilingual app with smart map |
| 4 Offline + Credibility | 2 weeks | HIGH | Works without network |
| 5 Moderation + Security | 2 weeks | HIGH | Safe for real users |
| 6 Lost/Found + Chat | 3 weeks | MEDIUM | Second product loop complete |
| 7 Pre-Launch | 2 weeks | HIGH | Ready for closed beta |

**Total: ~19 weeks to closed beta** (+30% buffer = ~6.5 months realistic)

**Minimum demo for LizaAlert / FASIE grant:** Sprint 0 + Sprint 1 = **4 weeks**

---

## Most-Touched Files Across All Sprints

1. `mobile/lib/api.js` — every feature adds endpoints here
2. `backend/src/routes/reports.js` — 2-phase, push, credibility, moderation, flags
3. `mobile/app/report/missing.js` — 2-phase rewrite, offline, i18n
4. `mobile/app/(tabs)/map.js` — clustering, filters, multi-type markers
5. `backend/src/index.js` — every plugin/route/worker registration
