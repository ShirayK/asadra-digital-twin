# אסדרא — מפרט תאום דיגיטלי תלת־ממד (IBM Bob)

צוות: Asadra_3D_model · אתגר IBM Bob Israel Hack · הגשה: יום ב׳ 2.11.2026, 22:00 (שעון ישראל)
גרסה 2.0 · 30.10.2026 · **פרויקט עצמאי לחלוטין**: repo פרטי חדש ShirayK/asadra-digital-twin

> חשוב: השיפוט מתבסס על סיכומי Task Sessions ב-Bob IDE. את כל הקוד כותבים בתוך Bob IDE, בחשבון ההאקתון (Settings ← General ← Team ← מופע ההאקתון us-east), ושומרים צילום מסך של כל סיכום בתיקייה bob_sessions.

> החלטת בעלים (30.10): התאום הדיגיטלי נפרד לחלוטין מתוכנת אסדרא. אין שום שינוי ב-repo ShirayK/Asadra, אין חיבור למסד הנתונים שלו (Supabase), ואין import של קוד ממנו. מבני הנתונים רק מחקים את המושגים של אסדרא, כדי שיהיה אפשר לחבר בעתיד דרך מתאם ייבוא/API.

## 1. חזון ובעיה

**הבעיה:** תוכנית HACCP חיה היום בטבלאות, בתרשים זרימה דו־ממדי ובטפסים. מנהלת בטיחות מזון, מבקר או עובד חדש לא "רואים" את המפעל: איפה כל נקודת בקרה קריטית (CCP), איך חומר זורם בין אזורים, איפה יש סיכון למגע צולב של אלרגנים, ואיפה מעבר מאזור "גולמי" לאזור "נקי" שובר את ההפרדה.

**החזון:** תאום דיגיטלי תלת־ממדי של רצפת הייצור, כאפליקציה עצמאית. היא מציגה אזורים, תחנות CCP, שלבי תהליך, מדידות ואלרגנים מתוך נתונים מקומיים בפורמט שמחקה את אסדרא. במבט אחד רואים את המפעל, את ה-CCP-ים צבועים לפי סטטוס אחרון (תקין / חריגה / לא נמדד), את מסלול החומר ואת אזורי ההפרדה.

**עוגן רגולטורי:** Codex General Principles of Food Hygiene (CXC 1-1969, עדכון 2022): תרשים זרימה מאומת בשטח והפרדת אזורים למניעת זיהום צולב. התאום הוא "תרשים הזרימה המאומת" בגרסה מרחבית.

**מעבר ל-POC (לא בהיקף):** חיבור לאסדרא דרך מתאם; בניית פריסה אוטומטית מצילום תוכנית קומה או מסרטון; הדרכה ותכנון קווים.

## 2. משתמשים

- **מנהלת בטיחות מזון / QA**: מצב כל ה-CCP-ים, חריגות ומסלולים בעייתיים.
- **מבקר**: מאמת תרשים זרימה מול המרחב, הפרדת אזורים ומיקום CCP, לוחץ על נקודה ורואה מדידות אחרונות.
- **עובד חדש**: "סיור מודרך" שלב אחרי שלב.
- **יועץ בטיחות מזון**: בונה פריסה ללקוח ומשתמש בה להדגמה ותכנון.

## 3. היקף ה-MVP מול מחוץ להיקף

**בהיקף (עד יום ב׳):**
1. repo חדש ועצמאי: Next.js 14 (App Router) + TypeScript + three + @react-three/fiber + @react-three/drei + vitest.
2. נתונים מקומיים בלבד: קובץ seed בפורמט JSON (data/seed/hummus-plant.json) שנטען ומאומת ב-zod. בלי Supabase ובלי מסד נתונים משותף.
3. סצנה תלת־ממדית: רצפה, אזורים צבועים לפי סוג היגייני, תחנות ושלבים כאובייקטים.
4. סטטוס CCP: צבע לכל תחנה לפי המדידה האחרונה מול הגבולות (ירוק/אדום/אפור/כתום).
5. זרימת חומר: חצים מונפשים בין שלבי התהליך.
6. בדיקת הפרדה ואלרגנים: מעבר גולמי ← נקי בלי CCP, וזרימה מאזור עם אלרגן לאזור בלעדיו.
7. פאנל צד: שם, סוג (CCP/CP/PRP), 5 מדידות אחרונות, גבולות, פעולה מתקנת.
8. עורך פריסה בסיסי: גרירת תחנה ושמירה ב-localStorage, ייצוא/ייבוא JSON.
9. "סיור מודרך" לפי סדר השלבים.
10. מתאם ייבוא מוגדר (ממשק + מימוש JSON בלבד) שמוכן לחיבור עתידי לאסדרא.
11. i18n בעברית (ראשית, RTL) ובאנגלית; ערבית ותאית אופציונליות.

