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
    key: "eating", ar: "طعامك الحالي", en: "How you eat now",
    fields: [
      { name: "protein", type: "option", options: ["High", "Moderate", "Low"], ar: "البروتين (لحوم، دجاج، بيض)", en: "Protein (meat, chicken, eggs)" },
      { name: "carbs", type: "option", options: ["High", "Moderate", "Low"], ar: "النشويات (خبز، رز، معكرونة)", en: "Carbs (bread, rice, pasta)" },
      { name: "fat", type: "option", options: ["High", "Moderate", "Low"], ar: "الدهون والمقالي", en: "Fats and fried food" },
      { name: "vegetables", type: "option", options: ["High", "Moderate", "Low"], ar: "الخضار", en: "Vegetables" },
      { name: "fruit", type: "option", options: ["High", "Moderate", "Low"], ar: "الفواكه", en: "Fruit" },
      { name: "dairy", type: "option", options: ["High", "Moderate", "Low"], ar: "الألبان", en: "Dairy" },
      { name: "grains", type: "option", options: ["High", "Moderate", "Low"], ar: "الحبوب الكاملة", en: "Whole grains" },
      { name: "food_to_eat_more", type: "long", ar: "أطعمة تحبها وتريدها في خطتك", en: "Foods you love and want in your plan" },
      { name: "food_to_eat_less", type: "long", ar: "أطعمة تريد التقليل منها", en: "Foods you want to eat less" },
      { name: "food_to_avoid", type: "long", ar: "أطعمة لا تأكلها أبدًا", en: "Foods you never eat" },
    ],
  },
  {
    key: "lifestyle", ar: "نمط الحياة", en: "Lifestyle",
    fields: [
      { name: "smoke_cigarettes", type: "boolean", ar: "هل تدخن؟", en: "Do you smoke?" },
      { name: "how_many_smoke_a_day", type: "option", options: ["1/2 Pack", "1 Pack", "1.5 Pack", "2 Pack"], ar: "كم يوميًا؟", en: "How much a day?", showIf: "smoke_cigarettes" },
      { name: "smoking_duration", type: "option", options: ["Months", "Years"], ar: "منذ متى؟", en: "For how long?", showIf: "smoke_cigarettes" },
      { name: "alcohol", type: "boolean", ar: "هل تشرب الكحول؟", en: "Do you drink alcohol?" },
      { name: "how_many_drinks_a_day", type: "option", options: ["1", "2", "3", "4 or more"], ar: "كم مشروبًا يوميًا؟", en: "Drinks a day", showIf: "alcohol" },
      { name: "alcohol_duration", type: "option", options: ["Months", "Years"], ar: "منذ متى؟", en: "For how long?", showIf: "alcohol" },
      { name: "caffeine", type: "boolean", ar: "هل تشرب القهوة أو الشاي أو مشروبات الطاقة؟", en: "Coffee, tea or energy drinks?" },
      { name: "how_many_caffeine_a_day", type: "option", options: ["1", "2", "3", "4 or more"], ar: "كم كوبًا يوميًا؟", en: "Cups a day", showIf: "caffeine" },
      { name: "caffeine_duration", type: "option", options: ["Months", "Years"], ar: "منذ متى؟", en: "For how long?", showIf: "caffeine", public: false },
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
