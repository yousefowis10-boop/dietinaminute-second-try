import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { PageHeader, Spinner } from "../ui";
import { amountOf, kcalOf, unitLabel } from "./foodUtils";

export default function Foods() {
  const { t, lang, foodName, num } = useI18n();
  const [foods, setFoods] = useState(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");

  useEffect(() => { API.get("/nutrition/foods/").then((r) => setFoods(r.data)); }, []);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (foods || []).filter((f) => (!type || f.food_type === type) && (!q || (f.name || "").toLowerCase().includes(q) || (f.name_ar || "").includes(q)));
  }, [foods, query, type]);

  return (
    <>
      <PageHeader title={t("foodsTitle")} subtitle={t("foodsHint")} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input ps-9" placeholder={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">—</option>
          {["protein", "carb", "fat"].map((x) => <option key={x} value={x}>{t(`type_${x}`)}</option>)}
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
                  <td className="px-4 py-2"><div className="font-medium">{foodName(f)}</div><div className="text-xs text-muted">{t(`type_${f.food_type}`)}</div></td>
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
    </>
  );
}