**מחוץ להיקף:**
- כל קריאה או כתיבה ל-repo של אסדרא או למסד הנתונים שלו.
- התחברות משתמשים ו-multi-tenant (הדמו מקומי, tenantId נשמר רק כשדה בנתונים).
- מודלי GLTF מפורטים, ריבוי קומות, VR/AR, זמן אמת (websockets).
- יצירת פריסה מתמונה/וידאו (רק תיאור "בקרוב").

## 4. סיפורי משתמש

1. כמנהלת QA, אני רוצה לראות כל CCP צבוע לפי המדידה האחרונה, כדי לזהות חריגה תוך שניות.
2. כמנהלת QA, אני רוצה ללחוץ על תחנה ולראות 5 מדידות אחרונות, גבולות ופעולה מתקנת.
3. כמבקר, אני רוצה לראות את מסלול החומר מונפש על הרצפה, כדי לאמת את תרשים הזרימה מול המרחב.
4. כמבקר, אני רוצה התראה כשהזרימה עוברת מאזור גולמי לאזור נקי בלי CCP בדרך.
5. כמבקר, אני רוצה לראות זרימה מאזור עם אלרגן לאזור בלעדיו (סיכון מגע צולב).
6. כעובד חדש, אני רוצה סיור מודרך עם הסבר לכל שלב.
7. כיועצת, אני רוצה לגרור תחנות ולייצא את הפריסה כ-JSON.
8. כמשתמשת דוברת עברית, אני רוצה ממשק RTL מלא.

## 5. מודל נתונים (מקומי, עצמאי)

מקור האמת הוא קובץ JSON מקומי שמאומת ב-zod (src/domain/schema.ts). הטיפוסים נגזרים מה-schema (z.infer). אין Prisma ואין DB ב-MVP. אופציה לעתיד: SQLite דרך Prisma מקומי (file:./dev.db) עם אותם שמות שדות, אף פעם לא Supabase.

הצורות מחקות מושגים של אסדרא (Station, StationField, StationLog, ProcessTemplate/Node/Edge, Allergen), אבל מוגדרות כאן ולא מיובאות משם.

```ts
type ZoneHygieneClass = 'RAW' | 'LOW_RISK' | 'HIGH_CARE' | 'PACKAGING' | 'STORAGE' | 'NON_FOOD';
type ControlType = 'CCP' | 'CP' | 'PRP';                       // ≈ Asadra StationControlType
type StepType = 'MATERIAL_INPUT' | 'PROCESS_ACTION' | 'CCP' | 'CP' | 'PRP' | 'PACKAGING' | 'OUTPUT'; // ≈ ProcessNodeType

interface TwinDataset {
  schemaVersion: 1;
  source: { kind: 'seed' | 'asadra-export' | 'manual'; exportedAt?: string };
  site: { id: string; name: string; widthM: number; depthM: number; tenantRef?: string };
  allergens: { code: string; name: string }[];                 // ≈ Allergen
  zones: {
    id: string; name: string; hygieneClass: ZoneHygieneClass;
    x: number; z: number; width: number; depth: number;        // center + size, meters
    allergenCodes: string[];
  }[];
  stations: {                                                  // ≈ Station + StationField
    id: string; name: string; controlType: ControlType;
    position: { x: number; z: number; rotationY?: number };
    zoneId?: string;                                           // derived from position if missing
    fields: { key: string; label: string; unit?: string; min?: number; max?: number;
              monitoringFrequency?: string; correctiveActionText?: string }[];
    externalRef?: { system: 'asadra'; stationId: string };     // for future integration only
  }[];
  process: {                                                   // ≈ ProcessTemplate/Node/Edge
    id: string; name: string;
    steps: { id: string; name: string; type: StepType; sortOrder: number;
             stationId?: string; position?: { x: number; z: number } }[];
    edges: { from: string; to: string; label?: string }[];
  };
  readings: {                                                  // ≈ StationLog (append-only)
    id: string; stationId: string; recordedAt: string;         // ISO
    values: Record<string, number>; correctiveAction?: string;
    hash?: string; prevHash?: string;
  }[];
}
```

