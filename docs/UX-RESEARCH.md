# SafeCircle -- UX Research: Safety & Emergency App Best Practices

> Compiled April 2026. Actionable recommendations for SafeCircle's mobile app.
> Each section includes **What the industry does**, **What SafeCircle should do**, and **Implementation priority**.

---

## 1. Emergency Reporting UX

### What the Industry Does

**The "3-Tap Rule" for critical reports.** The best emergency apps (RapidSOS, PulsePoint, FDNY 911) follow a principle: the user must be able to trigger the most critical action in 3 taps or fewer from app launch. RapidSOS places a single, prominent "Call 911" button as the dominant interface element. PulsePoint uses a single-screen alert with only essential information.

**Progressive disclosure -- collect critical info first, details later.** RapidSOS sends location and emergency type immediately, then asks for optional details (medical history, allergies) afterward. The FDNY system collects only what first responders need in the first 10 seconds, with everything else deferred.

**Photo-first, form-second.** For missing person reports, leading apps place the photo upload as the first and most prominent action. Citizen's missing person feature leads with a photo and name; everything else is secondary.

**Immediate feedback is non-negotiable.** The FDNY system shows a confirmation animation and message "Your alert has been sent" within 1 second. Users in crisis need visual, auditory, or haptic confirmation that their action registered. Without this, they will tap again, creating duplicates.

### What SafeCircle Should Do

**Current state problem:** The missing person form (`/report/missing`) requires scrolling through 7 fields before hitting "Send Alert". Under stress, this is too much.

**Recommended redesign -- 2-phase reporting:**

**Phase 1: Quick Alert (3 taps, under 15 seconds)**
1. Tap "Report Missing Person" from home screen
2. Take/select photo (camera opens immediately)
3. Tap "Send Alert Now"

The system auto-captures: GPS location, timestamp, device language. The alert goes out immediately with the photo, location, and an "unverified" tag.

**Phase 2: Enrich (prompted after submission)**
- Name, age, gender (pre-filled selectors, not free text)
- Clothing description (visual picker with icons, not a text field)
- Last seen location (map pin, not address text)
- Circumstances (optional free text)
- Alert radius (slider with visual preview on map)

Each enrichment updates the live alert in real-time via Socket.IO.

**Specific implementation changes:**

| Current | Recommended |
|---------|-------------|
| Photo upload is a dashed box placeholder | Camera launches immediately on entry; gallery fallback one tap away |
| Name is a free text field marked required | Name becomes optional in Phase 1; prompted in Phase 2 |
| Gender is 4 text buttons | Gender uses universal icons (silhouettes) not text labels -- works across languages |
| Clothing is a free text field | Clothing uses icon grid: shirt color picker, pants/skirt/dress selector, hat yes/no, glasses yes/no |
| Alert radius is a numeric text input | Alert radius is a visual slider overlaid on the map showing the actual coverage area |
| "Submitting..." text on button | Full-screen confirmation with animation, haptic feedback, and "Alert sent to X nearby users" count |

**For suspicious activity reports:** Keep the current anonymous flow but add a "Quick Report" mode: tap category icon on the map directly, auto-fill location, done in 2 taps.

### Priority: CRITICAL -- redesign before launch

---

## 2. Map-Based Alert Systems

### What the Industry Does

**Waze: Crowdsourced pins with decay.** Reports appear as color-coded icons on the map. They fade in opacity as they age and disappear when no longer confirmed. Other users can "thumbs up" (confirm) or "not there" (dismiss) a report, creating a real-time validity signal. Data refreshes every 2 minutes.

**Citizen: Radius-based alert zones.** Users define custom alert zones with adjustable radius sliders. Alerts are categorized (fire, police, weather) with distinct iconography. Live incident video streams are overlaid on the map. Population density and incident severity influence notification delivery.

**PulsePoint: Color-coded severity.** Red for immediate threat, yellow for caution. Only active incidents show on the map. The app shows real-time dispatch data from 911 centers, with each incident type having a unique icon.

**Clustering is mandatory at scale.** All major map-based apps use marker clustering (Supercluster algorithm) to prevent the map from becoming unreadable. Clusters show count badges and expand on zoom.

