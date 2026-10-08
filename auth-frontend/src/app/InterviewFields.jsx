import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { useI18n } from "../i18n";
import { DRINKS, FREQS, FREQ_UNIT, optionLabel } from "./interviewConfig";

const CHIP = { ok: "bg-[#d7ebe4] text-[#124a3c]", bad: "bg-bad-soft text-bad", warn: "bg-warn-soft text-warn" };
const TYPE_ORDER = ["carb", "protein", "fat", "mixed"];

// Pick several foods from the food database. Value = list of food ids.
export function FoodsPicker({ foods, value, onChange, tone = "ok", disabledIds = [] }) {
  const { t, lang, foodName } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const ids = Array.isArray(value) ? value : [];
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  const match = (f) => !q || (f.name || "").toLowerCase().includes(q.toLowerCase()) || (f.name_ar || "").includes(q);
  const toggle = (id) => onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  return (
    <div className="relative" ref={ref}>
      <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-2" onClick={() => setOpen(true)} role="button" tabIndex={0}>
        {ids.map((id) => byId[id] && (
          <span key={id} className={`inline-flex h-7 items-center gap-1 rounded-full px-3 text-[13px] font-semibold ${CHIP[tone]}`}>
            {foodName(byId[id])}
            <button type="button" onClick={(e) => { e.stopPropagation(); toggle(id); }} className="opacity-60 hover:opacity-100" aria-label={t("delete")}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <span className="ms-1 text-[13px] text-[#a3aba7]">{t("addDots")}</span>
        <ChevronDown className="ms-auto h-3.5 w-3.5 text-muted" />
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-w-sm rounded-xl border border-line bg-white p-2 shadow-xl">
          <div className="relative mb-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input autoFocus className="input h-9 ps-8 text-sm" placeholder={t("searchFood")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {TYPE_ORDER.map((type) => {
              const list = foods.filter((f) => (f.food_type || "mixed") === type && match(f));
              if (!list.length) return null;
              return (
                <div key={type}>
                  <div className="px-2 pb-0.5 pt-2 text-[11px] font-bold text-muted">{t(`type_${type}`)}</div>
                  {list.map((f) => {
                    const on = ids.includes(f.id);
                    const blocked = disabledIds.includes(f.id) && !on;
                    return (
                      <button key={f.id} type="button" disabled={blocked} onClick={() => toggle(f.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-page disabled:opacity-40 ${on ? "font-semibold" : ""}`}>
                        <i className={`grid h-4 w-4 place-items-center rounded border-[1.5px] ${on ? "border-brand bg-brand" : "border-[#c4ccc8]"}`} />
                        {lang === "ar" ? f.name_ar || f.name : f.name}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// How often each drink, with an amount. Value = {coffee_tea: {freq, amount}, ..., water_l}.
export function DrinksTable({ value, onChange }) {
  const { lang, t } = useI18n();
  const ar = lang === "ar";
  const v = value && typeof value === "object" ? value : {};
  const setRow = (key, patch) => onChange({ ...v, [key]: { ...(v[key] || {}), ...patch } });
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
        <colgroup><col style={{ width: "24%" }} />{FREQS.map((f) => <col key={f[0]} />)}<col style={{ width: "17%" }} /></colgroup>
        <thead><tr className="text-xs text-muted">
          <th className="pb-2 text-start font-semibold">{t("drink")}</th>
          {FREQS.map((f) => <th key={f[0]} className="pb-2 text-center font-semibold">{ar ? f[1] : f[2]}</th>)}
          <th className="pb-2 text-center font-semibold">{t("colAmount")}</th>
        </tr></thead>
        <tbody>
          {DRINKS.map(([key, arName, enName]) => {
            const row = v[key] || {};
            const unit = FREQ_UNIT[row.freq];
            return (
              <tr key={key} className="border-t border-[#f0f2f0]">
                <td className="py-2 font-semibold">{ar ? arName : enName}</td>
                {FREQS.map(([f]) => (
                  <td key={f} className="text-center">
                    <button type="button" aria-label={f} onClick={() => setRow(key, { freq: f, amount: unit && FREQ_UNIT[f] ? row.amount : null })}
                      className={`h-[18px] w-[18px] rounded-full border-[1.5px] ${row.freq === f ? "border-[5.5px] border-brand" : "border-[#c4ccc8]"}`} />
                  </td>
                ))}
                <td className="text-center">
                  {unit ? (
                    <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2 text-[13px]">
                      <input className="num w-9 bg-transparent text-center outline-none" type="number" min="0" value={row.amount ?? ""} onChange={(e) => setRow(key, { amount: e.target.value === "" ? null : Number(e.target.value) })} />
                      <span className="whitespace-nowrap text-muted">{unit[ar ? 0 : 1]}</span>
                    </span>
                  ) : <span className="text-muted">—</span>}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-[#f0f2f0]">
            <td className="py-2 font-semibold">{t("water")}</td>
            <td colSpan={FREQS.length} className="text-start text-muted">{t("waterQ")}</td>
            <td className="text-center">
              <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2 text-[13px]">
                <input className="num w-10 bg-transparent text-center outline-none" type="number" min="0" step="0.5" value={v.water_l ?? ""} onChange={(e) => onChange({ ...v, water_l: e.target.value === "" ? null : Number(e.target.value) })} />
                <span className="text-muted">{t("litre")}</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const WIDE_TYPES = new Set(["long", "checkbox", "drinks"]);
export const isWide = (field) => field.wide || WIDE_TYPES.has(field.type);

// Renders one interview question. Used on the client's link and inside the app.
export function Question({ field, value, onChange, foods = [], blockedFoods = [] }) {
  const { lang, t } = useI18n();
  const label = field[lang] || field.en;
  const hint = field.hint?.[lang];
  const choice = (v, selected, onClick) => (
    <button key={v} type="button" onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${selected ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-white hover:border-brand/40"}`}>
      {optionLabel(v, lang)}
    </button>
  );
  let control;
  switch (field.type) {
    case "foods":
      control = <FoodsPicker foods={foods} value={value} onChange={onChange} tone={field.tone} disabledIds={blockedFoods} />;
      break;
    case "drinks":
      control = <DrinksTable value={value} onChange={onChange} />;
      break;
    case "long":
      control = <textarea className="input" rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "option":
      control = field.options.length > 7 ? (
        <select className="input" value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {field.options.map((o) => <option key={o} value={o}>{optionLabel(o, lang)}</option>)}
        </select>
      ) : (
        <div className="inline-grid grid-flow-col overflow-hidden rounded-xl border border-line">
          {field.options.map((o) => (
            <button key={o} type="button" onClick={() => onChange(value === o ? null : o)}
              className={`h-10 border-s border-line px-4 text-[13px] font-semibold first:border-s-0 ${value === o ? "bg-brand text-white" : "bg-white"}`}>{optionLabel(o, lang)}</button>
          ))}
        </div>
      );
      break;
    case "checkbox": {
      const list = Array.isArray(value) ? value : [];
      control = (
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => choice(o, list.includes(o), () => onChange(list.includes(o) ? list.filter((x) => x !== o) : [...list, o])))}
        </div>
      );
      break;
    }
    case "boolean":
      control = (
        <div className="inline-grid grid-flow-col overflow-hidden rounded-xl border border-line">
          {[[true, t("yes")], [false, t("no")]].map(([v, l]) => (
            <button key={l} type="button" onClick={() => onChange(value === v ? null : v)}
              className={`h-10 border-s border-line px-5 text-[13px] font-semibold first:border-s-0 ${value === v ? "bg-brand text-white" : "bg-white"}`}>{l}</button>
          ))}
        </div>
      );
      break;
    case "number":
      control = <input className="input num h-11 max-w-[10rem]" type="number" min="0" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
      break;
    case "time":
    case "date":
      control = <input className="input h-11 max-w-[12rem]" type={field.type} dir="ltr" value={value || ""} onChange={(e) => onChange(e.target.value || null)} />;
      break;
    default:
      control = <input className="input h-11" type={field.type === "email" ? "email" : "text"} dir={field.type === "email" ? "ltr" : undefined}
        placeholder={field.placeholder?.[lang] || ""} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <div className={isWide(field) ? "sm:col-span-2" : ""}>
      <div className="mb-2 flex items-baseline gap-2 text-sm font-semibold">{label}{hint && <span className="text-[12.5px] font-normal text-muted">{hint}</span>}</div>
      {control}
    </div>
  );
}

export function visibleFields(step, answers, { publicOnly = false } = {}) {
  const has = (v) => v !== null && v !== undefined && v !== "";
  return step.fields.filter((f) => (!publicOnly || f.public !== false) && (!f.showIf || answers[f.showIf] === true)
    && (!f.legacy || (!publicOnly && has(answers[f.name]))));
}