כללים:
- readings הם append-only גם כאן (אין עריכה או מחיקה ב-UI), כדי לשמור על הסמנטיקה של אסדרא.
- מיקום של שלב: position של התחנה המקושרת (stationId), אחרת step.position.
- zoneId נגזר מנקודה-בתוך-מלבן אם חסר.
- עריכות של המשתמש נשמרות כ-overlay ב-localStorage ולא משנות את קובץ ה-seed. כפתור "ייצוא" מוריד TwinDataset מלא.

לוגיקה (פונקציות טהורות + בדיקות vitest, src/domain/):
- **getStationStatus(station, lastReading, now)** ← OK / OUT_OF_RANGE / NO_DATA / STALE (מעל 24 שעות). ערך מחוץ ל-min/max או correctiveAction לא ריק ← OUT_OF_RANGE.
- **buildFlowPaths(dataset)** ← מקטעים {from:{x,z}, to:{x,z}, edge}.
- **findSeparationIssues(dataset)** ← RAW_TO_HIGH_CARE_WITHOUT_CCP (קשת מאזור RAW/LOW_RISK לאזור HIGH_CARE שצומת המקור שלה אינו CCP), ו-ALLERGEN_CROSS_CONTACT (קשת מאזור עם אלרגן A לאזור בלי A).
- **verifyReadingChain(readings)** ← בדיקה שה-prevHash של כל רשומה תואם ל-hash של הקודמת (SHA-256, להצגה בלבד).

**מתאם אינטגרציה עתידי (src/adapters/):**
```ts
interface TwinDataSource { load(): Promise<TwinDataset> }
// MVP: JsonFileSource (data/seed/*.json) + LocalOverlaySource (localStorage)
// Future, NOT in MVP: AsadraApiSource — reads a read-only export endpoint of Asadra and maps
//   Station/StationField/StationLog/ProcessNode/ProcessEdge/Allergen -> TwinDataset.
```
ב-MVP אין שום קוד שפונה לאסדרא. מסמך docs/INTEGRATION.md מתאר את המיפוי.

## 6. ארכיטקטורה ומבנה קבצים

Repo: **ShirayK/asadra-digital-twin** (פרטי, חדש). Stack: Next.js 14 App Router, TypeScript strict, three, @react-three/fiber 8, @react-three/drei 9, zod, next-intl (או מילון פשוט), vitest, ESLint. בלי Prisma, Supabase או NextAuth ב-MVP.

```
asadra-digital-twin/
  AGENTS.md                      # כללים ל-Bob: עצמאות מאסדרא, בלי סודות, tsc+vitest
  README.md
  docs/SPEC.md                   # המסמך הזה
  docs/INTEGRATION.md            # מיפוי עתידי לאסדרא
  bob_sessions/                  # צילומי סיכומי Task Sessions
  data/seed/hummus-plant.json    # מפעל חומוס לדמו
  src/domain/schema.ts           # zod + types
  src/domain/status.ts           # getStationStatus
  src/domain/flow.ts             # buildFlowPaths
  src/domain/separation.ts       # findSeparationIssues
  src/domain/chain.ts            # verifyReadingChain
  src/adapters/{types.ts,json-file-source.ts,local-overlay.ts}
  src/app/[locale]/page.tsx      # דף נחיתה קצר + כניסה לתאום
  src/app/[locale]/twin/page.tsx # Server Component: טוען dataset ומעביר DTO
  src/components/twin/
    twin-canvas.tsx              # "use client", dynamic ssr:false, <Canvas>
    factory-floor.tsx  zone-mesh.tsx  station-marker.tsx
    flow-arrows.tsx  separation-overlay.tsx
    side-panel.tsx  guided-tour.tsx  twin-toolbar.tsx  legend.tsx
  src/i18n/{he,en}.json
  tests/domain/*.test.ts
```

