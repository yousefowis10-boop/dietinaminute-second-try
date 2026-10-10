import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, Check, Droplet, Dumbbell, ListChecks, Salad, ShoppingCart, X } from "lucide-react";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Spinner } from "../ui";
import { LanguageSwitch } from "./AppLayout";
import WorkoutView from "./WorkoutView";
import SmartGrocery from "./SmartGrocery";
import { AdviceCards } from "./client/bloodUi";
import { englishUnit, niceAmount } from "./foodUtils";
import { dayLabel, fromIso, isoDay } from "./schedule";

const GLASSES = 12;
const SHOP_KEY = (token) => `dim.shop.${token}`;
const HINT_KEY = "dim.installHintClosed";

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private window: still works this visit */ }
}

function FoodLine({ row }) {
  const { lang, num } = useI18n();
  const ar = lang === "ar";
  return (
    <span className="block">
      <span className="num font-semibold">{num(niceAmount(row.amount, row.factor), 1)} {ar ? row.unit : englishUnit(row.unit_en, row.unit, row.factor ?? 100)}</span>{" "}
      {ar ? row.food : row.food_en}
    </span>
  );
}

function Tick({ value }) {
  if (value === 1) return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ok text-white"><Check className="h-4 w-4" /></span>;
  if (value === 0.5) return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-warn text-xs font-bold text-white">½</span>;
  return <span className="h-7 w-7 shrink-0 rounded-full border-2 border-[#c4ccc8]" />;
}