### What SafeCircle Should Do

**Current state problem:** The map view (`/map.js`) shows raw markers and circles for every alert. No clustering, no filtering, no severity color coding, no temporal decay.

**Recommended map redesign:**

**A. Marker clustering**
- Use `react-native-map-clustering` (wraps Supercluster) to cluster nearby alerts
- Cluster badges show count; tap to zoom and expand
- Individual markers use distinct icons per report type:
  - Red person silhouette = missing person
  - Yellow package = lost item
  - Green checkmark = found item
  - Purple eye = suspicious activity report (aggregated only, never individual)

**B. Temporal decay and freshness**
- Markers at full opacity for first 2 hours
- 50% opacity after 12 hours
- 25% opacity after 48 hours
- Auto-remove resolved/expired reports
- Pulsing animation on markers less than 30 minutes old ("just reported")

**C. Heatmap layer for community intelligence**
- Never show individual suspicious activity reports as pins (privacy risk)
- Instead, render aggregated pattern data as a heatmap layer
- Color gradient: green (safe) through yellow (some reports) to red (pattern detected)
- Heatmap refreshes from the `active_alerts_grid` materialized view every 5 minutes
- User can toggle heatmap layer on/off

**D. Alert radius visualization**
- Show the reporter's selected radius as a translucent circle (current implementation is fine)
- Add a dashed circle showing the user's own notification radius preference
- Where circles overlap = "you would be notified about this"

**E. Filtering controls**
- Floating filter chips at top of map: "Missing" | "Lost/Found" | "Activity" | "All"
- Time filter: "Last hour" | "Today" | "This week"
- These filters persist in user preferences

**F. Performance targets**
- Map should render within 2 seconds with up to 500 active alerts
- Clustering must happen on the client side (no server round-trip per zoom)
- Cache map tiles for offline viewing (OpenStreetMap tiles are cacheable)

### Priority: HIGH -- current map is not production-ready

---

## 3. Push Notification Strategy

### What the Industry Does

**Separation of critical vs. informational is the #1 rule.** When low-priority messages arrive through high-urgency channels, trust erodes. Once broken, users disable everything. The 2026 industry consensus: a single "Allow notifications?" toggle is no longer acceptable UX.

**iOS Critical Alerts** bypass Do Not Disturb and silent mode. Apple requires explicit approval (apps must apply for the entitlement). Only genuine safety/health/security apps qualify. These produce an audible alert even on muted devices.

**Category-based user control** (Citizen model):
- Users toggle individual categories: Fire, Police, Weather, Missing Persons
- Each category has independent radius settings
- "High severity only" mode filters out minor incidents
- Digest/summary mode batches non-urgent updates

**Geotargeting reduces fatigue.** Mass notification systems that use geofencing and geotargeting reach only affected users, cutting notification volume by 60-80% compared to broadcast. Waze cross-verifies reports against location data before sending alerts.

**Multi-channel escalation for critical alerts:**
1. Push notification (first attempt)
2. If not opened within 5 minutes, send a second push with different copy
3. If still not opened, escalate to SMS (for opted-in users)
4. For life-threatening alerts, use Critical Alert (iOS) / High-priority channel (Android)

### What SafeCircle Should Do

**Notification tiers for SafeCircle:**

| Tier | Type | Behavior | User Can Disable? |
|------|------|----------|-------------------|
| **CRITICAL** | Missing child (<12 years old) in your radius | iOS Critical Alert (bypasses DND), Android high-priority channel, vibration, sound | No (explain during onboarding) |
| **HIGH** | Missing person (any age), urgent suspicious pattern | Standard push with sound, badge | Yes, per category |
| **MEDIUM** | Lost/found match, sighting update on your report | Standard push, no sound | Yes |
| **LOW** | Community intelligence summary, weekly safety digest, reward notifications | Batched digest, delivered at user-preferred time | Yes |

**Android notification channels** (must be defined at app install):
```
safecircle_critical    -- Missing child alerts (cannot be silenced by user)
safecircle_high        -- Missing person alerts, urgent patterns
safecircle_medium      -- Lost/found matches, sighting updates
safecircle_low         -- Digests, summaries, rewards
```

