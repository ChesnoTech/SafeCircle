# SafeCircle — User Scenarios

> Bilingual: English primary, Russian below each scenario (Русский перевод ниже каждого сценария)

---

## Scenario 1: Missing Child in a Shopping Mall

### Context
A mother is shopping with her 4-year-old son in a large shopping mall. She turns around and the child is gone. It's 3:47 PM on a Saturday — the mall is packed.

### User Flow

**Minute 0 — Discovery**
1. Mother realizes child is missing
2. Opens SafeCircle app — big red "MISSING PERSON" button on home screen
3. Selects "Child" category

**Minute 1 — Report**
4. Uploads child's photo (from phone gallery or takes new one)
5. Quick-fill fields: Name: "Ahmed", Age: 4, Clothing: "red jacket, blue jeans, white sneakers"
6. Location auto-detected: "Mega Mall, 2nd floor, near food court"
7. Alert radius: 2 km (covers entire mall + parking + surrounding streets)
8. Taps "SEND ALERT NOW"

**Minute 1:30 — System Response**
9. Alert enters moderation queue — moderator sees it within 30 seconds
10. Simultaneously: alert goes out with "unverified" tag to all users within 2 km
11. Push notification received by 3,200 SafeCircle users in the area
12. Notification shows: Ahmed's photo, "4 years old, red jacket, blue jeans, last seen food court 2nd floor"

**Minute 2–10 — Community Activation**
13. Mall security guard (SafeCircle user) sees alert, activates mall-wide search
14. User in parking lot B reports: "I see a child matching this description walking alone near exit B3" — pins location
15. Mother receives real-time notification with sighting location on map
16. Mother and security converge on exit B3

**Minute 8 — Resolution**
17. Child found safe near exit B3 — was following a balloon vendor
18. Mother marks report as "RESOLVED — FOUND SAFE"
19. System sends "RESOLVED" notification to all 3,200 users who received the alert
20. Security guard who helped receives Silver recognition badge

### What Made This Different from Facebook
- **Speed**: 90 seconds from disappearance to 3,200 people looking — Facebook post would take 15+ minutes to gain traction
- **Photo in notification**: users didn't need to open an app or scroll — the child's face was in the push notification
- **Geographic targeting**: only people who could actually help were notified
- **Real-time tracking**: mother could see sighting reports on a live map
- **Resolution broadcast**: everyone who worried was notified it was resolved

---

### Русский: Пропавший ребёнок в торговом центре

#### Контекст
Мать с 4-летним сыном в большом торговом центре. Она оборачивается — ребёнка нет. 15:47, суббота, ТЦ переполнен.

#### Ход действий

**Минута 0 — Обнаружение**
1. Мать понимает, что ребёнок пропал
2. Открывает SafeCircle — большая красная кнопка «ПРОПАВШИЙ ЧЕЛОВЕК»
3. Выбирает категорию «Ребёнок»

**Минута 1 — Отчёт**
4. Загружает фото ребёнка
5. Быстрое заполнение: Имя: «Ахмед», Возраст: 4, Одежда: «красная куртка, синие джинсы, белые кроссовки»
6. Местоположение автоматически: «Мега Молл, 2 этаж, у фудкорта»
7. Радиус оповещения: 2 км
8. Нажимает «ОТПРАВИТЬ ОПОВЕЩЕНИЕ»

**Минута 1:30 — Реакция системы**
9. Оповещение попадает к модератору (проверка за 30 сек)
10. Одновременно: оповещение уходит с тегом «не проверено» всем в радиусе 2 км
11. Push-уведомление получают 3 200 пользователей
12. В уведомлении: фото Ахмеда, описание, последнее местоположение

**Минуты 2–10 — Активация сообщества**
13. Охранник ТЦ (пользователь SafeCircle) видит оповещение, запускает поиск по ТЦ
14. Пользователь на парковке Б: «Вижу ребёнка, похожего на описание, у выхода Б3» — ставит метку на карте
15. Мать получает уведомление с местоположением на карте в реальном времени

**Минута 8 — Разрешение**
16. Ребёнок найден в безопасности у выхода Б3
17. Мать отмечает «НАЙДЕН — В БЕЗОПАСНОСТИ»
18. Все 3 200 пользователей получают уведомление о разрешении
19. Охранник получает серебряный знак признания