עקרונות:
- הקנבס נטען רק בצד לקוח (dynamic, ssr:false).
- השרת טוען ומאמת את ה-JSON ומעביר DTO מחושב (סטטוס, מקטעים, בעיות) ל-client.
- עריכה: client state + localStorage overlay, חישוב מחדש של הבעיות בצד לקוח עם אותן פונקציות טהורות.
- RTL: הפאנלים בצד הנכון לפי ה-locale; הסצנה עצמה לא משתקפת.
- דיפלוי: פרויקט Vercel חדש ונפרד (לא הפרויקט של אסדרא), בלי משתני סביבה סודיים.

## 7. תסריט דמו לשופטים (3 דקות)

- **0:00–0:20 — הבעיה:** "תוכנית HACCP היא טבלה ותרשים. אף אחד לא רואה את המפעל."
- **0:20–0:50 — התאום:** מפעל החומוס בתלת־ממד: קבלה, השריה, בישול (CCP), קירור (CCP), אזור נקי, אריזה. סיבוב מצלמה.
- **0:50–1:20 — סטטוס:** CCP קירור אדום. לחיצה: 9°C מול גבול 5°C, פעולה מתקנת, שרשרת hash מאומתת.
- **1:20–1:50 — זרימה והפרדה:** חצים מונפשים; מקטע אדום גולמי ← נקי בלי שלב הריגה; אזור שומשום שמחובר לקו בלי שומשום.
- **1:50–2:20 — עריכה:** גרירת תחנה, ההתראה מתעדכנת מיד; ייצוא JSON.
- **2:20–2:45 — הדרכה:** סיור מודרך בעברית.
- **2:45–3:00 — חזון ו-Bob:** מודול עצמאי שמתחבר לאסדרא דרך מתאם; בעתיד, פריסה מצילום. "כל הקוד נבנה ב-IBM Bob" + צילום סיכום Task Session.

## 8. תוכנית בנייה ל-3 ימים

**שישי 30.10 (ערב):**
- יצירת repo פרטי ShirayK/asadra-digital-twin, scaffold ו-AGENTS.md (פרומפט 0).
- schema ב-zod, טיפוסים ו-seed (פרומפטים 1–2).

**שבת 31.10:**
- לוגיקה טהורה + בדיקות (פרומפט 3).
- טעינת נתונים, route וסצנה בסיסית (פרומפטים 4–5).
- סטטוס CCP + פאנל צד (פרומפט 6).

**ראשון 1.11:**
- זרימה + שכבת הפרדה/אלרגנים (פרומפט 7).
- עורך גרירה + ייצוא/ייבוא (פרומפט 8).
- סיור מודרך + i18n (פרומפטים 9–10).
- הגשה מוקדמת לקבלת דוח שיפור AI.

**שני 2.11 (עד 22:00):**
- ליטוש, tsc + vitest, מתאם ו-docs, דיפלוי Vercel נפרד (פרומפט 11).
- סרטון 3 דקות, README, הגשה סופית עד 20:00.

**נקודת חיתוך:** אם עד ראשון בצהריים העורך לא עובד, מוותרים עליו ומעדכנים מיקומים ב-seed. סטטוס, זרימה והפרדה הם הליבה.

## 9. פרומפטים מוכנים ל-Bob IDE (באנגלית, לפי הסדר)

> כל פרומפט = Task Session נפרד. בסוף כל אחד: צילום מסך של הסיכום ← bob_sessions/NN-name.png. אין לפתוח או לשנות את ה-repo של אסדרא בשום שלב.

**Prompt 0 — Scaffold the new standalone repo**

```
Scaffold a brand-new, standalone project in an empty folder `asadra-digital-twin` (it will be pushed to a new private GitHub repo ShirayK/asadra-digital-twin). It must be completely independent of the existing Asadra product: no imports from, no copies of, no network calls to, and no shared database with the Asadra repo or its Supabase. Stack: Next.js 14 App Router, TypeScript strict, three, @react-three/fiber@8, @react-three/drei@9, zod, vitest, ESLint, pnpm or npm. No Prisma, Supabase or auth for the MVP. Create: AGENTS.md (rules: standalone, local JSON data only, readings are append-only, every change passes tsc + vitest, Hebrew-first RTL with English, never commit secrets or .env), README.md, docs/SPEC.md (I will paste the spec), bob_sessions/.gitkeep, a .gitignore that excludes .env*, and the folder structure: data/seed, src/domain, src/adapters, src/app/[locale], src/components/twin, src/i18n, tests/domain. Add scripts: dev, build, lint, typecheck, test. Make `npm run build`, `typecheck` and `test` pass with a placeholder page. Initialize git with a first commit; do not push. Output a short plan for the next steps.
```

