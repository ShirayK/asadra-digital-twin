# Asadra Digital Twin — IBM Bob Israel Hackathon 2026

**Team:** Asadra_3D_model
**Live demo:** https://asadra-digital-twin.vercel.app/en/twin
**Repository:** https://github.com/ShirayK/asadra-digital-twin
**Bob session evidence:** [`bob_sessions/`](../bob_sessions)

---

## English

### Problem
Food plants manage HACCP with spreadsheets and paper logs. A QA manager cannot *see* the plant: which Critical Control Point (CCP) is out of range right now, where raw material crosses into high-care areas, or where allergen cross-contact may happen. Auditors get the same flat tables.

### Solution
This is a standalone 3D digital twin of the production floor:
- Zones are colored by hygiene class (RAW / LOW_RISK / HIGH_CARE / PACKAGING / STORAGE).
- Each CCP station has a live status ring: OK, OUT_OF_RANGE (pulsing red), STALE, or NO_DATA.
- Animated material-flow arrows show how product moves.
- Automatic separation checks flag two risks: RAW→HIGH_CARE without a kill step, and allergen cross-contact (e.g. sesame).
- Clicking a station opens a side panel with the last 5 readings, the corrective action, and a SHA-256 hash-chain integrity badge.
- A layout editor supports drag and drop, with JSON export and import.
- A guided camera tour walks through the process steps in order, showing critical limits, monitoring frequency and corrective actions (in English on /en).
- A live simulator streams readings every 3 s. A header shows a live clock and KPIs: CCPs in range, open deviations, and hash-chain integrity.
- Hebrew (RTL, default) and English.

The demo dataset is a hummus plant. In live mode its cooling CCP drifts above the 5 °C critical limit and raises a breach alert. The plant also has a sesame cross-contact zone.

### How IBM Bob was used
The core app was written in 21 **IBM Bob IDE Task Sessions** (0–20): sessions 0–11 follow the prompts in `docs/SPEC.md` one by one, and sessions 12–14 add the equipment, the cinematic look and the live simulator. Everything after session 14 was done by hand (listed below). The sessions ran on the hackathon team instance (ibm-coding-challenge-2, us-east). After session 14 exhausted that budget, the organizers added a second team budget (TECHZONE-TS023239691), and **session 15** ran there: Asadra purple/white brand palette (`src/theme/asadra.ts`), constant-size readable labels with LOD dots, a toast stack, scrollable side panel, wider zoom-out and Fit/Top view buttons (commit `09226bc`, followed by a small manual fix `46e1a7f`). **Session 16** (same TECHZONE budget) added a true bounding-box Fit/Top view, a collapsible legend, label collision handling, readable 12px zone labels and purple lighting (`f10e1ae`; manual fixes `bc4935b`, `a7aa5ed`). **Session 17** switched to a light, bright theme (white/light-purple glass UI, light epoxy floor, new lighting, less bloom, 13px labels, Hebrew label wrapping, tighter fit) (`3fe3ad2`; manual fixes `3cf9b59`, `8b21791`). **Session 18** replaced generic shapes with recognizable equipment (receiving dock with pallets, steam kettles, stone mill, blast chiller, metal-detector arch over a conveyor, packaging line), thin floor outlines instead of thick rings, and separation warnings beside the stations (`441f6f4`; manual fixes `9e8a8b8`, `906df9f`). **Session 19** added a compact real-scale metal detector, a chiller condensing unit, low-poly workers, click-to-focus camera with Back to overview, and CCP label priority (`227dab3`; manual fixes `10382ee`, `ca5b672`). **Session 20** made the app English-only (/he and / redirect to /en/twin, no language toggle), tightened click-to-focus close-ups, made separation warnings subtler and moved the breach toast inside the canvas (`02b93d6`; manual fixes `5d9607b`, `0f954b8` so no Hebrew data reaches the page). Each session's summary screenshot is in `bob_sessions/`.

| # | Bob session | Commit |
|---|-------------|--------|
| 0 | Scaffold Next.js 14 + TS + R3F + i18n | `646297b` |
| 1 | Domain schema (zod + types) + tests | `5b577c4` |
| 2 | Demo seed with SHA-256 hash chain | `fb178c0` |
| 3 | Pure domain logic (status, flows, separation, chain verify) + vitest | `73b3fb0` |
| 4 | Data-source adapter + twin route | `4b091c4` |
| 5 | 3D scene: Canvas, zones, station markers, legend | `f478051` |
| 6 | Side panel: readings, corrective action, hash badge | `4b825a5` |
| 7 | Flow arrows, separation overlay, toolbar | `e555757` |
| 8 | Edit mode, drag & drop, richer scene | `f803551` |
| 9 | Guided tour | `8bc7689` |
| 10 | Full i18n, language switcher, key-parity test | `8933a78` |
| 11 | QA pass: empty state, docs, secrets audit | `4a06dce` |
| 12 | Realistic factory equipment, building, lighting | `214ec77` |
| 13 | Cinematic dark industrial look with bloom | `3aa3a6c` |
| 14 | Live CCP simulator, breach toast, English names, compact labels, camera fit. The session hit the team's 50-Bobcoin budget before it could commit, so the code it wrote was committed by hand | `36bcf38` |

