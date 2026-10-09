import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Spinner } from "../ui";
import { LanguageSwitch } from "./AppLayout";
import { addDays, dayLabel, fromIso, isoDay, money } from "./schedule";

function Option({ on, onClick, title, sub, right }) {
  return (
    <button type="button" onClick={onClick}
      className={`mb-2 flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-start ${on ? "border-2 border-brand bg-brand-soft" : "border border-line bg-white"}`}>
      <span><span className="block font-medium">{title}</span>{sub && <span className="block text-xs text-muted">{sub}</span>}</span>
      {right}
    </button>
  );
}

// The next two weeks, without the calendar's days off (stored Monday = 0).
const openDays = (cal, today) => Array.from({ length: 21 }, (_, i) => addDays(fromIso(today), i))
  .filter((d) => !cal.open_days || cal.open_days.includes((d.getDay() + 6) % 7)).slice(0, 14).map((d) => isoDay(d));

// The clinic's booking link: pick dietitian, visit type, day, time and how to pay. No login.
export default function PublicBooking() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const [info, setInfo] = useState(null);
  const [state, setState] = useState("loading"); // loading | form | done | notfound
  const [cal, setCal] = useState(null);
  const [typeId, setTypeId] = useState(null);
  const [day, setDay] = useState(null);
  const [slots, setSlots] = useState(null);
  const [time, setTime] = useState("");
  const [pay, setPay] = useState("clinic");
  const [who, setWho] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    API.get(`/public/book/${slug}/`).then((r) => {
      setInfo(r.data);
      const c = r.data.calendars.find((x) => x.slug === r.data.selected) || r.data.calendars[0];
      setCal(c);
      setTypeId(c?.types[0]?.id || null);
      setPay(c?.pay_at_clinic ? "clinic" : "online");
      setDay(openDays(c, r.data.today)[0]);
      setState("form");
    }).catch(() => setState("notfound"));
  }, [slug]);

  useEffect(() => {
    if (!cal || !typeId || !day) return;
    setSlots(null);
    setTime("");
    API.get(`/public/book/${cal.slug}/slots/`, { params: { type: typeId, date: day } })
      .then((r) => setSlots(r.data.slots)).catch(() => setSlots([]));
  }, [cal, typeId, day, refresh]);

  const type = cal?.types.find((x) => x.id === typeId);
  const days = info && cal ? openDays(cal, info.today) : [];

  const pickCal = (c) => { setCal(c); setTypeId(c.types[0]?.id || null); setPay(c.pay_at_clinic ? "clinic" : "online"); setDay(openDays(c, info.today)[0]); };
  const book = async () => {
    if (!who.name.trim() || who.phone.replace(/\D/g, "").length < 8) { setError(t("bookNamePhone")); return; }
    setBusy(true);
    setError("");
    try {
      const r = await API.post(`/public/book/${cal.slug}/slots/`, { type: typeId, date: day, time, pay, ...who });
      setDone(r.data);
      setState("done");
    } catch (err) {
      const code = err?.response?.data?.detail;
      setError(code === "slot_taken" ? t("slotTaken") : code === "too_many" ? t("tooManyBookings") : t("error"));
      if (code === "slot_taken") setRefresh((n) => n + 1); // show the times that are still free
    } finally {
      setBusy(false);
    }
  };

  const label = (text) => <div className="mb-2 mt-5 text-sm font-bold">{text}</div>;

  return (
    <div className="min-h-screen bg-page px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-5 flex items-center gap-3">
          {info?.logo_url ? <img src={info.logo_url} alt="" className="h-11 w-11 rounded-xl border border-line bg-white object-contain" />
            : <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft font-bold text-brand">{(info?.clinic_name || "D")[0]}</span>}
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold">{t("bookTitle")}</div>
            <div className="truncate text-sm text-muted">{info?.clinic_name || "Diet in a Minute"}</div>
          </div>
          <LanguageSwitch className="w-36" />
        </header>
        {state === "loading" && <Spinner label={t("loading")} />}
        {state === "notfound" && <div className="card p-8 text-center text-muted">{t("bookNotFound")}</div>}
        {state === "done" && (
          <div className="card p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-ok" />
            <h1 className="mt-3 text-xl font-bold">{t("bookDone")}</h1>
            <p className="mt-2 text-sm text-muted">
              {dayLabel(fromIso(done.date), lang, { weekday: "long", day: "numeric", month: "long" })} · <span className="num">{done.time}</span> · {cal.name}
            </p>
            <p className="mt-2 text-sm text-muted">{done.pay === "online" ? t("bookPaidOnline") : t("bookPayAtClinic")}</p>
          </div>
        )}
        {state === "form" && (
          <div className="card p-5">
            {info.calendars.length > 1 && (
              <>
                {label(t("bookWithWhom"))}
                {info.calendars.map((c) => <Option key={c.slug} on={cal.slug === c.slug} onClick={() => pickCal(c)} title={c.name} />)}
              </>
            )}
            {label(t("visitType"))}
            {cal.types.map((x) => (
              <Option key={x.id} on={typeId === x.id} onClick={() => setTypeId(x.id)} title={lang === "ar" ? x.name_ar || x.name : x.name}
                sub={`${x.minutes} ${t("minutes")}${x.online ? ` · ${t("videoCall")}` : ""}`}
                right={x.price > 0 && <b className="num whitespace-nowrap">{money(x.price, cal.currency)}</b>} />
            ))}
            {label(t("dayAndTime"))}
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {days.map((d) => (
                <button key={d} type="button" onClick={() => setDay(d)}
                  className={`min-w-[3.6rem] rounded-xl border px-1 py-1.5 text-center text-xs ${day === d ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>
                  {dayLabel(fromIso(d), lang, { weekday: "short" })}
                  <b className="num block text-base">{fromIso(d).getDate()}</b>
                </button>
              ))}
            </div>
            <div className="mt-3">
              {slots === null ? <Spinner /> : slots.length === 0 ? <p className="text-sm text-muted">{t("noFreeTimesDay")}</p> : (
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.map((s) => (
                    <button key={s} type="button" onClick={() => setTime(s)}
                      className={`num rounded-lg py-2 text-sm ${time === s ? "border-2 border-brand font-bold text-brand" : "border border-line bg-white"}`}>{s}</button>
                  ))}
                </div>
              )}
            </div>
            {time && (
              <>
                {label(t("yourDetails"))}
                <div className="space-y-2">
                  <input className="input h-11" placeholder={t("fullName")} value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} />
                  <input className="input h-11" type="tel" dir="ltr" placeholder={t("phoneLbl")} value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} />
                </div>
                {(cal.pay_online || cal.pay_at_clinic) && type?.price > 0 && (
                  <>
                    {label(t("payment"))}
                    {cal.pay_online && <Option on={pay === "online"} onClick={() => setPay("online")} title={t("payNowOnline")} sub={t("payNowOnlineSub")} />}
                    {cal.pay_at_clinic && <Option on={pay === "clinic"} onClick={() => setPay("clinic")} title={t("payAtClinic")} sub={t("payAtClinicSub")} />}
                  </>
                )}
                {error && <p className="mt-3 text-sm text-bad">{error}</p>}
                <button type="button" className="btn-primary mt-4 h-12 w-full text-base" disabled={busy} onClick={book}>
                  {busy ? t("saving") : `${t("confirmBooking")}${type?.price > 0 ? ` · ${money(type.price, cal.currency)}` : ""}`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