**Prompt 1 — Domain schema (zod + types)**

```
Create src/domain/schema.ts with zod schemas and inferred TypeScript types for TwinDataset exactly as described in section 5 of docs/SPEC.md: ZoneHygieneClass, ControlType, StepType, site, allergens, zones (center x/z + width/depth in meters, allergenCodes), stations (controlType, position, optional zoneId, fields with key/label/unit/min/max/monitoringFrequency/correctiveActionText, optional externalRef {system:'asadra', stationId}), process (steps with sortOrder and optional stationId/position, edges from/to), readings (stationId, ISO recordedAt, values record, optional correctiveAction, hash, prevHash). Add cross-reference validation with superRefine (every stationId/zoneId/allergenCode/edge endpoint exists, step sortOrder unique). These shapes mirror Asadra concepts but are defined here; do not import anything from Asadra. Add tests for valid and invalid datasets.
```

**Prompt 2 — Demo seed**

```
Create data/seed/hummus-plant.json, a valid TwinDataset for a 30x20m hummus plant "מפעל חומוס — דמו": zones קבלה (RAW), השריה ובישול (LOW_RISK), טחינה (LOW_RISK, allergen SESAME), קירור ואזור נקי (HIGH_CARE), אריזה (PACKAGING), מחסן קירור (STORAGE); stations: receiving temperature (PRP), soaking (CP), cooking (CCP, temperature min 90 °C), cooling (CCP, max 5 °C), metal detector (CCP), packaging (PRP), with Hebrew labels and units; a process with ordered steps linked to those stations and edges; and ~20 readings over the last 24h with a valid SHA-256 hash chain (generate them with a small script scripts/build-seed.ts that computes hash = sha256(prevHash + stationId + recordedAt + JSON(values))), including one out-of-range cooling reading of 9 °C with a corrective action. Make sure one edge goes RAW -> HIGH_CARE from a non-CCP step and one edge goes from the sesame zone to a zone without sesame, so both separation checks fire. Validate the file with the zod schema in a test.
```

**Prompt 3 — Pure logic + tests**

```
Create pure functions with no React or I/O in src/domain: status.ts getStationStatus(station, lastReading, now) -> 'OK'|'OUT_OF_RANGE'|'NO_DATA'|'STALE' (STALE if older than 24h; OUT_OF_RANGE if any value violates its field min/max or correctiveAction is non-empty); flow.ts buildFlowPaths(dataset) -> segments {from:{x,z}, to:{x,z}, edge} resolving a step position via its station first, then step.position; separation.ts findSeparationIssues(dataset) -> issues 'RAW_TO_HIGH_CARE_WITHOUT_CCP' and 'ALLERGEN_CROSS_CONTACT' (zones resolved by point-in-rectangle when zoneId is missing); chain.ts verifyReadingChain(readings) using Web Crypto SHA-256. Add vitest tests in tests/domain covering every branch. Run test and typecheck.
```

**Prompt 4 — Data source adapter & route**

```
Create src/adapters/types.ts with interface TwinDataSource { load(): Promise<TwinDataset> } and src/adapters/json-file-source.ts that reads data/seed/*.json on the server and validates it with the zod schema. Add docs/INTEGRATION.md describing a FUTURE AsadraApiSource that would map Asadra Station/StationField/StationLog/ProcessNode/ProcessEdge/Allergen to TwinDataset via a read-only export endpoint — documentation only, no code that calls Asadra. Add route src/app/[locale]/twin/page.tsx (server component) that loads the dataset, computes a serializable DTO (stations with status and last 5 readings, flow segments, separation issues, chain verification) and renders a client TwinView. Add a simple landing page at src/app/[locale]/page.tsx linking to the twin. Locales: he (default, RTL) and en.
```

**Prompt 5 — 3D scene**

```
Create client components in src/components/twin/: twin-canvas.tsx (dynamically imported with ssr:false, @react-three/fiber Canvas, drei OrbitControls, soft lighting), factory-floor.tsx (floor sized widthM x depthM with grid), zone-mesh.tsx (semi-transparent box per zone colored by hygieneClass, drei Html label, allergen chip), station-marker.tsx (cylinder + status ring: green OK, red OUT_OF_RANGE with pulse, grey NO_DATA, amber STALE; CCP taller than CP/PRP; hover cursor and click), legend.tsx. Keep it performant (frameloop="demand" except during animations, no heavy shadows). Surrounding UI must be correct in RTL Hebrew.
```

