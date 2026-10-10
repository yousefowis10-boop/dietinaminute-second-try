// Short "good to include / limit or avoid" guidance per health issue, shown with the medical templates.
// Starting draft (like the templates themselves): a qualified dietitian should review it.
export const CONDITIONS = ["diabetes", "hypertension", "cholesterol", "pcos", "pregnancy"];

export const COND_NAME = {
  diabetes: { en: "Type 2 diabetes", ar: "السكري النوع الثاني" },
  hypertension: { en: "High blood pressure", ar: "ضغط الدم المرتفع" },
  cholesterol: { en: "High cholesterol", ar: "الكوليسترول المرتفع" },
  pcos: { en: "PCOS", ar: "تكيس المبايض" },
  pregnancy: { en: "Pregnancy", ar: "الحمل" },
  other: { en: "Other", ar: "أخرى" },
};

export const COND_TIPS = {
  diabetes: {
    en: { good: ["Carbs spread evenly over the day, never a big carb meal", "Whole grains, oats, legumes, vegetables", "Protein at every meal and snack", "Whole fruit instead of juice"],
      avoid: ["Sugary drinks, juice, sweets", "White bread and large rice portions", "Skipping meals (risk of low sugar with medication)"] },
    ar: { good: ["توزيع النشويات بالتساوي على اليوم وعدم تناول وجبة نشويات كبيرة", "الحبوب الكاملة والشوفان والبقوليات والخضار", "بروتين في كل وجبة وسناك", "الفاكهة الكاملة بدل العصير"],
      avoid: ["المشروبات المحلاة والعصائر والحلويات", "الخبز الأبيض وحصص الأرز الكبيرة", "تخطي الوجبات (خطر هبوط السكر مع الأدوية)"] },
  },
  hypertension: {
    en: { good: ["Vegetables and fruit at most meals (potassium)", "Low-fat dairy", "Fresh chicken, fish, legumes", "Herbs, lemon and spices instead of salt"],
      avoid: ["Salty cheese, pickles, olives, chips", "Canned and processed meats (luncheon, sausages)", "Stock cubes, ready sauces, instant noodles"] },
    ar: { good: ["خضار وفواكه في معظم الوجبات (بوتاسيوم)", "ألبان قليلة الدسم", "دجاج وسمك طازج وبقوليات", "الأعشاب والليمون والبهارات بدل الملح"],
      avoid: ["الأجبان المالحة والمخللات والزيتون والشيبس", "المعلبات واللحوم المصنعة (لانشون، نقانق)", "مكعبات المرق والصلصات الجاهزة والنودلز سريعة التحضير"] },
  },
  cholesterol: {
    en: { good: ["Oats, barley, legumes (soluble fibre)", "Fish 2× a week (salmon, sardines)", "Olive oil, nuts, avocado", "Plenty of vegetables"],
      avoid: ["Fatty red meat, processed meats", "Full-fat cheese, butter, ghee, cream", "Fried food and pastries"] },
    ar: { good: ["الشوفان والشعير والبقوليات (ألياف ذائبة)", "السمك مرتين أسبوعيًا (سلمون، سردين)", "زيت الزيتون والمكسرات والأفوكادو", "الكثير من الخضار"],
      avoid: ["اللحوم الحمراء الدهنية واللحوم المصنعة", "الأجبان كاملة الدسم والزبدة والسمن والقشطة", "المقالي والمعجنات"] },
  },
  pcos: {
    en: { good: ["Higher protein, every meal", "Low-sugar carbs: oats, whole grains, legumes", "Healthy fats: olive oil, nuts", "Regular meal times"],
      avoid: ["Sugary drinks and sweets", "Refined carbs on their own (white bread, biscuits)", "Very low-calorie crash diets"] },
    ar: { good: ["بروتين أعلى في كل وجبة", "نشويات قليلة السكر: شوفان وحبوب كاملة وبقوليات", "دهون صحية: زيت الزيتون والمكسرات", "مواعيد وجبات منتظمة"],
      avoid: ["المشروبات المحلاة والحلويات", "النشويات المكررة وحدها (خبز أبيض، بسكويت)", "الحميات القاسية جدًا"] },
  },
  pregnancy: {
    en: { good: ["No calorie deficit; small regular meals", "Iron and folate: red meat, lentils, leafy greens", "Dairy for calcium", "Well-cooked eggs, meat and fish"],
      avoid: ["Raw fish, shellfish, undercooked meat or eggs", "High-mercury fish (shark, swordfish, king mackerel)", "Unpasteurised cheese and milk", "More than 200 mg caffeine a day"] },
    ar: { good: ["بدون عجز في السعرات؛ وجبات صغيرة منتظمة", "الحديد والفولات: اللحم الأحمر والعدس والورقيات", "الألبان للكالسيوم", "البيض واللحم والسمك مطهوة جيدًا"],
      avoid: ["السمك النيء والمحار واللحم أو البيض غير المطهو جيدًا", "الأسماك عالية الزئبق (القرش، أبو سيف، الماكريل الملكي)", "الأجبان والحليب غير المبستر", "أكثر من 200 ملغ كافيين يوميًا"] },
  },
};