---

## Scenario 2: Lost Wallet on the Metro

### Context
A university student drops his wallet on the metro during morning rush hour. The wallet contains his student ID, bank cards, and cash. He doesn't notice until he reaches campus 20 minutes later.

### User Flow

**8:45 AM — Loss occurs (unnoticed)**

**9:05 AM — Discovery**
1. Student reaches campus, reaches for wallet — it's gone
2. Opens SafeCircle, selects "Report Lost Item"
3. Category: "Wallet"
4. Description: "Black leather wallet, contains student ID (Moscow State University), two bank cards"
5. Marks approximate loss location: "Metro Blue Line, between Universitet and Sportivnaya stations"
6. Time window: "Between 8:30 and 8:50 AM"
7. Offers reward: 2,000 RUB
8. Submits report

**9:05 AM — System Processing**
9. Report indexed with geographic data along the metro line
10. System checks existing found-item reports for matches — none yet
11. Report visible to users near the metro line stations

**9:40 AM — Item Found**
12. Cleaning crew member at Sportivnaya station finds a black wallet under a seat
13. Opens SafeCircle, selects "Report Found Item"
14. Takes photo of the wallet (closed, no personal data visible)
15. Category: "Wallet", Location: "Sportivnaya station, car 7"

**9:41 AM — Automatic Match**
16. System detects match: same category, geographic overlap (same metro line), time overlap
17. Student receives notification: "Potential match for your lost wallet found at Sportivnaya station"
18. Student sees the photo — confirms it's his wallet

**9:42 AM — Coordination**
19. In-app messaging opens between student and finder
20. Finder: "I'll leave it at the station master's office at Sportivnaya"
21. Student: "Thank you! I'll pick it up at lunch"

**12:30 PM — Resolution**
22. Student picks up wallet from station master's office
23. Marks report as "RESOLVED — RETURNED"
24. 2,000 RUB reward transferred to finder
25. Finder receives Bronze recognition badge

### What Made This Different from Facebook
- **Permanent listing**: the report didn't get buried in a feed
- **Geographic matching**: system automatically connected loss location with find location on the same metro line
- **Automatic notification**: student didn't have to check — the system told him
- **Secure coordination**: in-app messaging without exchanging phone numbers
- **Reward mechanism**: built-in incentive for honest return

---

### Русский: Потерянный кошелёк в метро

#### Контекст
Студент университета роняет кошелёк в метро в час пик. В кошельке — студенческий билет, банковские карты, наличные. Он замечает потерю только через 20 минут, на кампусе.

#### Ход действий

**8:45 — Потеря (незамеченная)**

**9:05 — Обнаружение**
1. Студент на кампусе, тянется за кошельком — его нет
2. Открывает SafeCircle → «Сообщить о потере»
3. Категория: «Кошелёк»
4. Описание: «Чёрный кожаный кошелёк, студенческий МГУ, две банковские карты»
5. Место потери: «Метро, синяя ветка, между Университетом и Спортивной»
6. Временное окно: «8:30–8:50»
7. Вознаграждение: 2 000 руб.

**9:40 — Находка**
8. Уборщик на станции Спортивная находит чёрный кошелёк под сиденьем
9. Открывает SafeCircle → «Сообщить о находке»
10. Фотографирует кошелёк, указывает категорию и место

**9:41 — Автоматическое совпадение**
11. Система обнаруживает совпадение: категория, география, время
12. Студент получает уведомление: «Найден потенциально ваш кошелёк на Спортивной»
13. Студент подтверждает по фото

**9:42 — Координация**
14. Обмен сообщениями в приложении
15. Нашедший оставляет кошелёк у дежурного по станции

**12:30 — Разрешение**
16. Студент забирает кошелёк
17. Отмечает «ВОЗВРАЩЁН»
18. 2 000 руб. переводятся нашедшему
19. Нашедший получает бронзовый знак

---

## Scenario 3: Suspicious Activity Near a School

### Context
Over two weeks, multiple parents notice a white van parked near an elementary school at pickup time. The van has tinted windows and the driver watches children. No single observation is alarming enough to call police, but the pattern is concerning.

### User Flow

