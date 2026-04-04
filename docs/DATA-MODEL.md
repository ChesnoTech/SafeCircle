# SafeCircle — Data Model

> Extracted and modernized from original 2019 brainstorming (XMind maps).
> Designed country-agnostic — Egypt was the reference implementation.
> Bilingual: English primary, Russian secondary (Русский перевод ниже каждого раздела)

---

## Design Principles

1. **Country-agnostic core, country-specific extensions**: core fields are universal, country-specific fields stored as JSONB
2. **Progressive disclosure**: minimal required fields for speed, optional fields for detail
3. **Standardized vocabularies**: dropdowns/enums instead of free text wherever possible (enables cross-language matching)
4. **Privacy by design**: anonymous reports have no reporter link at the database level
5. **Offline-first**: reports can be drafted offline and submitted when connectivity returns

---

### Русский: Принципы проектирования

1. **Универсальное ядро, страновые расширения**: базовые поля универсальны, специфичные — в JSONB
2. **Прогрессивное раскрытие**: минимум обязательных полей для скорости, опциональные — для деталей
3. **Стандартизированные справочники**: выпадающие списки вместо свободного текста
4. **Конфиденциальность**: анонимные отчёты не содержат связи с отправителем
5. **Офлайн-режим**: отчёты можно составить без сети и отправить позже

---

## 1. Report Types (Типы отчётов)

### Overview

| Type | Arabic (Original) | Russian | Description |
|------|-------------------|---------|-------------|
| `missing_person` | ابلغ عن مفقود | Пропавший | Missing person/vehicle/animal/item report |
| `suspicious` | اشتباة | Подозрительная активность | Suspicious activity report (anonymous) |
| `found` | عثرت علي... | Я нашёл... | Found person/item/witnessed incident |
| `lost_item` | — (new) | Потерял | Lost item report (for matching with found) |

---

## 2. Missing Person Report (`missing_person`)

> Original: ابلغ عن مفقود — the most detailed map, 200+ fields

### 2.1 Report Categories

| Category | Arabic | Russian | Subcategories |
|----------|--------|---------|---------------|
| `person` | افراد | Люди | Adults, children |
| `vehicle` | مركبات | Транспорт | Cars, motorcycles, bicycles, boats |
| `document` | مستندات | Документы | ID, passport, license, cards |
| `device` | موبايل و كمبيوتر | Устройства | Phone, laptop, tablet |
| `animal` | حيوانات | Животные | Pets (cats, dogs, birds), wild animals |
| `valuables` | معادن نفيسة | Ценности | Jewelry (gold, silver, diamonds, gems) |
| `art` | تحف و اثار | Искусство | Paintings, sculptures, antiquities |
| `bag` | حقيبة | Сумка | — |
| `wallet` | محفظة | Кошелёк | — |

### 2.2 Person Report — Core Fields

> Fields marked with `*` are required. All others are optional but improve matching.

