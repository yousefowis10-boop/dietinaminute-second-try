import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Copy, LayoutGrid, Minus, Plus, Search, Sparkles, Target, Trash2, X } from "lucide-react";
import API from "../hooks/useApi";
import { MEAL_ORDER, mealSlots, useI18n } from "../i18n";
import {
  AIBadge, Card, CalorieRing, DraftBadge, Empty, MacroBar, Modal, SafetyFlags, Spinner, StatusPill, StepBar,
  TestModeBadge, apiError,
} from "../ui";
import { AIUnavailableNote, useAIBlocker } from "./client/AIPanel";
import { amountOf, kcalOf, roundHalf, sharesFor, totalsOf, tplDesc, tplName, unitLabel } from "./foodUtils";

const TYPES = ["protein", "carb", "fat", "mixed"];

function foodToItem(food, extra = {}) {
  return {
    food_id: food.id, name: food.name, name_ar: food.name_ar, unit: food.unit, unit_ar: food.unit_ar,
    protein: food.protein, carb: food.carb, fat: food.fat, food_type: food.food_type,
    multiplying_factor: food.multiplying_factor || 1, quantity: 1, meals: [], shares: {}, ...extra,
  };
}

function ServingStepper({ value, onChange }) {
  return (
    <div className="flex items-center rounded-lg border border-line bg-white">
      <button type="button" className="px-2 py-1.5 text-muted hover:text-brand" onClick={() => onChange(roundHalf(value - 0.5))} aria-label="-"><Minus className="h-3.5 w-3.5" /></button>
      <input
        className="num w-12 bg-transparent text-center text-sm font-semibold outline-none" inputMode="decimal" value={value}
        onChange={(e) => { const v = parseFloat(e.target.value); onChange(Number.isNaN(v) ? 0 : Math.max(v, 0)); }}
      />
      <button type="button" className="px-2 py-1.5 text-muted hover:text-brand" onClick={() => onChange(roundHalf(value + 0.5))} aria-label="+"><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}

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
  const [step, setStep] = useState(editing ? 1 : 0);
  const [query, setQuery] = useState("");
  const [mainMeals, setMainMeals] = useState(3);
  const [withSnacks, setWithSnacks] = useState(true);
  const [templates, setTemplates] = useState(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------- load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ov, fd] = await Promise.all([
          API.get(`/nutrition/clients/${clientId}/overview/`),
          API.get("/nutrition/foods/"),
        ]);
        if (cancelled) return;
        setOverview(ov.data);
        setFoods(fd.data);
        if (editing) {
          const [plan, tags] = await Promise.all([API.get(`/nutrition/plan/${planId}/`), API.get("/nutrition/tags/")]);
          const tagName = Object.fromEntries(tags.data.map((tg) => [tg.id, tg.name]));
          const byId = Object.fromEntries(fd.data.map((f) => [f.id, f]));
          const loaded = plan.data.items.map((i) => {
            const food = byId[i.food_id] || {};
            const meals = (i.tag_ids || []).map((id) => tagName[id]).filter(Boolean).sort((a, b) => MEAL_ORDER.indexOf(a) - MEAL_ORDER.indexOf(b));
            const shares = Object.fromEntries(Object.entries(i.meal_shares || {}).map(([id, v]) => [tagName[id], v]).filter(([k]) => k));
            return foodToItem(food, { quantity: i.quantity, meals, shares, food_type: i.food_type || food.food_type });
          });
          setItems(loaded);
          setName(plan.data.name);
          const used = new Set(loaded.flatMap((i) => i.meals));
          const mains = ["meal4", "meal3", "meal2"].find((m) => used.has(m));
          if (mains) setMainMeals(Number(mains.slice(-1)));
          setWithSnacks([...used].some((m) => m.startsWith("snack")) || !used.size);
        } else {
          setName(t("defaultPlanName", { date: fmtDate(new Date()) }));
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
  const slots = useMemo(() => mealSlots(mainMeals, withSnacks), [mainMeals, withSnacks]);

  // ------------------------------------------------------------ actions
  const updateItem = (foodId, patch) => setItems((list) => list.map((i) => (i.food_id === foodId ? { ...i, ...patch } : i)));
  const removeItem = (foodId) => setItems((list) => list.filter((i) => i.food_id !== foodId));
  const addFood = (food) => {
    if (items.some((i) => i.food_id === food.id)) return;
    setItems((list) => [...list, foodToItem(food)]);
    setQuery("");
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const used = new Set(items.map((i) => i.food_id));
    return foods.filter((f) => !used.has(f.id) && !excludedIds.has(f.id)
      && ((f.name || "").toLowerCase().includes(q) || (f.name_ar || "").includes(q))).slice(0, 8);
  }, [query, foods, items, excludedIds]);

  const fit = useCallback(async (list = items, quiet = false) => {
    if (!list.length) return list;
    setBusy("fit");
    try {
      const r = await API.post(`/nutrition/clients/${clientId}/fit-servings/`, {
        items: list.map((i) => ({ food_id: i.food_id, quantity: i.quantity || 1 })),
      });
      const q = Object.fromEntries(r.data.items.map((i) => [i.food_id, i.quantity]));
      const next = list.map((i) => ({ ...i, quantity: q[i.food_id] ?? i.quantity }));
      setItems(next);
      return next;
    } catch (err) {
      if (!quiet) toast.error(apiError(err, t));
      return list;
    } finally {
      setBusy("");
    }
  }, [clientId, items, t]);

  const openTemplates = async () => {
    setTemplateOpen(true);
    if (!templates) {
      const r = await API.get("/nutrition/templates/");
      setTemplates(r.data);
    }
  };

  const applyTemplate = async (tpl) => {
    setTemplateOpen(false);
    setBusy("template");
    try {
      const r = await API.get(`/nutrition/templates/${tpl.id}/apply/${clientId}/`);
      const list = r.data.items.map((i) => foodToItem({ ...i, id: i.food_id }, {
        quantity: i.quantity, meals: i.meals || [], shares: i.shares || {},
      }));
      if (r.data.removed?.length) toast(t("removedExcluded", { foods: r.data.removed.join("، ") }), { icon: "⚠️" });
      setItems(list);
      setStep(1);
      if (tpl.is_shared) await fit(list, true); // library templates start generic: fit them to this client
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy("");
    }
  };

  const runAIDraft = async () => {
    setBusy("ai");
    try {
      const r = await API.post(`/nutrition/ai/clients/${clientId}/draft-plan/`, { meals: mainMeals, language: lang });
      setItems(r.data.items.map((i) => foodToItem({ ...i, id: i.food_id }, { quantity: i.quantity, meals: i.meals || [], shares: {} })));
      setAiDraft(r.data);
      setStep(1);
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    const payload = items.filter((i) => i.quantity > 0).map((i) => ({
      id: i.food_id, quantity: i.quantity, category: ["protein", "carb", "fat"].includes(i.food_type) ? i.food_type : "carb",
      meals: i.meals.filter((m) => slots.includes(m)),
      shares: Object.fromEntries(Object.entries(i.shares || {}).filter(([m]) => i.meals.includes(m) && slots.includes(m))),
    }));
    setBusy("save");
    try {
      let id = planId;
      if (editing) await API.put(`/nutrition/plan/${planId}/replace/`, { name, items: payload });
      else id = (await API.post(`/nutrition/plan/custom/${clientId}/`, { name, items: payload })).data.plan_id;
      toast.success(t("planSaved"));
      navigate(`/dashboard/plans/${id}`);
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy("");
    }
  };

  // When moving to meals, give every food without a meal a sensible default.
  const goToMeals = () => {
    setItems((list) => list.map((i) => {
      const valid = i.meals.filter((m) => slots.includes(m));
      return { ...i, meals: valid.length ? valid : [slots.filter((s) => s.startsWith("meal"))[0]] };
    }));
    setStep(2);
  };

  // ------------------------------------------------------------- render
  if (loading) return <Spinner label={t("loading")} />;
  if (!client) return <Empty>{t("error")}</Empty>;

  const steps = [t("startFrom"), t("stepServings"), t("stepMeals")];
  const summary = (
    <Card title={t("dailyTotal")}>
      <div className="flex items-center gap-5">
        <CalorieRing value={totals.kcal} target={targets.kcal} />
        <div className="space-y-2">
          <StatusPill totals={totals} targets={targets} />
          <p className="text-xs leading-relaxed text-muted">{t("fitHint")}</p>
        </div>
      </div>
      <MacroBar label={t("protein")} value={totals.protein} target={targets.protein} />
      <MacroBar label={t("carbs")} value={totals.carb} target={targets.carb} />
      <MacroBar label={t("fat")} value={totals.fat} target={targets.fat} />
      {step === 1 && (
        <button type="button" className="btn-secondary mt-4 w-full" disabled={!items.length || busy === "fit"} onClick={() => fit()}>
          <Target className="h-4 w-4" />{busy === "fit" ? t("loading") : t("fitTargets")}
        </button>
      )}
    </Card>
  );

  return (
    <>
      <Link to={`/dashboard/clients/${clientId}?tab=plans`} className="mb-2 inline-block text-sm text-muted hover:text-brand">← {client.name}</Link>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">{t(editing ? "editBuilderTitle" : "builderTitle", { name: client.name })}</h1>
        {step === 1 && <button type="button" className="btn-primary" disabled={!items.length} onClick={goToMeals}>{t("continueMeals")}</button>}
        {step === 2 && (
          <>
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>{t("back")}</button>
            <button type="button" className="btn-primary" disabled={busy === "save" || !items.length} onClick={save}>{busy === "save" ? t("saving") : t("savePlan")}</button>
          </>
        )}
      </div>
      <StepBar steps={steps} current={step} />

      {/* ---------------------------------------------------- step 0: start */}
      {step === 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <button type="button" className="card p-6 text-start transition hover:border-brand" onClick={() => setStep(1)}>
            <Plus className="mb-3 h-6 w-6 text-brand" />
            <div className="font-bold">{t("startEmpty")}</div>
            <p className="mt-1 text-sm text-muted">{t("startEmptyHint")}</p>
          </button>
          <button type="button" className="card p-6 text-start transition hover:border-brand" onClick={openTemplates}>
            <LayoutGrid className="mb-3 h-6 w-6 text-brand" />
            <div className="font-bold">{t("startTemplate")}</div>
            <p className="mt-1 text-sm text-muted">{t("startTemplateHint")}</p>
          </button>
          <div className="card border-ai/25 bg-gradient-to-b from-ai-soft/70 to-white p-6">
            <Sparkles className="mb-3 h-6 w-6 text-ai" />
            <div className="font-bold text-ai">{t("startAI")}</div>
            <p className="mt-1 text-sm text-muted">{t("startAIHint")}</p>
            <div className="mt-4">
              {aiBlocker ? <AIUnavailableNote reason={aiBlocker} /> : (
                <>
                  <div className="mb-3 flex items-center gap-2 text-sm">
                    <span className="text-muted">{t("mealsCount")}</span>
                    {[2, 3, 4].map((n) => (
                      <button key={n} type="button" onClick={() => setMainMeals(n)}
                        className={`h-8 w-8 rounded-lg border text-sm ${mainMeals === n ? "border-ai bg-ai text-white" : "border-line bg-white"}`}>{n}</button>
                    ))}
                  </div>
                  <button type="button" className="btn-ai w-full" disabled={busy === "ai"} onClick={runAIDraft}>
                    <Sparkles className="h-4 w-4" />{busy === "ai" ? t("aiThinking") : t("startAI")}
                  </button>
                </>
              )}
            </div>
          </div>
          {overview.safety_flags.length > 0 && (
            <div className="md:col-span-3">
              <Card tone="warn" title={t("needsReview")}><SafetyFlags flags={overview.safety_flags} /></Card>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------- step 1: servings */}
      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <div className="card p-4">
              <label className="label">{t("planName")}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="input py-2.5 ps-9" placeholder={t("addFood")} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
              {searchResults.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                  {searchResults.map((f) => (
                    <li key={f.id}>
                      <button type="button" className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm hover:bg-page" onClick={() => addFood(f)}>
                        <span className="flex-1">
                          <span className="font-medium">{foodName(f)}</span>
                          <span className="ms-2 text-xs text-muted">{t("servingsOf", { unit: `${amountOf(f, 1)} ${unitLabel(f, lang)}` })}</span>
                        </span>
                        <span className="text-xs text-muted">{t(`type_${f.food_type}`)}</span>
                        <span className="num text-xs text-muted">{num(kcalOf(f))} {t("kcal")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {aiDraft && (
              <Card tone="ai" title={t("aiDraft")} icon={<Sparkles className="h-4 w-4 text-ai" />} actions={aiDraft.test_mode ? <TestModeBadge /> : <AIBadge>AI</AIBadge>}>
                {aiDraft.notes?.filter(Boolean).length > 0 && (
                  <ul className="mb-2 space-y-1 text-sm">{aiDraft.notes.filter(Boolean).map((n) => <li key={n} className="flex gap-2"><span className="text-ai">✓</span>{n}</li>)}</ul>
                )}
                <p className="text-xs text-muted">🔒 {t("aiDraftNote")}</p>
              </Card>
            )}
            {!items.length ? <Empty>{t("noFoodsYet")}</Empty> : TYPES.map((type) => {
              const group = items.filter((i) => (i.food_type || "mixed") === type);
              if (!group.length) return null;
              return (
                <Card key={type} title={t(`type_${type}`)}>
                  <ul className="divide-y divide-line">
                    {group.map((i) => (
                      <li key={i.food_id} className="flex flex-wrap items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="font-medium">{foodName(i)}</div>
                          <div className="text-xs text-muted">
                            {t("servingsOf", { unit: `${amountOf(i, 1)} ${unitLabel(i, lang)}` })} · <b className="text-brand-ink">{amountOf(i, i.quantity)} {unitLabel(i, lang)}</b>
                          </div>
                        </div>
                        <ServingStepper value={i.quantity} onChange={(v) => updateItem(i.food_id, { quantity: v })} />
                        <span className="num w-16 text-end text-sm text-muted">{num(kcalOf(i) * i.quantity)}</span>
                        <button type="button" className="btn-ghost p-1.5 hover:text-bad" onClick={() => removeItem(i.food_id)} aria-label={t("delete")}><Trash2 className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">{summary}</div>
        </div>
      )}

      {/* ---------------------------------------------------- step 2: meals */}
      {step === 2 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Card>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold">{t("mealsCount")}</span>
                {[2, 3, 4].map((n) => (
                  <button key={n} type="button" onClick={() => setMainMeals(n)}
                    className={`h-9 w-9 rounded-lg border ${mainMeals === n ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{n}</button>
                ))}
                <label className="ms-2 flex items-center gap-2"><input type="checkbox" checked={withSnacks} onChange={(e) => setWithSnacks(e.target.checked)} />{t("withSnacks")}</label>
              </div>
            </Card>
            <Card title={t("assignMeals")}>
              <ul className="divide-y divide-line">
                {items.map((i) => {
                  const meals = i.meals.filter((m) => slots.includes(m));
                  const shares = sharesFor({ ...i, meals });
                  const custom = meals.length > 1 && Object.keys(i.shares || {}).some((m) => meals.includes(m));
                  const toggle = (m) => {
                    const next = meals.includes(m) ? meals.filter((x) => x !== m) : [...meals, m].sort((a, b) => MEAL_ORDER.indexOf(a) - MEAL_ORDER.indexOf(b));
                    updateItem(i.food_id, { meals: next });
                  };
                  return (
                    <li key={i.food_id} className="py-3">
                      <div className="mb-2 flex items-baseline gap-2">
                        <span className="font-medium">{foodName(i)}</span>
                        <span className="text-xs text-muted">{amountOf(i, i.quantity)} {unitLabel(i, lang)}</span>
                        {!meals.length && <span className="text-xs font-semibold text-bad">· {t("notInMeal")}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {slots.map((m) => (
                          <button key={m} type="button" onClick={() => toggle(m)}
                            className={`rounded-full border px-3 py-1 text-xs ${meals.includes(m) ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-white text-muted"}`}>
                            {t(m)}{meals.includes(m) && meals.length > 1 ? ` · ${amountOf(i, i.quantity * shares[m])}` : ""}
                          </button>
                        ))}
                      </div>
                      {meals.length > 1 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <button type="button" className={`rounded-md px-2 py-1 ${!custom ? "bg-page font-semibold" : "text-muted"}`} onClick={() => updateItem(i.food_id, { shares: {} })}>{t("splitEqual")}</button>
                          <span className="text-muted">{t("splitCustom")}:</span>
                          {meals.map((m) => (
                            <label key={m} className="flex items-center gap-1">
                              <span className="text-muted">{t(m)}</span>
                              <input className="input num w-14 px-2 py-1 text-xs" type="number" min="0" step="0.5"
                                value={i.shares?.[m] ?? 1}
                                onChange={(e) => updateItem(i.food_id, { shares: { ...Object.fromEntries(meals.map((x) => [x, i.shares?.[x] ?? 1])), [m]: Number(e.target.value) } })} />
                            </label>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card title={t("mealPreview")}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {slots.map((m) => {
                  const rows = items.flatMap((i) => {
                    const meals = i.meals.filter((x) => slots.includes(x));
                    if (!meals.includes(m)) return [];
                    const share = sharesFor({ ...i, meals })[m];
                    return [{ i, share }];
                  });
                  const kcal = rows.reduce((s, r) => s + kcalOf(r.i) * r.i.quantity * r.share, 0);
                  return (
                    <div key={m} className="rounded-xl border border-line p-3">
                      <div className="mb-2 flex items-baseline">
                        <span className="font-bold">{t(m)}</span>
                        <span className="num ms-auto text-xs text-muted">{num(kcal)} {t("kcal")}</span>
                      </div>
                      {rows.length ? (
                        <ul className="space-y-1 text-sm">
                          {rows.map(({ i, share }) => (
                            <li key={i.food_id} className="flex gap-2">
                              <span className="flex-1">{foodName(i)}</span>
                              <span className="num text-muted">{amountOf(i, i.quantity * share)} {unitLabel(i, lang)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-xs text-muted">—</p>}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">{summary}</div>
        </div>
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
        <div className="mt-4 text-end"><button type="button" className="btn-ghost" onClick={() => setTemplateOpen(false)}><X className="h-4 w-4" />{t("close")}</button></div>
      </Modal>
    </>
  );
}
