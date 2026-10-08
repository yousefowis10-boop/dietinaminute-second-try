// Small helpers shared by the builder and the client sheet.

export const kcalOf = (f) => (f.protein || 0) * 4 + (f.carb || 0) * 4 + (f.fat || 0) * 9;

export function totalsOf(items) {
  const totals = { protein: 0, carb: 0, fat: 0, kcal: 0 };
  items.forEach((i) => {
    const q = Number(i.quantity) || 0;
    totals.protein += (i.protein || 0) * q;
    totals.carb += (i.carb || 0) * q;
    totals.fat += (i.fat || 0) * q;
  });
  totals.kcal = totals.protein * 4 + totals.carb * 4 + totals.fat * 9;
  return totals;
}

const UNIT_EN = { "غرام": "g", "جرام": "g", "مل": "ml" };
const EN_FIX = [
  [/^(tea ?spoon|tra spoon|teaspoon|tsp)$/, "tsp"], [/^(table ?spoon|tbs|tbsp)$/, "tbsp"],
  [/^scoo+p$/, "scoop"],
];

// Clean English unit for an amount: "1 scoop" -> "scoop", "Tra spoon" -> "tsp", "100 G" (factor 100) -> "g".
export function englishUnit(unit, unitAr, factor) {
  if (UNIT_EN[(unitAr || "").trim()] && (factor || 1) !== 1) return UNIT_EN[unitAr.trim()];
  let u = String(unit || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (/[\u0600-\u06FF]/.test(u)) return UNIT_EN[(unitAr || "").trim()] || u; // unit typed in Arabic in the database
  u = u.replace(/^(1|one|a)\s+/, "");
  const fix = EN_FIX.find(([re]) => re.test(u));
  if (fix) return fix[1];
  if (/\bmedium\b|\blarge\b|\bsmall\b/.test(u)) return "pc"; // "medium banana", "medium egg" -> pieces
  return u;
}

// Real-world unit for an amount (servings × factor). Arabic names come from the database.
export function unitLabel(food, lang) {
  if (lang === "ar") return food.unit_ar || food.unit || "";
  return englishUnit(food.unit, food.unit_ar, food.multiplying_factor);
}

export function amountOf(food, servings) {
  const value = (Number(servings) || 0) * (food.multiplying_factor || 1);
  return Math.round(value * 100) / 100;
}

// Split of one food across its meals, as fractions that add up to 1.
export function sharesFor(item) {
  const meals = item.meals || [];
  if (!meals.length) return {};
  const raw = meals.map((m) => Math.max(Number(item.shares?.[m]) || 0, 0));
  const sum = raw.reduce((a, b) => a + b, 0);
  return Object.fromEntries(meals.map((m, i) => [m, sum > 0 ? raw[i] / sum : 1 / meals.length]));
}

export const roundHalf = (n) => Math.max(0, Math.round(n * 2) / 2);

// "60s" -> "60 ث" in Arabic; other text unchanged.
export const timeLabel = (value, lang) =>
  lang === "ar" ? String(value ?? "").replace(/(\d)\s*s\b/g, "$1 ث").replace(/(\d)\s*min\b/g, "$1 د") : value;

export const tplName = (tpl, lang) => (lang === "ar" && tpl.name_ar) || tpl.name;
export const tplDesc = (tpl, lang) => (lang === "ar" && tpl.description_ar) || tpl.description;

// Display an amount: whole grams/ml for weighed foods, up to 1 decimal for pieces and spoons.
export const niceAmount = (amount, factor = 1) => {
  const v = Number(amount) || 0;
  return (factor || 1) >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
};
