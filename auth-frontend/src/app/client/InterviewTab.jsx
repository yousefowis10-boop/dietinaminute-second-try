import { useEffect, useMemo, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { Check, CheckCircle2, ChevronDown, ClipboardList, Download, Link2, Sparkles, TriangleAlert } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../hooks/useApi";
import { useI18n } from "../../i18n";
import { Modal, Spinner } from "../../ui";
import { DRINKS, FREQS, FREQ_UNIT, INTERVIEW_STEPS, MEASUREMENT_FIELDS, MEASUREMENT_LABELS, answeredIn, optionLabel } from "../interviewConfig";
import { Question, visibleFields } from "../InterviewFields";
import { InterviewLinkCard } from "./OverviewTab";

const CHIP = { ok: "bg-[#d7ebe4] text-[#124a3c]", bad: "bg-bad-soft text-bad", warn: "bg-warn-soft text-warn" };

function hasValue(v) {
  return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length) && !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
}

// The interview as a neat A4 document (also used for the PDF).
export function InterviewDoc({ data, answers, steps, foods, branding }) {
  const { t, lang, num, fmtDate, foodName } = useI18n();
  const ar = lang === "ar";
  const c = data.client;
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  const fmt = (field, v) => {
    if (field.type === "foods") {
      return <div className="flex flex-wrap gap-1">{(v || []).map((id) => byId[id] && <span key={id} className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${CHIP[field.tone || "ok"]}`}>{foodName(byId[id])}</span>)}</div>;
    }
    if (field.type === "boolean") return v ? t("yes") : t("no");
    if (Array.isArray(v)) return v.map((x) => optionLabel(x, lang)).join("، ");
    if (field.type === "option") return optionLabel(v, lang);
    return String(v);
  };
  const summary = (data.ai_results || []).find((r) => r.kind === "summary")?.content;
  const info = [
    [t("age"), `${num(c.age)} ${t("years")}`], [t("gender"), c.gender === "F" ? t("female") : t("male")],
    [`${t("weight")} / ${t("height")}`, `${num(c.weight, 1)} ${t("kg")} · ${num(c.height)} ${t("cm")}`], [t("bodyFat"), c.pbf ? `${num(c.pbf, 1)}%` : "—"],
    [t("goal"), t(`goal_${c.goal || ""}`)], [ar ? "العمل" : "Job", answers.occupation || "—"],
    [ar ? "الحالة الاجتماعية" : "Marital status", answers.marital_status ? optionLabel(answers.marital_status, lang) : "—"], [t("calorieTargetLbl"), `${num(c.target_calories)} ${t("kcal")}`],
  ];
  return (
    <div className="bg-white text-brand-ink" dir={ar ? "rtl" : "ltr"}>
      <header className="flex items-center gap-4 border-b-[3px] border-brand pb-4">
        {branding?.logo_url
          ? <img src={branding.logo_url} alt="" className="h-14 w-14 rounded-2xl object-contain" />
          : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-sm font-bold text-white">{(branding?.clinic_name || "DM").slice(0, 4).toUpperCase()}</div>}
        <div className="flex-1 text-xl font-bold">{branding?.clinic_name || "Diet in a Minute"}</div>
        <div className="text-end text-xs text-muted">{t("interviewPdfTitle")}<br /><b className="text-[13px] text-brand-ink">{fmtDate(data.interview.submitted_at || new Date())}</b></div>
      </header>
      <div className="mb-3 mt-5 flex items-baseline gap-3"><h2 className="text-xl font-bold">{c.name}</h2><span className="text-[13px] text-muted">{data.interview.submitted_at ? t("answeredViaLink") : t("enteredInClinic")}</span></div>
      <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-line">
        {info.map(([k, v], i) => (
          <div key={i} className={`px-3.5 py-2.5 ${i % 4 ? "border-s border-line" : ""} ${i >= 4 ? "border-t border-line" : ""}`}>
            <div className="text-[11px] text-muted">{k}</div><div className="text-[13.5px] font-bold">{v}</div>
          </div>
        ))}
      </div>
      {data.safety_flags?.length > 0 && (
        <div className="mt-3.5 rounded-xl border border-[#f0d9a8] bg-warn-soft px-4 py-2.5">
          <h4 className="mb-1 text-[13px] font-bold text-warn">{t("needsAttention")}</h4>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] text-[#5a4a2c]">
            {data.safety_flags.map((f) => <li key={f.code}>⚠ {ar ? f.ar : f.en}</li>)}
          </ul>
        </div>
      )}
      {steps.map((step) => {
        const fields = visibleFields(step, answers).filter((f) => f.type !== "drinks" && hasValue(answers[f.name]));
        const drinks = step.fields.find((f) => f.type === "drinks");
        const drinkRows = drinks && answers.drinks ? DRINKS.filter(([k]) => answers.drinks[k]?.freq) : [];
        if (!fields.length && !drinkRows.length && !(drinks && answers.drinks?.water_l)) return null;
        const pairs = [];
        for (let i = 0; i < fields.length; i += 2) pairs.push(fields.slice(i, i + 2));
        return (
          <section key={step.key} className="mt-4 break-inside-avoid">
            <h3 className="mb-2 border-s-4 border-brand ps-2.5 text-[13.5px] font-bold">{step[lang] || step.en}</h3>
            {pairs.length > 0 && (
              <table className="w-full table-fixed border-collapse text-[12.5px]">
                <colgroup><col style={{ width: "18%" }} /><col style={{ width: "32%" }} /><col style={{ width: "18%" }} /><col style={{ width: "32%" }} /></colgroup>
                <tbody>
                  {pairs.map((pair, i) => (
                    <tr key={i} className={i % 2 ? "bg-[#fafbfa]" : ""}>
                      {pair.map((f) => [
                        <td key={`${f.name}k`} className="h-9 border-b border-[#f0f2f0] px-2.5 align-middle text-muted">{f[lang] || f.en}</td>,
                        <td key={`${f.name}v`} className="border-b border-[#f0f2f0] px-2.5 py-1.5 align-middle font-semibold">{fmt(f, answers[f.name])}</td>,
                      ])}
                      {pair.length === 1 && <><td className="border-b border-[#f0f2f0]" /><td className="border-b border-[#f0f2f0]" /></>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {(drinkRows.length > 0 || answers.drinks?.water_l) && (
              <table className="mt-2 w-full table-fixed border-collapse text-[12.5px]">
                <thead><tr className="bg-[#fafbfa] text-[11.5px] text-muted"><th className="px-2.5 py-2 text-start font-semibold">{t("drink")}</th><th className="px-2.5 py-2 text-start font-semibold">{t("howOften")}</th><th className="px-2.5 py-2 text-start font-semibold">{t("colAmount")}</th></tr></thead>
                <tbody>
                  {drinkRows.map(([k, arName, enName]) => {
                    const row = answers.drinks[k];
                    const f = FREQS.find((x) => x[0] === row.freq);
                    const u = FREQ_UNIT[row.freq];
                    return (
                      <tr key={k} className="border-b border-[#f0f2f0]"><td className="h-[34px] px-2.5">{ar ? arName : enName}</td>
                        <td className="px-2.5"><span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${row.freq === "daily" ? "bg-bad-soft text-bad" : row.freq === "weekly" ? "bg-warn-soft text-warn" : row.freq === "monthly" ? "bg-brand-soft text-brand" : "bg-page text-muted"}`}>{f ? (ar ? f[1] : f[2]) : ""}</span></td>
                        <td className="num px-2.5">{u && row.amount ? `${row.amount} ${u[ar ? 0 : 1]}` : "—"}</td></tr>
                    );
                  })}
                  {answers.drinks?.water_l ? <tr className="border-b border-[#f0f2f0]"><td className="h-[34px] px-2.5">{t("water")}</td><td className="px-2.5">—</td><td className="num px-2.5">{answers.drinks.water_l} {t("litre")}</td></tr> : null}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
      {summary && (
        <div className="mt-4 break-inside-avoid rounded-xl border border-[#d9d4fa] bg-ai-soft px-4 py-2.5 text-[12.5px] text-[#3b3192]">
          <h4 className="mb-1 text-[13px] font-bold">✦ {t("aiSummaryPdf")}</h4>{summary.summary}
        </div>
      )}
      <div className="mt-6 grid grid-cols-2 gap-8 text-xs text-muted"><div className="border-t border-dashed border-[#c9d0cc] pt-1.5">{t("dietitianSig")}</div><div className="border-t border-dashed border-[#c9d0cc] pt-1.5">{t("clientSig")}</div></div>
      <footer className="mt-4 border-t border-line pt-3 text-[11px] text-muted" dir="ltr">Diet in a Minute</footer>
    </div>
  );
}