**Prompt 6 — Side panel**

```
Add side-panel.tsx: clicking a station opens a panel (right in LTR, left in RTL) showing name, controlType badge, each field with unit and limits, the last 5 readings with recordedAt, highlighted out-of-range values, the latest correctiveAction, and a truncated hash with a "chain verified" badge from verifyReadingChain. Readings are read-only in the UI. All strings via the i18n dictionaries.
```

**Prompt 7 — Flow & separation overlay**

```
Add twin-toolbar.tsx with toggles "flow" and "separation check" and an issues count badge. Add flow-arrows.tsx that draws drei Line segments from the flow segments with an animated dash offset showing direction, and separation-overlay.tsx that renders issues in red with a tooltip explaining the rule (raw-to-high-care without a kill step; allergen cross-contact naming the allergen). Clicking an issue focuses the camera on it.
```

**Prompt 8 — Basic layout editor (local only)**

```
Add an "edit mode" toggle. In edit mode, station markers can be dragged on the floor plane (raycast to y=0), snapping to 0.5m. Store edits as an overlay in localStorage via src/adapters/local-overlay.ts (never modify the seed file and never touch readings), recompute zone assignment, flow and separation issues on the client with the same domain functions, and add "Reset", "Export JSON" (downloads a full validated TwinDataset) and "Import JSON" (validated with zod, clear error messages). Add tests for the overlay merge.
```

**Prompt 9 — Guided tour (training mode)**

```
Add guided-tour.tsx: a "Guided tour" button that walks the camera through process steps in sortOrder (smooth lerp of camera position/target), showing a card with step name, type, and why it matters (for CCP: field limits, monitoringFrequency, correctiveActionText) with Next/Prev buttons. Esc exits. Text from i18n.
```

**Prompt 10 — i18n polish**

```
Complete src/i18n/he.json and en.json for every string used (Hebrew first, natural professional food-safety wording), add a language switcher, and verify the RTL layout in Hebrew. Optionally add ar.json. Add a test that all locale files have identical keys.
```

**Prompt 11 — QA, docs & deploy**

```
Run lint, typecheck, test and build and fix all failures. Check an empty dataset shows an empty state. Update README.md (what it is, how to run, data format, standalone by design, future Asadra adapter) and docs/INTEGRATION.md. Confirm there are no secrets, API keys or .env files in git and no references to the Asadra repo or its database. Prepare a deploy to a NEW separate Vercel project (not Asadra's) with no secret env vars.
```

## 10. תזכורת bob_sessions

- כל העבודה ב-Bob IDE בלבד, בחשבון ההאקתון (לא חשבון אישי, כי זה לא נספר).
- אחרי כל Task Session: צילום מסך של הסיכום ← bob_sessions/00-scaffold.png, 01-schema.png, וכן הלאה.
- התיקייה bob_sessions נמצאת ב-repo החדש ונכנסת להגשה.
- לעולם לא להעלות מפתחות API ל-repo; .env ב-.gitignore.

## 11. צ׳קליסט הגשה

- [ ] כל חברי הצוות אישרו את ההזמנה (פעמון ← Accept) באתר התחרות.
- [ ] repo פרטי ShirayK/asadra-digital-twin עם כל הקוד; typecheck + test + build עוברים.
- [ ] אפס שינויים ב-ShirayK/Asadra ובמסד הנתונים שלו.
- [ ] ה-seed מציג: CCP אדום, מקטע הפרדה אדום, אלרגן.
- [ ] דיפלוי בפרויקט Vercel נפרד (או סרטון).
- [ ] סרטון דמו של 3 דקות לפי סעיף 7.
- [ ] תיקיית bob_sessions עם צילומי כל הסיכומים (00–11).
- [ ] README + docs/SPEC.md + docs/INTEGRATION.md.
- [ ] אין מפתחות או סודות בקוד.
- [ ] הגשה מוקדמת עד ראשון בערב, הגשה סופית עד יום ב׳ 2.11, 20:00 (הדדליין 22:00).
- [ ] קישור ההגשה: https://compete.092601.watsonx-challenge.ibm.com/competitions/bobisraelhack/teams
- [ ] נגמרו Bobcoins? לכתוב לצוות IBM / מריה.
