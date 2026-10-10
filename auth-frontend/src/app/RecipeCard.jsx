import { useEffect, useState } from "react";
import { BookOpen, ChefHat, Clock, Users } from "lucide-react";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Modal, Spinner } from "../ui";

// One recipe: photo, portion info, nutrition per portion, ingredients and steps (in the current language).
// `recipe` is what the server sends for a plan's recipes (or /nutrition/recipes/<food_id>/).
export default function RecipeCard({ recipe, printMode = false, compact = false }) {
  const { t, lang, num } = useI18n();
  const c = recipe.content?.[lang] || recipe.content?.en || {};
  const chip = "inline-flex items-center gap-1.5 rounded-full bg-page px-2.5 py-1 text-xs font-semibold text-brand-ink";
  const macros = [["kcal", recipe.kcal, ""], ["protein", recipe.protein, t("g")], ["carbs", recipe.carb, t("g")], ["fat", recipe.fat, t("g")]];
  return (
    <article className={printMode ? "break-inside-avoid" : ""}>
      {recipe.photo ? (
        <img src={recipe.photo} alt="" className={`mb-4 w-full rounded-2xl object-cover ${printMode ? "h-[240px]" : compact ? "h-44" : "h-56 sm:h-72"}`} />
      ) : (
        !compact && <div className={`mb-4 grid w-full place-items-center rounded-2xl bg-brand-soft text-brand ${printMode ? "h-24" : "h-28"}`}><ChefHat className="h-9 w-9" /></div>
      )}
      <div className="mb-1 text-xs font-semibold text-muted">{lang === "ar" ? recipe.section_ar : recipe.section}</div>
      <h2 className={`font-bold leading-tight ${compact ? "text-lg" : "text-2xl"}`}>{c.title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={chip}><BookOpen className="h-3.5 w-3.5 text-brand" />{t("portionIs", { size: c.serving_size })}</span>
        <span className={chip}><Users className="h-3.5 w-3.5 text-brand" />{t("makesPortions", { n: num(recipe.servings) })}</span>
        {c.prep && c.prep !== "—" && <span className={chip}><Clock className="h-3.5 w-3.5 text-brand" />{t("prepTime")}: {c.prep}</span>}
        {c.cook && c.cook !== "—" && <span className={chip}><ChefHat className="h-3.5 w-3.5 text-brand" />{t("cookTime")}: {c.cook}</span>}
        {recipe.per_week > 0 && <span className={`${chip} bg-brand-soft text-brand`}>{t("perWeekPortions", { n: num(recipe.per_week, 1) })}</span>}
      </div>
      <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-xl border border-line text-center">
        {macros.map(([k, v, unit]) => (
          <div key={k} className="border-e border-line px-2 py-2 last:border-e-0">
            <div className="num text-base font-bold">{num(v, k === "kcal" ? 0 : 1)}{unit && <span className="text-xs font-medium text-muted"> {unit}</span>}</div>
            <div className="text-[11px] text-muted">{t(k)} · {t("perPortion")}</div>
          </div>
        ))}
      </div>
      <div className={`mt-5 grid gap-6 ${compact ? "" : "md:grid-cols-[2fr_3fr]"} ${printMode ? "!grid-cols-[2fr_3fr]" : ""}`}>
        <section>
          <h3 className="mb-2 text-sm font-bold">{t("ingredients")}</h3>
          <p className="mb-2 text-[11.5px] text-muted">{t("batchIngredients")} · {t("makesPortions", { n: num(recipe.servings) })}</p>
          <ul className="space-y-1.5 text-[13.5px]">
            {(c.ingredients || []).map((x, i) => (
              <li key={i} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span>{x}</span></li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-bold">{t("directions")}</h3>
          <ol className="space-y-2.5 text-[13.5px] leading-relaxed">
            {(c.steps || []).map((x, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">{num(i + 1)}</span>
                <span>{x}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}

// Pop-up that loads one recipe by its food id (used from the plan builder and the food list).
export function RecipeModal({ foodId, onClose }) {
  const { t } = useI18n();
  const [recipe, setRecipe] = useState(null);
  useEffect(() => {
    setRecipe(null);
    if (foodId) API.get(`/nutrition/recipes/${foodId}/`).then((r) => setRecipe(r.data)).catch(() => onClose());
  }, [foodId, onClose]);
  return (
    <Modal open={Boolean(foodId)} onClose={onClose} title={t("recipeLabel")} wide>
      {recipe ? <RecipeCard recipe={recipe} /> : <Spinner label={t("loading")} />}
    </Modal>
  );
}
