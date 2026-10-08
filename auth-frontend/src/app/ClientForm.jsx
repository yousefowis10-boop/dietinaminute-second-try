import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Spinner, apiError } from "../ui";

const WORK_STYLES = ["bed_bound", "seated_static", "seated_moving", "standing", "sport", "strenuous"];
// Auto macro split by goal: [carbs, protein, fat] %.
const AUTO_SPLIT = { loss: [45, 30, 25], gain: [55, 25, 20], maintain: [50, 25, 25] };
const goalFor = (adj) => (adj < -50 ? "loss" : adj > 50 ? "gain" : "maintain");

function Section({ title, right, children }) {
  return (
    <section className="border-t border-line py-6 first:border-t-0 first:pt-1">
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
        {right && <div className="ms-auto">{right}</div>}
      </div>
      {children}
    </section>
  );
}

function Box({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-brand-ink/80">{label}</span>
      {children}
    </label>
  );
}

// Number input with its unit inside the box.
function UnitInput({ unit, ...props }) {
  return (
    <div className="flex h-12 items-center rounded-xl border border-line bg-white px-4 focus-within:border-brand">
      <input className="num w-full bg-transparent text-[15px] outline-none" type="number" step="any" {...props} />
      {unit && <span className="ms-2 shrink-0 text-sm text-muted">{unit}</span>}
    </div>
  );
}

