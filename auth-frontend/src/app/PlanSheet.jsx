import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import html2pdf from "html2pdf.js";
import { Copy, Download, Dumbbell, LayoutGrid, MessageCircle, Pencil, Plus, RefreshCw, ShoppingCart, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import API from "../hooks/useApi";
import { MEAL_ORDER, useI18n } from "../i18n";
import { Card, DraftBadge, Modal, Spinner, TestModeBadge, apiError } from "../ui";
import { AIUnavailableNote, useAIBlocker } from "./client/AIPanel";
import { StepsBar, colOf } from "./PlanBuilder";
import { englishUnit, niceAmount } from "./foodUtils";
import WorkoutSuggestions from "./WorkoutSuggestions";
import WorkoutView from "./WorkoutView";

const enUnit = (row) => englishUnit(row.unit_en, row.unit, row.factor ?? 100);

// Day names starting on Sunday, in the current language.
function dayNames(lang) {
  const base = new Date(2026, 0, 4); // a Sunday
  return Array.from({ length: 7 }, (_, i) => new Date(base.getTime() + i * 86400000).toLocaleDateString(lang === "ar" ? "ar-JO" : "en-GB", { weekday: "long" }));
}

function useSlots(data, t) {
  return useMemo(() => {
    if (!data) return [];
    const saved = data.meal_slots || [];
    const used = new Set(Object.keys(data.meals || {}));
    if (saved.length) return [...saved, ...[...used].filter((k) => !saved.some((s) => s.key === k)).map((k) => ({ key: k, name: t(k), time: "" }))];
    return MEAL_ORDER.filter((m) => used.has(m)).map((m) => ({ key: m, name: t(m), time: "" }));
  }, [data, t]);
}

// Client goal -> workout goal, so matching workouts are listed first.
const GOAL_TO_WORKOUT = { loss: "fat_loss", gain: "muscle_gain", maintain: "general_health" };

export function WorkoutBlock({ workout, allDays = false }) {
  return <WorkoutView workout={workout} allDays={allDays} />;
}

function Grocery({ rows }) {
  const { t, lang, num } = useI18n();
  const ar = lang === "ar";
  return (
    <table className="w-full table-fixed text-sm">
      <colgroup><col style={{ width: "50%" }} /><col style={{ width: "25%" }} /><col style={{ width: "25%" }} /></colgroup>
      <thead><tr className="border-b border-line bg-[#fafbfa] text-xs text-muted">
        <th className="px-3 py-2 text-start font-semibold">{t("colFood")}</th><th className="px-3 py-2 text-start font-semibold">{t("perDayShort")}</th><th className="px-3 py-2 text-start font-semibold">{t("perWeekShort")}</th>
      </tr></thead>
      <tbody>
        {rows.map((g) => (
          <tr key={g.food_en} className="border-b border-[#f0f2f0]">
            <td className="px-3 py-2">☐ {ar ? g.food : g.food_en}</td>
            <td className="num px-3 py-2 text-muted">{num(niceAmount(g.per_day, g.factor), 1)} {ar ? g.unit : enUnit(g)}</td>
            <td className="num px-3 py-2 font-semibold">{num(niceAmount(g.per_week, g.factor), 1)} {ar ? g.unit : enUnit(g)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// The day plan exactly as the client receives it.
function DaySheet({ data, slots, notes }) {
  const { t, lang, num, fmtDate } = useI18n();
  const ar = lang === "ar";
  const p = data.plan;
  return (
    <div className="bg-white">
      <header className="flex items-center gap-4 border-b-[3px] border-brand pb-4">
        {data.branding.logo_url
          ? <img src={data.branding.logo_url} alt="" className="h-14 w-14 rounded-2xl object-contain" />
          : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-sm font-bold text-white">{(data.branding.clinic_name || "DM").slice(0, 4).toUpperCase()}</div>}
        <div className="flex-1">
          <div className="text-xl font-bold">{data.branding.clinic_name || "Diet in a Minute"}</div>
        </div>
        <div className="text-end text-xs text-muted">{t("dietPlanTitle")}<br /><b className="text-[13px] text-brand-ink">{fmtDate(p.created_at)}</b></div>
      </header>
      <div className="mb-3 mt-5"><h2 className="text-2xl font-bold">{data.client.name}</h2>{data.client.goal && <p className="text-sm text-muted">{t("goal")}: {t(`goal_${data.client.goal}`)}</p>}</div>
      <div className="mb-5 grid grid-cols-4 overflow-hidden rounded-xl border border-line">
        {[[t("caloriesDay"), num(p.kcal), ""], [t("carbs"), num(p.carb), ` ${t("g")}`], [t("protein"), num(p.protein), ` ${t("g")}`], [t("fat"), num(p.fat), ` ${t("g")}`]].map(([k, v, u], idx) => (
          <div key={k} className={`px-4 py-2.5 ${idx ? "border-s border-line" : "bg-brand-soft"}`}><div className="text-[11px] text-muted">{k}</div><div className="num text-lg font-bold">{v}{u}</div></div>
        ))}
      </div>
      <div className="space-y-3">
        {slots.filter((s) => data.meals[s.key]?.length).map((s) => {
          const rows = data.meals[s.key];
          const kcal = rows.reduce((a, r) => a + (r.kcal || 0), 0);
          return (
            <section key={s.key} className="break-inside-avoid overflow-hidden rounded-xl border border-line">
              <div className="flex items-center gap-2.5 bg-brand px-4 py-2 text-white">
                <b className="text-sm">{s.name}</b>{s.time && <span className="num text-xs opacity-80">{s.time}</span>}
                <span className="num ms-auto rounded-full bg-white/15 px-2.5 py-0.5 text-xs">{num(kcal)} {t("kcal")}</span>
              </div>
              <div className="grid grid-cols-3">
                {rows.map((r, idx) => (
                  <div key={`${r.food_en}-${idx}`} className={`flex justify-between gap-2 px-4 py-2 text-[13px] ${idx % 3 ? "border-s border-[#f0f2f0]" : ""} ${idx >= 3 ? "border-t border-[#f0f2f0]" : ""}`}>
                    <span>{ar ? r.food : r.food_en}</span><b className="num whitespace-nowrap">{num(niceAmount(r.amount, r.factor), 1)} {ar ? r.unit : enUnit(r)}</b>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="break-inside-avoid rounded-xl border border-line px-4 py-3 text-[13px]">
          <h4 className="mb-1 font-bold text-brand">{t("notesFromDietitian")}</h4>
          <p className="whitespace-pre-line text-brand-ink">{notes.trim() || "—"}</p>
        </div>
        <div className="break-inside-avoid rounded-xl border border-line px-4 py-3 text-[13px]">
          <h4 className="mb-1 font-bold text-brand">{t("workout")}</h4>
          <p>{data.workout ? t("workoutAttached", { name: ar ? data.workout.name_ar || data.workout.name : data.workout.name }) : t("noWorkoutAttached")}</p>
        </div>
      </div>
    </div>
  );
}

function WeekRow({ day, index, slots, names, onSwap, onEdit, compact = false }) {
  const { t, lang, num } = useI18n();
  const ar = lang === "ar";
  const cols = slots.filter((s) => day.items.some((i) => i.meal === s.key));
  return (
    <section className={`grid overflow-hidden rounded-2xl bg-white ${compact ? "border border-line" : "shadow-[0_1px_2px_rgba(16,40,32,.06),0_8px_24px_rgba(16,40,32,.08)]"}`}
      style={{ gridTemplateColumns: `${compact ? 120 : 170}px repeat(${Math.max(cols.length, 1)}, minmax(0, 1fr))` }}>
      <header className={`flex flex-col justify-center gap-1.5 border-e border-line px-4 py-3 ${index === 0 ? "bg-gradient-to-r from-[#dcefe7] to-[#f3f8f6]" : "bg-gradient-to-r from-[#f3f8f6] to-white"}`}>
        <div className="text-[11px] font-bold uppercase tracking-wide text-brand">{t("dayN", { n: index + 1 })}</div>
        <h3 className={`${compact ? "text-sm" : "text-[17px]"} font-bold`}>{names[index]}</h3>
        {index === 0 ? <span className="w-fit rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{t("yourPlan")}</span>
          : <span className="w-fit rounded-full bg-ai-soft px-2 py-0.5 text-[11px] font-semibold text-ai">{t("nSwaps", { n: day.swaps })}</span>}
        <div className={`num ${compact ? "text-base" : "text-[22px]"} font-bold`}>{num(day.kcal)} <small className="text-[11px] font-medium text-muted">{t("kcal")}</small></div>
        {!compact && index > 0 && (
          <div className="flex gap-3 text-xs font-semibold text-brand">
            <button type="button" onClick={onSwap} className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" />{t("swapDay")}</button>
            <button type="button" onClick={onEdit} className="inline-flex items-center gap-1"><Pencil className="h-3 w-3" />{t("editDay")}</button>
          </div>
        )}
        {!compact && index === 0 && <button type="button" onClick={onEdit} className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand"><Pencil className="h-3 w-3" />{t("editDay")}</button>}
      </header>
      {cols.map((s) => {
        const items = day.items.filter((i) => i.meal === s.key);
        const kcal = items.reduce((a, i) => a + i.kcal, 0);
        return (
          <div key={s.key} className={`${compact ? "m-1.5 p-2" : "m-2.5 p-3"} rounded-xl border border-[#edf0ee] bg-[#fcfdfc]`}>
            <div className="mb-1.5">
              <b className="block truncate text-[13px]">{s.name}</b>
              <span className="num block whitespace-nowrap text-[11px] text-muted">{s.time ? `${s.time} · ` : ""}{num(kcal)} {t("kcal")}</span>
            </div>
            {items.map((i, idx) => (
              <div key={`${i.food_id}-${idx}`} className={`mb-0.5 flex justify-between gap-1.5 rounded-md px-1.5 py-1 text-xs ${i.swapped ? "bg-ai-soft text-[#3b3192]" : ""}`}>
                <span className="truncate">{i.swapped ? "↻ " : ""}{ar ? i.name_ar || i.name : i.name}</span>
                <b className="num whitespace-nowrap font-semibold">{num(niceAmount(i.amount, i.factor), 1)} {ar ? i.unit_ar || i.unit : englishUnit(i.unit, i.unit_ar, i.factor)}</b>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}

function EditDayModal({ open, day, dayName, slots, foods, excluded, onClose, onSave }) {
  const { t, foodName } = useI18n();
  const [rows, setRows] = useState([]);
  useEffect(() => { if (open && day) setRows(day.items.map((i) => ({ ...i }))); }, [open, day]);
  if (!open || !day) return null;
  const set = (idx, patch) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  return (
    <Modal open={open} onClose={onClose} title={t("editDayTitle", { day: dayName })} wide>
      <div className="space-y-4">
        {slots.map((s) => {
          const idxs = rows.map((r, i) => [r, i]).filter(([r]) => r.meal === s.key);
          if (!idxs.length) return null;
          return (
            <div key={s.key}>
              <div className="mb-1.5 text-sm font-bold">{s.name}</div>
              {idxs.map(([r, idx]) => {
                const col = colOf(foods.find((f) => f.id === r.food_id) || r);
                return (
                  <div key={idx} className="mb-1.5 grid grid-cols-[1fr_96px_32px] items-center gap-2">
                    <select className="input h-9 py-0 text-sm" value={r.food_id} onChange={(e) => set(idx, { food_id: Number(e.target.value), swapped: true })}>
                      {foods.filter((f) => colOf(f) === col && !excluded.has(f.id)).map((f) => <option key={f.id} value={f.id}>{foodName(f)}</option>)}
                    </select>
                    <input className="input num h-9 py-0 text-sm" type="number" step="0.5" min="0" value={r.quantity} onChange={(e) => set(idx, { quantity: Number(e.target.value) })} />
                    <button type="button" className="btn-ghost p-1.5 hover:text-bad" onClick={() => setRows((x) => x.filter((_, i) => i !== idx))} aria-label={t("delete")}><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          );
        })}
        <p className="text-xs text-muted">{t("colServings")}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button type="button" className="btn-primary" onClick={() => onSave(rows.filter((r) => r.quantity > 0))}>{t("save")}</button>
      </div>
    </Modal>
  );
}

export default function PlanSheet() {
  const { planId } = useParams();
  const { t, lang, num, fmtDate } = useI18n();
  const aiBlocker = useAIBlocker();
  const pdfRef = useRef(null);
  const [data, setData] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [foods, setFoods] = useState([]);
  const [excluded, setExcluded] = useState(new Set());
  const [tab, setTab] = useState("day");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [editDay, setEditDay] = useState(null);
  const [weekInPdf, setWeekInPdf] = useState(true);

  const load = useCallback(() => API.get(`/nutrition/plan/${planId}/sheet/`).then((r) => {
    setData(r.data); setNotes(r.data.plan.notes || ""); setTemplateName(r.data.plan.name);
    return r.data;
  }), [planId]);
  useEffect(() => {
    load().then((d) => API.get(`/nutrition/clients/${d.client.id}/overview/`).then((ov) => setExcluded(new Set(ov.data.excluded_foods.map((f) => f.id)))));
    API.get("/nutrition/workouts/").then((r) => setWorkouts(r.data));
    API.get("/nutrition/foods/").then((r) => setFoods(r.data));
  }, [load]);
  const slots = useSlots(data, t);
  const names = useMemo(() => dayNames(lang), [lang]);

  if (!data) return <Spinner label={t("loading")} />;
  const ar = lang === "ar";
  const week = data.weekly;

  const attachWorkout = async (id) => { await API.put(`/nutrition/plan/${planId}/workout/`, { workout_id: id || null }); load(); };
  const saveNotes = async () => { await API.put(`/nutrition/plan/${planId}/notes/`, { notes }); toast.success(t("saved")); };
  const makeWeek = async () => {
    setBusy("week");
    try {
      const r = await API.post(`/nutrition/plan/${planId}/weekly/`, { seed: Math.floor(Math.random() * 100000) });
      setData((d) => ({ ...d, weekly: r.data.weekly }));
    } catch (err) { toast.error(apiError(err, t)); } finally { setBusy(""); }
  };
  const saveWeek = async (days) => {
    try {
      const r = await API.put(`/nutrition/plan/${planId}/weekly/`, { days: days.map((d) => ({ items: d.items.map(({ meal, food_id, quantity, swapped }) => ({ meal, food_id, quantity, swapped })) })) });
      setData((d) => ({ ...d, weekly: r.data.weekly }));
      toast.success(t("saved"));
    } catch (err) { toast.error(apiError(err, t)); }
  };
  const swapDay = async (index) => {
    setBusy(`swap${index}`);
    try {
      const fresh = (await API.post(`/nutrition/plan/${planId}/weekly/`, { seed: Math.floor(Math.random() * 100000) })).data.weekly;
      const days = week.days.map((d, i) => (i === index ? fresh.days[index] : d));
      await saveWeek(days);
    } finally { setBusy(""); }
  };
  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      await html2pdf().set({
        margin: 8, filename: `${data.client.name} - ${data.plan.name}.pdf`, image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4" }, pagebreak: { mode: ["css", "legacy"] },
      }).from(pdfRef.current).save();
    } finally { setBusy(""); }
  };
  const writeMessage = async () => {
    setBusy("ai");
    try { setMessage((await API.post(`/nutrition/ai/plans/${planId}/client-message/`, { language: lang })).data.content); }
    catch (err) { toast.error(err?.response?.data?.detail || t("error")); } finally { setBusy(""); }
  };
  const saveTemplate = async () => {
    try { await API.post("/nutrition/templates/", { plan_id: Number(planId), name: templateName }); toast.success(t("templateSaved")); setTemplateOpen(false); }
    catch { toast.error(t("error")); }
  };
  const lo = week ? Math.min(...week.days.map((d) => d.kcal)) : 0;
  const hi = week ? Math.max(...week.days.map((d) => d.kcal)) : 0;
  const tabs = [["day", t("tabDayPlan")], ["week", t("tabWeekly")], ["shop", t("tabShopping")], ["workout", t("tabWorkout")]];

  return (
    <>
      <Link to={`/dashboard/clients/${data.client.id}?tab=plans`} className="mb-1 inline-block text-sm text-muted hover:text-brand">← {data.client.name}</Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-2xl font-bold">{t("clientSheetTitle")} <span className="text-base font-medium text-muted">· {data.plan.name}</span></h1>
        <Link to={`/dashboard/clients/${data.client.id}/plans/${planId}/edit`} className="btn-secondary"><Pencil className="h-4 w-4" />{t("editPlanBtn")}</Link>
        <button type="button" className="btn-secondary" onClick={() => setTemplateOpen(true)}><LayoutGrid className="h-4 w-4" />{t("saveAsTemplate")}</button>
        <button type="button" className="btn-primary" disabled={busy === "pdf"} onClick={downloadPdf}><Download className="h-4 w-4" />{busy === "pdf" ? t("loading") : t("downloadPdf")}</button>
      </div>
      <StepsBar current={2} className="mb-4" />
      {data.unassigned.length > 0 && (
        <div className="mb-4 flex gap-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-[#5a4a2c]">
          <TriangleAlert className="h-4 w-4 shrink-0 text-warn" />{t("unassignedWarn", { foods: data.unassigned.join("، ") })}
        </div>
      )}
      <div className="mb-4 flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_#e6e9e6]">
        {tabs.map(([v, label]) => (
          <button key={v} type="button" onClick={() => setTab(v)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === v ? "border-brand text-brand" : "border-transparent text-muted hover:text-brand-ink"}`}>{label}</button>
        ))}
      </div>

      {tab === "day" && (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="card p-6 sm:p-8"><DaySheet data={data} slots={slots} notes={notes} /></div>
          <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Card title={t("planNotes")}>
              <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <button type="button" className="btn-secondary mt-2 w-full" onClick={saveNotes}>{t("save")}</button>
            </Card>
            <Card tone="ai" title={t("aiMessage")} icon={<Sparkles className="h-4 w-4 text-ai" />} actions={message?.test_mode && <TestModeBadge />}>
              {message && (
                <>
                  <textarea className="input mb-2 text-sm" rows={7} value={message.message} onChange={(e) => setMessage({ ...message, message: e.target.value })} />
                  <div className="mb-3 flex gap-2">
                    <button type="button" className="btn-secondary flex-1" onClick={() => navigator.clipboard.writeText(message.message).then(() => toast.success(t("copied")))}><Copy className="h-4 w-4" />{t("copy")}</button>
                    <button type="button" className="btn-secondary flex-1" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message.message)}`, "_blank", "noopener")}><MessageCircle className="h-4 w-4" />WhatsApp</button>
                  </div>
                </>
              )}
              {aiBlocker ? <AIUnavailableNote reason={aiBlocker} /> : (
                <button type="button" className="btn-ai w-full" disabled={busy === "ai"} onClick={writeMessage}><Sparkles className="h-4 w-4" />{busy === "ai" ? t("aiThinking") : t("writeMessage")}</button>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "week" && (
        <>
          <div className="card mb-4 flex flex-wrap items-center gap-4 border border-dashed border-[#b8d6ca] bg-brand-soft px-5 py-4 shadow-none">
            <h3 className="whitespace-nowrap font-bold">{t("howWeek")}</h3>
            <p className="min-w-[260px] flex-1 text-[13px] text-[#2c4a40]">{t("howWeekBody")}</p>
            <span className="whitespace-nowrap rounded-md bg-ai-soft px-2 py-1 text-xs text-[#3b3192]">↻ {t("swappedFood")}</span>
            {week && <p className="text-[13px] text-[#2c4a40]">{t("allDaysRange", { lo: num(lo), hi: num(hi) })}</p>}
            <button type="button" className="btn-secondary bg-white" onClick={makeWeek} disabled={busy === "week"}>
              <RefreshCw className="h-4 w-4" />{busy === "week" ? t("loading") : week ? t("newSuggestions") : t("makeWeek")}
            </button>
          </div>
          {week ? (
            <div className="space-y-4 overflow-x-auto pb-2">
              <div className="min-w-[900px] space-y-4">
                {week.days.map((d, i) => (
                  <WeekRow key={i} day={d} index={i} slots={slots} names={names} onSwap={() => swapDay(i)} onEdit={() => setEditDay(i)} />
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={weekInPdf} onChange={(e) => setWeekInPdf(e.target.checked)} />{t("includeWeekPdf")}</label>
            </div>
          ) : (
            <div className="card grid place-items-center gap-3 p-10 text-center">
              <p className="max-w-md text-sm text-muted">{t("howWeekBody")}</p>
              <button type="button" className="btn-primary" onClick={makeWeek} disabled={busy === "week"}><Plus className="h-4 w-4" />{t("makeWeek")}</button>
            </div>
          )}
        </>
      )}

      {tab === "shop" && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4"><ShoppingCart className="h-5 w-5 text-brand" /><h3 className="font-bold">{t("groceryList")}</h3></div>
          <Grocery rows={data.grocery} />
        </div>
      )}

      {tab !== "workout" && !data.workout && (
        <button type="button" onClick={() => setTab("workout")} className="mb-4 flex w-full items-center gap-2 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-start text-sm font-semibold text-brand">
          <Dumbbell className="h-4 w-4" />{t("noWorkoutYet")}<span className="ms-auto">→</span>
        </button>
      )}
      {tab === "workout" && (
        <div className="space-y-4">
          {!data.workout && <WorkoutSuggestions planId={planId} clientName={data.client.name} workouts={workouts} onAttach={attachWorkout} />}
          <Card title={t("attachWorkout")} icon={<Dumbbell className="h-4 w-4 text-brand" />}>
            <select className="input" value={data.workout?.id || ""} onChange={(e) => attachWorkout(e.target.value)}>
              <option value="">{t("noWorkout")}</option>
              {[["suggestedWorkouts", workouts.filter((w) => w.goal === GOAL_TO_WORKOUT[data.client.goal])],
                ["otherWorkouts", workouts.filter((w) => w.goal !== GOAL_TO_WORKOUT[data.client.goal])]].map(([label, list]) => list.length > 0 && (
                <optgroup key={label} label={t(label)}>
                  {list.map((w) => <option key={w.id} value={w.id}>{ar ? w.name_ar || w.name : w.name} · {t(`level_${w.level}`)} · {t(`place_${w.place}`)}{w.is_safe_version ? " ⚕" : ""}</option>)}
                </optgroup>
              ))}
            </select>
            {data.workout?.is_draft && <div className="mt-2"><DraftBadge /></div>}
          </Card>
          {data.workout && <div className="card p-6"><WorkoutBlock workout={data.workout} /></div>}
        </div>
      )}

      {/* Hidden: what goes into the PDF (day plan, then week, shopping list and workout on new pages). */}
      <div className="pointer-events-none fixed -start-[10000px] top-0 w-[794px]" aria-hidden>
        <div ref={pdfRef} dir={ar ? "rtl" : "ltr"} className="bg-white p-8 font-sans text-brand-ink">
          <DaySheet data={data} slots={slots} notes={notes} />
          {week && weekInPdf && (
            <>
              <div className="html2pdf__page-break" />
              <h2 className="mb-3 text-lg font-bold">{t("weekPdfTitle")} · {data.client.name}</h2>
              <div className="space-y-2">
                {week.days.map((d, i) => <WeekRow key={i} day={d} index={i} slots={slots} names={names} compact />)}
              </div>
            </>
          )}
          {data.grocery.length > 0 && (
            <>
              <div className="html2pdf__page-break" />
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><ShoppingCart className="h-5 w-5 text-brand" />{t("groceryList")}</h2>
              <Grocery rows={data.grocery} />
            </>
          )}
          {data.workout && (<><div className="html2pdf__page-break" /><WorkoutBlock workout={data.workout} allDays /></>)}
          <footer className="mt-6 flex text-[11px] text-muted" dir="ltr"><span>Diet in a Minute</span><span className="ms-auto">{fmtDate(data.plan.created_at)}</span></footer>
        </div>
      </div>

      <EditDayModal open={editDay !== null} day={week?.days?.[editDay]} dayName={names[editDay ?? 0]} slots={slots} foods={foods} excluded={excluded}
        onClose={() => setEditDay(null)}
        onSave={async (rows) => { const days = week.days.map((d, i) => (i === editDay ? { ...d, items: rows } : d)); setEditDay(null); await saveWeek(days); }} />

      <Modal open={templateOpen} onClose={() => setTemplateOpen(false)} title={t("saveAsTemplate")}>
        <label className="label">{t("planName")}</label>
        <input className="input" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setTemplateOpen(false)}>{t("cancel")}</button>
          <button type="button" className="btn-primary" onClick={saveTemplate}>{t("save")}</button>
        </div>
      </Modal>
    </>
  );
}
