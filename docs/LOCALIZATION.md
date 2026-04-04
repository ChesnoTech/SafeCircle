# SafeCircle — Localization & Country Adaptation Guide

> Bilingual: English primary, Russian secondary (Русский перевод ниже каждого раздела)

---

## Overview

SafeCircle is designed to work globally. Each country has different:
- Administrative divisions (governorate vs. oblast vs. state vs. province)
- Document types (national ID formats, license types)
- Vehicle registration systems
- Emergency services structure
- Legal requirements for missing person reports
- Languages and scripts

The system handles this through a **universal core + country extensions** model.

---

### Русский: Обзор

SafeCircle спроектирован для глобальной работы. Каждая страна имеет различные административные деления, типы документов, системы регистрации ТС, структуры экстренных служб. Система решает это через модель «универсальное ядро + страновые расширения».

---

## Architecture: How Country Adaptation Works

```
┌─────────────────────────────────────────┐
│           UNIVERSAL CORE                │
│                                         │
│  • Name (first, family — always)        │
│  • Gender                               │
│  • Age / DOB                            │
│  • Photo                                │
│  • GPS coordinates                      │
│  • Skin tone (numeric scale)            │
│  • Physical description enums           │
│  • Report type                          │
│  • Timestamps (UTC)                     │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
┌────────────┐ ┌────────┐ ┌────────────┐
│ Egypt (EG) │ │ Russia │ │ Country X  │
│            │ │  (RU)  │ │            │
│ Governorate│ │ Oblast │ │ Province/  │
│ → Markaz/  │ │ → City │ │ State/     │
│   Kism     │ │ → Dist │ │ Region     │
│            │ │        │ │            │
│ 4-part name│ │ Patron.│ │ Local name │
│ Arabic docs│ │ RU docs│ │ format     │
│ EG plates  │ │ RU plat│ │ Local plat │
│ EG police  │ │ RU MVD │ │ Local auth │
└────────────┘ └────────┘ └────────────┘
    JSONB          JSONB       JSONB
```

---

## Country Profile: Egypt (مصر) — Reference Implementation

> The original brainstorming was built around Egypt. This is the most detailed country profile.

### Administrative Structure

```
Egypt (مصر)
├── 27 Governorates (محافظات)
│   ├── Cairo (القاهرة)
│   ├── Giza (الجيزة)
│   ├── Alexandria (الإسكندرية)
│   ├── Dakahlia (الدقهلية)
│   └── ... (23 more)
│
├── Each governorate contains:
│   ├── Markaz (مركز) — rural district
│   ├── Kism (قسم) — urban district
│   └── New Urban Community (مجتمع عمراني)
│
└── Each district contains:
    ├── Cities (مدن)
    ├── Villages (قرى)
    └── Neighborhoods (أحياء / شياخات)
```

See `data/reference/egypt/` for complete datasets.

### Name Format
4-part name: First (الأسم الأول) → Father (الأب) → Grandfather (الجد) → Great-grandfather (جد الأب)

### Document Types
- National ID (بطاقة شخصية) — 14-digit number
- Passport (جواز سفر)
- Driver's License (رخصة قيادة) — 12 types (see reference data)
- Vehicle Registration (رخصة سيارة) — 28 license types
- Student ID (كارنية جامعة/مدرسة)
- Health Insurance (تامين طبي)

### Vehicle Registration
- Plate format: Arabic letters + numbers + governorate
- 28 license types (private, taxi, bus, tourism, government, military, etc.)
- 159 traffic police units across the country

### Education System
Levels: Illiterate → Literate (no certificate) → Primary → Preparatory → Secondary (Technical 3yr / Technical 5yr / General / Azhari) → University (Bachelor/License) → Postgraduate (Master/PhD)

### Emergency Services
- Police: 122
- Ambulance: 123
- Fire: 180

### Language
- Primary: Arabic (العربية)
- Secondary: English

---

## Country Profile: Russia (Россия)

### Administrative Structure

```
Russia (Россия)
├── 89 Federal Subjects (субъекты федерации)
│   ├── 22 Republics (республики)
│   ├── 9 Krais (края)
│   ├── 48 Oblasts (области)
│   ├── 4 Autonomous Okrugs (автономные округа)
│   ├── 1 Autonomous Oblast (автономная область)
│   ├── 3 Federal Cities (города федерального значения)
│   │   ├── Moscow (Москва)
│   │   ├── Saint Petersburg (Санкт-Петербург)
│   │   └── Sevastopol (Севастополь)
│   └── 2 Federal Territories (федеральные территории)
│
├── Each subject contains:
│   ├── Cities (города)
│   ├── Urban Districts (городские округа)
│   ├── Municipal Districts (муниципальные районы)
│   └── Urban/Rural Settlements (поселения)
```

### Name Format
3-part name: First (Имя) → Patronymic (Отчество) → Family (Фамилия)

### Document Types
- Internal Passport (паспорт гражданина РФ) — series + number (e.g., 45 08 123456)
- International Passport (загранпаспорт)
- Driver's License (водительское удостоверение) — categories A, A1, B, B1, C, C1, D, D1, BE, CE, DE, M, Tm, Tb
- Vehicle Registration (СТС — свидетельство о регистрации)
- PTS (паспорт транспортного средства)
- SNILS (СНИЛС — pension insurance)
- INN (ИНН — tax number)
- Health Insurance (полис ОМС)
- Student ID (студенческий билет)