```
REPORTER INFORMATION
├── reporter_id*                    # Authenticated user
├── relationship_to_missing*        # Enum (see 2.3)
└── police_report                   # Optional
    ├── report_photo                # Photo of police report
    ├── issuing_authority           # Country-specific (Egypt: governorate → police station)
    ├── report_date
    └── report_number

MISSING PERSON — IDENTITY
├── full_name*
│   ├── first_name*
│   ├── father_name                # Patronymic (Egypt, Russia, Arab countries)
│   ├── grandfather_name           # Egypt/Arab countries
│   ├── great_grandfather_name     # Egypt
│   ├── family_name*               # Surname/last name
│   └── nickname                   # Known-as name / child's nickname
├── gender*                        # Enum: male, female, other, unknown
├── date_of_birth                  # Or approximate age
├── age_approximate                # If DOB unknown
└── criminal_status                # Enum (see 2.4) — law enforcement only

MISSING PERSON — PHOTOS*
├── full_body_photo                # Full body recent photo
├── face_photo*                    # Face closeup — REQUIRED
└── additional_photos[]            # Array of extra photos

MISSING PERSON — PHYSICAL DESCRIPTION
├── height_range                   # { min_cm, max_cm }
├── weight_range                   # { min_kg, max_kg }
├── skin_tone*                     # Standardized palette (Pantone-based, see 2.5)
├── hair_color                     # Enum: black, blonde, brown, red, gray, white, dyed
├── hair_style                     # Enum: short, long, curly, straight, bald, hijab
├── eye_color                      # Enum: black, brown, hazel, green, blue, gray
├── teeth_description              # Free text
├── facial_hair                    # Enum: none, mustache, beard, goatee, stubble
├── glasses                        # Enum: none, eyeglasses, sunglasses
├── tattoos[]
│   ├── body_location              # Enum: neck, right_arm, left_arm, right_leg,
│   │                              #        left_leg, back, buttocks, chest, face
│   ├── color
│   └── description
├── distinguishing_marks[]
│   ├── type                       # Enum: scar, disability, permanent_injury, birthmark, piercing
│   ├── body_location
│   └── description
└── fractures[]
    └── body_part                  # Enum: right_hand, left_hand, right_leg, left_leg, neck, spine

MISSING PERSON — MEDICAL
├── medical_conditions[]           # Array of conditions
├── medications[]
│   ├── name
│   └── schedule                   # Dosage and timing
└── blood_type                     # Enum: A+, A-, B+, B-, AB+, AB-, O+, O-

MISSING PERSON — FAMILY (for children)
├── father
│   ├── full_name
│   ├── country_of_origin
│   ├── photo
│   └── marital_status             # Enum: single, married_to_mother, divorced_from_mother,
│                                  #        divorced_and_remarried
└── mother
    ├── full_name
    ├── country_of_origin
    ├── photo
    └── marital_status             # Enum: married_to_father, married_to_other,
                                   #        divorced_from_father, single

LAST SEEN*
├── datetime*                      # Date and time range { from, to }
├── location*                      # Geographic point + address
│   ├── coordinates                # { lat, lng }
│   └── address                    # Country-specific structured address (see Localization)
├── clothing_description*          # What they were wearing
├── circumstances                  # Free text — what happened
├── psychological_state            # State before disappearance
├── last_companions[]              # People they were last with
│   ├── name
│   ├── relationship
│   └── address
├── known_enemies[]                # People with grudges
│   ├── name
│   ├── relationship_nature
│   └── address
└── belongings[]                   # Items they had with them

ALERT SETTINGS
├── alert_radius_km*               # Geographic radius for push notifications
├── auto_expand                    # Auto-expand radius after N minutes with no sighting
└── expires_at                     # Auto-expire (default: 72h, renewable)
```

### 2.3 Relationship to Missing Person

From original brainstorming (صلتك بالشخص المبلغ عنه):

| Category | Arabic | Values |
|----------|--------|--------|
| Blood relative | قرابة بالدم | Mother, Father, Sister, Brother, Uncle (maternal/paternal), Aunt, Cousin, Son, Daughter, Grandson, Granddaughter |
| By marriage | نسب | Husband, Wife, Mother-in-law, Father-in-law |
| Personal | علاقة شخصية | Friend, Work colleague, Classmate, Neighbor, Other |
| Law enforcement | ضابط شرطه | Police report reference, Prosecutor's order |

### 2.4 Criminal Status

From original (الحالة الجنائية):

| Status | Arabic | Russian | Note |
|--------|--------|---------|------|
| `clean` | لا يوجد سوابق | Нет судимостей | No prior record |
| `witness_wanted` | مطلوب للشهادة | Вызван свидетелем | Wanted as witness |
| `sentence_served` | انهي العقوبة | Отбыл наказание | Completed sentence |
| `case_pending` | مطلوب علي ذمة قضية | Подозреваемый | Wanted for pending case |
| `fugitive` | هارب من العدالة | В розыске | Fugitive |

> Note: Criminal status is visible only to verified law enforcement accounts.

### 2.5 Skin Tone Palette

Based on Pantone Humanae project reference images from brainstorming. Instead of subjective labels, use a standardized numeric palette:

| Level | Description (EN) | Arabic | Russian | Hex Range |
|-------|-------------------|--------|---------|-----------|
| 1 | Very light | أبيض فاتح | Очень светлая | `#F5E0D0` - `#FAEBD7` |
| 2 | Light | أبيض | Светлая | `#F0C8A0` - `#F5DEB3` |
| 3 | Light medium | قمحي | Светло-средняя | `#D2A06E` - `#DEB887` |
| 4 | Medium | أصفر | Средняя | `#C68E5B` - `#D2A06E` |
| 5 | Medium dark | قمحي غامق | Средне-тёмная | `#A0724A` - `#B8860B` |
| 6 | Dark | أسمر | Тёмная | `#8B6538` - `#A0724A` |
| 7 | Very dark | أسود | Очень тёмная | `#4A3728` - `#6B4226` |

