import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { BookOpen, Check, ChevronDown, Copy, LayoutGrid, Minus, Pencil, Plus, Search, Shuffle, Sparkles, Target, X } from "lucide-react";
import API, { cachedGet } from "../hooks/useApi";
import { useI18n } from "../i18n";
import { DraftBadge, Empty, InfoTip, Modal, SafetyFlags, Spinner, apiError, targetStatus } from "../ui";
import { useAIBlocker } from "./client/AIPanel";
import MicrosPanel, { microRows } from "./MicrosPanel";
import { RecipeModal } from "./RecipeCard";
import { amountOf, kcalOf, niceAmount, roundHalf, totalsOf, tplDesc, tplName, unitLabel } from "./foodUtils";

const COLS = ["carb", "protein", "fat"];
const DOT = { carb: "bg-[#b7791f]", protein: "bg-[#2563a8]", fat: "bg-[#8a4fb0]" };
const HEAD = { carb: "bg-[#fdf4e3]", protein: "bg-[#e8f0fa]", fat: "bg-[#f4ecf9]" };
const BAR = { on: "bg-ok", near: "bg-warn", off: "bg-bad", none: "bg-line" };
const PILL = { on: "bg-ok-soft text-ok", near: "bg-warn-soft text-warn", off: "bg-bad-soft text-bad", none: "bg-page text-muted" };

// Which column a food belongs to (mixed foods go where most of their calories come from).
export function colOf(f) {
  if (COLS.includes(f.food_type)) return f.food_type;
  const k = { carb: (f.carb || 0) * 4, protein: (f.protein || 0) * 4, fat: (f.fat || 0) * 9 };
  return COLS.reduce((a, b) => (k[b] > k[a] ? b : a), "carb");
}

function foodToItem(food, extra = {}) {
  return {
    food_id: food.id, name: food.name, name_ar: food.name_ar, unit: food.unit, unit_ar: food.unit_ar,
    protein: food.protein, carb: food.carb, fat: food.fat, food_type: food.food_type,
    multiplying_factor: food.multiplying_factor || 1, recipe: food.recipe || null, quantity: 0, meals: [], shares: {}, common: false, ...extra,
  };
}

// ----------------------------------------------------------- meal slots
const NAME_KEYS = { 2: ["breakfast", "dinner"], 3: ["breakfast", "lunch", "dinner"], 4: ["breakfast", "lunch", "dinner", "late"], 5: ["breakfast", "brunch", "lunch", "dinner", "late"] };

