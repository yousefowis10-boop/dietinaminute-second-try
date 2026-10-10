import { useEffect, useState } from "react";
import { Pill, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { InfoTip } from "../ui";

// Common supplements with a usual starting dose. The dietitian can change any dose, time or note.
export const SUPPLEMENTS = [
  { key: "whey", group: "protein", en: "Whey protein", ar: "واي بروتين", dose: "30", unit: "g", when: "post_workout" },
  { key: "casein", group: "protein", en: "Casein protein", ar: "كازين بروتين", dose: "30", unit: "g", when: "bedtime" },
  { key: "plant_protein", group: "protein", en: "Plant protein", ar: "بروتين نباتي", dose: "30", unit: "g", when: "post_workout" },
  { key: "creatine", group: "performance", en: "Creatine monohydrate", ar: "كرياتين مونوهيدرات", dose: "5", unit: "g", when: "any" },
  { key: "eaa", group: "performance", en: "Essential amino acids (EAA)", ar: "أحماض أمينية أساسية (EAA)", dose: "10", unit: "g", when: "pre_workout" },
  { key: "bcaa", group: "performance", en: "BCAA", ar: "أحماض أمينية متفرعة (BCAA)", dose: "5", unit: "g", when: "pre_workout" },
  { key: "beta_alanine", group: "performance", en: "Beta-alanine", ar: "بيتا ألانين", dose: "3", unit: "g", when: "any" },
  { key: "caffeine", group: "performance", en: "Caffeine", ar: "كافيين", dose: "150", unit: "mg", when: "pre_workout" },
  { key: "glutamine", group: "performance", en: "Glutamine", ar: "جلوتامين", dose: "5", unit: "g", when: "post_workout" },
  { key: "electrolytes", group: "performance", en: "Electrolytes", ar: "أملاح معدنية (إلكترولايت)", dose: "1", unit: "sachet", when: "pre_workout" },
  { key: "collagen", group: "performance", en: "Collagen", ar: "كولاجين", dose: "10", unit: "g", when: "morning" },
  { key: "vit_d", group: "vitamins", en: "Vitamin D3", ar: "فيتامين د3", dose: "2000", unit: "IU", when: "with_meal" },
  { key: "vit_b12", group: "vitamins", en: "Vitamin B12", ar: "فيتامين ب12", dose: "1000", unit: "mcg", when: "morning" },
  { key: "vit_c", group: "vitamins", en: "Vitamin C", ar: "فيتامين سي", dose: "500", unit: "mg", when: "with_meal" },
  { key: "folic", group: "vitamins", en: "Folic acid", ar: "حمض الفوليك", dose: "400", unit: "mcg", when: "morning" },
  { key: "b_complex", group: "vitamins", en: "Vitamin B complex", ar: "مجموعة فيتامين ب", dose: "1", unit: "tablet", when: "with_breakfast" },
  { key: "multi", group: "vitamins", en: "Multivitamin", ar: "فيتامينات متعددة", dose: "1", unit: "tablet", when: "with_breakfast" },
  { key: "iron", group: "minerals", en: "Iron", ar: "حديد", dose: "65", unit: "mg", when: "morning", note: { en: "With vitamin C or orange juice; not with tea, coffee or dairy", ar: "مع فيتامين سي أو عصير برتقال؛ ليس مع الشاي أو القهوة أو الألبان" } },
  { key: "magnesium", group: "minerals", en: "Magnesium glycinate", ar: "مغنيسيوم جلايسينات", dose: "300", unit: "mg", when: "bedtime" },
  { key: "zinc", group: "minerals", en: "Zinc", ar: "زنك", dose: "15", unit: "mg", when: "with_meal" },
  { key: "calcium", group: "minerals", en: "Calcium", ar: "كالسيوم", dose: "500", unit: "mg", when: "with_meal", note: { en: "Not at the same time as iron", ar: "ليس مع الحديد في نفس الوقت" } },
  { key: "omega3", group: "other", en: "Omega-3 (fish oil)", ar: "أوميغا 3 (زيت السمك)", dose: "1000", unit: "mg", when: "with_meal" },
  { key: "probiotic", group: "other", en: "Probiotic", ar: "بروبيوتيك", dose: "1", unit: "capsule", when: "morning" },
  { key: "psyllium", group: "other", en: "Psyllium fibre", ar: "ألياف السيليوم", dose: "5", unit: "g", when: "with_meal", note: { en: "With a big glass of water", ar: "مع كوب ماء كبير" } },
];
const BY_KEY = Object.fromEntries(SUPPLEMENTS.map((s) => [s.key, s]));
export const GROUPS = ["protein", "performance", "vitamins", "minerals", "other"];
export const WHEN = ["morning", "with_breakfast", "with_meal", "pre_workout", "post_workout", "bedtime", "any"];
const UNITS = ["g", "mg", "mcg", "IU", "ml", "tablet", "capsule", "scoop", "sachet"];
const UNIT_KEYS = new Set(UNITS);

export function suppName(row, lang) {
  const lib = BY_KEY[row.key];
  return row.name || (lib ? lib[lang] || lib.en : row.key);
}

// The list as the client sees it (sheet, PDF, phone page).
export function SupplementsList({ rows, compact = false }) {
  const { t, lang } = useI18n();
  if (!rows?.length) return null;
  return (
    <section className={`rounded-2xl border border-[#e7e1f4] ${compact ? "" : "mt-4"}`}>
      <div className="flex items-center gap-2 rounded-t-2xl bg-[#f4f0fb] px-4 py-2.5 text-sm font-bold text-[#5b3fa0]"><Pill className="h-4 w-4" />{t("supplementsTitle")}</div>
      <ul className="divide-y divide-[#f0edf6] px-4">
        {rows.map((r, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 text-[13.5px]">
            <b className="min-w-0 flex-1">{suppName(r, lang)}</b>
            <span className="num font-semibold">{r.dose} {(UNIT_KEYS.has(r.unit) ? t(`unit_${r.unit}`) : r.unit)}</span>
            <span className="rounded-full bg-page px-2 py-0.5 text-xs text-muted">{t(`when_${r.when || "any"}`)}</span>
            {r.note && <span className="w-full text-xs text-muted">{r.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// The dietitian's editor (client sheet → Supplements tab).
export function SupplementsEditor({ planId, initial, onSaved }) {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState(initial || []);
  const [busy, setBusy] = useState(false);
  useEffect(() => setRows(initial || []), [initial]);
  const used = new Set(rows.map((r) => r.key));
  const add = (s) => setRows((list) => [...list, { key: s.key, name: "", dose: s.dose, unit: s.unit, when: s.when, note: s.note ? s.note[lang] || s.note.en : "" }]);
  const addOther = () => setRows((list) => [...list, { key: "", name: "", dose: "", unit: "mg", when: "any", note: "" }]);
  const set = (i, patch) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const save = async () => {
    setBusy(true);
    try {
      const r = await API.put(`/nutrition/plan/${planId}/supplements/`, { supplements: rows });
      onSaved(r.data.supplements);
      toast.success(t("saved"));
    } catch { toast.error(t("error")); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2"><Pill className="h-4 w-4 text-[#5b3fa0]" /><h3 className="font-bold">{t("supplementsTitle")}</h3><InfoTip text={t("supplementsHint")} /></div>
        {!rows.length && <p className="rounded-xl bg-page p-4 text-sm text-muted">{t("noSupplements")}</p>}
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid items-center gap-2 rounded-xl border border-line p-2.5 sm:grid-cols-[1.4fr_90px_100px_1.1fr_auto]">
              {r.key ? <b className="px-1 text-sm">{suppName(r, lang)}</b>
                : <input className="input h-9 text-sm" placeholder={t("supplementName")} value={r.name} onChange={(e) => set(i, { name: e.target.value })} />}
              <input className="input num h-9 text-sm" inputMode="decimal" value={r.dose} onChange={(e) => set(i, { dose: e.target.value })} aria-label={t("dose")} />
              <select className="input h-9 text-sm" value={r.unit} onChange={(e) => set(i, { unit: e.target.value })}>
                {UNITS.map((u) => <option key={u} value={u}>{t(`unit_${u}`)}</option>)}
              </select>
              <select className="input h-9 text-sm" value={r.when} onChange={(e) => set(i, { when: e.target.value })}>
                {WHEN.map((w) => <option key={w} value={w}>{t(`when_${w}`)}</option>)}
              </select>
              <button type="button" className="justify-self-end text-[#b9c0bc] hover:text-bad" onClick={() => setRows((list) => list.filter((_, j) => j !== i))} aria-label={t("delete")}><X className="h-4 w-4" /></button>
              <input className="input h-8 text-xs sm:col-span-5" placeholder={t("supplementNote")} value={r.note} onChange={(e) => set(i, { note: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={addOther}><Plus className="h-4 w-4" />{t("otherSupplement")}</button>
          <button type="button" className="btn-primary ms-auto" disabled={busy} onClick={save}>{busy ? t("saving") : t("save")}</button>
        </div>
      </div>
      <div className="card p-4">
        <h4 className="mb-2 text-sm font-bold">{t("addSupplement")}</h4>
        {GROUPS.map((g) => (
          <div key={g} className="mb-3">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">{t(`suppGroup_${g}`)}</div>
            <div className="flex flex-wrap gap-1.5">
              {SUPPLEMENTS.filter((s) => s.group === g).map((s) => (
                <button key={s.key} type="button" disabled={used.has(s.key)} onClick={() => add(s)}
                  className="rounded-full border border-line px-2.5 py-1 text-xs font-medium hover:border-brand hover:text-brand disabled:opacity-40">
                  + {s[lang] || s.en}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