> **Modernization note**: The original brainstorming had 6 color labels. A numeric 1-10 scale with hex color swatches is more precise, less culturally loaded, and works across languages. Consider using actual Pantone SkinTone Guide values or Monk Skin Tone Scale (Google, 10-point scale) for production.

---

## 3. Vehicle Report

> Original: detailed vehicle data from Egyptian registration system

### Core Fields (Universal)

```
VEHICLE IDENTIFICATION
├── make*                          # Brand (Toyota, BMW, etc.)
├── model*                         # Model name
├── year                           # Manufacturing year
├── color*                         # Body color
├── license_plate                  # Country-specific format
│   ├── country_code*
│   ├── plate_text                 # Full or partial
│   └── plate_photo
├── chassis_number                 # VIN
└── engine_number

VEHICLE APPEARANCE
├── photos*
│   ├── front
│   ├── rear
│   ├── right_side
│   ├── left_side
│   └── interior
├── body_condition
│   ├── paint_color_actual         # May differ from registration
│   └── scratches_description
└── distinguishing_marks[]         # Stickers, dents, modifications
    ├── description
    └── photo

VEHICLE CONTENTS                   # What was inside
├── description
└── photos[]

LAST SEEN*
├── location*                      # Geographic point
├── datetime*
└── additional_info
```

### Country Extension: Egypt (مصر)

```json
{
  "country": "EG",
  "registration": {
    "governorate": "القاهرة",
    "traffic_unit": "وحدة مرور مدينة نصر",
    "license_type": "ملاكى",
    "letters": "أ ب ج",
    "numbers": "1234",
    "owner_nationality": "مصري",
    "owner_name": { "first": "", "father": "", "grandfather": "", "great_grandfather": "" },
    "owner_address_as_on_license": "",
    "license_expiry": "2025-01-01",
    "issue_date": "2022-01-01",
    "sale_prohibited": false,
    "body_type": "سيدان",
    "engine_cc": 1600,
    "cylinders": 4,
    "fuel_type": "بنزين",
    "glass_color": "شفاف",
    "insurance": {
      "company": "",
      "policy_number": ""
    },
    "inspection_date": "2024-06-01",
    "license_photos": { "front": "", "back": "" }
  }
}
```

### Country Extension: Russia (Россия)

```json
{
  "country": "RU",
  "registration": {
    "region_code": 77,
    "plate_format": "А000АА 77",
    "sts_number": "",
    "pts_number": "",
    "owner_name": { "first": "", "patronymic": "", "family": "" },
    "registration_address": "",
    "techosmotr_date": "2024-06-01",
    "osago_policy": "",
    "category": "B"
  }
}
```

---

## 4. Document Report

| Document Type | Arabic | Russian | Country-Specific Fields |
|---------------|--------|---------|------------------------|
| National ID | بطاقة شخصية | Паспорт гражданина | Full name, address, issuing authority |
| Passport | جواز سفر | Загранпаспорт | Passport number, nationality, expiry |
| Driver's license | رخصة قيادة | Водительское удостоверение | License type, number, categories |
| Vehicle registration | رخصة سيارة | СТС | See Vehicle Report |
| Student ID | كارنية جامعة | Студенческий билет | University, faculty, year |
| School ID | كارنية مدرسة | Школьный билет | School name, grade |
| Credit/bank card | بطاقة ائتمان | Банковская карта | Bank name (no card numbers!) |
| Contracts | عقود | Договоры | Type, parties |
| Health insurance | تامين طبي | Полис ОМС/ДМС | Provider, policy number |
| Club/gym card | كارنية نادي | Абонемент | Organization name |

> **Security**: Never store full card numbers, CVV, or bank account details. Only bank name and last 4 digits for identification.

---

## 5. Suspicious Activity Report (`suspicious`)

> Original: اشتباة — anonymous by design