**Week 1, Monday**
1. Parent A notices the van while picking up her daughter
2. Opens SafeCircle → "Report Suspicious Activity"
3. Category: "Suspicious vehicle"
4. Description: "White van, tinted windows, parked near school entrance at pickup time"
5. Location: pins the school entrance on the map
6. Time: 3:15 PM
7. Submits anonymously

**Week 1, Wednesday**
8. Parent B (different parent, doesn't know Parent A) sees the same van
9. Reports: "White van watching children at school exit, tinted windows"
10. Same location, similar time

**Week 1, Friday**
11. Parent C reports: "Someone in a white van was photographing children"
12. Walking school bus volunteer D reports: "White van, same license plate area, near the playground side"

**System: Pattern Detection (4 reports)**
13. System detects cluster: 4 reports, same location (school), same description (white van), same time pattern (school pickup hours), within 5 days
14. Pattern flagged for moderator review

**Week 2, Monday–Wednesday**
15. Three more reports from different users
16. Total: 7 reports from 7 different users

**System: Threshold Exceeded (7 reports)**
17. Pattern threshold exceeded
18. Moderator reviews aggregated intelligence:
    - 7 independent reports
    - Consistent description: white van, tinted windows
    - Consistent timing: school hours, pickup time
    - Consistent location: within 100m of school
    - No individual accusation — only behavioral pattern
19. Moderator approves forwarding to authorities

**Authority Notification**
20. Local police receive SafeCircle intelligence report:
    - Aggregated pattern summary (not individual reports)
    - Heat map showing observation locations
    - Time pattern chart
    - No reporter identities included
21. Police increase patrol near the school at pickup time
22. Van is identified and checked — turns out to be a contractor doing work nearby (false alarm), but the pattern warranted investigation

### What Made This Different
- **No single parent had to "be the one" to call police** — the system aggregated independent observations
- **Anonymous**: parents didn't have to worry about confrontation or being wrong
- **Pattern, not accusation**: the system reported a behavioral pattern, not an accusation against a person
- **Threshold**: prevented single-report overreaction — 7 independent reports justified investigation
- **Authority received intelligence, not panic**: structured report with data, not a worried phone call

---

### Русский: Подозрительная активность у школы

#### Контекст
В течение двух недель несколько родителей замечают белый фургон с тонированными стёклами у начальной школы во время забора детей. Водитель наблюдает за детьми. Ни одно наблюдение по отдельности не достаточно для вызова полиции, но паттерн вызывает беспокойство.

#### Ход действий

**Неделя 1, понедельник**
1. Родитель А замечает фургон → SafeCircle → «Подозрительная активность»
2. Категория: «Подозрительное транспортное средство»
3. Описание, местоположение, время — анонимно

**Неделя 1, среда–пятница**
4. Родители Б, В и волонтёр Г (независимо друг от друга) сообщают о том же фургоне
5. Всего: 4 отчёта за 5 дней

**Система: обнаружение паттерна**
6. Кластер: 4 отчёта, одна локация (школа), одно описание (белый фургон), одно время (часы забора детей)
7. Паттерн отмечен для модератора

**Неделя 2**
8. Ещё 3 отчёта от других пользователей (итого 7)

**Система: порог превышен**
9. Модератор проверяет агрегированную аналитику:
   - 7 независимых отчётов, одинаковое описание, время, место
   - Нет обвинений — только поведенческий паттерн
10. Модератор одобряет передачу властям

**Уведомление властей**
11. Полиция получает структурированный отчёт: паттерн, тепловая карта, временной график
12. Личности отправителей не передаются
13. Полиция усиливает патруль — фургон проверен

#### Ключевое отличие
- Ни одному родителю не пришлось «быть тем, кто звонит в полицию»
- Анонимность, агрегация паттернов, структурированные данные вместо паники

---

## Scenario 4: Hit-and-Run Witness Reports

### Context
A hit-and-run occurs at a busy intersection at 6:20 PM on a weekday. A car hits a pedestrian and drives away. Multiple witnesses are present, but in the chaos, nobody gets the full picture — one person sees the car color, another catches part of the license plate, another sees the direction.

### User Flow

**6:20 PM — Incident**

**6:22 PM — First Report**
1. Witness A (standing at the crosswalk) opens SafeCircle → "Report Incident"
2. Category: "Traffic — Hit and Run"
3. Description: "Car hit a pedestrian and drove away. Dark colored sedan. Turned left on Leninsky Prospekt heading south"
4. Location: pins the intersection
5. Adds: "Pedestrian is being helped, ambulance called"

**6:23 PM — Second Report**
6. Witness B (was in a car behind) reports:
7. "I was behind the car. It was a dark blue BMW 3-series. Partial plate: A***MO 77"
8. Same location pinned

**6:25 PM — Third Report**
9. Witness C (from a shop across the street) reports:
10. "I have dashcam footage from my shop security camera. The car passed my shop at 6:21 PM heading south"
11. Uploads a still frame from the camera

**6:28 PM — Fourth Report**
12. Witness D (2 blocks south on Leninsky) reports:
13. "Dark blue BMW just ran a red light at high speed heading south. Plate: A247MO 77"
14. Different location — 2 blocks south — corroborates direction of travel

**System: Incident Aggregation**
15. System detects cluster: 4 reports within 10 minutes, all referencing the same incident type, overlapping location and time
16. Automatic aggregation into one incident file:
    - **Vehicle**: Dark blue BMW 3-series
    - **License plate**: A247MO 77 (partial from B, full from D)
    - **Direction**: South on Leninsky Prospekt
    - **Evidence**: Security camera still (from C), 4 witness accounts
    - **Timeline**: impact at 6:20 → fled south → 2 blocks south at 6:28

**6:30 PM — Authority Notification**
17. Aggregated incident report forwarded to traffic police
18. Report includes: composite vehicle description, confirmed license plate, direction of travel, timeline, photographic evidence
19. Police can issue a BOLO (Be On the Lookout) with confirmed details

**Next Day — Follow-Up**
20. Police confirm the car was located using the license plate
21. Witnesses who contributed receive notification: "The vehicle from the incident you reported has been identified. Thank you for your contribution."
22. Witness C (security camera footage) receives Gold recognition
23. Others receive Silver recognition

### What Made This Different
- **Composite intelligence**: no single witness had the full picture — the system assembled fragments into a complete report
- **License plate confirmation**: partial plate from one witness, full plate from another — system connected them
- **Evidence aggregation**: security camera footage + witness accounts in one file
- **Timeline reconstruction**: system mapped reports chronologically and geographically to show direction of travel
- **Speed**: 10 minutes from incident to complete intelligence report for police

---

### Русский: Наезд с места ДТП — свидетельские показания

#### Контекст
На оживлённом перекрёстке в 18:20 в будний день машина сбивает пешехода и уезжает. Несколько свидетелей присутствуют, но в хаосе никто не видит полную картину — один видит цвет машины, другой — часть номера, третий — направление движения.

#### Ход действий

**18:22 — Первый отчёт**
1. Свидетель А: «Машина сбила пешехода и уехала. Тёмный седан. Повернул налево на Ленинский проспект, на юг»

**18:23 — Второй отчёт**
2. Свидетель Б: «Тёмно-синий BMW 3-серии. Частичный номер: А***МО 77»

**18:25 — Третий отчёт**
3. Свидетель В: «У меня есть запись с камеры наблюдения магазина. Машина проехала мимо в 18:21»
4. Загружает кадр с камеры

**18:28 — Четвёртый отчёт**
5. Свидетель Г (2 квартала южнее): «Тёмно-синий BMW проехал на красный на большой скорости. Номер: А247МО 77»

**Система: агрегация инцидента**
6. 4 отчёта за 10 минут → автоматическая агрегация:
   - **ТС**: тёмно-синий BMW 3-серии
   - **Номер**: А247МО 77 (частичный от Б, полный от Г)
   - **Направление**: юг по Ленинскому проспекту
   - **Улики**: кадр с камеры (В), 4 свидетельских показания
   - **Хронология**: удар в 18:20 → бегство на юг → 2 квартала южнее в 18:28

**18:30 — Уведомление властей**
7. Агрегированный отчёт передан ГИБДД
8. Полная информация: описание ТС, номер, направление, хронология, фото

**Следующий день**
9. Машина найдена по номеру
10. Свидетели получают уведомление и знаки признания

#### Ключевое отличие
- Ни один свидетель не имел полной картины — система собрала фрагменты в единый отчёт
- Подтверждение номера: частичный + полный от разных свидетелей
- Агрегация улик: камера + показания в одном файле
- 10 минут от ДТП до полного разведывательного отчёта для полиции
