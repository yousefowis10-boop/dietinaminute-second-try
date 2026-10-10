import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Camera, Check, Plus, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import API, { cachedGet, clearCached } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { Badge, Field, InfoTip, Modal, PageHeader, Spinner, TestModeBadge, apiError } from "../ui";
import { amountOf, kcalOf, unitLabel } from "./foodUtils";
import { RecipeModal } from "./RecipeCard";
import { readFileAsDataUrl } from "./client/CheckIn";

const EMPTY = { name: "", name_ar: "", brand: "", serving: "", unit: "g", protein: "", carb: "", fat: "" };

// Add a food: from photos of the nutrition label (AI reads it; brand required; goes into the main list for everyone)
// or typed by hand (only this dietitian / company sees it until an admin approves it).
function AddFoodModal({ mode, onClose, onSaved }) {
  const { t, num } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState("form");
  const [testMode, setTestMode] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setForm(EMPTY); setStep(mode === "label" ? "photo" : "form"); setTestMode(false); }, [mode]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const kcal = kcalOf({ protein: Number(form.protein) || 0, carb: Number(form.carb) || 0, fat: Number(form.fat) || 0 });

  const read = async (fileList) => {
    const files = [...fileList].slice(0, 4);
    if (!files.length) return;
    setStep("reading");
    try {
      const payload = await Promise.all(files.map(async (f) => ({ name: f.name, content_type: f.type || "image/jpeg", data: await readFileAsDataUrl(f) })));
      const r = (await API.post("/nutrition/foods/read-label/", { files: payload })).data;
      setForm({ name: r.name || "", name_ar: r.name_ar || "", brand: r.brand || "", serving: r.serving ?? "", unit: r.unit || "g",
        protein: r.protein ?? "", carb: r.carb ?? "", fat: r.fat ?? "" });
      setTestMode(!!r.test_mode);
      setStep("form");
    } catch (err) {
      toast.error(apiError(err, t));
      setStep("photo");
    }
  };

  const save = async () => {
    if (mode === "label" && !form.brand.trim()) { toast.error(t("brandRequired")); return; }
    setBusy(true);
    try {
      const r = await API.post("/nutrition/foods/add/", { ...form, from_label: mode === "label" });
      toast.success(mode === "label" ? t("foodAddedPublic") : t("foodAddedPending"));
      onSaved(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.name === "exists" ? t("foodExists") : apiError(err, t));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={Boolean(mode)} onClose={onClose} title={mode === "label" ? t("addFromLabel") : t("addManually")}>
      <p className="mb-4 rounded-xl bg-page px-3.5 py-2.5 text-[13px] text-muted">{mode === "label" ? t("labelNote") : t("manualNote")}</p>
      {step === "photo" && (
        <label className="grid cursor-pointer place-items-center gap-2 rounded-2xl border-2 border-dashed border-[#c9d0cc] px-4 py-10 text-center hover:border-brand">
          <Camera className="h-8 w-8 text-brand" />
          <span className="font-semibold">{t("labelPhotos")}</span>
          <span className="text-xs text-muted">{t("labelPhotosHint")}</span>
          <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => read(e.target.files)} />
        </label>
      )}
      {step === "reading" && <Spinner label={t("labelReading")} />}
      {step === "form" && (
        <>
          {testMode && <div className="mb-3"><TestModeBadge /></div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${t("brandName")}${mode === "label" ? " *" : ""}`}><input className="input" value={form.brand} onChange={set("brand")} /></Field>
            <Field label={t("foodNameEn")}><input className="input" value={form.name} onChange={set("name")} /></Field>
            <Field label={t("foodNameAr")}><input className="input" dir="rtl" value={form.name_ar} onChange={set("name_ar")} /></Field>
            <Field label={t("servingSize")}>
              <div className="flex gap-2">
                <input className="input num" inputMode="decimal" value={form.serving} onChange={set("serving")} />
                <select className="input w-24" value={form.unit} onChange={set("unit")}><option value="g">{t("gShort")}</option><option value="ml">{t("mlShort")}</option></select>
              </div>
            </Field>
            {[["protein", t("protein")], ["carb", t("carbs")], ["fat", t("fat")]].map(([k, label]) => (
              <Field key={k} label={`${label} (${t("gShort")}) · ${t("perServing")}`}><input className="input num" inputMode="decimal" value={form[k]} onChange={set(k)} /></Field>
            ))}
            <div className="flex items-end pb-2 text-sm text-muted">{t("kcal")}: <b className="num ms-1 text-brand-ink">{num(kcal)}</b></div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            {mode === "label" && <button type="button" className="btn-ghost me-auto" onClick={() => setStep("photo")}><Camera className="h-4 w-4" />{t("otherPhoto")}</button>}
            <button type="button" className="btn-ghost" onClick={onClose}>{t("cancel")}</button>
            <button type="button" className="btn-primary" disabled={busy} onClick={save}>{busy ? t("saving") : t("save")}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// Admin only: foods typed in by dietitians that wait to join the main list.
function ApprovalQueue({ onChange }) {
  const { t, foodName, num } = useI18n();
  const [list, setList] = useState(null);
  const load = useCallback(() => API.get("/nutrition/foods/review/").then((r) => setList(r.data)).catch(() => setList([])), []);
  useEffect(() => { load(); }, [load]);
  const decide = async (f, approve) => {
    await API.post(`/nutrition/foods/review/${f.id}/`, { approve });
    toast.success(approve ? t("approved") : t("rejected"));
    load();
    onChange();
  };
  if (!list?.length) return null;
  return (
    <section className="card mb-4 border-warn/30 p-4">
      <h3 className="mb-2 font-bold">{t("approvalQueue")} <span className="num text-muted">({num(list.length)})</span></h3>
      <ul className="divide-y divide-line">
        {list.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
            <span className="min-w-0 flex-1"><b>{foodName(f)}</b>
              <span className="num block text-xs text-muted">{f.unit} · {t("pShort")} {num(f.protein, 1)} · {t("cShort")} {num(f.carb, 1)} · {t("fShort")} {num(f.fat, 1)} · {f.added_by_name}</span></span>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => decide(f, false)}><X className="h-3.5 w-3.5" />{t("reject")}</button>
            <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => decide(f, true)}><Check className="h-3.5 w-3.5" />{t("approve")}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Foods() {
  const { t, lang, foodName, num } = useI18n();
  const { account } = useAuth();
  const [foods, setFoods] = useState(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [recipeFor, setRecipeFor] = useState(null);
  const [adding, setAdding] = useState(null); // "label" | "manual"
  const closeRecipe = useCallback(() => setRecipeFor(null), []);

  const load = useCallback(() => cachedGet("/nutrition/foods/").then((r) => setFoods(r.data)), []);
  useEffect(() => { load(); }, [load]);
  const refresh = () => { clearCached("/nutrition/foods/"); load(); };
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (foods || []).filter((f) => (!type || (type === "recipe" ? f.recipe : type === "mine" ? f.source : f.food_type === type))
      && (!q || (f.name || "").toLowerCase().includes(q) || (f.name_ar || "").includes(q)));
  }, [foods, query, type]);

  return (
    <>
      <PageHeader title={t("foodsTitle")} subtitle={t("foodsHint")} actions={(
        <>
          <button type="button" className="btn-secondary" onClick={() => setAdding("manual")}><Plus className="h-4 w-4" />{t("addManually")}</button>
          <button type="button" className="btn-primary" onClick={() => setAdding("label")}><Camera className="h-4 w-4" />{t("addFromLabel")}</button>
        </>
      )} />
      {account?.is_staff && <ApprovalQueue onChange={refresh} />}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input ps-9" placeholder={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">—</option>
          {["protein", "carb", "fat"].map((x) => <option key={x} value={x}>{t(`type_${x}`)}</option>)}
          <option value="recipe">{t("recipesTab")}</option>
          <option value="mine">{t("addedFoods")}</option>
        </select>
      </div>
      {!foods ? <Spinner label={t("loading")} /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-page text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 text-start font-semibold">{lang === "ar" ? "الطعام" : "Food"}</th>
                <th className="px-3 py-2.5 text-start font-semibold">{t("unit")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("kcal")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("protein")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("carbs")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("fat")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => (
                <tr key={f.id} className="border-t border-line">
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap items-center gap-2 font-medium">{foodName(f)}
                      {f.recipe && (
                        <button type="button" className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand hover:bg-brand hover:text-white" onClick={() => setRecipeFor(f.id)}>
                          <BookOpen className="h-3 w-3" />{t("viewRecipe")}
                        </button>
                      )}
                      {f.review_status === "pending" && <Badge tone="warn">{t("pendingApproval")}</Badge>}
                      {f.review_status === "rejected" && <Badge>{t("onlyYou")}</Badge>}
                    </div>
                    <div className="text-xs text-muted">{t(`type_${f.food_type}`)}</div>
                  </td>
                  <td className="px-3 py-2 text-muted">{amountOf(f, 1)} {unitLabel(f, lang)}</td>
                  <td className="num px-3 py-2 text-center">{num(kcalOf(f))}</td>
                  <td className="num px-3 py-2 text-center">{num(f.protein, 1)}</td>
                  <td className="num px-3 py-2 text-center">{num(f.carb, 1)}</td>
                  <td className="num px-3 py-2 text-center">{num(f.fat, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-2"><InfoTip text={t("foodSourcesHint")} /></div>
      <AddFoodModal mode={adding} onClose={() => setAdding(null)} onSaved={() => { setAdding(null); refresh(); }} />
      <RecipeModal foodId={recipeFor} onClose={closeRecipe} />
    </>
  );
}
