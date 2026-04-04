# SafeCircle — Feature Specification

> Bilingual: English primary, Russian below each section (Русский перевод ниже каждого раздела)

---

## 1. Missing Person Instant Alert

### How It Works

1. **User opens the app** and selects "Report Missing Person"
2. **Fills in the report**: photo, name, age, physical description (height, clothing, skin tone), last known location
3. **Selects alert radius**: 1 km, 5 km, 10 km, city-wide, or custom
4. **Submits the report**
5. **System immediately sends push notifications** with the photo and description to ALL SafeCircle users within the selected geographic radius
6. **Recipients can respond**: "I see this person" with location pin, or "Not seen"
7. **Real-time tracking dashboard** shows sighting reports on a map
8. **Automatic escalation**: if no positive sighting within a configurable time (e.g. 30 minutes), the radius automatically expands

### Key Features

- **Photo-first alerts**: the notification includes the photo — not just text
- **Geographic precision**: PostGIS-powered radius queries ensure only relevant users are notified
- **Time-critical UX**: report submission optimized for speed — minimal required fields, photo upload first
- **Verification layer**: moderator review within 60 seconds to prevent abuse, but alert goes out immediately with "unverified" tag if moderator hasn't reviewed yet
- **Authority integration**: one-tap forwarding to local police with full report data
- **Multilingual descriptions**: physical descriptions use standardized fields (not free text) for cross-language matching

### Privacy Safeguards

- Reports automatically expire after 72 hours unless renewed
- Reporter identity is verified but can be hidden from public view
- Photo usage consent is part of the report flow
- All sighting reports are anonymous by default

---

### Русский: Мгновенное оповещение о пропавших

#### Как это работает

1. **Пользователь открывает приложение** и выбирает «Сообщить о пропавшем»
2. **Заполняет отчёт**: фото, имя, возраст, описание внешности (рост, одежда, цвет кожи), последнее известное местоположение
3. **Выбирает радиус оповещения**: 1 км, 5 км, 10 км, весь город или произвольный
4. **Отправляет отчёт**
5. **Система мгновенно отправляет push-уведомления** с фотографией и описанием ВСЕМ пользователям SafeCircle в выбранном географическом радиусе
6. **Получатели могут ответить**: «Я вижу этого человека» с меткой на карте или «Не видел(а)»
7. **Панель отслеживания в реальном времени** показывает сообщения о наблюдениях на карте
8. **Автоматическое расширение**: если нет положительных наблюдений в течение настраиваемого времени (например, 30 минут), радиус автоматически увеличивается

#### Ключевые особенности

- **Фото в первую очередь**: уведомление включает фотографию, а не только текст
- **Географическая точность**: запросы на основе PostGIS гарантируют оповещение только релевантных пользователей
- **UX для критических ситуаций**: минимум обязательных полей, загрузка фото в первую очередь
- **Слой верификации**: модератор проверяет в течение 60 секунд, но оповещение отправляется немедленно с тегом «не проверено»
- **Интеграция с властями**: пересылка полного отчёта в полицию одним нажатием
- **Многоязычные описания**: стандартизированные поля вместо свободного текста

---

## 2. Lost & Found

### How It Works

1. **Lost item report**: user describes the item (category, color, brand, distinguishing marks), marks the location where it was lost, sets a time window
2. **Found item report**: user photographs the found item, marks where it was found, selects category
3. **Automatic matching**: system compares lost reports with found reports based on category, geographic proximity, time window, and visual similarity
4. **Notification**: when a potential match is found, both parties are notified
5. **Secure handoff**: in-app messaging to arrange return, with optional identity verification

### Categories