### Vehicle Registration
- Plate format: А000АА 77 (letter-3digits-2letters region_code)
- Region codes: 01–99, 100+
- Categories: A, B, C, D, BE, CE, DE, M, Tm, Tb
- Inspection: техосмотр (annual)
- Insurance: ОСАГО (mandatory), КАСКО (optional)

### Education System
Levels: Primary (начальное) → Basic General (основное общее, 9 years) → Secondary General (среднее общее, 11 years) → Vocational (среднее профессиональное) → Bachelor (бакалавриат) → Master (магистратура) → Specialist (специалитет) → PhD (аспирантура/кандидат наук) → Doctor of Sciences (доктор наук)

### Emergency Services
- Universal: 112
- Police: 102 (МВД)
- Ambulance: 103
- Fire: 101
- Missing persons: Поиск пропавших (volunteer org "Лиза Алерт" — potential partner)

### Language
- Primary: Russian (русский)
- Regional: 35+ official languages in different subjects

---

## Country Profile: China (中国) — Planned

> From original "Redirection Script" map — China was planned as a target market.

### Administrative Structure
Province (省) → Prefecture (地级市) → County (县) → Township (乡) → Village (村)

### Name Format
Family name (姓) + Given name (名) — family name first

### Key Considerations
- Great Firewall: FCM won't work — need Huawei Push, Xiaomi Push, or local alternatives
- WeChat integration may be more effective than standalone app
- Real-name registration requirements (实名制)
- Data localization laws — data must be stored in China

---

## Adding a New Country — Checklist

When expanding SafeCircle to a new country, the following must be configured:

### Required

- [ ] **Administrative divisions**: hierarchy of regions/states/provinces with codes and native names
- [ ] **Name format**: how many parts? Patronymic? Family name position?
- [ ] **Address format**: what fields? What order?
- [ ] **Phone number format**: country code, length, validation regex
- [ ] **Languages**: primary + regional languages, RTL support needed?
- [ ] **Emergency numbers**: police, ambulance, fire, missing persons hotline
- [ ] **Document types**: national ID, passport, driver's license formats
- [ ] **Vehicle plate format**: structure, validation, regional codes
- [ ] **Push notification service**: FCM works? Or need Huawei/local?
- [ ] **Legal requirements**: mandatory police report before missing person alert? Data localization?

### Recommended

- [ ] **Law enforcement partnerships**: which agencies to forward intelligence to
- [ ] **Trusted return points**: businesses willing to be drop-off points for found items
- [ ] **Volunteer organizations**: existing missing person search groups (e.g., Lisa Alert in Russia)
- [ ] **Transit integration**: public transport system data for lost items on transit
- [ ] **Local moderators**: native speakers for report moderation
- [ ] **Legal review**: privacy laws, data protection, anonymous reporting regulations

### Data Files to Create

```
data/reference/{country_code}/
├── administrative-divisions.json    # Full geographic hierarchy
├── document-types.json              # National document types and formats
├── vehicle-types.json               # Registration types, plate formats
├── education-levels.json            # Education system hierarchy
├── emergency-services.json          # Emergency numbers and agencies
└── translations.json                # UI strings in local language(s)
```

---

## Language Routing (from original "Redirection Script" map)

The original brainstorming planned language routing by country domain:

| Country | Domain | Primary Language | Secondary | Priority |
|---------|--------|-----------------|-----------|----------|
| Egypt | .eg | Arabic | English | 1 |
| Russia | .ru | Russian | Ukrainian | 2 |
| China | — | Chinese | — | 3 |

### Modernized Approach

Instead of domain-based routing:
1. **Auto-detect** device language setting
2. **User preference** overrides auto-detection
3. **Report language** detected independently (a user with Russian UI can submit reports in Arabic)
4. **Translation layer**: key fields (physical descriptions, categories) are stored as enum codes, displayed in user's language
5. **Free text fields**: stored in original language, with optional machine translation flag

### Supported Languages (Planned)

| Language | Code | Script | RTL | Status |
|----------|------|--------|-----|--------|
| Arabic | `ar` | Arabic | Yes | Priority 1 (original) |
| English | `en` | Latin | No | Priority 1 |
| Russian | `ru` | Cyrillic | No | Priority 1 |
| Chinese (Simplified) | `zh-CN` | Han | No | Priority 2 |
| French | `fr` | Latin | No | Priority 3 (North/West Africa) |
| Spanish | `es` | Latin | No | Priority 3 (Latin America) |
| Hindi | `hi` | Devanagari | No | Priority 3 (India) |
| Portuguese | `pt` | Latin | No | Priority 3 (Brazil) |
| Turkish | `tr` | Latin | No | Priority 3 |
| Ukrainian | `uk` | Cyrillic | No | Priority 3 |

---

### Русский: Добавление новой страны — чек-лист

При расширении SafeCircle в новую страну необходимо настроить:
- Административное деление с кодами и местными названиями
- Формат имени (сколько частей, отчество, порядок)
- Формат адреса
- Формат телефона и валидация
- Языки (основной + региональные, поддержка RTL)
- Экстренные номера
- Типы документов
- Формат автономеров
- Сервис push-уведомлений
- Юридические требования
- Партнёрства с правоохранительными органами
- Волонтёрские организации (например, «Лиза Алерт» в России)