**Notification content best practices:**
- Missing person: include photo thumbnail in the notification (Android BigPictureStyle / iOS rich notification)
- Show distance: "Missing child -- 1.2 km from you"
- Actionable: "Tap to view photo and last known location"
- Never include the reporter's identity in the notification
- Arabic notifications: use Arabic numerals and RTL layout

**Anti-fatigue measures:**
- Maximum 5 non-critical notifications per day per user
- If a user dismisses 3 consecutive alerts of the same category, auto-suggest reducing that category's radius
- Weekly "notification health" check: if open rate drops below 10%, prompt user to adjust preferences
- Never send notifications between 11 PM and 7 AM except for CRITICAL tier
- Aggregate nearby incidents: "3 incidents reported near Tverskaya" instead of 3 separate notifications

**Onboarding flow for notifications:**
1. Explain each tier with examples before asking for permission
2. Let user set their radius on a map during onboarding (default: 5 km)
3. Pre-select sensible defaults (CRITICAL + HIGH enabled, MEDIUM enabled, LOW as digest)
4. Show estimated notification frequency: "Based on your area, expect ~2-3 alerts per week"

### Priority: HIGH -- notification strategy must be designed before FCM integration

---

## 4. Trust and Verification Systems

### What the Industry Does

**Waze model -- cross-verification + reputation:**
- Reports are cross-verified against anonymized location and speed data to flag anomalies
- Users earn points through accurate reports and map edits
- "Area Managers" gain enhanced privileges after sustained quality contributions
- Reports require confirmation from other users to persist; unconfirmed reports decay quickly

**Wikipedia model -- role-based trust:**
- Graduated privileges: new users have limited editing ability
- Administrators and bureaucrats assigned after community vetting
- Edit history is fully transparent and auditable
- Vandalism detection uses machine learning (Gradient Boosting classifiers, attention mechanisms)

**Galaxy Zoo model -- consensus through redundancy:**
- Each item labeled by 40+ users for consensus
- Inconsistent classifiers have their influence reduced (not banned)
- Algorithms prioritize consistent contributors