**Manual work (not in Bob, done by hand after session 14 used up the Bobcoin budget):**
- `d2610c1`: pinned @react-three/postprocessing 2.x so it works with fiber 8 (the page crashed without it).
- `d6a8b07`: breach threshold now matches the seed's 5 °C limit (before, the toast fired at 4.1 °C); the side panel refreshes live and shows English labels; analytic camera framing instead of drei Bounds; app opens in Live mode; decorative racks, pallets, pipes and conveyor.
- `c5df2dc`: round-3 UI polish: dark glass theme, a header with logo, live clock and KPI strip (CCPs OK, open deviations, chain integrity), English guided tour on /en, simulator cycles (cooling breaches again about 45 s after a corrective action, and the cooking CCP briefly goes STALE every minute; 2 new tests), more detailed equipment (ladders, gauges, chiller fans, packaging conveyor with moving rollers), worker figures, thicker glowing pipes with flow pulses, compact zone tags, a bold separation overlay (glowing dashed path, warning beacon, badge) and a 3 s camera fly-in on load.
- Final polish commit: the two separation badges are offset so both can be read, and the worker figures are larger.

Screenshot commits: `28384d4`, `91110d7`, `a5f48d5`, `dd497e2`, `04f6cf4`.

### How to demo (about 60 seconds)
1. Open https://asadra-digital-twin.vercel.app/en/twin. The app opens in **Live** mode: every station reads fresh simulated data and shows a green ring.
2. Wait about 10–20 s. The **Cooling (CCP)** temperature drifts past its 5 °C critical limit. Its ring turns red and pulses, and a red **CCP breach** toast appears.
3. Click the Cooling station (3D or chip) to open the side panel: last 5 readings, with out-of-range values in red, and the limits.
4. Click **✓ Apply corrective action**. The cooling CCP is reset to 3 °C, the toast closes and the ring turns green again. The header KPIs update live. If you keep watching, cooling drifts and breaches again about 45 s later, and the cooking CCP sometimes shows STALE for a few seconds (a simulated sensor dropout).
5. **Live / Paused** toggles the simulation. Also try **Separation check** (raw→high-care and sesame cross-contact), **Edit mode** (drag stations), **Guided tour**, and the **עב/EN** switch.

### Run locally
```bash
git clone https://github.com/ShirayK/asadra-digital-twin && cd asadra-digital-twin
npm install
npm run dev      # http://localhost:3000/en/twin
npm test         # vitest
npm run build
```
No environment variables or API keys are needed. The data comes from `data/seed/*.json`.

### Roadmap and vision
1. **AI layout from a floor-plan photo:** upload a photo or PDF of the plant plan, and a vision model (watsonx / Granite Vision) extracts zones, walls and stations into a `TwinDataset` JSON for review.
2. A live `AsadraApiSource` adapter that streams real CCP readings from Asadra (read-only).
3. Alerts and audit mode: replay a day on the twin and export an auditor report.
4. IoT sensor ingestion (temperature, pH) with the hash chain extended to device signatures.
5. Multi-site benchmarking across plants.

---

## עברית

### הבעיה
מפעלי מזון מנהלים HACCP בגיליונות ובטפסי נייר. מנהלת האיכות לא *רואה* את המפעל: איזו נקודת בקרה קריטית (CCP) חורגת עכשיו, איפה חומר גלם נכנס לאזור High-Care, ואיפה יש סכנת מגע צולב באלרגנים.

