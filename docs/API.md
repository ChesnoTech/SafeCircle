# SafeCircle — API Reference

Base URL: `http://localhost:3000/api` (development)

## Authentication

All authenticated endpoints require `Authorization: Bearer <token>` header.

### POST /auth/register
Create a new account.

```json
// Request
{ "email": "user@example.com", "password": "min8chars", "name": "Ayoub" }

// Response 200
{ "user": { "id": "uuid", "email": "...", "name": "...", "role": "user" },
  "token": "jwt...", "refreshToken": "uuid" }
```

### POST /auth/login
```json
// Request
{ "email": "user@example.com", "password": "min8chars" }

// Response 200
{ "user": { ... }, "token": "jwt...", "refreshToken": "uuid" }
```

### POST /auth/refresh
```json
// Request
{ "refreshToken": "uuid" }

// Response 200
{ "token": "new-jwt...", "refreshToken": "new-uuid" }
```

---

## Missing Person Reports

### POST /reports/missing `[auth]`
Create a missing person report. Triggers instant push notification to nearby users.

```json
// Request
{
  "name": "Ahmed",
  "age": 4,
  "gender": "male",
  "photo_url": "/storage/safecircle/public/abc.webp",
  "latitude": 55.7558,
  "longitude": 37.6173,
  "last_seen_address": "Mega Mall, 2nd floor",
  "clothing_description": "Red jacket, blue jeans",
  "alert_radius_km": 5
}

// Response 201
{ "id": "uuid", "name": "Ahmed", "status": "active", ... }
```

### GET /reports/missing/nearby
Get active alerts near a location. **No auth required.**

```
GET /reports/missing/nearby?latitude=55.75&longitude=37.61&radius_km=10&limit=50

// Response 200
{ "alerts": [{ "id": "...", "name": "...", "photo_url": "...",
               "latitude": 55.75, "longitude": 37.61,
               "distance_m": 1234.5, ... }],
  "count": 3 }
```

### GET /reports/missing/:id
Get full report details.

### PATCH /reports/missing/:id `[auth]`
Update report status (owner only).
```json
{ "status": "resolved" }
```

---

## Sightings

### POST /sightings `[auth]`
Report a sighting of a missing person.

```json
{
  "report_id": "uuid",
  "latitude": 55.756,
  "longitude": 37.618,
  "confidence": "likely",
  "direction_of_travel": "S",
  "notes": "Saw someone matching description near exit B3"
}
```

### GET /sightings/:reportId
Get all sightings for a report.

---

## Lost & Found

### POST /items/lost `[auth]`
```json
{
  "category": "wallet",
  "description": "Black leather wallet, Moscow State University student ID",
  "latitude": 55.702,
  "longitude": 37.530,
  "lost_address": "Metro Blue Line, Sportivnaya",
  "lost_time_from": "2024-01-15T08:30:00Z",
  "lost_time_to": "2024-01-15T08:50:00Z",
  "reward": 2000
}
```

### POST /items/found `[auth]`
Automatically matches against lost items. Returns match results.

```json
{
  "category": "wallet",
  "description": "Black wallet found under seat",
  "latitude": 55.722,
  "longitude": 37.562,
  "found_time": "2024-01-15T09:40:00Z",
  "willing_to_hold": true
}

// Response 201
{ "item": { ... }, "matches_found": 2 }
```

### GET /items/lost/nearby
### GET /items/found/nearby
Search by location. Optional `category` filter.

```
GET /items/lost/nearby?latitude=55.7&longitude=37.5&radius_km=5&category=wallet
```

### GET /items/lost/:id/matches `[auth]`
Get matching found items for a lost item.

---

## Community Intelligence

### POST /intel/report
Anonymous report. **No auth required.** Rate limited: 5/hour.

```json
{
  "category": "suspicious_vehicle",
  "description": "White van with tinted windows near school at pickup time",
  "latitude": 55.761,
  "longitude": 37.642,
  "severity": "medium"
}

// Response 201
{ "submitted": true, "id": "uuid" }
```

### GET /intel/heatmap
Aggregated intelligence grid. Returns cell counts, NOT individual reports.

```
GET /intel/heatmap?latitude=55.75&longitude=37.6&radius_km=10

// Response — only cells with 3+ reports shown
{ "cells": [{ "latitude": 55.76, "longitude": 37.64, "report_count": 7,
              "top_category": "suspicious_vehicle" }] }
```

### GET /intel/patterns `[moderator+]`
Aggregated patterns for moderators and law enforcement.

---

## File Upload

### POST /upload `[auth]`
Upload a photo. Auto-converts to WebP, strips EXIF metadata, creates thumbnail.

```
Content-Type: multipart/form-data
Field: file (JPEG, PNG, WebP, HEIC — max 10MB)

// Response 200
{
  "url": "/storage/safecircle/public/abc.webp",
  "thumbnail_url": "/storage/safecircle/public/abc_thumb.webp",
  "size": 45678,
  "mime_type": "image/webp"
}
```

---

## User Profile

### GET /users/me `[auth]`
### PATCH /users/me `[auth]`
Update name, phone, photo, language.

### PUT /users/me/location `[auth]`
Update current location (for receiving nearby alerts).

### PUT /users/me/settings `[auth]`
Update notification preferences, FCM token.

### GET /users/me/reports `[auth]`
Get all user's own reports (missing, lost, found).

---

## WebSocket (Socket.IO)

Connect to: `ws://localhost:3000` (path: `/socket.io`)

### Events (client → server)
- `join_region` — join a geographic grid cell to receive alerts
- `watch_report` — subscribe to sighting updates for a specific report

### Events (server → client)
- `new_alert` — new missing person report nearby
- `alert_resolved` — a missing person was found
- `new_sighting` — new sighting on a watched report

---

## Error Responses

All errors follow the format:
```json
{ "error": "Human-readable error message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (validation failed) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not found |
| 409 | Conflict (e.g., email already registered) |
| 429 | Rate limited |
| 500 | Server error |