export default function ClientForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { t, num } = useI18n();
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [newVisit, setNewVisit] = useState(true);
  const [manual, setManual] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", age: "", gender: "M", weight: "", height: "", smm: "", pbf: "",
    work_style: "seated_moving", formula: "", adjustment: -500, carb_pct: 45, protein_pct: 30, fat_pct: 25,
  });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const onField = (key) => (e) => set(key, e.target.value);
  const goal = goalFor(Number(form.adjustment));

  useEffect(() => {
    API.get("/nutrition/bmr-formulas/").then((r) => {
      setFormulas(r.data);
      setForm((f) => ({ ...f, formula: f.formula || r.data.find((x) => x.name === "Mifflin-St Jeor")?.name || r.data[0]?.name || "" }));
    });
  }, []);

  useEffect(() => {
    if (!editing) return;
    API.get(`/nutrition/clients/${id}/`).then((r) => {
      const c = r.data;
      const adj = c.formula_name ? c.calorie_adjustment
        : c.activity_value && c.target_calories ? Math.round(c.target_calories - c.activity_value) : 0;
      const split = [c.carb_percentage || 55, c.protein_percentage || 25, c.fat_percentage || 20];
      const auto = AUTO_SPLIT[goalFor(adj)];
      setManual(split.join() !== auto.join());
      setForm((f) => ({
        ...f, name: c.name, description: c.description || "", age: c.age, gender: c.gender, weight: c.weight, height: c.height,
        smm: c.smm ?? "", pbf: c.pbf ?? "", work_style: c.work_style, formula: c.formula_name || f.formula, adjustment: adj,
        carb_pct: split[0], protein_pct: split[1], fat_pct: split[2],
      }));
      setLoading(false);
    });
  }, [editing, id]);

  // Auto mode: the split follows the goal the slider points to.
  useEffect(() => {
    if (manual) return;
    const [c, p, f] = AUTO_SPLIT[goal];
    setForm((x) => (x.carb_pct === c && x.protein_pct === p && x.fat_pct === f ? x : { ...x, carb_pct: c, protein_pct: p, fat_pct: f }));
  }, [goal, manual]);

  const pctTotal = Number(form.protein_pct) + Number(form.carb_pct) + Number(form.fat_pct);
  const ready = form.weight && form.height && form.age && form.formula && pctTotal === 100;

  // Live numbers come from the server, so they match exactly what gets saved.
  const previewKey = useMemo(() => JSON.stringify([form.formula, form.gender, form.weight, form.height, form.age, form.work_style,
    form.adjustment, form.protein_pct, form.carb_pct, form.fat_pct]), [form]);
  useEffect(() => {
    if (!ready) { setPreview(null); return undefined; }
    const timer = setTimeout(() => {
      API.post("/nutrition/calc-targets/", { ...form }).then((r) => setPreview(r.data)).catch(() => setPreview(null));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, ready]);

  const submit = async (e) => {
    e.preventDefault();
    if (pctTotal !== 100) { toast.error(t("pctMustBe100")); return; }
    setBusy(true);
    try {
      const payload = {
        ...form, goal, smm: form.smm === "" ? null : form.smm, pbf: form.pbf === "" ? null : form.pbf,
        protein_percentage: form.protein_pct, carb_percentage: form.carb_pct, fat_percentage: form.fat_pct,
        create_revision: editing ? newVisit : true,
      };
      if (editing) payload.id = Number(id);
      const res = await API.post("/nutrition/clients/", payload);
      toast.success(t("clientSaved"));
      navigate(`/dashboard/clients/${res.data.id}`);
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label={t("loading")} />;

  const adj = Number(form.adjustment);
  const sliderPct = ((adj + 1000) / 2000) * 100;
  const goalTone = { loss: "bg-warn-soft text-warn", gain: "bg-ai-soft text-ai", maintain: "bg-ok-soft text-ok" }[goal];
  const multiplier = preview?.multiplier;
  const macros = [["carb_pct", "carb_g", t("carbs"), "bg-[#b7791f]"], ["protein_pct", "protein_g", t("protein"), "bg-[#2563a8]"], ["fat_pct", "fat_g", t("fat"), "bg-[#8a4fb0]"]];

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl">
      {editing && <Link to={`/dashboard/clients/${id}`} className="mb-1 inline-block text-sm text-muted hover:text-brand">← {form.name}</Link>}
      <h1 className="mb-5 text-2xl font-bold">{editing ? t("editClientTitle") : t("newClientTitle")}</h1>
      <div className="card px-6 py-5 sm:px-8">
        <Section title={t("secClient")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Box label={t("clientName")}><input className="input h-12" required value={form.name} onChange={onField("name")} /></Box>
            <Box label={<>{t("descriptionLbl")} <span className="font-normal text-muted">({t("optional")})</span></>}>
              <input className="input h-12" placeholder={t("descriptionPh")} value={form.description} onChange={onField("description")} />
            </Box>
          </div>
        </Section>

        <Section title={t("secBody")}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Box label={t("age")}><UnitInput unit={t("years")} min="1" max="110" required value={form.age} onChange={onField("age")} /></Box>
            <Box label={t("weight")}><UnitInput unit={t("kg")} required value={form.weight} onChange={onField("weight")} /></Box>
            <Box label={t("height")}><UnitInput unit={t("cm")} required value={form.height} onChange={onField("height")} /></Box>
            <Box label={t("gender")}>
              <div className="grid h-12 grid-cols-2 overflow-hidden rounded-xl border border-line">
                {[["M", t("male")], ["F", t("female")]].map(([v, label]) => (
                  <button key={v} type="button" onClick={() => set("gender", v)}
                    className={`text-sm font-semibold ${form.gender === v ? "bg-brand text-white" : "bg-white"}`}>{label}</button>
                ))}
              </div>
            </Box>
            <Box label={t("pbfLbl")}><UnitInput unit="%" value={form.pbf} onChange={onField("pbf")} /></Box>
            <Box label={t("smmLbl")}><UnitInput unit={t("kg")} value={form.smm} onChange={onField("smm")} /></Box>
          </div>
        </Section>

        <Section title={t("secCalc")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Box label={t("bmrFormula")}>
              <select className="input h-12" value={form.formula} onChange={onField("formula")}>
                {formulas.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
              </select>
            </Box>
            <Box label={t("workStyle")}>
              <select className="input h-12" value={form.work_style} onChange={onField("work_style")}>
                {WORK_STYLES.map((w) => <option key={w} value={w}>{t(`ws_${w}`)}</option>)}
              </select>
            </Box>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-[#fafbfa] p-4">
              <div className="text-[13px] font-semibold text-muted">{t("bmr")}</div>
              <div className="num mt-1 text-3xl font-bold">{preview ? num(preview.bmr) : "—"} <small className="text-sm font-medium text-muted">{t("kcal")}</small></div>
              <div className="mt-0.5 text-xs text-muted">{form.formula}</div>
            </div>
            <div className="rounded-2xl border border-line bg-[#fafbfa] p-4">
              <div className="text-[13px] font-semibold text-muted">{t("withActivity")}</div>
              <div className="num mt-1 text-3xl font-bold">{preview ? num(preview.tdee) : "—"} <small className="text-sm font-medium text-muted">{t("kcal")}</small></div>
              <div className="mt-0.5 truncate text-xs text-muted">{multiplier ? `× ${multiplier} · ` : ""}{t(`ws_${form.work_style}`)}</div>
            </div>
            <div className="rounded-2xl bg-brand p-4 text-white">
              <div className="text-[13px] font-semibold text-white/75">{t("dailyGoal")}</div>
              <div className="num mt-1 text-3xl font-bold">{preview ? num(preview.target_calories) : "—"} <small className="text-sm font-medium text-white/75">{t("kcal")}</small></div>
              <div className="num mt-0.5 text-xs text-white/75">{adj > 0 ? "+" : ""}{num(adj)} {t("kcal")} · {t(`goal_${goal}`)}</div>
            </div>
          </div>
        </Section>

        <Section title={t("adjustTarget")} right={<div className="flex items-center gap-3"><b className="num" dir="ltr">{adj > 0 ? "+" : ""}{num(adj)} {t("kcal")}</b><span className={`rounded-full px-3 py-0.5 text-xs font-bold ${goalTone}`}>{t(`goal_${goal}`)}</span></div>}>
          <div className="relative py-3" dir="ltr">
            <div className="h-2.5 rounded-full" style={{ background: "linear-gradient(90deg,#d9534f 0%,#e9a23b 25%,#2f9e6e 50%,#e9a23b 75%,#d9534f 100%)" }} />
            <div className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-brand bg-white shadow" style={{ left: `${sliderPct}%` }} />
            <input type="range" min={-1000} max={1000} step={10} value={adj} onChange={(e) => set("adjustment", Number(e.target.value))}
              className="absolute inset-0 w-full cursor-pointer opacity-0" aria-label={t("adjustTarget")} />
          </div>
          <div className="num flex justify-between text-xs text-muted" dir="ltr">
            <span>−1000</span><span>−500</span><span>{t("maintainTick")}</span><span>+500</span><span>+1000</span>
          </div>
        </Section>

        <Section title={t("macrosTitle")} right={(
          <div className="inline-flex overflow-hidden rounded-xl border border-line text-sm font-semibold">
            <button type="button" onClick={() => setManual(false)} className={`px-4 py-1.5 ${!manual ? "bg-brand-soft text-brand" : "bg-white"}`}>{t("auto")}</button>
            <button type="button" onClick={() => setManual(true)} className={`px-4 py-1.5 ${manual ? "bg-brand-soft text-brand" : "bg-white"}`}>{t("manual")}</button>
          </div>
        )}>
          <div className="grid gap-4 sm:grid-cols-3">
            {macros.map(([pctKey, gKey, label, dot]) => (
              <div key={pctKey} className="rounded-2xl border border-line p-4">
                <div className="mb-3 flex items-center gap-2 font-bold"><i className={`h-2.5 w-2.5 rounded-[3px] ${dot}`} />{label}</div>
                <div className="grid grid-cols-2 items-center gap-3">
                  <div className={`flex h-11 items-center rounded-xl border px-3 ${pctTotal === 100 ? "border-line" : "border-bad"} ${manual ? "bg-white" : "bg-page"}`}>
                    <input className="num w-full bg-transparent text-base font-bold outline-none" type="number" min="0" max="100" readOnly={!manual}
                      value={form[pctKey]} onChange={(e) => set(pctKey, e.target.value === "" ? "" : Number(e.target.value))} />
                    <span className="text-sm text-muted">%</span>
                  </div>
                  <div className="num text-end text-2xl font-bold">{preview ? num(preview[gKey]) : "—"} <small className="text-xs font-medium text-muted">{t("g")}</small></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${pctTotal === 100 ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>
              {pctTotal === 100 ? t("total100") : t("totalPct", { n: pctTotal })}
            </span>
            <span className="text-muted">{t("macroHint")}</span>
          </div>
        </Section>

        {editing && (
          <label className="mb-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={newVisit} onChange={(e) => setNewVisit(e.target.checked)} />{t("countAsVisit")}
          </label>
        )}
        <div className="flex gap-3 pb-2">
          <button type="button" className="btn-secondary h-12 w-40" onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button type="submit" className="btn-primary h-12 flex-1 text-[15px]" disabled={busy || !ready}>
            {busy ? t("saving") : editing ? t("saveChanges") : t("createClient")}
          </button>
        </div>
      </div>
    </form>
  );
}