export default function InterviewTab({ data, reload }) {
  const { t, lang } = useI18n();
  const c = data.client;
  const [answers, setAnswers] = useState(null);
  const [foods, setFoods] = useState([]);
  const [branding, setBranding] = useState(null);
  const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false);
  const [closed, setClosed] = useState({});
  const [linkOpen, setLinkOpen] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    API.get(`/nutrition/clients/${c.id}/detailed-profile/`).then((r) => setAnswers(r.data)).catch(() => setAnswers({}));
    API.get("/nutrition/foods/").then((r) => setFoods(r.data));
    API.get("/nutrition/account/").then((r) => setBranding({ clinic_name: r.data.clinic_name, logo_url: r.data.logo_url }));
  }, [c.id]);

  const steps = useMemo(() => INTERVIEW_STEPS.filter((s) => !s.onlyFor || s.onlyFor === c.gender), [c.gender]);
  const set = (name) => (value) => { setAnswers((a) => ({ ...a, [name]: value })); setDirty(true); };

  const save = async () => {
    setBusy("save");
    try {
      const payload = Object.fromEntries(Object.entries(answers).filter(([k]) => !["id", "user", "client"].includes(k)));
      await API.put(`/nutrition/clients/${c.id}/detailed-profile/`, payload);
      setDirty(false);
      toast.success(t("saved"));
      reload();
    } catch (err) {
      const errors = err?.response?.data;
      toast.error(errors && typeof errors === "object" ? Object.keys(errors).join(", ") : t("error"));
    } finally {
      setBusy("");
    }
  };
  const markReviewed = async () => { await API.post(`/nutrition/clients/${c.id}/interview-reviewed/`, {}); reload(); };
  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      await html2pdf().set({
        margin: 8, filename: `${c.name} - ${t("interviewPdfTitle")}.pdf`, image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4" }, pagebreak: { mode: ["css", "legacy"] },
      }).from(pdfRef.current).save();
    } finally {
      setBusy("");
    }
  };

  if (!answers) return <Spinner label={t("loading")} />;
  const counts = steps.map((s) => answeredIn(s, answers));
  const all = counts.reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
  const pct = all[1] ? Math.round((all[0] / all[1]) * 100) : 0;
  const mCount = MEASUREMENT_FIELDS.filter((f) => hasValue(answers[f])).length;
  const blocked = (field) => {
    const others = ["liked_foods", "never_foods", "less_foods"].filter((n) => n !== field.name);
    return others.flatMap((n) => answers[n] || []);
  };
  const jump = (key) => document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-lg font-bold">{t("interviewTitle", { name: c.name })}</h2>
        <button type="button" className="btn-secondary" onClick={() => setLinkOpen(true)}><Link2 className="h-4 w-4" />{t("clientLinkBtn")}</button>
        <button type="button" className="btn-secondary" onClick={downloadPdf} disabled={busy === "pdf"}><Download className="h-4 w-4" />{busy === "pdf" ? t("loading") : t("downloadPdf")}</button>
        <button type="button" className="btn-primary" disabled={busy === "save" || !dirty} onClick={save}>{busy === "save" ? t("saving") : t("save")}</button>
      </div>
      {data.interview.status === "submitted" && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4">
          <ClipboardList className="h-5 w-5 text-warn" />
          <span className="flex-1 text-sm font-semibold text-[#5a4a2c]">{t("istatus_submitted")}</span>
          <button type="button" className="btn-primary" onClick={markReviewed}><CheckCircle2 className="h-4 w-4" />{t("markReviewed")}</button>
        </div>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[260px_1fr]">
        <nav className="card p-2.5 lg:sticky lg:top-6">
          {[...steps.map((s, i) => [s.key, s[lang] || s.en, counts[i]]), ["measurements", t("measurementsSec"), [mCount, MEASUREMENT_FIELDS.length]]].map(([key, title, [a, b]], i) => {
            const done = a === b && b > 0;
            return (
              <button key={key} type="button" onClick={() => jump(key)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-semibold hover:bg-page">
                <span className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-[1.5px] text-xs ${done ? "border-ok bg-ok text-white" : a ? "border-brand bg-brand text-white" : "border-[#cfd5d2] text-muted"}`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={`flex-1 ${a ? "" : "text-muted"}`}>{title}</span>
                <span className="num text-[11.5px] font-medium text-muted">{a}/{b}</span>
              </button>
            );
          })}
          <div className="mx-3 mb-1 mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0ee]"><i className="block h-full bg-ok" style={{ width: `${pct}%` }} /></div>
          <p className="px-3 py-1 text-xs text-muted">{t("pctDone", { n: pct })}</p>
        </nav>

        <div className="space-y-4">
          {steps.map((step, i) => {
            const [a, b] = counts[i];
            const isClosed = closed[step.key];
            return (
              <section key={step.key} id={`sec-${step.key}`} className="card scroll-mt-4">
                <button type="button" onClick={() => setClosed((x) => ({ ...x, [step.key]: !x[step.key] }))}
                  className={`flex w-full items-center gap-3 ${isClosed ? "rounded-2xl" : "rounded-t-2xl"} bg-[#fafbfa] px-6 py-4 text-start ${isClosed ? "" : "border-b border-line"}`}>
                  <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-brand text-sm font-bold text-white">{i + 1}</span>
                  <h3 className="text-[17px] font-bold">{step[lang] || step.en}</h3>
                  <span className="ms-auto flex items-center gap-2">
                    {step.note && !isClosed && <span className="hidden text-xs text-muted md:inline">{step.note[lang]}</span>}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a === b ? "bg-brand-soft text-brand" : a ? "bg-page text-muted" : "bg-page text-muted"}`}>
                      {a === b ? t("complete") : a ? `${a}/${b}` : t("notStarted")}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted transition ${isClosed ? "-rotate-90 rtl:rotate-90" : ""}`} />
                  </span>
                </button>
                {!isClosed && (
                  <div className="grid gap-x-7 gap-y-5 p-6 sm:grid-cols-2">
                    {step.key === "food" && (
                      <div className="flex items-center gap-2.5 rounded-xl bg-ai-soft px-4 py-2.5 text-[13px] text-[#4337a8] sm:col-span-2"><Sparkles className="h-4 w-4 shrink-0" />{t("foodInfo")}</div>
                    )}
                    {visibleFields(step, answers).map((field) => (
                      <Question key={field.name} field={field} value={answers[field.name]} onChange={set(field.name)} foods={foods} blockedFoods={field.type === "foods" ? blocked(field) : []} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          <section id="sec-measurements" className="card scroll-mt-4 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line bg-[#fafbfa] px-6 py-4">
              <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-brand text-sm font-bold text-white">{steps.length + 1}</span>
              <h3 className="text-[17px] font-bold">{t("measurementsSec")}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
              {MEASUREMENT_FIELDS.map((f) => (
                <label key={f} className="block">
                  <span className="mb-1.5 block text-[13px] font-semibold">{MEASUREMENT_LABELS[f][lang === "ar" ? 0 : 1]}</span>
                  <div className="flex h-11 items-center rounded-xl border border-line bg-white px-3">
                    <input className="num w-full bg-transparent outline-none" type="number" step="0.1" value={answers[f] ?? ""} onChange={(e) => set(f)(e.target.value === "" ? null : Number(e.target.value))} />
                    {f !== "waist_to_hip_ratio" && <span className="text-sm text-muted">{t("cm")}</span>}
                  </div>
                </label>
              ))}
            </div>
          </section>
          {dirty && (
            <div className="sticky bottom-4 flex items-center gap-3 rounded-2xl border border-warn/30 bg-white p-3 shadow-lg">
              <TriangleAlert className="h-4 w-4 text-warn" /><span className="flex-1 text-sm">{t("unsavedChanges")}</span>
              <button type="button" className="btn-primary" disabled={busy === "save"} onClick={save}>{busy === "save" ? t("saving") : t("save")}</button>
            </div>
          )}
        </div>
      </div>

      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title={t("clientLinkBtn")}>
        <InterviewLinkCard data={data} reload={reload} />
      </Modal>
      <div className="pointer-events-none fixed -start-[10000px] top-0 w-[794px]" aria-hidden>
        <div ref={pdfRef} className="bg-white p-8">
          <InterviewDoc data={data} answers={answers} steps={steps} foods={foods} branding={branding} />
        </div>
      </div>
    </>
  );
}
