# Yousef's decisions and wishes (kept up to date) — last update 9 Oct 2026

Testing round 1 done (9 Oct): Today, appointments, calendars, booking link all OK.
New screens always get a picture (mockup) first. Everything Arabic + English.

## Done on the test site (waiting for Yousef's test)
| What | Notes |
|---|---|
| Old foods fixed against USDA | 27 foods; total carbs (fibre included); brands untouched; run once on live DB at go-live after backup |
| Hummus | stays in Fats; shows in every food search |
| Workouts | 133 Yousef Owis Academy programs (EN+AR), ~20 per goal/level; sheet lists matching goal first |
| Appointments | named calendars per dietitian, booking link, pay at clinic / mark paid, WhatsApp one-tap reminders |
| Client phone page | private link, meal ticks (full / half), water, weekly plan, shopping, workout, next appointment |
| Today screen | today's visits, new check-ins, adherence %, stopped logging, follow-ups due, packages ending, unpaid |
| Packages | per client, visits used / left, paid / owed |
| Client phone number | on the client form, used for WhatsApp |

## Feedback from testing (9 Oct)
- DONE: added foods start empty (no default 1); 6 most-used foods per group; water + new check-in notice on client file;
  client file refreshes when you come back to the window. (Check-in was saved — it showed only in Today + Progress tab.)
- Picture r11 waiting for OK: simpler plan builder (same 3 columns), client file split into pages, clear workout table.
  Yousef on r11 builder: KEEP the +/− buttons. Not sure the side-by-side (horizontal) 3 columns is better — he will test
  before deciding. Client file: Yousef says it's fine as it is — do NOT split it into pages.
- DONE 9 Oct: meal names on 'Split into meals' fold into one line (Edit names & times); workout shown as instructions box
  + day buttons + table (sets / reps / rest / how to) everywhere (sheet, PDF all days, phone page, Workouts page).
  Yousef: 'over all looks okay'.

## Feedback from testing round 2 (10 Oct) — all DONE
- Blood test with several pages: pick many files at once + "Add page" while checking; AI reads all pages together.
- Diet plan sheet looks like meals: meal cards (icon, time, kcal, P/C/F) with coloured food dots, 2 columns.
- Client file buttons tidied: pencil next to name, one "Add ▾" menu (check-in, InBody, blood test, link) + New plan.
- Vitamin suggestions SWAP with the biggest food of the same group (macros stay), instead of adding on top.
- Shopping list: 1 week / 2 weeks / 1 month; "Shopping list for this week" button on the weekly plan.
- Phone page: big number is TODAY's %, the week % small underneath.

## Approved — build next (in this order unless Yousef changes it)
1. ✅ DONE 9 Oct · **Interview exercise questions** → works out? where + own level / if not: gym? level / if not: home? level / else walking goal. Mockup r10.
2. ✅ DONE 9 Oct · **Workout suggestion after the diet plan** → 3 best matches by goal + level + place (from #1), one-tap add. Mockup r8.
3. ✅ DONE 9 Oct (Yousef: works, make it look nicer — done) · **Smart grocery list** → grouped by store section (vegetables, fruit, meat & fish, dairy & eggs, bread & grains, oils & nuts, other), amounts for the week, tick off, share on WhatsApp. (Picture first.)
4. ✅ DONE 9 Oct · **Vitamins & minerals in plans** (USDA SR Legacy data, 140 foods; builder panel + sheet tab) → iron, calcium, vitamin D, B12, folate, magnesium, zinc, potassium, fibre, sodium per plan vs daily needs (age/sex); USDA values for foods. (Picture first.)
5. ✅ DONE 9 Oct · **Blood tests** + ONE full-history page of everything measured (Yousef asked) → upload photo/PDF, AI reads results, record with trends, food advice per low/high result, "refer to doctor" for extreme values, share with client. Mockup r9. Links to #4.

## Wanted — not approved for building yet
- ✅ DONE 10 Oct: per-client "Send booking link" (name filled in, optional chosen times, WhatsApp).
- Stripe online payment — Yousef has an account; connect later. Then: deposit / no-show fee.
- From the competitor report, suggested top picks (waiting for his choice): photo food diary + comments, chat,
  protocol templates (low iron, PCOS, cholesterol…), ready-made programs, automatic client journey, branded PDFs/pages.
- ✅ DONE 10 Oct (Yousef: "finish everything"): pages load on demand (1.5 MB -> 0.4 MB), light menu counts, faster Today,
  foods/workouts remembered, compact plan builder (kept +/− and 3 columns), welcome guide for new dietitians.
  Not done on purpose: client file split (Yousef: fine as is), one link per client (interview/phone page) — ask first.

## Pinned (waiting for Yousef)
- **Recipes library** (Yousef 10 Oct, PDF coming): each recipe becomes ONE food in the Carbs / Protein / Fat lists (by its main
  macro), 1 serving = one portion, nutrition worked out from its ingredients. Treats are named "Treat – …" so typing "treat"
  in any food search lists them. In a plan the recipe counts as one item (its ingredients' totals); the client sheet / PDF gets
  an extra page per recipe used: ingredients with amounts, steps, portions. Shopping list breaks recipes into ingredients.
- **Allergies from the interview** (Yousef 10 Oct): if the client marks an allergy (peanuts, shellfish, dairy, eggs, wheat,
  soy, gluten…), the dietitian is ASKED once: "Remove these foods from the search" or "Just mark them in red". Applies in the
  plan builder and swaps.
- Later ideas: health-watch sync (needs a real phone app), company wellness, own branded app in the stores.

## Mockups
r6 appointments · r7 client app + Today · r8 workout suggestion · r9 blood tests · r10 interview exercise · r11 builder / client file / workout view · r12 grocery + micronutrients (docs/mockups/)
