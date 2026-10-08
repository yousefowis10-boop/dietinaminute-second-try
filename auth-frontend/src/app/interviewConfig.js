// First-visit interview. Stored values stay in English (as before); labels show in the chosen language.
// "public: false" questions are only shown to the dietitian (not on the client's link).

const OPT_AR = {
  Male: "ذكر", Female: "أنثى", Single: "أعزب/عزباء", Married: "متزوج/ة",
  Peanuts: "فول سوداني", Shellfish: "مأكولات بحرية قشرية", Dairy: "ألبان", Eggs: "بيض", Wheat: "قمح", Soy: "صويا",
  Gluten: "غلوتين", Other: "أخرى", Asthma: "ربو", Diabetes: "سكري", "Heart Disease": "أمراض قلب",
  "High Blood Pressure": "ضغط مرتفع", Cancer: "سرطان", "Thyroid Disease": "أمراض الغدة الدرقية",
  High: "مرتفع", Moderate: "متوسط", Low: "منخفض", Medium: "متوسط", "Very High": "مرتفع جدًا",
  "1/2 Pack": "نصف علبة", "1 Pack": "علبة", "1.5 Pack": "علبة ونصف", "2 Pack": "علبتان",
  Months: "أشهر", Years: "سنوات", "4 or more": "4 أو أكثر",
  "30 Min": "30 دقيقة", "45 Min": "45 دقيقة", "1 Hour": "ساعة", "2+ Hours": "ساعتان أو أكثر",
  Walking: "مشي", Jogging: "هرولة", Running: "جري", Cycling: "دراجة", "Sports (Badminton, Basketball)": "رياضات (ريشة، سلة)",
  "Gym Workout (Bodybuilding, Powerlifting, Strength Training)": "تمارين نادي (حديد، قوة)",
};

export const optionLabel = (value, lang) => (lang === "ar" ? OPT_AR[value] || value : value);

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