```
REPORT (anonymous — no reporter_id stored)
├── category*                      # Enum (see below)
├── subcategory
├── description*                   # Free text
├── location*                      # Geographic point
├── datetime*                      # When observed
├── photos[]                       # Optional evidence photos
├── severity                       # Enum: low, medium, high, urgent
└── device_fingerprint             # For rate-limiting only, not stored long-term

CATEGORIES
├── persons (افراد / Лица)
│   ├── adults_18plus
│   │   ├── male (رجل / Мужчина)
│   │   ├── female (سيدة / Женщина)
│   │   └── unspecified (غير محدد / Не указано)
│   └── children
│       ├── boy (ولد / Мальчик)
│       ├── girl (بنت / Девочка)
│       └── unspecified
├── vehicles (مركبات / Транспорт)
│   ├── private_car (سياره خاصة)
│   ├── passenger_vehicle (سياره نقل افراد)
│   ├── cargo_vehicle (سياره نقل بضائع)
│   ├── bicycle (دراجه هوائية)
│   └── motorcycle (دراجه بخارية)
├── places_and_activities (اماكن و نشاطات / Места и действия)
│   ├── illegal_trade (تجارة غير شرعية / Нелегальная торговля)
│   ├── immoral_activity (اعمال منافية للاداب / Аморальная деятельность)
│   ├── terrorism (ارهاب / Терроризм)
│   ├── incitement (تحريض / Подстрекательство)
│   ├── drug_activity (— / Наркоактивность) [NEW]
│   ├── vandalism (— / Вандализм) [NEW]
│   └── harassment (— / Домогательства) [NEW]
└── art_and_antiquities (تحف فنية و اثار / Искусство и древности)
    ├── paintings (لوحات / Картины)
    ├── sculptures (تماثيل / Скульптуры)
    └── other (اخري / Другое)
```

> **Modernization**: Added drug_activity, vandalism, harassment categories. The original 2019 map didn't include these but they're common report types globally.

---

## 6. Found / Witness Report (`found`)

> Original: عثرت علي... (I found...)

```
REPORT
├── category*                      # What was found/witnessed
├── description*
├── location*
├── datetime*
├── photos[]*                      # At least one photo required for items
├── finder_willing_to_hold         # Boolean — is the finder keeping the item safe?
└── handoff_preference             # Enum: in_person, drop_point, police_station, other

CATEGORIES
├── persons (افراد)
│   ├── man_or_boy (رجل او ولد)
│   └── woman_or_girl (سيدة او بنت)
├── incidents (حادث) [WITNESSED]
│   ├── traffic_accident (حادث سير / ДТП)
│   ├── armed_robbery (سرقة بالاكراه / Грабёж)
│   ├── theft (سرقة / Кража)
│   ├── homicide (قتل / Убийство)
│   ├── fight (مشاجرة / Драка)
│   ├── hit_and_run (— / Наезд с места ДТП) [NEW]
│   └── other (— / Другое) [NEW]
├── documents (مستندات)           # Same types as Document Report
├── animals (حيوانات)
│   ├── pets: cats, dogs, birds, other (قطط, كلاب, طيور, اخري)
│   └── wild_animals (حيوانات برية)
├── devices (موبايل و كمبيوتر)
│   ├── laptop (لابتوب)
│   ├── smartphone (هاتف ذكي)
│   ├── mobile_phone (هاتف محمول)
│   └── tablet (جهاز لوحي)
├── art (تحف و اثار)
├── wallet (محفظة)
├── bag (حقيبه)
└── vehicles (مركبات)
    ├── commercial_car (سياره تجارية)
    ├── private_car (سياره خاصة)
    ├── motorcycle (دراجه بخارية)
    ├── bicycle (دراجه هوائية)
    └── boat (قوارب)
```

---

## 7. User Model

```
USER
├── id*                            # UUID
├── phone*                         # Primary identifier, verified via OTP
├── email                          # Optional
├── display_name
├── photo
├── language_preference            # Enum: ar, en, ru, zh, ...
├── country*                       # For localization and address format
├── home_location                  # Approximate, for default alert radius
├── notification_settings
│   ├── alert_radius_km            # How far away to receive missing person alerts
│   ├── categories[]               # Which alert types to receive
│   └── quiet_hours                # { from, to }
├── credibility_score              # Starts at 50, goes up/down based on report accuracy
├── role                           # Enum: user, moderator, law_enforcement, admin
├── verification_status            # Enum: phone_verified, id_verified, law_enforcement_verified
├── rewards
│   ├── badges[]                   # Bronze, Silver, Gold
│   ├── total_contributions        # Count of helpful actions
│   └── reward_balance             # Monetary rewards pending
├── created_at
└── last_active_at
```

### Roles & Permissions (from original "Users Access" map)

