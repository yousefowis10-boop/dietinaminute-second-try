import { useState } from "react";
import { Check, MessageCircle, ShoppingCart } from "lucide-react";
import { useI18n } from "../i18n";
import { englishUnit } from "./foodUtils";

export const SECTIONS = {
  vegetables: { icon: "🥬", tone: "bg-[#e9f6ee] text-[#1d7a46]" },
  fruit: { icon: "🍎", tone: "bg-[#fdeeea] text-[#c2410c]" },
  meat_fish: { icon: "🍗", tone: "bg-[#fbecef] text-[#b4234a]" },
  dairy_eggs: { icon: "🥚", tone: "bg-[#eaf2fb] text-[#2563a8]" },
  bread_grains: { icon: "🍞", tone: "bg-[#fdf4e3] text-[#b7791f]" },
  oils_nuts: { icon: "🫒", tone: "bg-[#f1f3e4] text-[#5f6b1f]" },
  other: { icon: "🛒", tone: "bg-page text-muted" },
  recipes: { icon: "📖", tone: "bg-brand-soft text-brand" },
};

// "1.1 kg", "350 g", "14 eggs" … in the current language.
export function useGroceryAmount() {
  const { t, lang, num } = useI18n();
  const ar = lang === "ar";
  return (r) => {
    if (r.kind === "recipe") return t("cookTimes", { n: num(r.batches), p: num(r.amount) });
    if (r.kind === "g" || r.kind === "ml") {
      const big = r.amount >= 1000;
      const n = big ? num(r.amount / 1000, 1) : num(r.amount);
      const unit = r.kind === "g" ? (big ? t("kgShort") : t("gShort")) : (big ? t("litre") : t("mlShort"));
      return `${n} ${unit}${r.note === "dry" ? ` ${t("dryWeight")}` : ""}`;
    }
    const unit = ar ? r.unit : englishUnit(r.unit_en, r.unit, r.factor ?? 1);
    return `${num(r.amount, 1)} ${unit}${r.ml ? ` (≈ ${r.ml} ${t("mlShort")})` : ""}`;
  };
}

const PERIOD = { 1: "oneWeek", 2: "twoWeeks", 4: "oneMonth" };

export function groceryText(rows, weeks, t, lang, amountOf) {
  const lines = [`🛒 ${t("groceryList")} – ${t(PERIOD[weeks])}`];
  Object.keys(SECTIONS).forEach((s) => {
    const list = rows.filter((r) => r.section === s);
    if (!list.length) return;
    lines.push("", `${SECTIONS[s].icon} ${t(`shop_${s}`)}`);
    list.forEach((r) => {
      lines.push(`• ${lang === "ar" ? r.food : r.food_en} – ${amountOf(r)}`);
      if (r.kind === "recipe") recipeLines(r, lang).forEach((x) => lines.push(`   – ${x}`));
    });
  });
  return lines.join("\n");
}

// A recipe's ingredients for the whole period: one batch's list, "× n" when it is cooked n times.
export function recipeLines(r, lang) {
  const list = (lang === "ar" ? r.ingredients_ar : r.ingredients) || r.ingredients || [];
  return list.map((x) => (r.batches > 1 ? `${x}  × ${r.batches}` : x));
}

// The shopping list grouped by shop aisle. `ticks` + `onTick` make items tickable (client phone page).
export default function SmartGrocery({ rows, rows2, rows4, ticks, onTick, onShare, printMode = false, compact = false }) {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const [weeks, setWeeks] = useState(1);
  const amountOf = useGroceryAmount();
  const list = (weeks === 4 && rows4) || (weeks === 2 && rows2) || rows;
  const tickable = !!onTick && !printMode;
  const bought = tickable ? list.filter((r) => ticks?.[r.food_en]).length : 0;
  const sections = Object.keys(SECTIONS).filter((s) => list.some((r) => r.section === s));

  return (
    <div>
      {!printMode && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-brand" />
          <h3 className="font-bold">{t("groceryList")}</h3>
          <span className="text-xs text-muted">· {tickable ? t("boughtOf", { n: bought, total: list.length }) : t("itemsCount", { n: list.length })}</span>
          <div className="ms-auto flex items-center gap-2">
            {rows2 && (
              <div className="inline-flex overflow-hidden rounded-lg border border-line text-xs font-semibold">
                {[1, 2, 4].filter((w) => w === 1 || (w === 2 ? rows2 : rows4)).map((w) => (
                  <button key={w} type="button" onClick={() => setWeeks(w)} className={`px-3 py-1.5 ${weeks === w ? "bg-brand text-white" : "bg-white"}`}>{t(PERIOD[w])}</button>
                ))}
              </div>
            )}
            {onShare && (
              <button type="button" className="btn px-3 py-1.5 text-xs bg-[#1fa855] text-white hover:opacity-90" onClick={() => onShare(groceryText(list, weeks, t, lang, amountOf))}>
                <MessageCircle className="h-3.5 w-3.5" />{t("sendWhatsApp")}
              </button>
            )}
          </div>
        </div>
      )}
      {tickable && list.length > 0 && (
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-page"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(100 * bought) / list.length}%` }} /></div>
      )}
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {sections.map((s) => {
          const items = list.filter((r) => r.section === s)
            .sort((a, b) => (tickable ? Number(!!ticks?.[a.food_en]) - Number(!!ticks?.[b.food_en]) : 0));
          return (
            <section key={s} className={`break-inside-avoid overflow-hidden rounded-2xl border border-line bg-white ${s === "recipes" && !compact ? "sm:col-span-2 lg:col-span-3" : ""}`}>
              <div className={`flex items-center gap-2 px-3.5 py-2 text-[13px] font-bold ${SECTIONS[s].tone}`}>
                <span className="text-base">{SECTIONS[s].icon}</span>{t(`shop_${s}`)}<span className="ms-auto text-[11px] font-semibold opacity-70">{items.length}</span>
              </div>
              <ul>
                {items.map((r) => {
                  const done = tickable && ticks?.[r.food_en];
                  const Row = tickable ? "button" : "div";
                  return (
                    <li key={r.food_en} className="border-t border-[#f0f2f1] first:border-t-0">
                      <Row type={tickable ? "button" : undefined} onClick={tickable ? () => onTick(r.food_en) : undefined}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-sm">
                        {tickable && (
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${done ? "border-brand bg-brand text-white" : "border-[#c4ccc8]"}`}>{done && <Check className="h-3 w-3" />}</span>
                        )}
                        <span className={`min-w-0 flex-1 ${done ? "text-muted line-through" : "font-medium"}`}>{ar ? r.food : r.food_en}</span>
                        <span className={`num shrink-0 rounded-lg px-2 py-0.5 text-[12.5px] font-bold ${done ? "text-muted" : "bg-page text-brand-ink"}`}>{amountOf(r)}</span>
                      </Row>
                      {r.kind === "recipe" && (
                        <ul className={`px-3.5 pb-2.5 text-[12.5px] ${done ? "text-muted line-through" : "text-[#3d4a44]"} ${tickable ? "ps-11" : ""}`}>
                          {recipeLines(r, lang).map((x, n) => <li key={n} className="flex gap-1.5 py-0.5"><span className="text-muted">–</span><span>{x}</span></li>)}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      {!printMode && <p className="mt-3 text-xs text-muted">{t("groceryHint")}</p>}
    </div>
  );
}