function makeSlots(n, snacks, t, keep = []) {
  const prev = Object.fromEntries(keep.map((s) => [s.key, s]));
  const keys = [];
  for (let i = 1; i <= n; i += 1) {
    keys.push(`meal${i}`);
    if (snacks && i < n) keys.push(`snack${i}`);
  }
  const extras = keep.filter((s) => s.extra);
  const total = keys.length + extras.length;
  const step = Math.min(180, Math.floor((14 * 60) / Math.max(total - 1, 1) / 30) * 30);
  const time = (i) => { const m = 8 * 60 + i * step; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const out = keys.map((key, i) => {
    if (prev[key]) return prev[key];
    const isMeal = key.startsWith("meal");
    const idx = Number(key.replace(/\D/g, ""));
    const name = isMeal ? t(`nm_${NAME_KEYS[n][idx - 1]}`) : t("nm_snack", { n: idx });
    return { key, name, time: time(i) };
  });
  return [...out, ...extras];
}

function nextExtraKey(slots) {
  const used = new Set(slots.map((s) => s.key));
  for (let i = 1; i <= 12; i += 1) if (!used.has(`meal${i}`)) return `meal${i}`;
  return null;
}

// ------------------------------------------------------------ pieces
function Stepper({ value, onChange }) {
  return (
    <div className="grid h-9 w-full max-w-[112px] grid-cols-[28px_1fr_28px] items-center overflow-hidden rounded-lg border border-line bg-white">
      <button type="button" className="grid h-full place-items-center bg-[#f7f8f7] text-muted hover:text-brand" onClick={() => onChange(roundHalf(value - 0.5))} aria-label="-"><Minus className="h-3.5 w-3.5" /></button>
      <input className="num w-full bg-transparent text-center text-sm font-bold outline-none" inputMode="decimal" placeholder="0" value={value || ""}
        onChange={(e) => { const v = parseFloat(e.target.value); onChange(Number.isNaN(v) ? 0 : Math.max(v, 0)); }} />
      <button type="button" className="grid h-full place-items-center bg-[#f7f8f7] text-muted hover:text-brand" onClick={() => onChange(roundHalf(value + 0.5))} aria-label="+"><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}

// Searchable list of foods (one column's foods only).
function FoodPicker({ options, others = [], onPick, placeholder, dashed = true }) {
  const { t, foodName, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const match = (f) => !q || (f.name || "").toLowerCase().includes(q.trim().toLowerCase()) || (f.name_ar || "").includes(q.trim());
  const list = options.filter(match).slice(0, 40);
  // While searching, also show foods from the other groups (they go to their own column).
  const extra = q.trim() ? others.filter(match).slice(0, 20) : [];
  const row = (f, tag) => (
    <li key={f.id}>
      <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-sm hover:bg-page"
        onClick={() => { onPick(f); setOpen(false); setQ(""); }}>
        <span className="flex-1">{foodName(f)}{f.recipe && <BookOpen className="ms-1.5 inline h-3.5 w-3.5 text-brand" aria-label={t("recipeLabel")} />}</span>
        {tag && <span className={`rounded-full px-2 py-px text-[11px] font-semibold ${HEAD[colOf(f)] || "bg-page"}`}>{tag}</span>}
        <span className="num text-xs text-muted">{amountOf(f, 1)} {unitLabel(f, lang)}</span>
      </button>
    </li>
  );
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center gap-2 rounded-xl px-3 text-start text-[13px] text-muted ${dashed ? "border border-dashed border-[#c9d0cc]" : "border border-line bg-white"}`}>
        <Search className="h-4 w-4" /><span className="flex-1 truncate">{placeholder}</span><ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-line bg-white p-2 shadow-xl">
          <input autoFocus className="input mb-1 h-9 text-sm" placeholder={t("searchFood")} value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="max-h-72 overflow-y-auto">
            {list.map((f) => row(f))}
            {extra.length > 0 && <li className="px-2 pb-1 pt-2.5 text-[11px] font-bold text-muted">{t("otherGroups")}</li>}
            {extra.map((f) => row(f, t(colOf(f) === "carb" ? "carbs" : colOf(f))))}
            {!list.length && !extra.length && <li className="px-2 py-3 text-sm text-muted">{t("noMatch")}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function StepsBar({ current, className = "" }) {
  const { t } = useI18n();
  const names = [t("stFoods"), t("stMeals"), t("stSheet")];
  return (
    <div className={`card grid grid-cols-3 gap-1 p-1.5 ${className}`}>
      {names.map((n, i) => (
        <div key={n} className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${i === current ? "bg-brand-soft text-brand" : i < current ? "text-brand-ink" : "text-muted"}`}>
          <span className={`grid h-6 w-6 place-items-center rounded-full border text-xs ${i < current ? "border-ok bg-ok text-white" : i === current ? "border-brand bg-brand text-white" : "border-line"}`}>
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={i === current ? "" : "hidden sm:inline"}>{n}</span>
        </div>
      ))}
    </div>
  );
}
export { StepsBar };