| Action | Public | Registered | Moderator | Law Enforcement | Admin |
|--------|--------|------------|-----------|-----------------|-------|
| View public reports | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Share on social media | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Add new report | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Modify own report | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Delete own report | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Comment on reports | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Contact members | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Review moderation queue | :x: | :x: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| View criminal status | :x: | :x: | :x: | :white_check_mark: | :white_check_mark: |
| Access behavioral analysis | :x: | :x: | :x: | :white_check_mark: | :white_check_mark: |
| Manage users & settings | :x: | :x: | :x: | :x: | :white_check_mark: |

---

## 8. Pattern / Intelligence Model

```
PATTERN (aggregated from anonymous reports)
├── id
├── category                       # What type of activity
├── location                       # Geographic center of reports
├── radius                         # How spread out the reports are
├── report_count                   # Number of independent reports
├── first_seen                     # Earliest report timestamp
├── last_seen                      # Latest report timestamp
├── time_pattern                   # e.g., "weekdays 15:00-16:00"
├── description_summary            # AI-generated summary of reports
├── status                         # Enum: monitoring, threshold_reached, reviewed, forwarded, resolved
├── moderator_review
│   ├── reviewed_by
│   ├── reviewed_at
│   └── decision                   # Enum: forward, dismiss, monitor
└── authority_forwarding
    ├── forwarded_at
    ├── forwarded_to               # Agency/department
    └── reference_number
```

---

## 9. Sighting Model

```
SIGHTING (response to a missing person alert)
├── id
├── report_id*                     # Which missing person report
├── spotter_id                     # Can be anonymous
├── location*                      # Geographic point where person was seen
├── datetime*
├── confidence                     # Enum: certain, likely, unsure
├── photo                          # Optional photo of sighting
├── direction_of_travel            # Enum: N, NE, E, SE, S, SW, W, NW, stationary, unknown
├── accompanied                    # Was the person with someone?
│   ├── alone
│   ├── with_adult
│   ├── with_children
│   └── description                # Description of companion
└── additional_info                # Free text
```

---

## 10. Database Schema Summary

```
PostgreSQL + PostGIS

Core Tables:
  users                            → User accounts & preferences
  reports                          → All report types (type discriminator column)
  report_persons                   → Person details for missing/found person reports
  report_vehicles                  → Vehicle details
  report_documents                 → Document details
  report_items                     → Generic item details
  sightings                        → Sighting responses to missing person alerts
  intel_reports                    → Anonymous suspicious activity (NO foreign key to users)
  patterns                         → Aggregated intelligence patterns
  matches                          → Lost-found automatic matches
  messages                         → In-app messaging threads
  rewards                          → Reward transactions and badges
  media                            → Photos and evidence files (metadata; files in object storage)
  country_reference                → Country-specific reference data (JSONB)
  audit_log                        → All law enforcement queries logged

Key Design Decisions:
  - GEOGRAPHY type for all location columns (PostGIS)
  - GIST indexes on all geography columns
  - JSONB for country_extension fields (flexible schema per country)
  - intel_reports has NO reporter_id column — anonymity is structural, not policy
  - Soft deletes (deleted_at timestamp) — never hard delete reports
  - All timestamps in UTC
  - Partitioning by country for large-scale deployment
```

---

## What's New vs. 2019 Brainstorming

| Area | 2019 Original | 2024+ Modernization |
|------|---------------|---------------------|
| Skin tone | 6 Arabic labels | Numeric scale + Monk Skin Tone Scale (Google) |
| Address format | Egypt-only (governorate → police station) | Country-agnostic with JSONB extensions |
| Languages | Arabic UI | Multilingual core (AR, EN, RU, ZH, +) |
| Photo matching | Manual | AI image similarity scoring |
| Device categories | Phone, laptop, tablet | + smartwatch, AirPods/earbuds, camera, drone |
| Vehicle categories | Cars, motorcycles | + scooters, e-bikes, boats, ATVs |
| Incident types | 5 types | + hit-and-run, fire, natural disaster witness |
| Suspicious activity | 4 categories | + drugs, vandalism, harassment, cyber |
| Auth | — | Phone OTP + biometric + law enforcement verification |
| Matching | Manual search | Automatic geo + visual + temporal matching |
| Offline | Not planned | Offline-first report drafting |
| Privacy | Basic | GDPR/privacy-by-design, structural anonymity |
