import { useState } from "react";
import { ChevronDown, Pill, Plus, Shuffle, TriangleAlert } from "lucide-react";
import { useI18n } from "../i18n";

const BAR = { ok: "bg-ok", near: "bg-warn", low: "bg-bad", high: "bg-bad" };

// Plan vitamins & minerals from the foods' USDA values (per serving) and the servings in the plan.
export function microRows(items, foods, needs, nutrients, excludedIds = new Set()) {
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  const totals = {};
  const missing = [];
  items.filter((i) => i.quantity > 0).forEach((i) => {
    const m = byId[i.food_id]?.micros || {};
    if (!Object.keys(m).length) { missing.push(i.food_id); return; }
    nutrients.forEach((n) => { totals[n.key] = (totals[n.key] || 0) + Number(m[n.key] || 0) * Number(i.quantity); });
  });
  const inPlan = new Set(items.filter((i) => i.quantity > 0).map((i) => i.food_id));
  const rows = nutrients.map((n) => {
    const value = totals[n.key] || 0;
    const need = needs[n.key];
    const pct = need ? Math.round((100 * value) / need) : 0;
    const status = n.kind === "max" ? (value > need ? "high" : "ok") : pct >= 90 ? "ok" : pct < 50 ? "low" : "near";
    const sources = status === "low" || status === "near"
      ? foods.filter((f) => !excludedIds.has(f.id) && !inPlan.has(f.id) && Number(f.micros?.[n.key]) > 0)
        .sort((a, b) => Number(b.micros[n.key]) - Number(a.micros[n.key])).slice(0, 3)
        .map((f) => ({ ...f, amount: Number(f.micros[n.key]) }))
      : [];
    return { ...n, value, need, pct, status, sources };
  });
  return { rows, missing: missing.length };
}

const fmt = (v) => (v >= 100 ? Math.round(v).toLocaleString("en-US") : Math.round(v * 10) / 10);

export default function MicrosPanel({ rows, missing = 0, bloodLow = [], onAdd, swap = false, collapsible = false }) {
  const { t, lang, foodName } = useI18n();
  const ar = lang === "ar";
  const [open, setOpen] = useState(!collapsible);
  const gaps = rows.filter((r) => r.status === "low" || r.status === "high");
  const unitOf = (r) => (r.unit === "µg" ? t("ugShort") : r.unit === "mg" ? t("mgShort") : t("gShort"));

  return (
    <section className="card p-4">
      <button type="button" className="flex w-full flex-wrap items-center gap-2 text-start" onClick={() => collapsible && setOpen((o) => !o)}>
        <Pill className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-bold">{t("microsTitle")}</h3>
        <span className="text-xs text-muted">{t("microsPerDay")}</span>
        {!open && (
          <span className="flex flex-wrap gap-1">
            {rows.map((r) => <span key={r.key} title={ar ? r.ar : r.en} className={`h-2 w-5 rounded-full ${BAR[r.status]}`} />)}
          </span>
        )}
        {gaps.length > 0 && <span className="rounded-full bg-bad-soft px-2 text-[11px] font-bold text-bad">{t("microsGaps", { n: gaps.length })}</span>}
        {collapsible && <ChevronDown className={`ms-auto h-4 w-4 text-muted transition ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-[7.5rem_1fr_7.5rem] items-center gap-2 border-t border-[#f0f2f1] py-1.5 text-[13px] first:border-t-0">
                <span className="flex items-center gap-1">{ar ? r.ar : r.en}{bloodLow.includes(r.key) && <span title={t("microsBloodLow")} className="text-bad">🩸</span>}</span>
                <span className="relative h-2 overflow-hidden rounded-full bg-page"><span className={`absolute inset-y-0 start-0 rounded-full ${BAR[r.status]}`} style={{ width: `${Math.min(r.pct, 100)}%` }} /></span>
                <span className="num text-end font-semibold">{fmt(r.value)} <span className="font-normal text-muted">/ {r.kind === "max" ? `${t("microsMax")} ` : ""}{fmt(r.need)} {unitOf(r)}</span></span>
              </div>
            ))}
            <p className="mt-2 text-[11px] text-muted">{t("microsLegend")}{missing > 0 ? ` · ${t("microsMissing", { n: missing })}` : ""}</p>
          </div>
          <div className="space-y-2">
            {rows.filter((r) => r.sources.length > 0 && (r.status === "low" || bloodLow.includes(r.key))).slice(0, 4).map((r) => (
              <div key={r.key} className={`rounded-xl p-3 text-[13px] ${r.status === "low" ? "bg-bad-soft/60" : "bg-warn-soft/60"}`}>
                <b className={r.status === "low" ? "text-bad" : "text-warn"}>{ar ? r.ar : r.en}: {r.pct}%</b>
                {bloodLow.includes(r.key) && <span className="ms-1 inline-flex items-center gap-1 text-xs text-bad"><TriangleAlert className="h-3 w-3" />{t("microsBloodLow")}</span>}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {r.sources.map((f) => (
                    <button key={f.id} type="button" disabled={!onAdd} onClick={() => onAdd?.(f)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs disabled:cursor-default">
                      {onAdd && (swap ? <Shuffle className="h-3 w-3 text-brand" /> : <Plus className="h-3 w-3 text-brand" />)}{foodName(f)} <span className="num text-muted">+{fmt(f.amount)} {unitOf(r)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {swap && rows.some((r) => r.sources.length > 0) && <p className="text-[11px] text-muted">{t("microsSwapHint")}</p>}
            {rows.every((r) => r.status === "ok") && <p className="rounded-xl bg-ok-soft p-3 text-sm text-ok">{t("microsAllGood")}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