export default function PlanBuilder() {
  const { clientId, planId } = useParams();
  const editing = Boolean(planId);
  const navigate = useNavigate();
  const { t, lang, foodName, num, fmtDate } = useI18n();
  const aiBlocker = useAIBlocker();

  const [overview, setOverview] = useState(null);
  const [foods, setFoods] = useState([]);
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [mainMeals, setMainMeals] = useState(3);
  const [withSnacks, setWithSnacks] = useState(true);
  const [slots, setSlots] = useState([]);
  const [namesOpen, setNamesOpen] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [editAmount, setEditAmount] = useState(null); // {food_id, meal}
  const [recipeFor, setRecipeFor] = useState(null); // food id of the recipe shown in the pop-up
  const closeRecipe = useCallback(() => setRecipeFor(null), []);

  // Add 1 serving of a vitamin-rich food and take the same amount of its main macro off the biggest food in the
  // same group, so protein / carbs / fat stay where they were (e.g. salmon in, part of the chicken out).
  const swapIn = (f) => {
    const col = colOf(f);
    const key = col === "carb" ? "carb" : col === "protein" ? "protein" : "fat";
    setItems((list) => {
      const others = list.filter((i) => i.food_id !== f.id && i.quantity > 0 && colOf(i) === col && i[key] > 0);
      const old = others.sort((a, b) => b.quantity * b[key] - a.quantity * a[key])[0];
      let next = list.some((i) => i.food_id === f.id)
        ? list.map((i) => (i.food_id === f.id ? { ...i, quantity: (i.quantity > 0 ? i.quantity : 0) + 1 } : i))
        : [...list, foodToItem(f, { quantity: 1 })];
      if (old && f[key] > 0) {
        const less = Math.round(((f[key] / old[key]) * 2)) / 2;
        const left = Math.max(0, Math.round((old.quantity - less) * 2) / 2);
        next = next.map((i) => (i.food_id === old.food_id ? { ...i, quantity: left } : i));
        toast.success(t("swappedFor", { food: foodName(f), old: foodName(old), n: num(old.quantity - left, 1) }));
      }
      return next;
    });
  };

  // Daily vitamin & mineral needs for this client (and which ones their blood test shows low).
  const [microInfo, setMicroInfo] = useState(null);
  useEffect(() => {
    API.get(`/nutrition/clients/${clientId}/micro-needs/`).then((r) => setMicroInfo(r.data)).catch(() => {});
  }, [clientId]);

  // ---------------------------------------------------------------- load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ov, fd, cm] = await Promise.all([
          API.get(`/nutrition/clients/${clientId}/overview/`), cachedGet("/nutrition/foods/"), API.get("/nutrition/foods/common/"),
        ]);
        if (cancelled) return;
        setOverview(ov.data);
        setFoods(fd.data);
        const byId = Object.fromEntries(fd.data.map((f) => [f.id, f]));
        const excluded = new Set((ov.data.excluded_foods || []).map((f) => f.id));
        const commonIds = COLS.flatMap((c) => cm.data[c] || []).filter((id) => byId[id] && !excluded.has(id));
        const commons = commonIds.map((id) => foodToItem(byId[id], { common: true }));
        if (editing) {
          const [plan, tags] = await Promise.all([API.get(`/nutrition/plan/${planId}/`), API.get("/nutrition/tags/")]);
          const tagName = Object.fromEntries(tags.data.map((tg) => [tg.id, tg.name]));
          const loaded = plan.data.items.map((i) => {
            const food = byId[i.food_id] || {};
            const meals = (i.tag_ids || []).map((id) => tagName[id]).filter(Boolean);
            const shares = Object.fromEntries(Object.entries(i.meal_shares || {}).map(([id, v]) => [tagName[id], v]).filter(([k]) => k));
            return foodToItem(food, { quantity: i.quantity, meals, shares, common: commonIds.includes(food.id) });
          });
          const loadedIds = new Set(loaded.map((i) => i.food_id));
          setItems([...loaded, ...commons.filter((c) => !loadedIds.has(c.food_id))]);
          setName(plan.data.name);
          const used = new Set(loaded.flatMap((i) => i.meals));
          let saved = plan.data.meal_slots || [];
          if (!saved.length) {
            const mains = [5, 4, 3, 2].find((n) => used.has(`meal${n}`)) || 3;
            saved = makeSlots(mains, [...used].some((m) => m.startsWith("snack")) || !used.size, t);
          }
          // Find the standard pattern (n meals, with or without snacks); anything else is an extra meal.
          const keys = new Set(saved.map((s) => s.key));
          const snacks = saved.some((s) => s.key.startsWith("snack"));
          const n = [5, 4, 3, 2].find((c) => makeSlots(c, snacks, t).every((x) => keys.has(x.key))) || 2;
          const pattern = new Set(makeSlots(n, snacks, t).map((x) => x.key));
          setMainMeals(n);
          setWithSnacks(snacks);
          setSlots(saved.map((s) => ({ ...s, extra: !pattern.has(s.key) })));
        } else {
          setItems(commons);
          setName(t("defaultPlanName", { date: fmtDate(new Date()) }));
          setSlots(makeSlots(3, true, t));
        }
      } catch {
        toast.error(t("error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, planId]);

  const client = overview?.client;
  const targets = useMemo(() => ({
    protein: client?.target_protein || 0, carb: client?.target_carb || 0, fat: client?.target_fat || 0, kcal: client?.target_calories || 0,
  }), [client]);
  const totals = useMemo(() => totalsOf(items), [items]);
  const excludedIds = useMemo(() => new Set((overview?.excluded_foods || []).map((f) => f.id)), [overview]);
  const slotKeys = slots.map((s) => s.key);
  const active = items.filter((i) => i.quantity > 0);

  // ------------------------------------------------------------ actions
  const updateItem = (foodId, patch) => setItems((list) => list.map((i) => (i.food_id === foodId ? { ...i, ...patch } : i)));
  const removeItem = (foodId) => setItems((list) => list.filter((i) => i.food_id !== foodId));
  const addFood = (food) => setItems((list) => (list.some((i) => i.food_id === food.id) ? list : [...list, foodToItem(food, { quantity: 0 })]));

  const fit = useCallback(async () => {
    const list = items.filter((i) => i.quantity > 0);
    if (!list.length) return;
    setBusy("fit");
    try {
      const r = await API.post(`/nutrition/clients/${clientId}/fit-servings/`, { items: list.map((i) => ({ food_id: i.food_id, quantity: i.quantity })) });
      const q = Object.fromEntries(r.data.items.map((i) => [i.food_id, i.quantity]));
      setItems((all) => all.map((i) => (q[i.food_id] !== undefined ? { ...i, quantity: q[i.food_id] } : i)));
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy("");
    }
  }, [clientId, items, t]);

  const mergeWithCommons = (list) => {
    const ids = new Set(list.map((i) => i.food_id));
    return [...list, ...items.filter((i) => i.common && !ids.has(i.food_id)).map((i) => ({ ...i, quantity: 0, meals: [], shares: {} }))];
  };

  const openTemplates = async () => {
    setTemplateOpen(true);
    if (!templates) setTemplates((await API.get("/nutrition/templates/")).data);
  };
  const applyTemplate = async (tpl) => {
    setTemplateOpen(false);
    setBusy("template");
    try {
      const r = await API.get(`/nutrition/templates/${tpl.id}/apply/${clientId}/`);
      const list = r.data.items.map((i) => foodToItem({ ...i, id: i.food_id }, { quantity: i.quantity, meals: i.meals || [], shares: i.shares || {} }));
      if (r.data.removed?.length) toast(t("removedExcluded", { foods: r.data.removed.join("، ") }), { icon: "⚠️" });
      setItems(mergeWithCommons(list));
      setName(tplName(tpl, lang));
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy("");
    }
  };
  const runAIDraft = async () => {
    if (aiBlocker) { toast(aiBlocker); return; }
    setBusy("ai");
    try {
      const r = await API.post(`/nutrition/ai/clients/${clientId}/draft-plan/`, { meals: mainMeals, language: lang });
      setItems(mergeWithCommons(r.data.items.map((i) => foodToItem({ ...i, id: i.food_id }, { quantity: i.quantity, meals: i.meals || [], shares: {} }))));
      setSlots(makeSlots(mainMeals, true, t, slots));
      setWithSnacks(true);
      toast.success(r.data.test_mode ? t("testMode") : t("aiDraft"));
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy("");
    }
  };

  // Meals ----------------------------------------------------------------
  const changeMeals = (n, snacks) => {
    setMainMeals(n);
    setWithSnacks(snacks);
    setSlots((prev) => makeSlots(n, snacks, t, prev));
  };
  const renameSlot = (key, patch) => setSlots((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const addSlot = () => {
    const key = nextExtraKey(slots);
    if (!key) return;
    const last = slots[slots.length - 1]?.time || "20:00";
    const [h, m] = last.split(":").map(Number);
    const time = `${String(Math.min(h + 2, 23)).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
    setSlots((list) => [...list, { key, name: t("nm_extra"), time, extra: true }]);
  };
  const removeSlot = (key) => {
    setSlots((list) => list.filter((s) => s.key !== key));
    setItems((list) => list.map((i) => ({ ...i, meals: i.meals.filter((m) => m !== key) })));
  };
  const autoSplit = () => {
    const mains = slotKeys.filter((k) => k.startsWith("meal"));
    const snacks = slotKeys.filter((k) => k.startsWith("snack"));
    setItems((list) => list.map((i) => {
      if (!(i.quantity > 0)) return i;
      const fruit = i.food_type === "carb" && i.multiplying_factor === 1 && snacks.length;
      return { ...i, meals: fruit ? snacks.slice(0, Math.max(1, Math.min(snacks.length, i.quantity))) : mains, shares: {} };
    }));
  };

  // amounts per meal for one item (real units)
  const mealAmounts = (i) => {
    const meals = i.meals.filter((m) => slotKeys.includes(m));
    const raw = meals.map((m) => Math.max(Number(i.shares?.[m]) || 0, 0));
    const sum = raw.reduce((a, b) => a + b, 0);
    return Object.fromEntries(meals.map((m, idx) => [m, (sum > 0 ? raw[idx] / sum : 1 / meals.length)]));
  };
  const setMealAmount = (i, meal, amount) => {
    const total = amountOf(i, i.quantity);
    const fractions = mealAmounts(i);
    const a = Math.min(Math.max(amount, 0), total);
    const others = Object.keys(fractions).filter((m) => m !== meal);
    const restBefore = others.reduce((s, m) => s + fractions[m], 0);
    const shares = { [meal]: a };
    others.forEach((m) => { shares[m] = restBefore > 0 ? ((total - a) * fractions[m]) / restBefore : (total - a) / others.length; });
    updateItem(i.food_id, { shares });
  };

  const save = async () => {
    const payload = active.map((i) => ({
      id: i.food_id, quantity: i.quantity, category: COLS.includes(i.food_type) ? i.food_type : colOf(i),
      meals: i.meals.filter((m) => slotKeys.includes(m)),
      shares: Object.fromEntries(Object.entries(i.shares || {}).filter(([m]) => i.meals.includes(m) && slotKeys.includes(m))),
    }));
    const meal_slots = slots.map(({ key, name: n, time }) => ({ key, name: n, time }));
    setBusy("save");
    try {
      let id = planId;
      if (editing) await API.put(`/nutrition/plan/${planId}/replace/`, { name, items: payload, meal_slots });
      else id = (await API.post(`/nutrition/plan/custom/${clientId}/`, { name, items: payload, meal_slots })).data.plan_id;
      toast.success(t("planSaved"));
      navigate(`/dashboard/plans/${id}`);
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy("");
    }
  };

  // ------------------------------------------------------------- render
  if (loading) return <Spinner label={t("loading")} />;
  if (!client) return <Empty>{t("error")}</Empty>;

  const mealKcal = Object.fromEntries(slots.map((s) => [s.key, 0]));
  active.forEach((i) => {
    const fr = mealAmounts(i);
    Object.entries(fr).forEach(([m, f]) => { mealKcal[m] += kcalOf(i) * i.quantity * f; });
  });
  const maxMealKcal = Math.max(1, ...Object.values(mealKcal));
  const unassigned = active.filter((i) => !i.meals.some((m) => slotKeys.includes(m)));

  const header = (
    <>
      <Link to={`/dashboard/clients/${clientId}?tab=plans`} className="mb-1 inline-block text-sm text-muted hover:text-brand">← {client.name}</Link>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">{step === 0 ? t(editing ? "editBuilderTitle" : "builderTitle", { name: client.name }) : t("stMeals")}</h1>
        {step === 0 ? (
          <>
            <button type="button" className="btn-secondary" onClick={openTemplates} disabled={busy === "template"}><LayoutGrid className="h-4 w-4" />{t("fromTemplate")}</button>
            <button type="button" className="btn-ai" onClick={runAIDraft} disabled={busy === "ai"} title={aiBlocker || ""}>
              <Sparkles className="h-4 w-4" />{busy === "ai" ? t("aiThinking") : t("aiDraftBtn")}
            </button>
          </>
        ) : (
          <button type="button" className="btn-secondary" onClick={autoSplit}><Shuffle className="h-4 w-4" />{t("autoSplit")}</button>
        )}
      </div>
    </>
  );

  return (
    <>
      {header}
      {overview.safety_flags?.length > 0 && step === 0 && (
        <div className="card mb-4 border-warn/30 bg-warn-soft p-4">
          <div className="mb-2 text-sm font-bold text-warn">{t("safetyTitle")}</div>
          <SafetyFlags flags={overview.safety_flags} />
        </div>
      )}

      {step === 0 && (
        <>
          <div className="card mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
            <StepsBar current={0} className="min-w-0 flex-1" />
            <div className="flex items-center gap-3">
              <div className="w-44 leading-tight">
                <div className="flex items-baseline gap-1"><span className="text-[11.5px] text-muted">{t("totalCalories")}</span>
                  <span className="num ms-auto text-lg font-bold">{num(totals.kcal)}</span><span className="num text-xs text-muted">/ {num(targets.kcal)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#edf0ee]">
                  <i className={`block h-full rounded-full ${BAR[targetStatus(totals.kcal, targets.kcal)]}`} style={{ width: `${targets.kcal ? Math.min(totals.kcal / targets.kcal, 1) * 100 : 0}%` }} />
                </div>
              </div>
              <button type="button" className="btn border-[#c5e8d6] bg-ok-soft px-3 py-2 text-[#1d7a52]" onClick={fit} disabled={busy === "fit" || !active.length}>
                <Target className="h-4 w-4" />{busy === "fit" ? t("loading") : t("fitToTarget")}
              </button>
            </div>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            {COLS.map((col) => {
              const rows = items.filter((i) => colOf(i) === col);
              const v = totals[col];
              const tg = targets[col];
              const s = targetStatus(v, tg);
              const used = new Set(items.map((i) => i.food_id));
              const options = foods.filter((f) => colOf(f) === col && !used.has(f.id) && !excludedIds.has(f.id));
              const diff = Math.round((v - tg) * 10) / 10;
              return (
                <section key={col} className="card">
                  <header className={`rounded-t-2xl border-b border-line px-4 py-3 ${HEAD[col]}`}>
                    <div className="flex items-center gap-2">
                      <i className={`h-2.5 w-2.5 rounded-[3px] ${DOT[col]}`} /><h3 className="text-base font-bold">{t(col === "carb" ? "carbs" : col)}</h3>
                      <span className="num ms-auto text-sm"><b className="text-lg text-brand-ink">{num(v, 1)}</b><span className="text-muted"> / {num(tg)} {t("g")}</span></span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILL[s]}`}>{s === "on" ? "✓" : diff >= 0 ? `+${num(Math.round(diff))}` : `−${num(Math.round(-diff))}`}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70"><i className={`block h-full rounded-full ${BAR[s]}`} style={{ width: `${tg ? Math.min(v / tg, 1) * 100 : 0}%` }} /></div>
                  </header>
                  <table className="w-full table-fixed border-collapse text-sm">
                    <colgroup><col style={{ width: "44%" }} /><col style={{ width: "31%" }} /><col style={{ width: "19%" }} /><col style={{ width: "6%" }} /></colgroup>
                    <thead><tr className="text-start text-[11.5px] text-muted">
                      <th className="ps-4 pt-2.5 pb-1 text-start font-semibold">{t("colFood")}</th>
                      <th className="pt-2.5 pb-1 text-start font-semibold">{t("colServings")}</th><th className="pt-2.5 pb-1 text-start font-semibold">{t("colAmount")}</th><th />
                    </tr></thead>
                    <tbody>
                      {rows.map((i) => (
                        <tr key={i.food_id} className="border-t border-[#f0f2f0]">
                          <td className={`h-[50px] ps-4 pe-1.5 font-semibold leading-tight ${i.quantity > 0 ? "" : "text-muted"}`}>
                            {foodName(i)}{i.recipe && (
                              <button type="button" className="ms-1.5 align-middle text-brand hover:text-brand-ink" onClick={() => setRecipeFor(i.food_id)} title={t("viewRecipe")} aria-label={t("viewRecipe")}>
                                <BookOpen className="inline h-3.5 w-3.5" />
                              </button>
                            )}{!i.common && <span className="ms-1.5 rounded-full bg-page px-1.5 py-px align-middle text-[10.5px] font-semibold text-muted">{t("addedTag")}</span>}
                            <span className="num block text-[11px] font-normal text-muted">1 = {amountOf(i, 1)} {unitLabel(i, lang)}</span>
                          </td>
                          <td className="px-1.5"><Stepper value={i.quantity} onChange={(q) => updateItem(i.food_id, { quantity: q })} /></td>
                          <td className={`num whitespace-nowrap px-1.5 text-[13px] font-bold ${i.quantity > 0 ? "text-brand" : "font-medium text-[#c3c9c6]"}`}>
                            {i.quantity > 0 ? `${amountOf(i, i.quantity)} ${unitLabel(i, lang)}` : "—"}
                          </td>
                          <td className="text-center">{!i.common && <button type="button" className="text-[#b9c0bc] hover:text-bad" onClick={() => removeItem(i.food_id)} aria-label={t("delete")}><X className="h-4 w-4" /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 pb-3 pt-2.5"><FoodPicker options={options} others={foods.filter((f) => colOf(f) !== col && !used.has(f.id) && !excludedIds.has(f.id))} onPick={addFood} placeholder={t(`addAnother_${col}`)} /></div>
                </section>
              );
            })}
          </div>
          {microInfo && (
            <div className="mt-4">
              <MicrosPanel collapsible {...microRows(items, foods, microInfo.needs, microInfo.nutrients, excludedIds)} bloodLow={microInfo.blood_low}
                swap onAdd={swapIn} />
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex-1"><InfoTip text={t("builderHint")} /></div>
            <button type="button" className="btn-primary h-11" disabled={!active.length} onClick={() => setStep(1)}>{t("nextSplit")}</button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <StepsBar current={1} className="mb-4" />
          <div className="card mb-4 flex flex-wrap items-center gap-4 px-5 py-3.5">
            <b>{t("mealsLbl")}</b>
            <div className="inline-grid grid-flow-col overflow-hidden rounded-xl border border-line">
              {[2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => changeMeals(n, withSnacks)}
                  className={`h-9 w-10 border-s border-line font-semibold first:border-s-0 ${mainMeals === n ? "bg-brand text-white" : "bg-white"}`}>{n}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 font-semibold">
              <button type="button" role="switch" aria-checked={withSnacks} onClick={() => changeMeals(mainMeals, !withSnacks)}
                className={`relative h-5 w-9 rounded-full transition ${withSnacks ? "bg-brand" : "bg-[#cfd5d2]"}`}>
                <i className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${withSnacks ? "end-0.5" : "start-0.5"}`} />
              </button>
              {t("withSnacksLbl")}
            </label>
            <div className="flex min-w-[220px] flex-1 items-center gap-2">
              <span className="text-sm text-muted">{t("planNameLbl")}</span>
              <input className="input h-9 flex-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <span className="num font-bold">{num(totals.kcal)} <small className="font-medium text-muted">{t("kcalPerDay")}</small></span>
          </div>

          <div className="card mb-4 px-5 py-3">
            <button type="button" className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-start" onClick={() => setNamesOpen((o) => !o)} aria-expanded={namesOpen}>
              <span className="text-[13px] font-semibold text-muted">{t("mealNamesShort")}</span>
              {!namesOpen && slots.map((s) => (
                <span key={s.key} className="text-[13px]"><b>{s.name}</b>{s.time && <span className="num text-muted"> {s.time}</span>}</span>
              ))}
              <span className="ms-auto inline-flex items-center gap-1 text-xs font-semibold text-brand">
                {namesOpen ? t("doneEditing") : <><Pencil className="h-3.5 w-3.5" />{t("editMealNames")}</>}
                <ChevronDown className={`h-4 w-4 transition ${namesOpen ? "rotate-180" : ""}`} />
              </span>
            </button>
            {namesOpen && (
            <>
            <p className="mb-3 mt-2 text-xs text-muted">{t("mealNamesTitle")}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {slots.map((s) => (
                <div key={s.key}>
                  <div className="mb-1 flex items-center text-[11.5px] font-semibold text-muted">
                    {s.key.startsWith("meal") ? t("mealKey_meal", { n: s.key.slice(4) }) : t("mealKey_snack", { n: s.key.slice(5) })}
                    {s.extra && <button type="button" className="ms-auto hover:text-bad" onClick={() => removeSlot(s.key)} aria-label={t("removeMeal")}><X className="h-3.5 w-3.5" /></button>}
                  </div>
                  <div className="flex h-10 items-center rounded-xl border border-line bg-white px-3 focus-within:border-brand">
                    <input className="w-full min-w-0 bg-transparent text-sm font-bold outline-none" value={s.name} maxLength={40} onChange={(e) => renameSlot(s.key, { name: e.target.value })} />
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-muted" />
                  </div>
                  <input type="time" className="num mt-1.5 w-full bg-transparent text-xs text-muted outline-none" value={s.time || ""} onChange={(e) => renameSlot(s.key, { time: e.target.value })} />
                </div>
              ))}
              <div>
                <div className="mb-1 text-[11.5px]">&nbsp;</div>
                <button type="button" className="flex h-10 w-full items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#b9c3be] bg-[#fbfdfc] text-sm font-bold text-brand disabled:opacity-40"
                  onClick={addSlot} disabled={!nextExtraKey(slots)}>{t("addAMeal")}</button>
                <div className="mt-1.5 text-xs text-muted">{t("addMealHint")}</div>
              </div>
            </div>
            </>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-line px-5 py-3 text-[13px] text-muted">
              <span className="inline-flex items-center gap-2"><i className="grid h-[22px] w-[26px] place-items-center rounded-md border-[1.5px] border-dashed border-[#d4dad7] not-italic text-[#b3bbb7]">+</i>{t("gridHintAdd")}</span>
              <span className="inline-flex items-center gap-2"><i className="grid h-[22px] w-[26px] place-items-center rounded-md border-[1.5px] border-[#9fd0bd] bg-[#d7ebe4]"><Check className="h-3 w-3 text-brand" /></i>{t("gridHintRemove")}</span>
              <span>{t("gridHintAmount")}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-sm" style={{ minWidth: 300 + slots.length * 120 }}>
                <thead>
                  <tr className="text-[12px] text-muted">
                    <th className="sticky start-0 z-10 w-[190px] border-b border-line bg-[#fafbfa] px-5 py-3 text-start font-semibold">{t("colFood")}</th>
                    <th className="w-[90px] border-b border-line bg-[#fafbfa] px-2 py-3 text-center font-semibold">{t("perDay")}</th>
                    {slots.map((s) => (
                      <th key={s.key} className="border-b border-line bg-[#fafbfa] px-2 py-3 text-center font-semibold">
                        <span className="block truncate text-[13.5px] font-bold text-brand-ink">{s.name}</span>
                        <span className="num">{s.time || " "}</span>
                      </th>
                    ))}
                    <th className="w-[84px] border-b border-line bg-[#fafbfa]" />
                  </tr>
                </thead>
                <tbody>
                  {COLS.map((col) => {
                    const rows = active.filter((i) => colOf(i) === col);
                    if (!rows.length) return null;
                    return [
                      <tr key={`g-${col}`}>
                        <td className={`sticky start-0 z-10 h-9 px-5 text-[13px] font-bold ${HEAD[col]}`}><i className={`me-2 inline-block h-2.5 w-2.5 rounded-[3px] ${DOT[col]}`} />{t(col === "carb" ? "carbs" : col)}</td>
                        <td colSpan={slots.length + 2} className={HEAD[col]} />
                      </tr>,
                      ...rows.map((i) => {
                        const fr = mealAmounts(i);
                        const meals = Object.keys(fr);
                        const total = amountOf(i, i.quantity);
                        const custom = meals.length > 1 && Object.keys(i.shares || {}).some((m) => meals.includes(m));
                        const missing = !meals.length;
                        const toggle = (m) => updateItem(i.food_id, {
                          meals: meals.includes(m) ? i.meals.filter((x) => x !== m) : [...i.meals.filter((x) => slotKeys.includes(x)), m],
                          shares: {},
                        });
                        return (
                          <tr key={i.food_id}>
                            <td className={`sticky start-0 z-10 h-[52px] border-b border-[#f0f2f0] px-5 font-semibold ${missing ? "bg-bad-soft text-bad" : "bg-white"}`}>{foodName(i)}</td>
                            <td className="num border-b border-[#f0f2f0] px-2 text-center text-[13px] font-bold text-brand">{total} {unitLabel(i, lang)}</td>
                            {slots.map((s) => {
                              const on = meals.includes(s.key);
                              const amount = on ? niceAmount(total * fr[s.key], i.multiplying_factor) : null;
                              const isEditing = editAmount?.food_id === i.food_id && editAmount?.meal === s.key;
                              return (
                                <td key={s.key} className={`border-b border-[#f0f2f0] px-1.5 py-1.5 text-center ${s.key.startsWith("snack") ? "bg-[#fbfcfb]" : ""}`}>
                                  {on ? (
                                    <div role="button" tabIndex={0} onClick={() => !isEditing && toggle(s.key)} onKeyDown={(e) => e.key === "Enter" && !isEditing && toggle(s.key)} title={t("gridHintRemove")}
                                      className="mx-auto flex h-9 w-full max-w-[118px] cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-[#9fd0bd] bg-[#d7ebe4] px-1.5 text-[13px] font-bold text-[#124a3c]">
                                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[5px] bg-brand text-white"><Check className="h-3 w-3" /></span>
                                      {isEditing ? (
                                        <input autoFocus className="num w-12 rounded bg-white px-1 text-center outline-none" type="number" step="any" defaultValue={amount}
                                          onClick={(e) => e.stopPropagation()}
                                          onBlur={(e) => { setMealAmount(i, s.key, Number(e.target.value)); setEditAmount(null); }}
                                          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditAmount(null); }} />
                                      ) : meals.length > 1 ? (
                                        <button type="button" className="num underline decoration-dotted underline-offset-2" title={t("clickToEditAmount")}
                                          onClick={(e) => { e.stopPropagation(); setEditAmount({ food_id: i.food_id, meal: s.key }); }}>{amount}</button>
                                      ) : <span className="num">{amount}</span>}
                                      <span className="truncate text-[12px] font-semibold">{unitLabel(i, lang)}</span>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => toggle(s.key)} aria-label={`${t("gridHintAdd")}: ${s.name}`}
                                      className="mx-auto grid h-9 w-full max-w-[118px] place-items-center rounded-[10px] border-[1.5px] border-dashed border-[#d4dad7] text-lg text-[#b3bbb7] transition hover:border-brand/50 hover:bg-brand-soft hover:text-brand">+</button>
                                  )}
                                </td>
                              );
                            })}
                            <td className="border-b border-[#f0f2f0] px-2 text-center">
                              {custom ? (
                                <button type="button" onClick={() => updateItem(i.food_id, { shares: {} })} title={t("backToEqual")}
                                  className="whitespace-nowrap rounded-full bg-ai-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-ai">{t("modeCustom")} ↺</button>
                              ) : missing ? <span className="whitespace-nowrap text-[11.5px] font-semibold text-bad">{t("notInMealYet")}</span> : null}
                            </td>
                          </tr>
                        );
                      }),
                    ];
                  })}
                  <tr>
                    <td className="sticky start-0 z-10 h-16 bg-[#fafbfa] px-5 font-bold">{t("kcalPerMeal")}</td>
                    <td className="num bg-[#fafbfa] px-2 text-center text-xs text-muted">{num(Object.values(mealKcal).reduce((a, b) => a + b, 0))} {t("kcal")}</td>
                    {slots.map((s) => (
                      <td key={s.key} className="bg-[#fafbfa] px-2 text-center">
                        <div className="num text-xl font-bold">{num(mealKcal[s.key])} <small className="text-[11px] font-medium text-muted">{t("kcal")}</small></div>
                        <div className="mx-auto mt-1 h-[5px] max-w-[100px] overflow-hidden rounded-full bg-[#edf0ee]"><i className="block h-full rounded-full bg-ok" style={{ width: `${(mealKcal[s.key] / maxMealKcal) * 100}%` }} /></div>
                      </td>
                    ))}
                    <td className="bg-[#fafbfa]" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {unassigned.length > 0 && (
            <div className="mt-3 rounded-xl bg-warn-soft px-4 py-2.5 text-[13px] font-medium text-[#7a5418]">⚠ {t("notInMealWarn", { foods: unassigned.map((i) => foodName(i)).join("، ") })}</div>
          )}
          <div className="mt-5 flex justify-between">
            <button type="button" className="btn-secondary h-11" onClick={() => setStep(0)}>{lang === "ar" ? "→" : "←"} {t("back")}</button>
            <button type="button" className="btn-primary h-11" disabled={busy === "save" || !active.length} onClick={save}>{busy === "save" ? t("saving") : t("saveViewSheet")}</button>
          </div>
        </>
      )}

      <Modal open={templateOpen} onClose={() => setTemplateOpen(false)} title={t("chooseTemplate")} wide>
        {!templates ? <Spinner label={t("loading")} /> : !templates.length ? <Empty>{t("noTemplates")}</Empty> : (
          <ul className="divide-y divide-line">
            {templates.map((tpl) => (
              <li key={tpl.id}>
                <button type="button" className="flex w-full items-center gap-3 px-1 py-3 text-start hover:bg-page" onClick={() => applyTemplate(tpl)}>
                  <Copy className="h-4 w-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{tplName(tpl, lang)}</span>
                    {tplDesc(tpl, lang) && <span className="block truncate text-xs text-muted">{tplDesc(tpl, lang)}</span>}
                  </span>
                  {tpl.is_draft && <DraftBadge />}
                  <span className="text-xs text-muted">{t("foodsCount", { n: tpl.items.length })}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <RecipeModal foodId={recipeFor} onClose={closeRecipe} />
    </>
  );
}