export const INTERVIEW_STEPS = [
  {
    key: "about", ar: "عنك", en: "About you",
    fields: [
      { name: "email", type: "email", ar: "البريد الإلكتروني", en: "Email" },
      { name: "marital_status", type: "option", options: ["Single", "Married"], ar: "الحالة الاجتماعية", en: "Marital status" },
      { name: "occupation", type: "short", ar: "العمل وساعات الدوام", en: "Job and working hours" },
      { name: "symptoms", type: "long", ar: "سبب الزيارة أو الأعراض الرئيسية", en: "Main reason for your visit or symptoms" },
    ],
  },
  {
    key: "health", ar: "الصحة والحساسية", en: "Health & allergies",
    fields: [
      { name: "food_allergies", type: "checkbox", options: ["Peanuts", "Shellfish", "Dairy", "Eggs", "Wheat", "Soy", "Gluten", "Other"], ar: "حساسية الطعام", en: "Food allergies" },
      { name: "diseases", type: "checkbox", options: ["Asthma", "Diabetes", "Heart Disease", "High Blood Pressure", "Cancer", "Thyroid Disease", "Other"], ar: "أمراض حالية أو سابقة", en: "Current or past conditions" },
      { name: "allergy_notes", type: "long", ar: "تفاصيل إضافية", en: "More details" },
      { name: "current_medications", type: "long", ar: "الأدوية الحالية", en: "Current medications" },
      { name: "medicine_history", type: "long", ar: "أدوية سابقة", en: "Past medications" },
      { name: "surgical_history", type: "long", ar: "عمليات جراحية سابقة", en: "Past surgeries" },
      { name: "current_supplement_intake", type: "long", ar: "المكملات الغذائية التي تتناولها", en: "Supplements you take" },
    ],
  },
  {
    key: "food", ar: "الطعام والمشروبات", en: "Food & drinks",
    note: { ar: "اختر من قائمة الأطعمة — الخطة والذكاء الاصطناعي يقرآن هذه الإجابات", en: "Pick from the food list — the plan and the AI read these answers" },
    fields: [
      { name: "liked_foods", type: "foods", tone: "ok", ar: "أطعمة يحبها ويريدها في خطته", en: "Foods they like and want in the plan", hint: { ar: "من قاعدة الأطعمة", en: "from your food list" } },
      { name: "never_foods", type: "foods", tone: "bad", ar: "أطعمة لا يأكلها أبدًا", en: "Foods they never eat", hint: { ar: "تُستبعد من الخطة", en: "removed from the plan" } },
      { name: "less_foods", type: "foods", tone: "warn", ar: "أطعمة يريد التقليل منها", en: "Foods they want to eat less" },
      { name: "food_to_eat_more", type: "short", ar: "ملاحظات عن الطعام", en: "Food notes", hint: { ar: "اختياري", en: "optional" }, placeholder: { ar: "مثلًا: لا يفطر عادة، يحب الأكل الحار…", en: "e.g. usually skips breakfast, likes spicy food…" } },
      { name: "food_to_eat_less", type: "long", legacy: true, ar: "أطعمة يريد التقليل منها (نص قديم)", en: "Foods to eat less (old text)", wide: true },
      { name: "food_to_avoid", type: "long", legacy: true, ar: "أطعمة لا يأكلها (نص قديم)", en: "Foods never eaten (old text)", wide: true },
      { name: "protein", type: "option", options: ["Low", "Moderate", "High"], ar: "البروتين في أكله الحالي", en: "Protein in current diet" },
      { name: "carbs", type: "option", options: ["Low", "Moderate", "High"], ar: "النشويات (خبز، رز، معكرونة)", en: "Carbs (bread, rice, pasta)" },
      { name: "fat", type: "option", options: ["Low", "Moderate", "High"], ar: "الدهون والمقالي", en: "Fats and fried food" },
      { name: "vegetables", type: "option", options: ["Low", "Moderate", "High"], ar: "الخضار", en: "Vegetables" },
      { name: "fruit", type: "option", options: ["Low", "Moderate", "High"], ar: "الفواكه", en: "Fruit" },
      { name: "dairy", type: "option", options: ["Low", "Moderate", "High"], ar: "الألبان", en: "Dairy" },
      { name: "drinks", type: "drinks", wide: true, ar: "المشروبات", en: "Drinks", hint: { ar: "كم مرة يشرب كل نوع؟", en: "How often for each?" } },
    ],
  },
  {
    key: "lifestyle", ar: "نمط الحياة", en: "Lifestyle",
    fields: [
      { name: "smoke_cigarettes", type: "boolean", ar: "هل تدخن؟", en: "Do you smoke?" },
      { name: "how_many_smoke_a_day", type: "option", options: ["1/2 Pack", "1 Pack", "1.5 Pack", "2 Pack"], ar: "كم يوميًا؟", en: "How much a day?", showIf: "smoke_cigarettes" },
      { name: "smoking_duration", type: "option", options: ["Months", "Years"], ar: "منذ متى؟", en: "For how long?", showIf: "smoke_cigarettes" },
      { name: "sleep_time", type: "time", ar: "متى تنام عادةً؟", en: "What time do you usually sleep?" },
      { name: "sleep_duration", type: "number", ar: "كم ساعة تنام؟", en: "Hours of sleep" },
      { name: "overall_energy_levels", type: "option", options: ["Low", "Moderate", "High"], ar: "مستوى طاقتك خلال اليوم", en: "Your energy during the day" },
      { name: "bowel_movements_per_day", type: "option", options: range(1, 5), ar: "عدد مرات الإخراج يوميًا", en: "Bowel movements per day" },
      { name: "urinate_frequency", type: "option", options: range(1, 15), ar: "عدد مرات التبول يوميًا", en: "Urination per day", public: false },
    ],
  },
  {
    key: "exercise", ar: "الرياضة", en: "Exercise",
    fields: [
      { name: "exercise", type: "boolean", ar: "هل تمارس الرياضة؟", en: "Do you exercise?" },
      { name: "exercise_times_per_week", type: "option", options: range(1, 7), ar: "كم مرة في الأسبوع؟", en: "Times per week", showIf: "exercise" },
      { name: "exercise_duration", type: "option", options: ["30 Min", "45 Min", "1 Hour", "2+ Hours"], ar: "مدة التمرين", en: "Session length", showIf: "exercise" },
      { name: "workout_intensity", type: "option", options: ["Low", "Medium", "High", "Very High"], ar: "شدة التمرين", en: "Intensity", showIf: "exercise" },
      { name: "types_of_workout", type: "checkbox", options: ["Walking", "Jogging", "Running", "Cycling", "Sports (Badminton, Basketball)", "Gym Workout (Bodybuilding, Powerlifting, Strength Training)"], ar: "نوع الرياضة", en: "Type of exercise", showIf: "exercise" },
    ],
  },
  {
    key: "women", ar: "للسيدات", en: "Women only", onlyFor: "F",
    fields: [
      { name: "pregnant", type: "boolean", ar: "هل أنتِ حامل؟", en: "Are you pregnant?" },
      { name: "weeks_pregnant", type: "option", options: range(1, 36), ar: "في أي أسبوع؟", en: "Which week?", showIf: "pregnant" },
      { name: "due_date", type: "date", ar: "موعد الولادة المتوقع", en: "Due date", showIf: "pregnant" },
      { name: "breastfeeding", type: "boolean", ar: "هل ترضعين؟", en: "Are you breastfeeding?" },
      { name: "women_health_comments", type: "long", ar: "ملاحظات صحية أخرى", en: "Other health notes" },
    ],
  },
  {
    key: "goals", ar: "أهدافك", en: "Your goals",
    fields: [
      { name: "dietary_goal", type: "long", ar: "ما الذي تريد تحقيقه من الخطة الغذائية؟", en: "What do you want from your diet plan?" },
      { name: "fitness_goal", type: "long", ar: "هدفك الرياضي أو الجسدي", en: "Your fitness or body goal" },
      { name: "lifestyle_goal", type: "long", ar: "تغييرات تريدها في نمط حياتك", en: "Lifestyle changes you want" },
      { name: "additional_concerns", type: "long", ar: "أي شيء آخر تريد أن نعرفه؟", en: "Anything else we should know?" },
    ],
  },
];

