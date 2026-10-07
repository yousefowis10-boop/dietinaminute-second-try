import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Every visible word in the app, in Arabic and English.
const STRINGS = {
  ar: {
    appName: "Diet in a Minute",
    tagline: "خطة غذائية خلال دقيقة",
    // navigation
    home: "الرئيسية", clients: "العملاء", interviews: "المقابلات", library: "المكتبة", planTemplates: "قوالب الخطط",
    workoutPlans: "برامج التمارين", foodDatabase: "قاعدة الأطعمة", account: "الحساب", settings: "الإعدادات والهوية",
    logout: "تسجيل الخروج", language: "اللغة",
    planBasic: "الخطة الأساسية", planPro: "خطة برو", planClinic: "خطة العيادات",
    // common
    save: "حفظ", saving: "جارٍ الحفظ…", cancel: "إلغاء", delete: "حذف", edit: "تعديل", back: "رجوع", next: "التالي",
    search: "بحث…", loading: "جارٍ التحميل…", open: "فتح", close: "إغلاق", copy: "نسخ", copied: "تم النسخ",
    yes: "نعم", no: "لا", none: "لا يوجد", optional: "اختياري", kcal: "سعرة", g: "غ", servings: "حصص",
    saved: "تم الحفظ", error: "حدث خطأ، حاول مرة أخرى", confirmDelete: "هل أنت متأكد من الحذف؟",
    draftBadge: "مسودة – تحتاج مراجعة", testMode: "وضع الاختبار – ليس ذكاءً اصطناعيًا حقيقيًا",
    // auth
    login: "تسجيل الدخول", signup: "إنشاء حساب", email: "البريد الإلكتروني", password: "كلمة المرور",
    firstName: "الاسم الأول", lastName: "اسم العائلة", noAccount: "ليس لديك حساب؟", haveAccount: "لديك حساب؟",
    loginFailed: "البريد الإلكتروني أو كلمة المرور غير صحيحة", welcomeBack: "أهلًا بعودتك",
    loginSub: "سجّل الدخول لإدارة عملائك وخططهم", signupSub: "ابدأ ببناء خطط عملائك في دقيقة",
    // not subscribed
    notSubscribedTitle: "حسابك غير مفعّل بعد", notSubscribedBody: "تواصل معنا لتفعيل اشتراكك والبدء باستخدام التطبيق.",
    // home
    goodDay: "أهلًا {name}", homeSub: "هذا ما يحتاج انتباهك اليوم",
    statClients: "العملاء", statPlans: "خطط آخر 30 يومًا", statInterviews: "مقابلات بانتظار المراجعة", statFollowUps: "متابعات مستحقة",
    followUpsDue: "متابعات مستحقة", followUpsEmpty: "لا توجد متابعات متأخرة.", lastVisit: "آخر زيارة",
    interviewsWaiting: "مقابلات بانتظار المراجعة", interviewsEmpty: "لا توجد مقابلات جديدة.",
    recentPlans: "أحدث الخطط", recentEmpty: "لم يتم إنشاء خطط بعد.", newClient: "عميل جديد",
    // clients
    clientList: "العملاء", searchClients: "ابحث باسم العميل…", noClients: "لا يوجد عملاء بعد. أضف أول عميل.",
    age: "العمر", years: "سنة", weight: "الوزن", height: "الطول", kg: "كغ", cm: "سم", gender: "الجنس",
    male: "ذكر", female: "أنثى", goal: "الهدف", workStyle: "نمط العمل والنشاط", bodyFat: "نسبة الدهون",
    muscle: "الكتلة العضلية", target: "الهدف اليومي", plansCount: "{n} خطة",
    goal_loss: "إنقاص الوزن", goal_gain: "زيادة الوزن", goal_maintain: "المحافظة", goal_: "غير محدد",
    ws_bed_bound: "ملازم للكرسي أو السرير", ws_seated_static: "عمل مكتبي بلا حركة", ws_seated_moving: "عمل مكتبي مع حركة بسيطة",
    ws_standing: "عمل وقوف (منزل، محل)", ws_sport: "رياضة بكثرة", ws_strenuous: "عمل شاق أو نشاط عالٍ جدًا",
    // client form
    newClientTitle: "عميل جديد", editClientTitle: "تعديل بيانات العميل", fullName: "الاسم الكامل", notes: "ملاحظات",
    measurements: "القياسات", targetsTitle: "السعرات والعناصر الغذائية", formula: "معادلة الحرق",
    adjustment: "تعديل السعرات", adjustmentHint: "مثلًا ‎-500‎ لإنقاص الوزن أو ‎+300‎ للزيادة",
    macroSplit: "توزيع العناصر", protein: "بروتين", carbs: "كربوهيدرات", fat: "دهون",
    pctMustBe100: "يجب أن يكون مجموع النسب 100%", bmr: "معدل الحرق الأساسي", tdee: "الاحتياج اليومي",
    dailyTarget: "هدف السعرات", saveClient: "حفظ العميل", clientSaved: "تم حفظ العميل",
    // client page
    tabOverview: "نظرة عامة", tabInterview: "المقابلة", tabPlans: "الخطط", tabProgress: "التقدم",
    newPlan: "خطة جديدة", visits: "الزيارات", needsReview: "تحتاج مراجعتك", noFlags: "لا توجد ملاحظات أمان.",
    excludedFoods: "أطعمة ممنوعة لهذا العميل", excludedHint: "لن تظهر في الخطط ولا يمكن حفظها. استخدمها للحساسية والحالات الطبية.",
    addExcluded: "أضف طعامًا ممنوعًا…", interviewLink: "رابط المقابلة", interviewLinkHint: "أرسل الرابط للعميل ليجيب على الأسئلة من البيت قبل الزيارة.",
    createLink: "إنشاء رابط", copyLink: "نسخ الرابط", sendWhatsApp: "إرسال عبر واتساب", markReviewed: "تمت المراجعة",
    istatus_none: "لم يُرسل", istatus_sent: "أُرسل الرابط", istatus_submitted: "أجاب العميل – بانتظار مراجعتك", istatus_reviewed: "تمت المراجعة",
    answeredFields: "{n} إجابة", whatsappInvite: "مرحبًا {name}، يرجى تعبئة هذه الأسئلة قبل موعدك: {link}",
    noPlans: "لا توجد خطط لهذا العميل بعد.", viewSheet: "ورقة العميل", editPlan: "تعديل",
    // AI
    aiTitle: "مساعد الذكاء الاصطناعي", aiSummary: "ملخص المقابلة", aiRecs: "توصيات", aiFlags: "تنبيهات من الذكاء الاصطناعي",
    runSummary: "لخّص المقابلة", rerun: "أعد التحليل", aiDecides: "الذكاء الاصطناعي يقترح، وأنت تقرر.",
    aiUpgrade: "ميزات الذكاء الاصطناعي ضمن خطة برو.", aiOff: "الذكاء الاصطناعي متوقف من الإعدادات.",
    aiNotReady: "الذكاء الاصطناعي غير مُعدّ على الخادم بعد.", aiThinking: "جارٍ التحليل…",
    aiDraft: "مسودة من الذكاء الاصطناعي", aiDraftNote: "اختار الذكاء الاصطناعي الأطعمة. كل الأرقام محسوبة من قاعدة أطعمتك.",
    aiMessage: "رسالة للعميل", writeMessage: "اكتب رسالة للعميل", aiFollowUp: "اقتراح للمتابعة", runFollowUp: "قارن بالزيارة السابقة",
    // progress
    progressTitle: "التقدم عبر الزيارات", sinceStart: "منذ البداية", sinceLast: "منذ الزيارة السابقة",
    needTwoVisits: "تحتاج زيارتين على الأقل لعرض التقدم.", printReport: "طباعة التقرير", progressReport: "تقرير التقدم",
    // plan builder
    builderTitle: "خطة جديدة لـ {name}", editBuilderTitle: "تعديل خطة {name}", planName: "اسم الخطة",
    defaultPlanName: "خطة {date}", stepServings: "الحصص", stepMeals: "توزيع الوجبات", stepDone: "حفظ",
    startFrom: "كيف تريد أن تبدأ؟", startEmpty: "خطة فارغة", startEmptyHint: "أنت تختار الأطعمة والحصص.",
    startTemplate: "من قالب", startTemplateHint: "استخدم خطة محفوظة أو قالبًا طبيًا.", startAI: "مسودة بالذكاء الاصطناعي",
    startAIHint: "من إجابات المقابلة. أنت تراجع وتعدّل.", addFood: "أضف طعامًا…", servingsOf: "حصة = {unit}",
    dailyTotal: "المجموع اليومي", ofTarget: "من {target}", onTarget: "ضمن الهدف", nearTarget: "قريب من الهدف",
    offTarget: "بعيد عن الهدف", fitTargets: "اضبط الحصص على الهدف", fitHint: "التطبيق يعدّل الحصص لتطابق الأهداف.",
    noFoodsYet: "أضف أطعمة من البحث أعلاه أو ابدأ من قالب.", continueMeals: "التالي: توزيع الوجبات",
    mealsCount: "عدد الوجبات", withSnacks: "مع وجبات خفيفة", assignMeals: "اختر وجبات كل طعام",
    splitEqual: "بالتساوي", splitCustom: "توزيع مخصص", shareOf: "نصيب", notInMeal: "غير موزّع على أي وجبة",
    mealPreview: "معاينة الوجبات", savePlan: "حفظ الخطة", planSaved: "تم حفظ الخطة", excludedBlocked: "أطعمة ممنوعة لهذا العميل: {foods}",
    removedExcluded: "تمت إزالة أطعمة ممنوعة: {foods}", chooseTemplate: "اختر قالبًا", meal1: "الوجبة 1", meal2: "الوجبة 2",
    meal3: "الوجبة 3", meal4: "الوجبة 4", snack1: "سناك 1", snack2: "سناك 2", snack3: "سناك 3",
    type_protein: "بروتين", type_carb: "كربوهيدرات", type_fat: "دهون", type_mixed: "مختلط",
    // sheet
    sheetTitle: "الخطة الغذائية", preparedFor: "معدّة لـ", date: "التاريخ", downloadPdf: "تحميل PDF", print: "طباعة",
    groceryList: "قائمة المشتريات الأسبوعية", perDay: "يوميًا", perWeek: "أسبوعيًا", workout: "برنامج التمارين",
    attachWorkout: "إرفاق برنامج تمارين", noWorkout: "بدون تمارين", saveAsTemplate: "حفظ كقالب", templateSaved: "تم حفظ القالب",
    planNotes: "ملاحظات للعميل", unassignedWarn: "هذه الأطعمة في الخطة لكنها غير موزعة على وجبات ولن تظهر للعميل: {foods}",
    sets: "مجموعات", reps: "تكرار", rest: "راحة", activityGuide: "دليل نشاط عام – توقف عند الشعور بألم أو دوخة.",
    // templates
    templatesTitle: "قوالب الخطط", medicalTemplates: "قوالب طبية", myTemplates: "قوالبي", noTemplates: "لا توجد قوالب بعد. احفظ أي خطة كقالب من ورقة العميل.",
    foodsCount: "{n} أطعمة", draftWarn: "قالب مبدئي يحتاج مراجعة أخصائي قبل الاستخدام.",
    // workouts
    workoutsTitle: "برامج التمارين", goal_fat_loss: "حرق الدهون", goal_muscle_gain: "بناء العضلات", goal_general_health: "صحة عامة",
    level_beginner: "مبتدئ", level_intermediate: "متوسط", place_home: "المنزل", place_gym: "النادي", safeVersion: "نسخة آمنة لأصحاب الحالات الطبية",
    allGoals: "كل الأهداف", allLevels: "كل المستويات", allPlaces: "كل الأماكن", newWorkout: "برنامج جديد", dayTitle: "اسم اليوم",
    addDay: "أضف يومًا", addExercise: "أضف تمرينًا", exercise: "التمرين", workoutSaved: "تم حفظ البرنامج", sharedLibrary: "من المكتبة",
    // foods
    foodsTitle: "قاعدة الأطعمة", perServing: "لكل حصة", unit: "الحصة", foodsHint: "القيم لكل حصة واحدة. تغيير الأطعمة يتم من لوحة الإدارة.",
    // settings
    settingsTitle: "الإعدادات والهوية", brandingTitle: "الهوية على أوراق العملاء", clinicName: "اسم العيادة أو الأخصائي",
    logo: "الشعار", uploadLogo: "رفع شعار", removeLogo: "إزالة الشعار", aiSettings: "الذكاء الاصطناعي", aiToggle: "تفعيل ميزات الذكاء الاصطناعي",
    aiToggleHint: "عند الإيقاف لن يُرسل أي شيء للذكاء الاصطناعي.", yourPlan: "خطتك الحالية", changePassword: "تغيير كلمة المرور",
    currentPassword: "كلمة المرور الحالية", newPassword: "كلمة المرور الجديدة", passwordChanged: "تم تغيير كلمة المرور",
    // public interview
    piTitle: "أسئلة ما قبل الزيارة", piHello: "أهلًا {name}", piIntro: "ستساعد إجاباتك أخصائي التغذية على تجهيز خطتك قبل الموعد. تستغرق 5–10 دقائق.",
    piStart: "ابدأ", piSubmit: "إرسال الإجابات", piStep: "الخطوة {n} من {total}", piThanks: "شكرًا لك!", piThanksBody: "وصلت إجاباتك لأخصائي التغذية. نراك في الموعد.",
    piAlready: "تم إرسال الإجابات من قبل. شكرًا لك!", piNotFound: "الرابط غير صحيح أو منتهي.", piPrivacy: "إجاباتك تصل لأخصائي التغذية فقط.",
  },
  en: {
    appName: "Diet in a Minute",
    tagline: "A diet plan in one minute",
    home: "Home", clients: "Clients", interviews: "Interviews", library: "Library", planTemplates: "Plan templates",
    workoutPlans: "Workout plans", foodDatabase: "Food database", account: "Account", settings: "Settings & branding",
    logout: "Log out", language: "Language",
    planBasic: "Basic plan", planPro: "Pro plan", planClinic: "Clinic plan",
    save: "Save", saving: "Saving…", cancel: "Cancel", delete: "Delete", edit: "Edit", back: "Back", next: "Next",
    search: "Search…", loading: "Loading…", open: "Open", close: "Close", copy: "Copy", copied: "Copied",
    yes: "Yes", no: "No", none: "None", optional: "optional", kcal: "kcal", g: "g", servings: "servings",
    saved: "Saved", error: "Something went wrong. Please try again.", confirmDelete: "Are you sure you want to delete this?",
    draftBadge: "Draft – needs review", testMode: "Test mode – not real AI",
    login: "Log in", signup: "Create account", email: "Email", password: "Password",
    firstName: "First name", lastName: "Last name", noAccount: "No account yet?", haveAccount: "Already have an account?",
    loginFailed: "Wrong email or password", welcomeBack: "Welcome back",
    loginSub: "Log in to manage your clients and their plans", signupSub: "Start building client plans in a minute",
    notSubscribedTitle: "Your account isn't active yet", notSubscribedBody: "Contact us to activate your subscription and start using the app.",
    goodDay: "Hello {name}", homeSub: "Here's what needs your attention today",
    statClients: "Clients", statPlans: "Plans in the last 30 days", statInterviews: "Interviews to review", statFollowUps: "Follow-ups due",
    followUpsDue: "Follow-ups due", followUpsEmpty: "No overdue follow-ups.", lastVisit: "Last visit",
    interviewsWaiting: "Interviews to review", interviewsEmpty: "No new interviews.",
    recentPlans: "Recent plans", recentEmpty: "No plans yet.", newClient: "New client",
    clientList: "Clients", searchClients: "Search by name…", noClients: "No clients yet. Add your first client.",
    age: "Age", years: "y", weight: "Weight", height: "Height", kg: "kg", cm: "cm", gender: "Gender",
    male: "Male", female: "Female", goal: "Goal", workStyle: "Work style & activity", bodyFat: "Body fat",
    muscle: "Muscle mass", target: "Daily target", plansCount: "{n} plans",
    goal_loss: "Weight loss", goal_gain: "Weight gain", goal_maintain: "Maintain", goal_: "Not set",
    ws_bed_bound: "Chair or bed bound", ws_seated_static: "Desk work, no movement", ws_seated_moving: "Desk work, some movement",
    ws_standing: "Standing work (home, shop)", ws_sport: "Lots of sport", ws_strenuous: "Strenuous work or very active",
    newClientTitle: "New client", editClientTitle: "Edit client", fullName: "Full name", notes: "Notes",
    measurements: "Measurements", targetsTitle: "Calories & macros", formula: "BMR formula",
    adjustment: "Calorie adjustment", adjustmentHint: "e.g. -500 for loss, +300 for gain",
    macroSplit: "Macro split", protein: "Protein", carbs: "Carbs", fat: "Fat",
    pctMustBe100: "Percentages must add up to 100%", bmr: "BMR", tdee: "Daily energy",
    dailyTarget: "Calorie target", saveClient: "Save client", clientSaved: "Client saved",
    tabOverview: "Overview", tabInterview: "Interview", tabPlans: "Plans", tabProgress: "Progress",
    newPlan: "New plan", visits: "Visits", needsReview: "Needs your review", noFlags: "No safety notes.",
    excludedFoods: "Foods this client must not get", excludedHint: "They're hidden from plans and can't be saved. Use for allergies and medical reasons.",
    addExcluded: "Add a food to exclude…", interviewLink: "Interview link", interviewLinkHint: "Send this link so the client answers the questions at home before the visit.",
    createLink: "Create link", copyLink: "Copy link", sendWhatsApp: "Send on WhatsApp", markReviewed: "Mark as reviewed",
    istatus_none: "Not sent", istatus_sent: "Link sent", istatus_submitted: "Answered – waiting for your review", istatus_reviewed: "Reviewed",
    answeredFields: "{n} answers", whatsappInvite: "Hi {name}, please answer these questions before your visit: {link}",
    noPlans: "No plans for this client yet.", viewSheet: "Client sheet", editPlan: "Edit",
    aiTitle: "AI assistant", aiSummary: "Interview summary", aiRecs: "Recommendations", aiFlags: "AI flags",
    runSummary: "Summarise interview", rerun: "Run again", aiDecides: "AI suggests, you decide.",
    aiUpgrade: "AI features are part of the Pro plan.", aiOff: "AI is switched off in Settings.",
    aiNotReady: "AI isn't set up on the server yet.", aiThinking: "Working…",
    aiDraft: "AI draft", aiDraftNote: "AI chose the foods. Every number is calculated from your food database.",
    aiMessage: "Message to client", writeMessage: "Write client message", aiFollowUp: "Follow-up suggestion", runFollowUp: "Compare with last visit",
    progressTitle: "Progress across visits", sinceStart: "Since start", sinceLast: "Since last visit",
    needTwoVisits: "Needs at least two visits to show progress.", printReport: "Print report", progressReport: "Progress report",
    builderTitle: "New plan for {name}", editBuilderTitle: "Edit plan for {name}", planName: "Plan name",
    defaultPlanName: "Plan {date}", stepServings: "Servings", stepMeals: "Meals", stepDone: "Save",
    startFrom: "How do you want to start?", startEmpty: "Empty plan", startEmptyHint: "You pick the foods and servings.",
    startTemplate: "From a template", startTemplateHint: "Use a saved plan or a medical template.", startAI: "AI draft",
    startAIHint: "From the interview answers. You review and adjust.", addFood: "Add a food…", servingsOf: "1 serving = {unit}",
    dailyTotal: "Daily total", ofTarget: "of {target}", onTarget: "On target", nearTarget: "Close", offTarget: "Off target",
    fitTargets: "Fit servings to targets", fitHint: "The app adjusts servings to match the targets.",
    noFoodsYet: "Add foods from the search above, or start from a template.", continueMeals: "Next: split into meals",
    mealsCount: "Number of meals", withSnacks: "with snacks", assignMeals: "Choose the meals for each food",
    splitEqual: "Equal", splitCustom: "Custom split", shareOf: "Share", notInMeal: "Not in any meal",
    mealPreview: "Meal preview", savePlan: "Save plan", planSaved: "Plan saved", excludedBlocked: "Excluded for this client: {foods}",
    removedExcluded: "Removed excluded foods: {foods}", chooseTemplate: "Choose a template", meal1: "Meal 1", meal2: "Meal 2",
    meal3: "Meal 3", meal4: "Meal 4", snack1: "Snack 1", snack2: "Snack 2", snack3: "Snack 3",
    type_protein: "Protein", type_carb: "Carbs", type_fat: "Fats", type_mixed: "Mixed",
    sheetTitle: "Diet plan", preparedFor: "Prepared for", date: "Date", downloadPdf: "Download PDF", print: "Print",
    groceryList: "Weekly shopping list", perDay: "per day", perWeek: "per week", workout: "Workout plan",
    attachWorkout: "Attach a workout", noWorkout: "No workout", saveAsTemplate: "Save as template", templateSaved: "Template saved",
    planNotes: "Notes for the client", unassignedWarn: "These foods are in the plan but not in any meal, so the client won't see them: {foods}",
    sets: "Sets", reps: "Reps", rest: "Rest", activityGuide: "General activity guide – stop if you feel pain or dizziness.",
    templatesTitle: "Plan templates", medicalTemplates: "Medical templates", myTemplates: "My templates", noTemplates: "No templates yet. Save any plan as a template from its client sheet.",
    foodsCount: "{n} foods", draftWarn: "Starting draft. Needs review by a dietitian before use.",
    workoutsTitle: "Workout plans", goal_fat_loss: "Fat loss", goal_muscle_gain: "Muscle gain", goal_general_health: "General health",
    level_beginner: "Beginner", level_intermediate: "Intermediate", place_home: "Home", place_gym: "Gym", safeVersion: "Safe version for medical limits",
    allGoals: "All goals", allLevels: "All levels", allPlaces: "All places", newWorkout: "New workout", dayTitle: "Day name",
    addDay: "Add day", addExercise: "Add exercise", exercise: "Exercise", workoutSaved: "Workout saved", sharedLibrary: "Library",
    foodsTitle: "Food database", perServing: "per serving", unit: "Serving", foodsHint: "Values are per one serving. Foods are changed from the admin panel.",
    settingsTitle: "Settings & branding", brandingTitle: "Branding on client sheets", clinicName: "Clinic or dietitian name",
    logo: "Logo", uploadLogo: "Upload logo", removeLogo: "Remove logo", aiSettings: "AI", aiToggle: "Use AI features",
    aiToggleHint: "When off, nothing is sent to AI.", yourPlan: "Your plan", changePassword: "Change password",
    currentPassword: "Current password", newPassword: "New password", passwordChanged: "Password changed",
    piTitle: "Before your visit", piHello: "Hello {name}", piIntro: "Your answers help your dietitian prepare your plan before the visit. It takes 5–10 minutes.",
    piStart: "Start", piSubmit: "Send answers", piStep: "Step {n} of {total}", piThanks: "Thank you!", piThanksBody: "Your answers reached your dietitian. See you at your visit.",
    piAlready: "These answers were already sent. Thank you!", piNotFound: "This link is not valid.", piPrivacy: "Only your dietitian sees your answers.",
  },
};

