# Diet in a Minute – handover (as of 2026-10-09)

## What this is
Upgrade of the live app (dietitians build diet plans with a servings system: 1 serving × multiplying factor,
e.g. rice 1 = 100 g; foods split across meals). New UI in Arabic/English, manual plan building for all,
AI as a Pro upgrade, workouts, check-ins. All work is on branch `new-version` and a separate TEST copy.

## Test copy (Railway project 16fc2575-998b-4ed8-b471-1a962301a9eb, env b6aff677-c1e9-4c77-80a5-deafe2c523f1)
- backend-test (bdff837c-…): https://backend-test-production-fd61.up.railway.app — Django; AI_FAKE=true, DEMO_DATA=true.
  Pre-deploy: migrate → seed_demo → seed_library (seed_library also runs add_usda_foods).
- website-test (6437c908-…): https://website-test-production-f8cd.up.railway.app — React (auth-frontend/), builds from `new-version`.
- phase0-checker (41114065-…): Bun function; fetches tools/test-copy-checker.ts from GitHub at a fixed commit SHA and runs
  ~100 API checks. To re-run: update its source with the new SHA, then read its logs ("ALL CHECKS PASSED").
- Demo login: demo@dietinaminute.test (password = Railway variable DEMO_PASSWORD on backend-test). Yousef signs in himself.
- No local Django; test through the deployed checker. Frontend checks: tsc-based syntax check, CRA build on Railway.

## Built and working on the test copy
- Plan builder: Carbs / Protein / Fats columns, 3 most-used foods each, totals per column, Fit to target,
  search finds foods from all groups. Steps: Foods & servings → Split into meals → Client sheet.
- Meal split: grid (food rows × meal columns, click box to add/remove, amounts editable, kcal per meal),
  rename meals + times, "+ Add a meal".
- Client sheet: day plan rows, suggested weekly plan (7 days, food swaps in same group, Swap/Edit day),
  shopping list, workout tab, PDF.
- Interview in sections with food pickers (liked / never / less) + drinks table, client link, interview PDF.
- Calorie page in the original layout. Progress & check-ins: stats, charts, manual / InBody upload (AI read) /
  client check-in link (/c/<token>), recalculates calories keeping the deficit.
- Collapsible sidebar. 103 USDA (SR28) foods added (nutrition/usda_foods.csv, Arabic names, servings).
- Approved mockups: docs/mockups/. Deferred: docs/LATER.md.

## Waiting on Yousef / next steps
1. Workouts: DONE on test. 133 Yousef Owis Academy programs (EN+AR, tips, targets, cardio) read from his PDFs
   (~/Downloads/programs) into nutrition/academy_workouts.json; `add_academy_workouts` runs in seed_library.
   Added levels advanced/all_levels and goal muscle_focus. Sheet lists workouts matching the client goal first.
   (Existing design he likes: Claude design artifact "Workout Schedule Design" – navy/gold, Tajawal.)
2. Appointment system + "daily-use" features – proposal given, NOT agreed yet. Proposal: calendar with working hours and
   appointment types, status (attended/no-show), public booking link, reminders, link to interview/check-ins;
   features: client app (daily meal ticks), Today screen, packages & payments, automatic follow-ups, visit notes,
   results report. Open questions: WhatsApp reminders free (one-tap) vs automatic (paid API); online payment or not;
   multi-dietitian clinics now or later; which features are Pro. Make mockups before any code.
3. Old foods: DONE on test (Yousef approved). `fix_old_foods` corrects 27 generic foods to USDA SR28 (total carbs), brands untouched;
   runs in seed_demo + seed_library. At go-live run it ONCE on the live DB, after the backup.
4. Hummus: stays in Fats (Yousef). Already found from every food search (plan columns, interview pickers, foods page).
5. Before go-live: database BACKUP of live DB (required), AI key, prices (Basic/Pro), switch-over plan,
   recommendations after check-ins and nicer sheet design are deferred.
