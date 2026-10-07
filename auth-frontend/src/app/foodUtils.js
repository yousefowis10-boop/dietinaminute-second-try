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

// Real-world unit for an amount (servings × factor). Arabic names come from the database.
export function unitLabel(food, lang) {
  if (lang === "ar") return food.unit_ar || food.unit || "";
  if (UNIT_EN[food.unit_ar]) return UNIT_EN[food.unit_ar];
  return (food.multiplying_factor || 1) === 1 ? food.unit || "" : food.unit_ar || food.unit || "";
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
