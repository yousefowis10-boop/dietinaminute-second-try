import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import html2pdf from "html2pdf.js";
import { Copy, Download, Dumbbell, LayoutGrid, MessageCircle, Pencil, Printer, ShoppingCart, Sparkles, TriangleAlert } from "lucide-react";
import API from "../hooks/useApi";
import { MEAL_ORDER, useI18n } from "../i18n";
import { Card, DraftBadge, Modal, Spinner, TestModeBadge } from "../ui";
import { AIUnavailableNote, useAIBlocker } from "./client/AIPanel";

// English unit for an amount: grams/ml when the Arabic unit says so, else the English serving name.
const enUnit = (row) => (row.unit === "غرام" || row.unit === "جرام" ? "g" : row.unit === "مل" ? "ml" : row.unit_en);

function WorkoutBlock({ workout }) {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Dumbbell className="h-5 w-5 text-brand" />{t("workout")}: {ar ? workout.name_ar || workout.name : workout.name}</h2>
      <p className="mb-3 text-sm text-muted">{ar ? workout.notes_ar || workout.notes : workout.notes}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {workout.days.map((day) => (
          <div key={day.title} className="rounded-xl border border-line p-3">
            <div className="mb-2 font-bold">{ar ? day.title_ar || day.title : day.title}</div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted"><th className="text-start font-medium">{t("exercise")}</th><th className="font-medium">{t("sets")}</th><th className="font-medium">{t("reps")}</th><th className="font-medium">{t("rest")}</th></tr></thead>
              <tbody>
                {day.exercises.map((ex) => (
                  <tr key={ex.name} className="border-t border-line">
                    <td className="py-1.5">{ar ? ex.name_ar || ex.name : ex.name}</td>
                    <td className="num text-center">{ex.sets}</td><td className="num text-center">{ex.reps}</td><td className="num text-center">{ex.rest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t("activityGuide")}</p>
    </section>
  );
}

export default function PlanSheet() {
  const { planId } = useParams();
  const { t, lang, num, fmtDate } = useI18n();
  const aiBlocker = useAIBlocker();
  const sheetRef = useRef(null);
  const [data, setData] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [showGrocery, setShowGrocery] = useState(true);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const load = useCallback(() => {
    API.get(`/nutrition/plan/${planId}/sheet/`).then((r) => { setData(r.data); setNotes(r.data.plan.notes || ""); setTemplateName(r.data.plan.name); });
  }, [planId]);
  useEffect(() => { load(); API.get("/nutrition/workouts/").then((r) => setWorkouts(r.data)); }, [load]);

  if (!data) return <Spinner label={t("loading")} />;
  const ar = lang === "ar";
  const meals = MEAL_ORDER.filter((m) => data.meals[m]?.length);

  const attachWorkout = async (id) => {
    await API.put(`/nutrition/plan/${planId}/workout/`, { workout_id: id || null });
    load();
  };
  const saveNotes = async () => {
    await API.put(`/nutrition/plan/${planId}/notes/`, { notes });
    toast.success(t("saved"));
  };
  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      await html2pdf().set({
        margin: 8, filename: `${data.client.name} - ${data.plan.name}.pdf`,
        image: { type: "jpeg", quality: 0.95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4" },
        pagebreak: { mode: ["css", "legacy"] },
      }).from(sheetRef.current).save();
    } finally {
      setBusy("");
    }
  };
  const writeMessage = async () => {
    setBusy("ai");
    try {
      const r = await API.post(`/nutrition/ai/plans/${planId}/client-message/`, { language: lang });
      setMessage(r.data.content);
    } catch (err) {
      toast.error(err?.response?.data?.detail || t("error"));
    } finally {
      setBusy("");
    }
  };
  const saveTemplate = async () => {
    try {
      await API.post("/nutrition/templates/", { plan_id: Number(planId), name: templateName });
      toast.success(t("templateSaved"));
      setTemplateOpen(false);
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <>
      <div className="no-print">
        <Link to={`/dashboard/clients/${data.client.id}?tab=plans`} className="mb-2 inline-block text-sm text-muted hover:text-brand">← {data.client.name}</Link>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h1 className="flex-1 text-2xl font-bold">{data.plan.name}</h1>
          <Link to={`/dashboard/clients/${data.client.id}/plans/${planId}/edit`} className="btn-secondary"><Pencil className="h-4 w-4" />{t("edit")}</Link>
          <button type="button" className="btn-secondary" onClick={() => setTemplateOpen(true)}><LayoutGrid className="h-4 w-4" />{t("saveAsTemplate")}</button>
          <button type="button" className="btn-secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />{t("print")}</button>
          <button type="button" className="btn-primary" disabled={busy === "pdf"} onClick={downloadPdf}><Download className="h-4 w-4" />{busy === "pdf" ? t("loading") : t("downloadPdf")}</button>
        </div>
        {data.unassigned.length > 0 && (
          <div className="mb-4 flex gap-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm text-[#5a4a2c]">
            <TriangleAlert className="h-4 w-4 shrink-0 text-warn" />{t("unassignedWarn", { foods: data.unassigned.join("، ") })}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* ---------------- the sheet the client receives ---------------- */}
        <div ref={sheetRef} className="card bg-white p-6 sm:p-8" dir={ar ? "rtl" : "ltr"}>
          <header className="mb-6 flex items-start gap-4 border-b border-line pb-5">
            {data.branding.logo_url && <img src={data.branding.logo_url} alt="" className="h-16 w-16 rounded-xl object-contain" />}
            <div className="flex-1">
              <div className="text-sm font-semibold text-brand">{data.branding.clinic_name}</div>
              <h2 className="text-2xl font-bold">{t("sheetTitle")}</h2>
              <div className="mt-1 text-sm text-muted">{t("preparedFor")} <b className="text-brand-ink">{data.client.name}</b> · {fmtDate(data.plan.created_at)}</div>
            </div>
            <div className="text-end">
              <div className="num text-2xl font-bold text-brand">{num(data.plan.kcal)}</div>
              <div className="text-xs text-muted">{t("kcal")} / {ar ? "يوم" : "day"}</div>
            </div>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            {meals.map((m) => (
              <section key={m} className="break-inside-avoid rounded-xl border border-line p-4">
                <h3 className="mb-2 font-bold text-brand">{t(m)}</h3>
                <ul className="space-y-1.5 text-sm">
                  {data.meals[m].map((row) => (
                    <li key={row.food_en} className="flex gap-3 border-b border-dashed border-line pb-1.5 last:border-0">
                      <span className="flex-1">{ar ? row.food : row.food_en}</span>
                      <span className="num font-semibold">{num(row.amount, 1)} <span className="font-normal text-muted">{ar ? row.unit : enUnit(row)}</span></span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {notes.trim() && (
            <section className="mt-6 break-inside-avoid rounded-xl bg-page p-4 text-sm leading-relaxed">
              <h3 className="mb-1 font-bold">{t("planNotes")}</h3>
              <p className="whitespace-pre-line">{notes}</p>
            </section>
          )}

          {data.workout && <WorkoutBlock workout={data.workout} />}

          {showGrocery && data.grocery.length > 0 && (
            <section className="mt-8 break-inside-avoid">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><ShoppingCart className="h-5 w-5 text-brand" />{t("groceryList")}</h2>
              <table className="w-full text-sm">
                <tbody>
                  {data.grocery.map((g) => (
                    <tr key={g.food_en} className="border-b border-line">
                      <td className="py-1.5">☐ {ar ? g.food : g.food_en}</td>
                      <td className="num text-muted">{num(g.per_day, 1)} {ar ? g.unit : enUnit(g)} <span className="text-xs">{t("perDay")}</span></td>
                      <td className="num font-semibold">{num(g.per_week, 1)} {ar ? g.unit : enUnit(g)} <span className="text-xs font-normal text-muted">{t("perWeek")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          <footer className="mt-8 text-center text-[11px] text-muted" dir="ltr">Diet in a Minute</footer>
        </div>

        {/* --------------------------- dietitian controls --------------------------- */}
        <div className="no-print space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card title={t("attachWorkout")} icon={<Dumbbell className="h-4 w-4 text-brand" />}>
            <select className="input" value={data.workout?.id || ""} onChange={(e) => attachWorkout(e.target.value)}>
              <option value="">{t("noWorkout")}</option>
              {workouts.map((w) => <option key={w.id} value={w.id}>{ar ? w.name_ar || w.name : w.name}{w.is_safe_version ? " ⚕" : ""}</option>)}
            </select>
            {data.workout?.is_draft && <div className="mt-2"><DraftBadge /></div>}
          </Card>
          <Card title={t("planNotes")}>
            <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button type="button" className="btn-secondary mt-2 w-full" onClick={saveNotes}>{t("save")}</button>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={showGrocery} onChange={(e) => setShowGrocery(e.target.checked)} />{t("groceryList")}</label>
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