// The client's own phone page from their private link. No login, no download.
export default function ClientApp() {
  const { token } = useParams();
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [tab, setTab] = useState("today");
  const [log, setLog] = useState({ meals: {}, water: 0 });
  const [weekDay, setWeekDay] = useState(new Date().getDay());
  const [shop, setShop] = useState(() => readJson(SHOP_KEY(token), {}));
  const [hint, setHint] = useState(() => !readJson(HINT_KEY, false));
  const today = isoDay();

  const load = useCallback(() => API.get(`/public/app/${token}/`, { params: { date: today } }).then((r) => {
    setData(r.data);
    const d = r.data.week.find((w) => w.date === r.data.date) || { meals: {}, water: 0 };
    setLog({ meals: d.meals || {}, water: d.water || 0 });
    setState("ready");
  }).catch(() => setState("notfound")), [token, today]);
  useEffect(() => { load(); }, [load]);

  const save = async (next) => {
    setLog(next);
    try {
      const r = await API.post(`/public/app/${token}/`, { date: today, meals: next.meals, water: next.water });
      setData((d) => ({ ...d, adherence: r.data.adherence }));
    } catch { /* keep what they tapped; it is sent again next time */ }
  };
  const tapMeal = (key) => {
    const cur = log.meals[key];
    const meals = { ...log.meals };
    if (cur === 1) meals[key] = 0.5;
    else if (cur === 0.5) delete meals[key];
    else meals[key] = 1;
    save({ ...log, meals });
  };
  const tapGlass = (i) => save({ ...log, water: log.water === i + 1 ? i : i + 1 });
  const toggleShop = (key) => {
    const next = { ...shop, [key]: !shop[key] };
    setShop(next);
    writeJson(SHOP_KEY(token), next);
  };

  if (state === "loading") return <div className="min-h-screen bg-page"><Spinner label={t("loading")} /></div>;
  if (state === "notfound") return <div className="grid min-h-screen place-items-center bg-page p-6"><div className="card max-w-sm p-8 text-center text-muted">{t("appNotFound")}</div></div>;

  const plan = data.plan;
  const meals = plan?.meals || [];
  const mealName = (m) => m.name || t(m.key);
  const eaten = Object.values(log.meals).reduce((s, v) => s + Number(v || 0), 0);
  const nxt = data.next_appointment;
  const dayNames = Array.from({ length: 7 }, (_, i) => new Date(2026, 0, 4 + i).toLocaleDateString(ar ? "ar-JO" : "en-GB", { weekday: "short" }));
  const weekPlan = plan?.weekly?.days?.[weekDay];
  const tabs = [["today", t("appToday"), ListChecks], ["plan", t("appPlan"), Salad], ["shop", t("appShopping"), ShoppingCart], ["workout", t("appWorkout"), Dumbbell]];

  return (
    <div className="min-h-screen bg-page pb-20">
      <div className="bg-brand px-4 pb-4 pt-5 text-white">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-2">
            {data.logo_url && <img src={data.logo_url} alt="" className="h-8 w-8 rounded-lg bg-white object-contain" />}
            <span className="min-w-0 flex-1 truncate text-xs opacity-80">{data.clinic_name || "Diet in a Minute"} · {dayLabel(fromIso(data.date), lang, { weekday: "long", day: "numeric", month: "long" })}</span>
            <div className="text-brand-ink"><LanguageSwitch className="w-32" /></div>
          </div>
          <h1 className="mt-2 text-xl font-bold">{t("appHello", { name: data.first_name })} 👋</h1>
          {tab === "today" && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl bg-white/15 px-3 py-2">{t("thisWeek")}<b className="num block text-lg">{data.adherence === null ? "—" : `${data.adherence}%`}</b></div>
              <div className="rounded-xl bg-white/15 px-3 py-2">{t("mealsToday")}<b className="num block text-lg">{eaten} / {meals.length}</b></div>
              <div className="rounded-xl bg-white/15 px-3 py-2">{t("water")}<b className="num block text-lg">{+(log.water * 0.25).toFixed(2)} {t("litre")}</b></div>
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 py-4">
        {!plan && <div className="card p-6 text-center text-sm text-muted">{t("appNoPlan")}</div>}

        {tab === "today" && (
          <>
            {hint && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#f3dfae] bg-[#fff8e6] p-3 text-xs">
                <span className="flex-1">📲 {t("installHint")}</span>
                <button type="button" onClick={() => { setHint(false); writeJson(HINT_KEY, true); }} aria-label="close"><X className="h-4 w-4 text-muted" /></button>
              </div>
            )}
            {nxt && (
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#e8eefa] px-4 py-3 text-sm">
                <CalendarDays className="h-5 w-5 shrink-0 text-[#2f5fb3]" />
                <div>
                  <div className="text-xs text-muted">{t("nextAppointment")}</div>
                  <b>{nxt.date === data.date ? t("todayWord") : dayLabel(fromIso(nxt.date), lang, { weekday: "long", day: "numeric", month: "short" })} <span className="num">{nxt.time}</span> · {nxt.with}</b>
                  {nxt.online && <div className="text-xs text-muted">{t("videoCall")}</div>}
                </div>
              </div>
            )}
            {data.blood_advice?.items?.length > 0 && (
              <details className="mb-3 rounded-xl border border-[#f6c7b1] bg-white px-4 py-3 text-sm">
                <summary className="cursor-pointer font-bold">🩸 {t("appBloodAdvice", { date: dayLabel(fromIso(data.blood_advice.date), lang, { day: "numeric", month: "short" }) })}</summary>
                <div className="mt-3"><AdviceCards advice={data.blood_advice.items} /></div>
              </details>
            )}
            {meals.length > 0 && (
              <>
                <div className="mb-2 mt-1 flex items-baseline justify-between"><h2 className="font-bold">{t("todaysMeals")}</h2><span className="text-xs text-muted">{t("tapWhenEaten")}</span></div>
                {meals.map((m) => {
                  const v = log.meals[m.key];
                  return (
                    <button key={m.key} type="button" onClick={() => tapMeal(m.key)}
                      className={`mb-2 flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-start text-sm ${v === 1 ? "border-[#bfe3cd] bg-ok-soft" : v === 0.5 ? "border-[#f3dfae] bg-warn-soft" : "border-line bg-white"}`}>
                      <Tick value={v} />
                      <span className="min-w-0 flex-1">
                        <b className="block">{mealName(m)}{m.time && <span className="num font-normal text-muted"> · {m.time}</span>}</b>
                        <span className="text-[13px] text-[#4b5551]">{m.items.map((r, i) => <FoodLine key={i} row={r} />)}</span>
                        {v === 0.5 && <span className="text-xs text-warn">{t("ateHalf")}</span>}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
            <div className="mb-2 mt-4 flex items-baseline justify-between"><h2 className="font-bold">{t("water")}</h2><span className="text-xs text-muted">{t("glassHint")}</span></div>
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: GLASSES }, (_, i) => (
                <button key={i} type="button" onClick={() => tapGlass(i)} aria-label={`${i + 1}`}
                  className={`grid h-10 place-items-center rounded-lg ${i < log.water ? "bg-[#d6e6fb] text-[#2f5fb3]" : "bg-white text-[#c4ccc8]"}`}>
                  <Droplet className="h-4 w-4" fill={i < log.water ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <Link to={`/c/${token}`} className="btn-primary mt-5 h-12 w-full text-base">{t("checkInNow")}</Link>
          </>
        )}

        {tab === "plan" && plan && (
          <>
            {plan.weekly ? (
              <>
                <div className="mb-3 grid grid-cols-7 gap-1">
                  {dayNames.map((n, i) => (
                    <button key={i} type="button" onClick={() => setWeekDay(i)}
                      className={`rounded-lg border py-1.5 text-[11px] ${weekDay === i ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{n}</button>
                  ))}
                </div>
                {meals.map((m) => {
                  const rows = (weekPlan?.items || []).filter((x) => x.meal === m.key);
                  if (!rows.length) return null;
                  return (
                    <div key={m.key} className="mb-2 rounded-xl border border-line bg-white px-3.5 py-3 text-sm">
                      <b className="block">{mealName(m)}</b>
                      {rows.map((x, i) => (
                        <span key={i} className="block text-[13px] text-[#4b5551]">
                          <span className="num font-semibold">{niceAmount(x.amount, x.factor)} {ar ? x.unit_ar || x.unit : englishUnit(x.unit, x.unit_ar, x.factor)}</span> {ar ? x.name_ar || x.name : x.name}
                          {x.swapped && <span className="ms-1 rounded-full bg-[#e8eefa] px-1.5 text-[10px] text-[#2f5fb3]">{t("swapTag")}</span>}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </>
            ) : (
              meals.map((m) => (
                <div key={m.key} className="mb-2 rounded-xl border border-line bg-white px-3.5 py-3 text-sm">
                  <b className="block">{mealName(m)}{m.time && <span className="num font-normal text-muted"> · {m.time}</span>}</b>
                  <span className="text-[13px] text-[#4b5551]">{m.items.map((r, i) => <FoodLine key={i} row={r} />)}</span>
                </div>
              ))
            )}
            {plan.notes && <div className="card mt-3 whitespace-pre-line p-4 text-sm">{plan.notes}</div>}
          </>
        )}

        {tab === "shop" && plan && (
          <SmartGrocery rows={plan.grocery} rows2={plan.grocery2} ticks={shop} onTick={toggleShop} compact
            onShare={(text) => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener")} />
        )}

        {tab === "workout" && (
          plan?.workout ? <div className="card p-4"><WorkoutView workout={plan.workout} /></div>
            : <div className="card p-6 text-center text-sm text-muted">{t("appNoWorkout")}</div>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${tab === key ? "font-bold text-brand" : "text-muted"}`}>
              <Icon className="h-5 w-5" />{label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