const LanguageContext = createContext(null);

function readSaved() {
  try {
    return localStorage.getItem("lang");
  } catch {
    return null;
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readSaved() === "en" ? "en" : "ar");

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo(() => {
    const dict = STRINGS[lang];
    const t = (key, vars) => {
      let text = dict[key] ?? STRINGS.en[key] ?? key;
      if (vars) Object.entries(vars).forEach(([k, v]) => { text = text.replaceAll(`{${k}}`, v); });
      return text;
    };
    const setLang = (next) => {
      try { localStorage.setItem("lang", next); } catch { /* private window */ }
      setLangState(next);
    };
    // Food and unit names in the current language (Arabic names come from the database).
    const foodName = (f) => (lang === "ar" ? f?.name_ar || f?.food_name_ar || f?.name || f?.food_name : f?.name || f?.food_name || f?.name_ar);
    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(lang === "ar" ? "ar-JO" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
    const num = (n, digits = 0) => (n === null || n === undefined || Number.isNaN(Number(n)) ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: digits }));
    return { lang, dir: lang === "ar" ? "rtl" : "ltr", t, setLang, foodName, fmtDate, num };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useI18n = () => useContext(LanguageContext);

export const MEAL_ORDER = ["meal1", "snack1", "meal2", "snack2", "meal3", "snack3", "meal4"];

// Which meal slots to use for a chosen number of main meals.
export function mealSlots(mainMeals, withSnacks) {
  const mains = ["meal1", "meal2", "meal3", "meal4"].slice(0, mainMeals);
  if (!withSnacks) return mains;
  return MEAL_ORDER.filter((m) => mains.includes(m) || (m.startsWith("snack") && Number(m.slice(-1)) < mainMeals));
}