**False report detection patterns:**
- Rule-based filters: remove impossible readings (e.g., report from ocean, report 500 km from user's location)
- Cross-reference against external data: check reports against public data sources
- Spatial clustering analysis: use Getis-Ord Gi* to assess geographic consistency
- Temporal analysis: sudden spike in reports from single area flagged for review

### What SafeCircle Should Do

**A. User credibility score (internal, never shown to users)**

```
Initial score: 50 (neutral)
Range: 0-100

Score increases:
  +5  Report confirmed by moderator
  +3  Report confirmed by 3+ other users
  +2  Sighting verified as helpful
  +1  Account age > 6 months
  +1  Phone number verified
  +2  Government ID verified (optional)

Score decreases:
  -10 Report removed by moderator as false
  -5  Report flagged by 5+ users as inaccurate
  -3  Report auto-expired with 0 confirmations
  -1  Per month of inactivity (decay)

Thresholds:
  < 20: Reports require moderator approval before going live
  20-40: Reports go live with "unverified" tag, queued for review
  40-70: Reports go live immediately, standard review queue
  70+: "Trusted reporter" -- reports skip initial review queue
```

**B. Report verification workflow**

```
Report submitted
    |
    v
[Credibility >= 40?] --yes--> Alert goes live immediately
    |                          Queued for moderator review (60s target)
    no
    |
    v
Alert goes live with "Unverified" badge
Queued for PRIORITY moderator review (30s target)
    |
    v
Moderator reviews:
  - Approve: badge changes to "Verified", credibility +5
  - Flag: alert paused, reporter notified, credibility -5
  - Remove: alert deleted, credibility -10
    |
    v
Community confirmation layer (parallel):
  - Other users can "Confirm" or "Didn't see" a report
  - 3+ confirmations: "Community verified" badge
  - 5+ "Didn't see": auto-flag for moderator re-review
```

**C. Automated false report detection**

Implement server-side checks on report submission:

| Check | Rule | Action |
|-------|------|--------|
| Geographic plausibility | Report location > 50 km from user's last known location | Block + prompt "Are you reporting from the scene?" |
| Rate limiting | > 3 reports in 1 hour from same user | Queue for review, do not publish immediately |
| Duplicate detection | Photo hash or text similarity > 80% to existing report | Prompt "Is this the same incident as [link]?" |
| Time plausibility | "Last seen" timestamp is in the future | Reject with error |
| Content filtering | Description contains hate speech, personal accusations, phone numbers | Block + warn user |
| Device fingerprint | Same device submitting from multiple accounts | Flag all accounts for review |

**D. Moderator tools (web dashboard)**

- Real-time queue with priority sorting (unverified reports first)
- Side-by-side view: report details + reporter history + similar reports
- One-click actions: Approve / Flag / Remove / Escalate to law enforcement
- Bulk actions for coordinated false report campaigns
- Moderator activity log (all actions auditable)
- Performance metrics: average review time, approval rate, appeals

**E. Counter-reporting**

- Any user can tap "Report Issue" on an alert
- Options: "Inaccurate information", "Person has been found", "Spam/fake", "Inappropriate content"
- 3+ counter-reports from distinct users triggers auto-flag
- Reporter is notified and can update/remove their report

### Priority: HIGH -- trust system must exist before public launch

---

## 5. Accessibility

### What the Industry Does

**RTL layout for Arabic:**
- I18nManager in React Native controls layout direction globally
- Use `start`/`end` instead of `left`/`right` in all StyleSheet definitions
- Numbers within Arabic text remain left-to-right (bidirectional text handling)
- Icons that imply direction (arrows, progress bars) must be mirrored
- Mixed-direction text (Arabic sentence with English name) requires explicit bidi control characters

**Emergency apps for elderly users (research from PMC/JMIR):**
- Minimum touch target: 48x48 dp (Google Material), 44x44 pt (Apple HIG)
- Font size minimum: 16sp for body text, 20sp+ for critical information
- Favor tapping over gesture interactions (swipe, pinch, long-press)
- Simplified call feature: one-tap direct call to emergency services
- High contrast mode: WCAG AA minimum (4.5:1 contrast ratio for text)
- Reduce cognitive load: maximum 3-5 options per screen

**Multilingual emergency alerts (Dubai sandstorm case study):**
- Simultaneous alerts in Arabic, English, and Urdu
- Alert messages: short, direct, action-oriented
- No idioms, no jargon, no abbreviations
- Use universal symbols alongside text

**Low-literacy design patterns:**
- Icon-driven navigation (supplement text with recognizable icons)
- Audio descriptions for critical alerts
- Visual severity indicators (color + icon, never color alone)
- Numbered step-by-step flows with progress indicators

### What SafeCircle Should Do

**A. RTL implementation for Arabic**

In `app.json`:
```json
{
  "expo": {
    "extra": {
      "supportsRTL": true
    }
  }
}
```

In the app entry point:
```javascript
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';

// Detect Arabic locale
const isRTL = Localization.locale.startsWith('ar');
if (I18nManager.isRTL !== isRTL) {
  I18nManager.forceRTL(isRTL);
  // Requires app restart -- handle gracefully
}
```

**Stylesheet rules (apply across entire codebase):**
- Replace all `marginLeft`/`paddingLeft` with `marginStart`/`paddingStart`
- Replace all `marginRight`/`paddingRight` with `marginEnd`/`paddingEnd`
- Replace `textAlign: 'left'` with `textAlign: 'auto'` (auto-detects RTL)
- Replace `flexDirection: 'row'` awareness: in RTL, `row` auto-reverses
- Test every screen in both Arabic and English

**B. Elderly-friendly mode**

Add a toggle in Settings: "Large Text Mode" / "Simplified Mode"

| Feature | Standard | Elderly Mode |
|---------|----------|--------------|
| Body text | 16sp | 22sp |
| Button text | 16sp | 20sp |
| Touch targets | 44pt | 56pt minimum |
| Navigation | Tab bar with icons + text | Tab bar with large icons + large text |
| Report flow | Standard multi-field form | Guided wizard, one field per screen |
| Map controls | Standard pinch/zoom | Large +/- buttons, no gesture requirement |
| Emergency action | Report button in tab bar | Persistent SOS button on every screen |

**C. Language architecture**

Use `i18next` + `react-i18next` with namespace-based translation files:

```
locales/
  ar/
    common.json      # Shared UI strings
    report.json      # Report-specific strings
    alerts.json      # Alert/notification strings
    categories.json  # Report categories, clothing, etc.
  ru/
    common.json
    report.json
    ...
  en/
    common.json
    report.json
    ...
```

**Critical translation rules:**
- Physical descriptions (clothing, body type, hair) use enum codes, not free text -- displayed in the reader's language regardless of reporter's language
- Category labels are translated at display time, stored as codes (`suspicious_vehicle`, not a Russian/Arabic string)
- Numbers: use `Intl.NumberFormat` for locale-aware formatting
- Dates: use `Intl.DateTimeFormat` -- Russian uses DD.MM.YYYY, Arabic may use Hijri calendar optionally
- Pluralization: Arabic has 6 plural forms (zero, one, two, few, many, other) -- i18next handles this natively

**D. Accessibility checklist for every screen**

- [ ] All images have `accessibilityLabel` (screen reader support)
- [ ] Color is never the sole indicator (always pair with icon or text)
- [ ] Touch targets >= 44pt in both dimensions
- [ ] Contrast ratio >= 4.5:1 for all text
- [ ] Screen reader navigation order matches visual order
- [ ] All interactive elements have `accessibilityRole` and `accessibilityHint`
- [ ] No essential information conveyed only through animation
- [ ] Tested with VoiceOver (iOS) and TalkBack (Android)

### Priority: HIGH -- Arabic RTL and i18n architecture needed before any translations

---

## 6. Offline Functionality

### What the Industry Does

**Offline-first architecture** treats the local database as the single source of truth. The UI reads from and writes to local storage first, with synchronization happening opportunistically in the background.

**Priority-based sync queues:**
- High priority: Emergency reports, sightings (push immediately when connected)
- Medium priority: Profile updates, preference changes
- Low priority: Analytics, non-critical metadata

**Conflict resolution patterns:**
- Last-Write-Wins (LWW): simple, used for non-collaborative data
- CRDTs (Conflict-Free Replicated Data Types): for data modified by multiple users
- Server-authoritative: server always wins for security-critical data (credibility scores, moderation decisions)

**Optimistic UI:** Display user actions immediately in the interface, marked as "pending" until server confirmation.

**Delta sync with tokens:** Exchange only changes since last sync using opaque tokens. Avoids clock-skew issues. Server provides a sync token; client requests `changes?token=abc123`.

### What SafeCircle Should Do

**A. What must work offline**

| Feature | Offline Capability | Sync Behavior |
|---------|-------------------|---------------|
| View cached alerts | Read from AsyncStorage | Refresh on reconnect |
| View cached map | Cached OpenStreetMap tiles | Refresh tiles on reconnect |
| Submit missing person report | Queue locally with photo | HIGH priority sync, auto-submit on reconnect |
| Submit sighting | Queue locally | HIGH priority sync |
| Submit suspicious activity report | Queue locally | MEDIUM priority sync |
| Submit lost/found item | Queue locally | MEDIUM priority sync |
| View own report history | Cached locally | Refresh on reconnect |
| Update profile/settings | Queue locally | LOW priority sync |
| Receive push notifications | Not possible offline | Notifications delivered on reconnect |
| Real-time map updates | Not possible offline | Socket.IO reconnects automatically |
| Chat/messaging | Queue messages locally | Sync on reconnect |

**B. Local storage schema**

```javascript
// AsyncStorage keys
'@safecircle/pending_reports'   // Array of queued reports
'@safecircle/cached_alerts'     // Last fetched nearby alerts
'@safecircle/cached_map_tiles'  // Tile cache metadata
'@safecircle/user_profile'      // Cached profile + settings
'@safecircle/sync_token'        // Server-provided sync token
'@safecircle/report_history'    // User's own reports
```

Each pending report:
```javascript
{
  id: uuid(),               // Client-generated UUID (idempotency key)
  type: 'missing',          // Report type
  data: { ... },            // Full report payload
  photo_uri: 'file://...',  // Local photo path
  created_at: timestamp,    // Client timestamp
  status: 'pending',        // pending | syncing | synced | failed
  retry_count: 0,           // Number of sync attempts
  priority: 'high'          // high | medium | low
}
```

**C. Sync engine implementation**

```
On app foreground OR network state change to "connected":
  1. Check pending_reports queue
  2. Sort by priority (high first), then by created_at (oldest first)
  3. For each pending report:
     a. Set status = 'syncing'
     b. Upload photo to MinIO (if present)
     c. Submit report to API with client-generated UUID
     d. If success: set status = 'synced', remove from queue
     e. If failure:
        - Network error: increment retry_count, keep in queue
        - 4xx error: set status = 'failed', notify user
        - 5xx error: exponential backoff (2^retry * 1000ms + jitter)
     f. Maximum 5 retries, then set status = 'failed' and notify user
  4. After all reports synced, fetch updates:
     a. GET /sync?token={sync_token}
     b. Update cached_alerts with new/changed/removed alerts
     c. Store new sync_token
```

**D. UI indicators for offline state**

- Persistent banner at top of screen when offline: "You're offline. Reports will be sent when you reconnect."
- Pending reports show a clock icon and "Waiting to send" label
- Successfully synced reports show a checkmark transition animation
- Failed reports show a red exclamation with "Tap to retry"
- Map shows "Last updated: 15 minutes ago" when viewing cached data

**E. Map tile caching**

- Cache the user's current area (5 km radius) at zoom levels 12-16
- This is approximately 100-200 tiles, roughly 5-10 MB
- Refresh tiles when online and tiles are older than 7 days
- Use a tile cache library compatible with react-native-maps and OpenStreetMap

### Priority: MEDIUM -- offline reports are essential, but full offline mode can iterate

---

## 7. Privacy-First Design

### What the Industry Does

**Structural anonymity (not just policy):** The strongest anonymous reporting systems (STOPit, Anonymous Alerts) make it architecturally impossible to identify reporters -- the system literally does not store the reporter's identity. This is more trustworthy than "we promise not to look."

**Secure two-way anonymous communication:** Platforms like VComply enable investigators to ask follow-up questions through an anonymous channel. The reporter sees the question and can respond without revealing their identity. This is implemented via anonymous thread IDs.

**End-to-end encryption for report content:** Only the intended recipient (moderator, law enforcement) can read the report content. The platform operator cannot access it.

**EXIF stripping:** Photos submitted in reports must have all metadata (GPS coordinates, device info, timestamps) stripped before storage. Otherwise, the "anonymous" report contains identifying information in the image metadata.

**Minimal data collection principle:** Collect only what is needed for the feature to function. Do not collect email for anonymous reports. Do not require account creation for anonymous reports. Do not store IP addresses associated with anonymous reports.

**Data retention and auto-deletion:** Reports auto-expire. User data is deleted on account deletion. Aggregated intelligence retains no individual report traces.

### What SafeCircle Should Do

**A. Anonymous reporting architecture (already partially designed)**

The current `intel_reports` table has no `reporter_id` column -- this is correct and should be preserved. Strengthen it:

- Anonymous reports must NOT require authentication (`POST /reports/suspicious` should work without JWT)
- Server must NOT log IP addresses for anonymous report endpoints
- Rate limiting for anonymous reports: use a temporary device fingerprint hash (hashed, not stored) that expires after 24 hours -- prevents spam without tracking identity
- Photo EXIF metadata must be stripped server-side using Sharp before storage (never trust client-side stripping)

**B. Privacy layers for different report types**

| Report Type | Reporter Identity | Public Visibility | Data Retention |
|-------------|-------------------|-------------------|----------------|
| Missing person | Verified (required for accountability) | Reporter name hidden from public, visible to moderators + law enforcement | Until resolved + 30 days |
| Lost item | Authenticated user | Name visible only to matched finder (after mutual consent) | Until resolved + 90 days |
| Found item | Authenticated user | Name visible only to matched loser (after mutual consent) | Until claimed + 90 days |
| Suspicious activity | Fully anonymous (no login required) | Never visible as individual report | Aggregated after 7 days, individual report deleted |
| Sighting | Authenticated user | Spotter name hidden from public, visible to reporter + moderators | Until case resolved + 30 days |

**C. Photo privacy**

- Strip all EXIF metadata server-side on upload (Sharp can do this)
- Compress and convert to WebP (removes additional metadata)
- Missing person photos: stored with signed URLs (time-limited access, no direct public URL)
- Blur faces in background of photos automatically (on roadmap, not MVP)
- Reporter can request photo removal at any time

**D. Location privacy**

- User's exact home location is never stored; only a "home zone" (city/district level)
- Location for push notifications: use coarse grid cells, not exact coordinates
- Report locations: stored at street level for missing persons, neighborhood level for suspicious activity
- Sighting locations: stored at precise level (necessary for search)
- Users can set a "privacy zone" around their home -- no reports from this area will show their address

**E. Data subject rights (GDPR-style, even in non-EU jurisdictions)**

- "My Data" screen in Settings: shows all data the platform holds about the user
- "Delete My Account" one-tap action: removes all personal data within 30 days
- "Download My Data" exports all user data as JSON
- Anonymous reports are unaffected by account deletion (they have no link to the account)

**F. Privacy communication**

- During onboarding: explain in plain language what data is collected and why
- Anonymous report screen: display a clear banner "This report is completely anonymous. We cannot trace it back to you." (already implemented -- good)
- Before photo upload: "This photo will be shared with nearby users. Location data will be removed from the image."
- Notification settings: "Your location is used to determine which alerts you receive. Your exact location is never shared with other users."

### Priority: HIGH -- privacy architecture must be right from the start

---

## Cross-Cutting Recommendations

### Design System Foundations

Before implementing any of the above, establish these foundations:

**Color system with semantic meaning:**

| Color | Meaning | Hex | Usage |
|-------|---------|-----|-------|
| Red | Critical/Emergency | #DC2626 | Missing person alerts, SOS |
| Amber | Warning/Caution | #F59E0B | Lost items, unverified reports |
| Green | Safe/Resolved/Found | #22C55E | Found items, resolved cases |
| Indigo | Community/Anonymous | #6366F1 | Suspicious activity, patterns |
| Gray | Neutral/Informational | #6B7280 | Secondary text, disabled states |

These colors are already partially used in the codebase -- formalize them.

**Typography scale (must support Arabic, Russian, English):**
- Arabic: use a Naskh-style font (e.g., Noto Sans Arabic) -- never use a decorative/Kufi font for UI
- Russian: system Cyrillic font (SF Pro on iOS, Roboto on Android handle this natively)
- English: system Latin font
- All three must be tested at every size in the scale

**Icon system:**
- Use a single icon library (e.g., `@expo/vector-icons` with MaterialCommunityIcons)
- Every icon must be paired with a text label (accessibility)
- Directional icons (arrows, chevrons) must auto-mirror in RTL mode

### Onboarding Flow

Design a first-run experience that:
1. Asks for language preference (Arabic / Russian / English) with flag icons
2. Requests location permission with a visual explanation of why
3. Requests notification permission with tier explanation
4. Sets notification radius on an interactive map
5. Optional: verify phone number for higher credibility
6. Optional: verify government ID for "verified reporter" status

This flow should take under 90 seconds and be skippable (with sensible defaults applied).

### Performance Budgets

| Metric | Target |
|--------|--------|
| App launch to interactive | < 3 seconds |
| Report submission (Phase 1) | < 15 seconds from first tap |
| Map render with 500 alerts | < 2 seconds |
| Push notification delivery | < 5 seconds from report submission |
| Photo upload + strip EXIF | < 3 seconds on 3G |
| Offline report queue processing | < 10 seconds per report on reconnect |

---

## Summary: Implementation Roadmap

| Priority | Area | Key Action |
|----------|------|------------|
| **P0 -- Before launch** | Emergency reporting | Redesign to 2-phase flow (quick alert + enrich) |
| **P0 -- Before launch** | Trust system | Implement credibility scoring + moderator queue |
| **P0 -- Before launch** | Privacy | Ensure structural anonymity, EXIF stripping, signed URLs |
| **P0 -- Before launch** | Notifications | Define Android channels + notification tiers |
| **P1 -- First release** | Map | Add clustering, filtering, temporal decay |
| **P1 -- First release** | i18n | Implement i18next + RTL support + Arabic translations |
| **P1 -- First release** | Offline | Implement report queue with priority sync |
| **P2 -- Fast follow** | Accessibility | Elderly mode, large text, guided wizard |
| **P2 -- Fast follow** | Map | Heatmap layer for community intelligence |
| **P2 -- Fast follow** | Notifications | Anti-fatigue measures, digest mode |
| **P3 -- Iteration** | Trust | ML-based false report detection |
| **P3 -- Iteration** | Accessibility | VoiceOver/TalkBack full audit |
| **P3 -- Iteration** | Offline | Full map tile caching |

---

## Sources

- [Designing for Urgency: What 911 Emergency Apps Reveal About Fast UX](https://blessingokpala.substack.com/p/designing-for-urgency-what-911-emergency)
- [UX for Public Safety: Designing Emergency Alert Systems](https://vrunik.com/ux-for-public-safety-designing-emergency-alert-systems/)
- [App Push Notification Best Practices for 2026](https://appbot.co/blog/app-push-notifications-2026-best-practices/)
- [Establishing Trust in Crowdsourced Data](https://arxiv.org/html/2511.03016v1)
- [Offline-First Done Right: Sync Patterns for Real-World Mobile Networks](https://developersvoice.com/blog/mobile/offline-first-sync-patterns/)
- [Improving UX and Declutter the Map for Waze](https://medium.com/@trinaghoshipad/improving-ux-and-declutter-the-map-for-waze-ux-case-study-62af11540e54)
- [Citizen App Quick Start Guide](https://support.citizen.com/hc/en-us/articles/34348406180503-Quick-Start-Guide)
- [PulsePoint - Building Informed Communities](https://www.pulsepoint.org/)
- [Arabic Web Design: UX, RTL and Cultural Considerations](https://www.extradigital.co.uk/articles/design/elements-arabic-web-design/)
- [Implementing RTL in React Native Expo](https://geekyants.com/blog/implementing-rtl-right-to-left-in-react-native-expo---a-step-by-step-guide)
- [React Native I18nManager Documentation](https://reactnative.dev/docs/i18nmanager)
- [Expo Localization Documentation](https://docs.expo.dev/guides/localization/)
- [Optimizing Mobile App Design for Older Adults](https://pmc.ncbi.nlm.nih.gov/articles/PMC12350549/)
- [Design Guidelines of Mobile Apps for Older Adults](https://mhealth.jmir.org/2023/1/e43186)
- [Offline-First Architecture: Designing for Reality](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79)
- [react-native-map-clustering](https://www.npmjs.com/package/react-native-map-clustering)
- [Community Surveillance Apps -- EFF](https://sls.eff.org/technologies/community-surveillance-apps)
- [Omnilert: A Practical Guide to Mass Notification Systems](https://www.omnilert.com/blog/mass-notification-systems)
- [3 iOS and Android Updates for 2025 Push Strategy](https://www.airship.com/blog/3-ios-android-updates-to-consider-in-your-2025-push-notification-strategy/)
- [Critical Alerts -- Pushsafer](https://www.pushsafer.com/en/critical-alerts)
- [Trust and Reputation Systems -- Springer](https://link.springer.com/chapter/10.1007/978-3-540-74810-6_8)
- [Anonymous Reporting Systems -- STOPit Solutions](https://www.stopitsolutions.com/solutions/anonymous-reporting-system)
- [Planning for RTL Languages -- Argos Multilingual](https://www.argosmultilingual.com/blog/planning-for-rtl-languages-how-layout-content-and-qa-fit-together)
- [Disability-Inclusive Emergency Mobile App Requirements](https://link.springer.com/article/10.1007/s10209-025-01235-1)
