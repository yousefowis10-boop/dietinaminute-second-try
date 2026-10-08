// Checker for the TEST backend only. Prints PASS/FAIL lines, then exits.
const B = "https://backend-test-production-fd61.up.railway.app/api";
let fails = 0;
const ok = (name: string, cond: any, extra: any = "") => {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${extra !== "" ? " :: " + (typeof extra === "string" ? extra : JSON.stringify(extra)).slice(0, 400) : ""}`);
};
const req = async (path: string, opts: any = {}, token?: string) => {
  const headers: any = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(B + path, { ...opts, headers });
  let body: any = null;
  try { body = await r.json(); } catch {}
  return { status: r.status, body };
};
const post = (p: string, body: any, t?: string) => req(p, { method: "POST", body: JSON.stringify(body) }, t);
const put = (p: string, body: any, t?: string) => req(p, { method: "PUT", body: JSON.stringify(body) }, t);

try {
  const T = (await post("/auth/login/", { username: "demo@dietinaminute.test", password: Bun.env.DEMO_PASSWORD })).body?.access;
  ok("demo login", !!T);

  const acct = await req("/nutrition/account/", {}, T);
  ok("account: pro plan, AI test mode", acct.body?.plan_tier === "pro" && acct.body?.ai?.server_ready && acct.body?.ai?.test_mode, acct.body);

  const dash = await req("/nutrition/dashboard/", {}, T);
  ok("dashboard", dash.status === 200 && dash.body?.counts?.clients >= 3, dash.body?.counts);

  const calc = await post("/nutrition/calc-targets/", { formula: "Mifflin-St Jeor", gender: "M", weight: 92, height: 178, age: 34, work_style: "seated_moving", adjustment: -500, protein_pct: 30, carb_pct: 45, fat_pct: 25 }, T);
  ok("calc targets (server math)", calc.body?.bmr === 1868 && calc.body?.target_calories === 2395, calc.body);
  const badCalc = await post("/nutrition/calc-targets/", { formula: "Mifflin-St Jeor", gender: "M", weight: 92, height: 178, age: 34, work_style: "seated_moving", protein_pct: 30, carb_pct: 30, fat_pct: 30 }, T);
  ok("calc rejects % not adding to 100", badCalc.status === 400, badCalc.body);

  // Create a fresh client through the new path: server computes targets
  const created = await post("/nutrition/clients/", { name: `Checker ${Date.now()}`, age: 30, weight: 70, height: 170, gender: "F", goal: "loss", work_style: "standing", formula: "Mifflin-St Jeor", adjustment: -400, protein_pct: 30, carb_pct: 45, fat_pct: 25 }, T);
  const C = created.body;
  ok("create client with server calculation", C?.id && C?.target_calories > 1000 && Math.abs(C.target_protein - C.target_calories * 0.3 / 4) < 1, C);

  const ov = await req(`/nutrition/clients/${C.id}/overview/`, {}, T);
  ok("client overview", ov.status === 200 && ov.body?.client?.id === C.id, Object.keys(ov.body || {}));

  const foods = (await req("/nutrition/foods/", {}, T)).body;
  const byName = (n: string) => foods.find((f: any) => f.name === n);
  const shrimp = byName("shrimp"), chicken = byName("Chicken Breast"), rice = byName("white rice"), oil = byName("olive oil");
  ok("foods include Arabic + factor", !!chicken?.name_ar && chicken?.multiplying_factor === 100, chicken);

  const ex = await put(`/nutrition/clients/${C.id}/exclusions/`, { food_ids: [shrimp.id] }, T);
  ok("set excluded foods", ex.body?.excluded_foods?.length === 1, ex.body);
  const blocked = await post(`/nutrition/plan/custom/${C.id}/`, { items: [{ id: shrimp.id, quantity: 1, category: "protein" }] }, T);
  ok("excluded food blocked when saving plan", blocked.status === 400 && blocked.body?.error === "excluded_foods", blocked.body);

  // Interview link flow
  const link = await post(`/nutrition/clients/${C.id}/interview-link/`, {}, T);
  ok("interview link created", !!link.body?.token && link.body?.status === "sent", link.body);
  const pub = await fetch(`${B}/public/interview/${link.body.token}/`).then(r => r.json());
  ok("public interview opens without login", pub.first_name === "Checker" && pub.submitted === false, pub);
  const sub = await fetch(`${B}/public/interview/${link.body.token}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: { occupation: "Nurse, night shifts", food_allergies: ["Shellfish"], diseases: ["High Blood Pressure"], caffeine: true, total_visits: 99, pregnant: false } }) });
  ok("client submits answers", sub.status === 200, await sub.text());
  const again = await fetch(`${B}/public/interview/${link.body.token}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: { occupation: "x" } }) });
  ok("second submission refused", again.status === 409);
  const bad = await fetch(`${B}/public/interview/00000000-0000-0000-0000-000000000000/`);
  ok("unknown link gives 404", bad.status === 404);
  const dp = (await req(`/nutrition/clients/${C.id}/detailed-profile/`, {}, T)).body;
  ok("answers saved; admin field ignored", dp?.occupation === "Nurse, night shifts" && dp?.total_visits !== 99, { occ: dp?.occupation, tv: dp?.total_visits });
  const ov2 = (await req(`/nutrition/clients/${C.id}/overview/`, {}, T)).body;
  ok("status = submitted, safety flags from answers", ov2.interview.status === "submitted" && ov2.safety_flags.some((f: any) => f.code === "diseases") && ov2.safety_flags.some((f: any) => f.code === "allergies"), ov2.safety_flags);
  const dash2 = (await req("/nutrition/dashboard/", {}, T)).body;
  ok("dashboard shows waiting interview", dash2.interviews_waiting.some((x: any) => x.id === C.id));
  await post(`/nutrition/clients/${C.id}/interview-reviewed/`, {}, T);

  // AI (test mode)
  const sum = await post(`/nutrition/ai/clients/${C.id}/summary/`, { language: "en" }, T);
  ok("AI summary (test mode) + rule flags", sum.status === 200 && sum.body?.content?.test_mode && sum.body?.content?.rule_flags?.length >= 2, sum.body);
  const draft = await post(`/nutrition/ai/clients/${C.id}/draft-plan/`, { meals: 4 }, T);
  ok("AI draft plan never uses excluded food", draft.status === 200 && !draft.body.items.some((i: any) => i.food_id === shrimp.id), draft.body?.items?.map((i: any) => i.name));
  ok("test-mode draft uses everyday foods, no supplements", draft.body?.items?.some((i: any) => i.name === "Chicken Breast") && !draft.body?.items?.some((i: any) => /iso|vitargo|honey|serious/i.test(i.name)), draft.body?.items?.map((i: any) => i.name));
  ok("draft spreads protein over all main meals", draft.body?.items?.find((i: any) => i.food_type === "protein")?.meals?.length === 4, draft.body?.items?.map((i: any) => i.meals));
  ok("AI draft lands on targets (app math)", draft.body?.on_target && Object.values(draft.body.on_target).filter(Boolean).length >= 2, { totals: draft.body?.totals, targets: draft.body?.targets, on: draft.body?.on_target });

  // Fit servings
  const fit = await post(`/nutrition/clients/${C.id}/fit-servings/`, { items: [{ food_id: chicken.id, quantity: 1 }, { food_id: rice.id, quantity: 1 }, { food_id: oil.id, quantity: 1 }] }, T);
  ok("fit servings to targets", fit.status === 200 && Object.values(fit.body.on_target).filter(Boolean).length >= 2, fit.body);

  // Save plan with meals + shares
  const created2 = await post(`/nutrition/plan/custom/${C.id}/`, { name: "Checker plan", items: [
    { id: chicken.id, quantity: 2, category: "protein", meals: ["meal2", "meal3"], shares: { meal2: 2, meal3: 1 } },
    { id: rice.id, quantity: 1.5, category: "carb", meals: ["meal2"] },
    { id: oil.id, quantity: 2, category: "fat" },
  ] }, T);
  const P = created2.body?.plan_id;
  ok("plan saved with meals", !!P, created2.body);
  const sheet = (await req(`/nutrition/plan/${P}/sheet/`, {}, T)).body;
  const ch2 = sheet?.meals?.meal2?.find((x: any) => x.food_en === "Chicken Breast")?.amount;
  const ch3 = sheet?.meals?.meal3?.find((x: any) => x.food_en === "Chicken Breast")?.amount;
  ok("unequal split 2:1 (133.33 g / 66.67 g)", Math.abs(ch2 - 133.33) < 0.02 && Math.abs(ch3 - 66.67) < 0.02, { ch2, ch3 });
  ok("rice 1.5 servings = 150 g", sheet?.meals?.meal2?.find((x: any) => x.food_en === "white rice")?.amount === 150);
  ok("unassigned food listed", sheet?.unassigned?.length === 1, sheet?.unassigned);
  ok("grocery list per week", sheet?.grocery?.find((g: any) => g.food_en === "Chicken Breast")?.per_week === 1400, sheet?.grocery);

  // Shares via tag update
  const plan = (await req(`/nutrition/plan/${P}/`, {}, T)).body;
  const tags = (await req("/nutrition/tags/", {}, T)).body;
  const tid = (n: string) => tags.find((t: any) => t.name === n).id;
  const oilItem = plan.items.find((i: any) => i.food_name === "olive oil");
  const upd = await put(`/nutrition/plan/${P}/update-tags/`, { items: [{ item_id: oilItem.id, tag_ids: [tid("meal1"), tid("meal3")], shares: { [tid("meal1")]: 1, [tid("meal3")]: 3 } }] }, T);
  const sheet2 = (await req(`/nutrition/plan/${P}/sheet/`, {}, T)).body;
  ok("shares via meal editor (1:3)", upd.status === 200 && sheet2.meals.meal3.find((x: any) => x.food_en === "olive oil")?.amount === 1.5 && sheet2.unassigned.length === 0, sheet2.meals);

  // Workouts + templates
  const workouts = (await req("/nutrition/workouts/", {}, T)).body;
  ok("workout library (drafts)", workouts.length >= 7 && workouts.every((w: any) => w.is_draft), workouts.length);
  const safe = workouts.find((w: any) => w.is_safe_version);
  const aw = await put(`/nutrition/plan/${P}/workout/`, { workout_id: safe.id }, T);
  const sheet3 = (await req(`/nutrition/plan/${P}/sheet/`, {}, T)).body;
  ok("workout attached to plan sheet", aw.status === 200 && sheet3.workout?.id === safe.id);
  const fl = (await req("/nutrition/workouts/?goal=fat_loss&place=home", {}, T)).body;
  ok("workout filter", fl.length >= 1 && fl.every((w: any) => w.goal === "fat_loss" && w.place === "home"));
  const tpls = (await req("/nutrition/templates/", {}, T)).body;
  ok("medical templates (drafts)", tpls.filter((t: any) => t.is_medical && t.is_draft).length === 5, tpls.map((t: any) => t.name));
  const saved = await post("/nutrition/templates/", { plan_id: P, name: "My checker template" }, T);
  ok("save plan as template", saved.status === 201 && saved.body.items.length === 3, saved.body);
  const applied = (await req(`/nutrition/templates/${saved.body.id}/apply/${C.id}/`, {}, T)).body;
  ok("apply template", applied.items.length === 3 && applied.items[0].name, applied);
  await req(`/nutrition/templates/${saved.body.id}/`, { method: "DELETE" }, T);

  const msg = await post(`/nutrition/ai/plans/${P}/client-message/`, {}, T);
  ok("AI client message (test mode)", msg.status === 200 && msg.body?.content?.message, msg.body);
  const fu = await post(`/nutrition/ai/clients/${(await req("/nutrition/clients/", {}, T)).body.find((c: any) => c.name === "Ahmad Khalil").id}/follow-up/`, {}, T);
  ok("AI follow-up with visit comparison", fu.status === 200 && fu.body?.content?.change?.visits >= 2, fu.body);

  // Branding + AI switch
  const br = await req("/nutrition/account/branding/", { method: "PUT", body: JSON.stringify({ clinic_name: "Nour Nutrition Clinic", ai_enabled: false }) }, T);
  ok("branding saved, AI switched off", br.body?.clinic_name === "Nour Nutrition Clinic" && br.body?.ai?.enabled === false, br.body);
  const off = await post(`/nutrition/ai/clients/${C.id}/summary/`, {}, T);
  ok("AI refused when switched off", off.status === 409 && off.body?.error === "disabled_by_user", off.body);
  await req("/nutrition/account/branding/", { method: "PUT", body: JSON.stringify({ ai_enabled: true }) }, T);

  // A Basic account: no AI, and cannot touch demo data
  const email = `basic-${Date.now()}@dietinaminute.test`;
  await post("/auth/register/", { email, password: "Basic-Pass-9472!", first_name: "B", last_name: "U" });
  const T2 = (await post("/auth/login/", { username: email, password: "Basic-Pass-9472!" })).body?.access;
  const basicAi = await post(`/nutrition/ai/clients/${C.id}/summary/`, {}, T2);
  ok("other account cannot reach client (404 before plan check)", basicAi.status === 404);
  const own = await post("/nutrition/clients/", { name: "Basic client", age: 40, weight: 80, height: 175, gender: "M", goal: "maintain", work_style: "seated_static", formula: "Harris-Benedict" }, T2);
  const basicAi2 = await post(`/nutrition/ai/clients/${own.body.id}/summary/`, {}, T2);
  ok("Basic plan gets 'upgrade required' for AI", basicAi2.status === 402, basicAi2.body);
  ok("other account blocked: overview/sheet/templates apply", (await req(`/nutrition/clients/${C.id}/overview/`, {}, T2)).status === 404 && (await req(`/nutrition/plan/${P}/sheet/`, {}, T2)).status === 404 && (await req(`/nutrition/templates/${tpls[0].id}/apply/${C.id}/`, {}, T2)).status === 404);
  ok("other account cannot attach workout to demo plan", (await put(`/nutrition/plan/${P}/workout/`, { workout_id: safe.id }, T2)).status === 404);

  const rep = await put(`/nutrition/plan/${P}/replace/`, { name: "Edited plan", items: [
    { id: chicken.id, quantity: 2.5, category: "protein", meals: ["meal1", "meal2"], shares: { meal1: 1, meal2: 4 } },
    { id: rice.id, quantity: 2, category: "carb", meals: ["meal2"] },
  ] }, T);
  const sheet4 = (await req(`/nutrition/plan/${P}/sheet/`, {}, T)).body;
  ok("edit plan replaces foods and meals", rep.status === 200 && sheet4.plan.name === "Edited plan" && sheet4.meals.meal1?.[0]?.amount === 50 && sheet4.meals.meal2?.length === 2 && sheet4.grocery.length === 2, sheet4.meals);
  const repBlocked = await put(`/nutrition/plan/${P}/replace/`, { items: [{ id: shrimp.id, quantity: 1, category: "protein" }] }, T);
  ok("edit cannot add excluded food", repBlocked.status === 400, repBlocked.body);
  const del = await req(`/nutrition/plan/${P}/delete/`, { method: "DELETE" }, T);
  ok("delete plan", del.status === 204);


  // ---- round 4: common foods, meal names, weekly plan, check-ins, interview foods
  const common = (await req("/nutrition/foods/common/", {}, T)).body;
  ok("3 common foods per group", ["carb", "protein", "fat"].every((k) => common?.[k]?.length === 3), common);
  const P2r = await post(`/nutrition/plan/custom/${C.id}/`, { name: "Week plan", meal_slots: [
      { key: "meal1", name: "Breakfast", time: "08:00" }, { key: "meal2", name: "Lunch", time: "14:00" },
      { key: "meal5", name: "Pre-workout", time: "17:30" }, { key: "meal3", name: "Dinner", time: "20:00" }],
    items: [
      { id: rice.id, quantity: 3, category: "carb", meals: ["meal2", "meal3"] },
      { id: chicken.id, quantity: 3, category: "protein", meals: ["meal2", "meal3"] },
      { id: oil.id, quantity: 2, category: "fat", meals: ["meal2", "meal3"] },
      { id: byName("banana").id, quantity: 1, category: "carb", meals: ["meal5"] },
      { id: byName("Oats").id, quantity: 1, category: "carb", meals: ["meal1"] },
    ] }, T);
  const P2 = P2r.body?.plan_id;
  const sh = (await req(`/nutrition/plan/${P2}/sheet/`, {}, T)).body;
  ok("meal names saved, extra meal works", sh?.meal_slots?.length === 4 && sh.meal_slots[2].name === "Pre-workout" && sh.meals?.meal5?.length === 1, { slots: sh?.meal_slots, keys: Object.keys(sh?.meals || {}) });
  const wk = (await post(`/nutrition/plan/${P2}/weekly/`, {}, T)).body?.weekly;
  const k0 = wk?.days?.[0]?.kcal;
  ok("weekly plan: 7 days, day 1 = plan", wk?.days?.length === 7 && wk.days[0].swaps === 0 && wk.days[0].items.length === 8, wk?.days?.map((d: any) => [d.kcal, d.swaps]));
  ok("weekly plan: every day within 7% calories", wk?.days?.every((d: any) => Math.abs(d.kcal - k0) / k0 <= 0.07), wk?.days?.map((d: any) => d.kcal));
  ok("weekly plan: some swaps, never excluded food", wk?.days?.some((d: any) => d.swaps > 0) && !wk.days.some((d: any) => d.items.some((i: any) => i.food_id === shrimp.id)), wk?.days?.map((d: any) => d.items.filter((i: any) => i.swapped).map((i: any) => i.name)));
  const wkBad = await req(`/nutrition/plan/${P2}/weekly/`, { method: "PUT", body: JSON.stringify({ days: [{ items: [{ meal: "meal2", food_id: shrimp.id, quantity: 1 }] }] }) }, T);
  ok("weekly edit cannot add excluded food", wkBad.status === 400, wkBad.body);
  const wkOk = await req(`/nutrition/plan/${P2}/weekly/`, { method: "PUT", body: JSON.stringify({ days: wk.days.map((d: any) => ({ items: d.items })) }) }, T);
  ok("weekly edit saves", wkOk.status === 200 && wkOk.body?.weekly?.days?.length === 7);

  const before = (await req(`/nutrition/clients/${C.id}/`, {}, T)).body;
  const ci = await post(`/nutrition/clients/${C.id}/checkins/`, { weight: before.weight - 2, pbf: 24, smm: 30.5, source: "manual", date: "2026-10-01" }, T);
  ok("manual check-in saved, calories recalculated", ci.status === 201 && ci.body?.checkin?.weight === before.weight - 2 && ci.body.calories_after < ci.body.calories_before, ci.body);
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const read = await post(`/nutrition/clients/${C.id}/inbody-read/`, { file: { name: "inbody.png", content_type: "image/png", data: png } }, T);
  ok("InBody read (test mode)", read.status === 200 && read.body?.weight > 20 && read.body?.test_mode, read.body);
  const ci2 = await post(`/nutrition/clients/${C.id}/checkins/`, { ...read.body, source: "inbody", file: { name: "inbody.png", content_type: "image/png", data: png } }, T);
  const fileBack = (await req(`/nutrition/checkins/${ci2.body?.checkin?.id}/file/`, {}, T)).body;
  ok("InBody check-in keeps the file", ci2.status === 201 && ci2.body.checkin.source === "inbody" && fileBack?.data === png, ci2.body);
  const badFile = await post(`/nutrition/clients/${C.id}/checkins/`, { weight: 70, file: { name: "x.exe", content_type: "application/x-msdownload", data: png } }, T);
  ok("check-in rejects non-image files", badFile.status === 400);
  const lk = (await post(`/nutrition/clients/${C.id}/checkin-link/`, {}, T)).body;
  const pubGet = await fetch(`${B}/public/checkin/${lk?.token}/`).then((r) => r.json());
  ok("client check-in link opens without login", pubGet?.first_name === "Checker", pubGet);
  const pubPost = await fetch(`${B}/public/checkin/${lk.token}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weight: 68.4, note: "felt good" }) });
  ok("client sends check-in", pubPost.status === 200);
  const dash3 = (await req("/nutrition/dashboard/", {}, T)).body;
  const waitingCi = dash3?.checkins_waiting?.find((x: any) => x.client_id === C.id);
  ok("dashboard shows new client check-in", !!waitingCi && waitingCi.weight === 68.4, dash3?.checkins_waiting);
  ok("mark check-in seen", (await post(`/nutrition/checkins/${waitingCi?.id}/`, {}, T)).body?.reviewed === true);
  const ciList = (await req(`/nutrition/clients/${C.id}/checkins/`, {}, T)).body;
  ok("check-in list has sources", ciList?.checkins?.some((x: any) => x.source === "client_link") && ciList.checkins.some((x: any) => x.source === "inbody" && x.file), ciList?.checkins?.map((x: any) => x.source));
  ok("other account cannot read check-in file", (await req(`/nutrition/checkins/${ci2.body?.checkin?.id}/file/`, {}, T2)).status === 404);

  const link2 = (await post(`/nutrition/clients/${C.id}/interview-link/`, { new: true }, T)).body;
  const pub2 = await fetch(`${B}/public/interview/${link2.token}/`).then((r) => r.json());
  ok("interview link lists foods", pub2?.foods?.length > 20, pub2?.foods?.length);
  const broccoli = byName("Broccli");
  await fetch(`${B}/public/interview/${link2.token}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: { liked_foods: [chicken.id], never_foods: [broccoli.id], drinks: { coffee_tea: { freq: "daily", amount: "3" }, water_l: 2 } } }) });
  const ov3 = (await req(`/nutrition/clients/${C.id}/overview/`, {}, T)).body;
  const dp3 = (await req(`/nutrition/clients/${C.id}/detailed-profile/`, {}, T)).body;
  ok("never-eat foods become excluded; drinks saved", ov3.excluded_foods.some((f: any) => f.id === broccoli.id) && dp3?.drinks?.coffee_tea?.freq === "daily" && dp3?.liked_foods?.[0] === chicken.id, { ex: ov3.excluded_foods, drinks: dp3?.drinks });
  await req(`/nutrition/plan/${P2}/delete/`, { method: "DELETE" }, T);
  ok("medical templates have Arabic names", tpls.filter((x: any) => x.is_medical).every((x: any) => x.name_ar && x.description_ar), tpls.map((x: any) => x.name_ar));
  ok("demo shows a follow-up due", (await req("/nutrition/dashboard/", {}, T)).body?.counts?.follow_ups_due >= 1);
  ok("other account cannot delete client", (await req(`/nutrition/clients/${C.id}/`, { method: "DELETE" }, T2)).status === 404);
  await req(`/nutrition/clients/${own.body.id}/`, { method: "DELETE" }, T2);
  const delC = await req(`/nutrition/clients/${C.id}/`, { method: "DELETE" }, T);
  ok("delete client (and it is gone)", delC.status === 204 && (await req(`/nutrition/clients/${C.id}/`, {}, T)).status === 404);
  // Clean up clients left by earlier checker runs.
  const all = await req("/nutrition/clients/", {}, T);
  const list = Array.isArray(all.body) ? all.body : all.body?.results || [];
  for (const old of list.filter((x: any) => String(x.name || "").startsWith("Checker "))) await req(`/nutrition/clients/${old.id}/`, { method: "DELETE" }, T);
} catch (e) {
  fails++;
  console.log("FAIL crashed :: " + (e as any)?.stack);
}
console.log(fails === 0 ? "ALL CHECKS PASSED" : `${fails} CHECK(S) FAILED`);
