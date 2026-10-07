import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Card, Field, PageHeader, Spinner, apiError } from "../ui";

const WORK_STYLES = ["bed_bound", "seated_static", "seated_moving", "standing", "sport", "strenuous"];
const DEFAULT_SPLIT = { loss: [30, 45, 25], gain: [25, 55, 20], maintain: [25, 50, 25], "": [25, 55, 20] };

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
  const [form, setForm] = useState({
    name: "", description: "", age: "", gender: "F", weight: "", height: "", smm: "", pbf: "",
    goal: "loss", work_style: "seated_moving", formula: "", adjustment: -500,
    protein_pct: 30, carb_pct: 45, fat_pct: 25,
  });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const onField = (key) => (e) => set(key, e.target.value);

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
      setForm((f) => ({
        ...f, name: c.name, description: c.description || "", age: c.age, gender: c.gender, weight: c.weight, height: c.height,
        smm: c.smm ?? "", pbf: c.pbf ?? "", goal: c.goal || "", work_style: c.work_style,
        adjustment: c.activity_value && c.target_calories ? Math.round(c.target_calories - c.activity_value) : 0,
        protein_pct: c.protein_percentage || 25, carb_pct: c.carb_percentage || 55, fat_pct: c.fat_percentage || 20,
      }));
      setLoading(false);
    });
  }, [editing, id]);

  const pctTotal = Number(form.protein_pct) + Number(form.carb_pct) + Number(form.fat_pct);
  const ready = form.weight && form.height && form.age && form.formula && pctTotal === 100;

  // Live preview: the server does the calculation, so the numbers match what gets saved.
  const previewKey = useMemo(() => JSON.stringify([form.formula, form.gender, form.weight, form.height, form.age, form.work_style,
    form.adjustment, form.protein_pct, form.carb_pct, form.fat_pct]), [form]);
  useEffect(() => {
    if (!ready) { setPreview(null); return undefined; }
    const timer = setTimeout(() => {
      API.post("/nutrition/calc-targets/", { ...form }).then((r) => setPreview(r.data)).catch(() => setPreview(null));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, ready]);

  const onGoal = (goal) => {
    const [p, c, f] = DEFAULT_SPLIT[goal];
    setForm((x) => ({ ...x, goal, adjustment: goal === "loss" ? -500 : goal === "gain" ? 300 : 0, protein_pct: p, carb_pct: c, fat_pct: f }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (pctTotal !== 100) { toast.error(t("pctMustBe100")); return; }
    setBusy(true);
    try {
      const payload = {
        ...form, smm: form.smm === "" ? null : form.smm, pbf: form.pbf === "" ? null : form.pbf,
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

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={editing ? t("editClientTitle") : t("newClientTitle")}
        back={editing && <Link to={`/dashboard/clients/${id}`} className="mb-1 inline-block text-sm text-muted hover:text-brand">← {form.name}</Link>}
        actions={<button type="submit" className="btn-primary" disabled={busy || !ready}>{busy ? t("saving") : t("saveClient")}</button>}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fullName")} className="sm:col-span-2"><input className="input" required value={form.name} onChange={onField("name")} /></Field>
              <Field label={t("age")}><input className="input num" type="number" min="1" max="110" required value={form.age} onChange={onField("age")} /></Field>
              <Field label={t("gender")}>
                <div className="flex gap-2">
                  {[["F", t("female")], ["M", t("male")]].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => set("gender", v)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm ${form.gender === v ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-white"}`}>{label}</button>
                  ))}
                </div>
              </Field>
              <Field label={`${t("notes")} (${t("optional")})`} className="sm:col-span-2">
                <textarea className="input" rows={2} value={form.description} onChange={onField("description")} />
              </Field>
            </div>
          </Card>
          <Card title={t("measurements")}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label={`${t("weight")} (${t("kg")})`}><input className="input num" type="number" step="0.1" required value={form.weight} onChange={onField("weight")} /></Field>
              <Field label={`${t("height")} (${t("cm")})`}><input className="input num" type="number" step="0.1" required value={form.height} onChange={onField("height")} /></Field>
              <Field label={`${t("bodyFat")} %`}><input className="input num" type="number" step="0.1" value={form.pbf} onChange={onField("pbf")} /></Field>
              <Field label={`${t("muscle")} (${t("kg")})`}><input className="input num" type="number" step="0.1" value={form.smm} onChange={onField("smm")} /></Field>
            </div>
          </Card>
          <Card title={t("targetsTitle")}>
            <Field label={t("goal")}>
              <div className="flex flex-wrap gap-2">
                {["loss", "maintain", "gain"].map((g) => (
                  <button key={g} type="button" onClick={() => onGoal(g)}
                    className={`rounded-lg border px-4 py-2 text-sm ${form.goal === g ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-white"}`}>{t(`goal_${g}`)}</button>
                ))}
              </div>
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t("workStyle")}>
                <select className="input" value={form.work_style} onChange={onField("work_style")}>
                  {WORK_STYLES.map((w) => <option key={w} value={w}>{t(`ws_${w}`)}</option>)}
                </select>
              </Field>
              <Field label={t("formula")}>
                <select className="input" value={form.formula} onChange={onField("formula")}>
                  {formulas.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                </select>
              </Field>
              <Field label={`${t("adjustment")} (${t("kcal")})`} hint={t("adjustmentHint")}>
                <input className="input num" type="number" step="50" dir="ltr" value={form.adjustment} onChange={onField("adjustment")} />
              </Field>
            </div>
            <div className="mt-4">
              <span className="label">{t("macroSplit")} (%)</span>
              <div className="grid grid-cols-3 gap-3">
                {[["protein_pct", t("protein")], ["carb_pct", t("carbs")], ["fat_pct", t("fat")]].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input className="input num" type="number" min="0" max="100" value={form[key]} onChange={onField(key)} />
                  </Field>
                ))}
              </div>
              {pctTotal !== 100 && <p className="mt-2 text-xs font-semibold text-bad">{t("pctMustBe100")} ({pctTotal}%)</p>}
            </div>
            {editing && (
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newVisit} onChange={(e) => setNewVisit(e.target.checked)} />
                {t("visits")}: +1
              </label>
            )}
          </Card>
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card title={t("dailyTarget")}>
            {preview ? (
              <>
                <div className="num text-4xl font-bold text-brand">{num(preview.target_calories)}<span className="ms-1 text-base font-medium text-muted">{t("kcal")}</span></div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">{t("bmr")}</dt><dd className="num">{num(preview.bmr)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">{t("tdee")}</dt><dd className="num">{num(preview.tdee)}</dd></div>
                </dl>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[["protein_g", t("protein")], ["carb_g", t("carbs")], ["fat_g", t("fat")]].map(([k, label]) => (
                    <div key={k} className="rounded-lg bg-page p-2">
                      <div className="num font-bold">{num(preview[k])}{t("g")}</div>
                      <div className="text-[11px] text-muted">{label}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-muted">—</p>}
          </Card>
        </div>
      </div>
    </form>
  );
}