// Dietitian-only measurements (not on the client's link).
export const MEASUREMENT_FIELDS = [
  "waist_to_hip_ratio", "chest", "belly", "hip", "glutes", "right_arm", "left_arm", "right_forearm", "left_forearm",
  "right_thigh", "left_thigh", "right_calve", "left_calve",
];
export const MEASUREMENT_LABELS = {
  waist_to_hip_ratio: ["نسبة الخصر للورك", "Waist-to-hip ratio"], chest: ["الصدر", "Chest"], belly: ["البطن", "Belly"],
  hip: ["الورك", "Hip"], glutes: ["الأرداف", "Glutes"], right_arm: ["الذراع الأيمن", "Right arm"], left_arm: ["الذراع الأيسر", "Left arm"],
  right_forearm: ["الساعد الأيمن", "Right forearm"], left_forearm: ["الساعد الأيسر", "Left forearm"], right_thigh: ["الفخذ الأيمن", "Right thigh"],
  left_thigh: ["الفخذ الأيسر", "Left thigh"], right_calve: ["الساق الأيمن", "Right calf"], left_calve: ["الساق الأيسر", "Left calf"],
};

// Drinks table rows and how often (stored in English keys).
export const DRINKS = [
  ["coffee_tea", "قهوة / شاي", "Coffee / tea"], ["energy", "مشروبات طاقة", "Energy drinks"], ["soft", "مشروبات غازية", "Soft drinks"],
  ["juice", "عصائر محلاة", "Sweet juices"], ["alcohol", "كحول", "Alcohol"],
];
export const FREQS = [["never", "لا يشرب", "Never"], ["rarely", "نادرًا", "Rarely"], ["monthly", "مرة شهريًا", "Monthly"], ["weekly", "أسبوعيًا", "Weekly"], ["daily", "يوميًا", "Daily"]];
export const FREQ_UNIT = { daily: ["كوب / يوم", "cups / day"], weekly: ["/ أسبوع", "/ week"], monthly: ["/ شهر", "/ month"] };

// How many questions of a section have an answer.
export function answeredIn(step, answers) {
  const fields = step.fields.filter((f) => !f.legacy && !f.showIf);
  const has = (v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length) && !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
  return [fields.filter((f) => has(answers[f.name])).length, fields.length];
}