- Documents (passport, ID, driver's license)
- Electronics (phone, laptop, tablet, headphones)
- Wallets & bags
- Keys
- Jewelry & watches
- Clothing
- Pets
- Other

### Key Features

- **Permanent listings**: posts never expire (unlike social media)
- **Geographic matching**: found items near where you lost them get priority
- **Photo matching**: visual similarity scoring using image recognition
- **Transport integration**: items lost on public transit linked to route/line
- **Reward option**: poster can offer a reward for return
- **Trusted return points**: partnership with businesses to serve as drop-off/pickup points

---

### Русский: Бюро находок

#### Как это работает

1. **Заявка о потере**: пользователь описывает предмет (категория, цвет, бренд, особые приметы), отмечает место потери, указывает временной интервал
2. **Заявка о находке**: пользователь фотографирует найденный предмет, отмечает место находки, выбирает категорию
3. **Автоматическое сопоставление**: система сравнивает заявки о потерях и находках по категории, географической близости, временному окну и визуальному сходству
4. **Уведомление**: при обнаружении потенциального совпадения обе стороны получают уведомление
5. **Безопасная передача**: обмен сообщениями в приложении с опциональной верификацией личности

#### Ключевые особенности

- **Постоянные объявления**: публикации не удаляются со временем
- **Географическое сопоставление**: найденные предметы рядом с местом потери имеют приоритет
- **Сопоставление по фото**: оценка визуального сходства с помощью распознавания изображений
- **Интеграция с транспортом**: привязка потерянных предметов к маршруту/линии
- **Опция вознаграждения**: заявитель может предложить награду за возврат
- **Доверенные пункты возврата**: партнёрство с бизнесами для пунктов приёма/выдачи

---

## 3. Community Intelligence

### How It Works

1. **Anonymous reporting**: user submits a report about suspicious or dangerous behavior — no personal data required
2. **Categorization**: aggressive behavior, theft, vandalism, harassment, drug activity, traffic violations, other
3. **Geographic tagging**: report is pinned to a specific location
4. **Pattern aggregation**: system aggregates reports across time and geography
5. **Threshold alerting**: when N reports about the same pattern/location/person exceed a threshold, the system generates an intelligence summary
6. **Authority forwarding**: aggregated intelligence (not individual reports) is forwarded to relevant authorities

### Anti-Abuse Measures

- **No accusations**: the system explicitly prohibits naming specific individuals — reports describe behavior, not people
- **Threshold requirement**: single reports have no effect — only patterns trigger action
- **Rate limiting**: users cannot submit more than X reports per day
- **Moderator review**: flagged patterns are reviewed by moderators before authority forwarding
- **Counter-reporting**: users can dispute reports attached to their area
- **Credibility scoring**: repeat accurate reporters gain credibility; false reporters lose it

### Privacy Design

- Reports are stripped of reporter identity at the database level
- No way to trace a report back to the reporter
- Aggregated intelligence contains no individual report details
- End-to-end encryption for report submission

---

### Русский: Общественная разведка

#### Как это работает

1. **Анонимные сообщения**: пользователь отправляет отчёт о подозрительном или опасном поведении — личные данные не требуются
2. **Категоризация**: агрессивное поведение, кражи, вандализм, домогательства, наркоактивность, нарушения ПДД, прочее
3. **Геопривязка**: отчёт привязывается к конкретной локации
4. **Агрегация паттернов**: система собирает отчёты по времени и географии
5. **Пороговые оповещения**: когда N отчётов об одном паттерне/локации/лице превышают порог, система формирует аналитическую сводку
6. **Передача властям**: агрегированная аналитика (не отдельные отчёты) передаётся соответствующим органам

#### Защита от злоупотреблений

- **Никаких обвинений**: система запрещает называть конкретных лиц — отчёты описывают поведение, а не людей
- **Требование порога**: единичные отчёты не имеют эффекта — действия вызывают только паттерны
- **Ограничение частоты**: не более X отчётов в день
- **Модераторский контроль**: выявленные паттерны проверяются перед передачей властям
- **Контр-отчёты**: пользователи могут оспаривать отчёты, привязанные к их району
- **Оценка достоверности**: точные сообщения повышают рейтинг, ложные — снижают

---

## 4. Behavioral Analysis

### How It Works

1. **Historical data**: system maintains anonymized behavioral patterns from solved cases
2. **Pattern matching**: new reports are compared against historical patterns
3. **Suspect pool narrowing**: behavioral similarity scoring helps investigators prioritize leads
4. **Geographic profiling**: historical patterns mapped to geography help predict likely areas of activity
5. **Time-series analysis**: behavioral patterns analyzed across time to identify escalation

### Safeguards

- Only available to verified law enforcement accounts
- All queries are logged and auditable
- No direct identification — only behavioral pattern matching
- Results are probabilistic, explicitly labeled as "intelligence, not evidence"
- Regular bias audits of the matching algorithms

---

### Русский: Поведенческий анализ

#### Как это работает

1. **Исторические данные**: система хранит анонимизированные поведенческие паттерны из раскрытых дел
2. **Сопоставление паттернов**: новые отчёты сравниваются с историческими паттернами
3. **Сужение круга подозреваемых**: оценка поведенческого сходства помогает следователям расставлять приоритеты
4. **Географическое профилирование**: исторические паттерны на карте помогают прогнозировать вероятные зоны активности
5. **Анализ временных рядов**: поведенческие паттерны анализируются во времени для выявления эскалации

#### Гарантии

- Доступно только верифицированным аккаунтам правоохранительных органов
- Все запросы логируются и подлежат аудиту
- Без прямой идентификации — только сопоставление поведенческих паттернов
- Результаты вероятностные, явно помечены как «аналитика, а не доказательство»
- Регулярный аудит алгоритмов на предвзятость

---

## 5. Reward Program

### How It Works

1. **Case resolution**: when a missing person is found or a case is solved with community help, the system identifies contributing users
2. **Recognition tiers**: Bronze (helpful tip), Silver (key information), Gold (directly led to resolution)
3. **Rewards**: in-app badges, public recognition (optional), monetary rewards (funded by platform or case poster)
4. **Leaderboard**: community safety contributors ranked by impact (opt-in)

### Incentive Design

- Rewards are for verified contributions only
- No reward for volume of reports — only for quality and impact
- Monetary rewards held in escrow until case resolution is confirmed
- Anti-gaming measures: contributions are verified by moderators and/or authorities

---

### Русский: Программа вознаграждений

#### Как это работает

1. **Раскрытие дела**: когда пропавший найден или дело раскрыто с помощью сообщества, система определяет пользователей, внёсших вклад
2. **Уровни признания**: Бронза (полезная подсказка), Серебро (ключевая информация), Золото (непосредственно привело к раскрытию)
3. **Награды**: значки в приложении, публичное признание (опционально), денежные вознаграждения (от платформы или заявителя)
4. **Таблица лидеров**: рейтинг участников по вкладу в безопасность (по желанию)

#### Дизайн стимулов

- Вознаграждения только за верифицированный вклад
- Нет наград за количество отчётов — только за качество и результат
- Денежные награды хранятся на эскроу-счёте до подтверждения раскрытия дела
- Защита от накрутки: вклад проверяется модераторами и/или властями

---

## 6. Privacy & Security

### Principles

- **Minimal data collection**: only collect what is necessary for the feature to work
- **End-to-end encryption**: all sensitive reports encrypted in transit and at rest
- **Anonymous by default**: community intelligence reports are anonymous at the database level
- **Right to deletion**: users can delete their account and all associated data
- **Transparency**: users can see what data the platform holds about them
- **No selling data**: user data is never sold to third parties

### Русский: Конфиденциальность и безопасность

- **Минимальный сбор данных**: собираются только данные, необходимые для работы функций
- **Сквозное шифрование**: все конфиденциальные отчёты зашифрованы при передаче и хранении
- **Анонимность по умолчанию**: отчёты общественной разведки анонимны на уровне базы данных
- **Право на удаление**: пользователи могут удалить аккаунт и все связанные данные
- **Прозрачность**: пользователи видят, какие данные о них хранит платформа
- **Данные не продаются**: данные пользователей никогда не продаются третьим лицам