### הפתרון
התאום הוא תאום דיגיטלי תלת־ממדי עצמאי של רצפת הייצור:
- אזורים צבועים לפי דרגת היגיינה.
- לכל CCP יש טבעת סטטוס חיה: תקין, חריגה (אדום מהבהב), לא עדכני, או אין נתונים.
- חיצי זרימה מונפשים מראים איך המוצר נע.
- בדיקות הפרדה אוטומטיות מזהות RAW→HIGH_CARE בלי שלב הריגה, ומגע צולב באלרגנים (שומשום).
- לחיצה על תחנה פותחת פאנל צד עם 5 הקריאות האחרונות, הפעולה המתקנת, ותג שלמות של שרשרת SHA-256.
- עורך פריסה עם גרירה, ייצוא וייבוא JSON.
- סיור מודרך במצלמה.
- סימולציה חיה: הקירור חורג, פעולה מתקנת מחזירה אותו לטווח, והוא חורג שוב כעבור כ-45 שניות. כותרת עם שעון ומדדי KPI.
- עברית (RTL) ואנגלית.

### איך השתמשנו ב-IBM Bob
כל קוד הפיצ'רים נכתב ב-**Bob IDE Task Sessions**: 15 סשנים (0–14) בחשבון ההאקתון (us-east): 0–11 לפי הפרומפטים ב-`docs/SPEC.md`, ו-12–14 לשדרוג המראה ולסימולציה החיה. סשן 14 נעצר כשנגמר תקציב 50 ה-Bobcoins, לפני הקומיט. כל מה שנעשה אחריו נעשה ידנית: תיקונים (`d2610c1`, `d6a8b07`), ליטוש עיצובי (`c5df2dc`): ערכת עיצוב כהה, כותרת עם מדדי KPI ושעון, סיור באנגלית, מחזורי חריגה חוזרים, ציוד ועובדים מפורטים, שכבת הפרדה בולטת ומעוף מצלמה בפתיחה, וליטוש אחרון. לאחר מכן נוסף תקציב שני לצוות (TECHZONE-TS023239691), ובו רץ **סשן 15** ב-Bob: צבעי המותג של אסדרא (סגול ולבן), תוויות קריאות בגודל קבוע, ערימת התראות, פאנל צד נגלל, זום אאוט רחב וכפתורי Fit/Top view (`09226bc`, ותיקון ידני קטן `46e1a7f`). **סשן 16** (באותו תקציב) הוסיף Fit/Top view אמיתיים לפי גבולות המפעל, מקרא מתקפל, מניעת חפיפת תוויות, תוויות אזור קריאות ותאורה סגולה (`f10e1ae`, ותיקונים ידניים `bc4935b`, `a7aa5ed`). **סשן 17** עבר לעיצוב בהיר: ממשק זכוכית לבן/סגול בהיר, רצפת אפוקסי בהירה, תאורה חדשה, פחות bloom ותוויות 13px (`3fe3ad2`, ותיקונים ידניים `3cf9b59`, `8b21791`). **סשן 18** החליף צורות כלליות בציוד מזוהה (רמפת קבלה עם משטחים, סירי בישול בקיטור, טחנת אבן, מקרר הלם, קשת גלאי מתכות על מסוע, קו אריזה), קווי רצפה דקים במקום טבעות עבות, והתראות הפרדה ליד התחנות (`441f6f4`, ותיקונים ידניים `9e8a8b8`, `906df9f`). **סשן 19** הוסיף גלאי מתכות בקנה מידה אמיתי, יחידת קירור, עובדים ומצלמה שמתמקדת בתחנה בלחיצה (`227dab3`, ותיקונים ידניים `10382ee`, `ca5b672`). **סשן 20** הפך את האפליקציה לאנגלית בלבד (/he ו-/ מפנים ל-/en/twin), הידק את התקריבים, עידן את התראות ההפרדה והעביר את הודעת החריגה לתוך הקנבס (`02b93d6`, ותיקונים ידניים `5d9607b`, `0f954b8`). צילומי הסיכום נמצאים ב-`bob_sessions/`, וטבלת הקומיטים מופיעה למעלה.

### איך מדגימים
פותחים את /en/twin. האפליקציה נפתחת במצב חי, ותוך 10–20 שניות ה-CCP של הקירור חורג מ-5°C: הטבעת מהבהבת באדום ומופיעה התראה. לוחצים "בצע פעולה מתקנת" והתחנה חוזרת לירוק. הכפתור חי/מושהה עוצר את הסימולציה.

### הרצה
`npm install && npm run dev` ואז לפתוח http://localhost:3000/en/twin. אין צורך במפתחות.

### חזון ומפת דרכים
1. **פריסה אוטומטית מתמונת תוכנית קומה בעזרת AI:** מצלמים את תוכנית המפעל, ומודל ראייה מחלץ אזורים ותחנות ל-JSON.
2. חיבור קריאה בלבד ל-Asadra לקריאות CCP חיות.
3. מצב ביקורת, הפעלה חוזרת של יום, ודוח למבקר.
4. חיישני IoT.
5. השוואה בין מפעלים.
