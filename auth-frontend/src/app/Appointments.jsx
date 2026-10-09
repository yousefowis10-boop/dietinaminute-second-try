import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Link2, MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import API from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { Badge, Field, Modal, PageHeader, Spinner, apiError } from "../ui";
import {
  addDays, bookingUrl, dayLabel, fromIso, fromMinutes, isoDay, money, openWhatsApp, toMinutes, weekStart,
} from "./schedule";

const PX_PER_MIN = 1.1;
export const STATUS_TONE = { booked: "brand", attended: "ok", no_show: "bad", cancelled: "neutral" };

export const typeName = (a, lang) => (lang === "ar" ? a.type_name_ar || a.type_name : a.type_name);

// The WhatsApp reminder text, in the current language.
export function reminderText(a, t, lang, clinic) {
  return t("reminderMsg", {
    name: (a.name || "").split(" ")[0],
    day: dayLabel(fromIso(a.date), lang, { weekday: "long", day: "numeric", month: "long" }),
    time: a.time,
    clinic: clinic || a.calendar_name,
  });
}

function AppointmentForm({ initial, calendars, onClose, onSaved }) {
  const { t, lang } = useI18n();
  const [a, setA] = useState(initial);
  const [clients, setClients] = useState([]);
  const [slots, setSlots] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setA((x) => ({ ...x, [k]: v }));
  const cal = calendars.find((c) => c.id === Number(a.calendar)) || calendars[0];
  const types = (cal?.types || []).filter((x) => x.active || x.id === a.type);

  useEffect(() => { API.get("/nutrition/clients/").then((r) => setClients(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (!cal || !a.date) return;
    API.get(`/nutrition/calendars/${cal.id}/free-slots/`, { params: { date: a.date, minutes: a.minutes || 30, ignore: a.id || "" } })
      .then((r) => setSlots(r.data.slots)).catch(() => setSlots([]));
  }, [cal, a.date, a.minutes, a.id]);

  const pickType = (id) => {
    const tp = types.find((x) => x.id === Number(id));
    setA((x) => ({ ...x, type: tp ? tp.id : null, minutes: tp ? tp.minutes : x.minutes, price: tp && !x.paid ? tp.price : x.price }));
  };
  const save = async () => {
    setBusy(true);
    try {
      const body = { calendar: cal.id, type: a.type || null, client: a.client || null, guest_name: a.guest_name || "",
        guest_phone: a.guest_phone || "", date: a.date, time: a.time, minutes: a.minutes, price: a.price,
        pay_method: a.pay_method || "", notes: a.notes || "" };
      if (a.id) await API.put(`/nutrition/appointments/${a.id}/`, body);
      else await API.post("/nutrition/appointments/", body);
      toast.success(t("saved"));
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail === "name_required" ? t("apptNameRequired") : apiError(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={a.id ? t("editAppointment") : t("newAppointment")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("calendar")}>
          <select className="input" value={cal?.id || ""} onChange={(e) => set("calendar", Number(e.target.value))}>
            {calendars.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t("visitType")}>
          <select className="input" value={a.type || ""} onChange={(e) => pickType(e.target.value)}>
            <option value="">—</option>
            {types.map((x) => <option key={x.id} value={x.id}>{lang === "ar" ? x.name_ar || x.name : x.name} · {x.minutes} {t("minShort")}</option>)}
          </select>
        </Field>
        <Field label={t("client")} className="sm:col-span-2">
          <select className="input" value={a.client || ""} onChange={(e) => set("client", e.target.value ? Number(e.target.value) : null)}>
            <option value="">{t("notAClientYet")}</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {!a.client && (
          <>
            <Field label={t("guestName")}><input className="input" value={a.guest_name || ""} onChange={(e) => set("guest_name", e.target.value)} /></Field>
            <Field label={t("phoneLbl")}><input className="input" type="tel" dir="ltr" value={a.guest_phone || ""} onChange={(e) => set("guest_phone", e.target.value)} /></Field>
          </>
        )}
        <Field label={t("date")}><input className="input" type="date" value={a.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label={t("time")}>
          <input className="input" type="time" step="300" value={a.time} onChange={(e) => set("time", e.target.value)} />
        </Field>
        {slots && (
          <div className="sm:col-span-2">
            <div className="mb-1 text-xs font-medium text-muted">{slots.length ? t("freeTimes") : t("noFreeTimes")}</div>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s) => (
                <button key={s} type="button" onClick={() => set("time", s)}
                  className={`num rounded-lg border px-2.5 py-1 text-xs ${a.time === s ? "border-brand bg-brand-soft font-bold text-brand" : "border-line bg-white"}`}>{s}</button>
              ))}
            </div>
          </div>
        )}
        <Field label={t("lengthMin")}><input className="input num" type="number" min="5" step="5" value={a.minutes} onChange={(e) => set("minutes", e.target.value)} /></Field>
        <Field label={`${t("price")} (${cal?.currency || ""})`}><input className="input num" type="number" min="0" step="0.5" value={a.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label={t("notes")} className="sm:col-span-2"><textarea className="input" rows={2} value={a.notes || ""} onChange={(e) => set("notes", e.target.value)} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button type="button" className="btn-primary" disabled={busy || !a.date || !a.time} onClick={save}>{busy ? t("saving") : t("save")}</button>
      </div>
    </Modal>
  );
}

function DetailPanel({ appt, account, onChanged, onEdit, onClose }) {
  const { t, lang } = useI18n();
  const [notes, setNotes] = useState(appt.notes || "");
  useEffect(() => setNotes(appt.notes || ""), [appt.id, appt.notes]);

  const update = async (body) => {
    try {
      await API.put(`/nutrition/appointments/${appt.id}/`, body);
      onChanged();
    } catch (err) {
      toast.error(apiError(err, t));
    }
  };
  const remind = async () => {
    openWhatsApp(appt.phone, reminderText(appt, t, lang, account?.clinic_name));
    try { await API.post(`/nutrition/appointments/${appt.id}/reminder/`); onChanged(); } catch { /* the message still opened */ }
  };
  const remove = async () => {
    if (!window.confirm(t("confirmDelete"))) return;
    await API.delete(`/nutrition/appointments/${appt.id}/`);
    onClose();
    onChanged();
  };
  const paidLabel = appt.paid ? `${t("paid")}${appt.paid_via ? ` · ${t(`paidVia_${appt.paid_via}`)}` : ""}` : t("unpaid");

  return (
    <section className="card p-5">
      <div className="flex items-start gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: appt.color }}>{typeName(appt, lang) || t("appointment")}</span>
        <button type="button" className="btn-ghost ms-auto p-1.5" onClick={onEdit} title={t("edit")}><Pencil className="h-4 w-4" /></button>
        <button type="button" className="btn-ghost p-1.5 hover:text-bad" onClick={remove} title={t("delete")}><Trash2 className="h-4 w-4" /></button>
      </div>
      <h3 className="mt-2 text-lg font-bold">{appt.name}</h3>
      <div className="text-sm text-muted">{dayLabel(fromIso(appt.date), lang, { weekday: "long", day: "numeric", month: "short" })} · <span className="num">{appt.time} – {fromMinutes(toMinutes(appt.time) + appt.minutes)}</span> · {appt.calendar_name}</div>

      <div className="mt-3 grid grid-cols-4 overflow-hidden rounded-xl border border-line text-center text-xs font-semibold">
        {["booked", "attended", "no_show", "cancelled"].map((s) => (
          <button key={s} type="button" onClick={() => update({ status: s })}
            className={`border-e border-line px-1 py-2 last:border-e-0 ${appt.status === s ? { booked: "bg-brand-soft text-brand", attended: "bg-ok-soft text-ok", no_show: "bg-bad-soft text-bad", cancelled: "bg-page text-muted" }[s] : "bg-white"}`}>
            {t(`apptStatus_${s}`)}
          </button>
        ))}
      </div>

      <dl className="mt-3 divide-y divide-line text-sm">
        <div className="flex justify-between py-2"><dt className="text-muted">{t("phoneLbl")}</dt><dd dir="ltr">{appt.phone || "—"}</dd></div>
        <div className="flex justify-between py-2"><dt className="text-muted">{t("booked")}</dt><dd>{appt.source === "booking_link" ? t("viaBookingLink") : t("byYou")}</dd></div>
        <div className="flex items-center justify-between gap-2 py-2">
          <dt className="text-muted">{t("payment")}</dt>
          <dd className="flex items-center gap-2">
            <Badge tone={appt.paid ? "ok" : "warn"}>{paidLabel}</Badge>
            <span className="num">{money(appt.price, appt.currency)}</span>
          </dd>
        </div>
      </dl>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {appt.paid ? (
          <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => update({ paid: false })}>{t("markUnpaid")}</button>
        ) : ["cash", "card", "transfer"].map((v) => (
          <button key={v} type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => update({ paid_via: v })}>{t("paidBy")} {t(`paidVia_${v}`)}</button>
        ))}
      </div>

      {appt.phone && appt.status === "booked" && (
        <>
          <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">{t("reminder")}</div>
          <p className="mt-1.5 rounded-xl border border-[#cdeedb] bg-[#f2fbf5] p-3 text-xs leading-relaxed">{reminderText(appt, t, lang, account?.clinic_name)}</p>
          <button type="button" className="btn mt-2 w-full bg-[#1fa855] text-white hover:opacity-90" onClick={remind}>
            <MessageCircle className="h-4 w-4" />{appt.reminder_sent_at ? t("sendAgain") : t("sendWhatsAppOneTap")}
          </button>
          <p className="mt-1 text-[11px] text-muted">{appt.reminder_sent_at ? t("reminderSent") : t("reminderHint")}</p>
        </>
      )}

      <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">{t("visitNotes")}</div>
      <textarea className="input mt-1.5" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (appt.notes || "") && update({ notes })} placeholder={t("visitNotesPh")} />

      <div className="mt-4 grid grid-cols-2 gap-2">
        {appt.client ? (
          <>
            <Link className="btn-secondary px-2 text-xs" to={`/dashboard/clients/${appt.client}`}>{t("openClient")}</Link>
            <Link className="btn-secondary px-2 text-xs" to={`/dashboard/clients/${appt.client}?tab=progress`}>{t("addCheckin")}</Link>
          </>
        ) : (
          <Link className="btn-secondary col-span-2 px-2 text-xs" to="/dashboard/clients/new">{t("makeClient")}</Link>
        )}
      </div>
    </section>
  );
}

export default function Appointments() {
  const { t, lang } = useI18n();
  const { account } = useAuth();
  const [calendars, setCalendars] = useState(null);
  const [calId, setCalId] = useState("all");
  const [start, setStart] = useState(() => weekStart(new Date()));
  const [appts, setAppts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => { API.get("/nutrition/calendars/").then((r) => setCalendars(r.data)).catch(() => setCalendars([])); }, []);
  const load = useCallback(() => {
    API.get("/nutrition/appointments/", { params: { start: isoDay(start), end: isoDay(addDays(start, 6)) } })
      .then((r) => setAppts(r.data)).catch(() => toast.error(t("error")));
  }, [start, t]);
  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => (calendars || []).filter((c) => c.active), [calendars]);
  const shownCals = calId === "all" ? active : active.filter((c) => c.id === calId);
  const shown = appts.filter((a) => calId === "all" || a.calendar === calId);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  // Hours to draw: from the earliest opening to the latest closing of the calendars on screen.
  const [from, to] = useMemo(() => {
    let lo = 9 * 60;
    let hi = 18 * 60;
    shownCals.forEach((c) => Object.values(c.hours || {}).forEach((h) => {
      if (!h.on) return;
      lo = Math.min(lo, toMinutes(h.start));
      hi = Math.max(hi, toMinutes(h.end));
    }));
    shown.forEach((a) => { lo = Math.min(lo, toMinutes(a.time)); hi = Math.max(hi, toMinutes(a.time) + a.minutes); });
    return [Math.floor(lo / 60) * 60, Math.ceil(hi / 60) * 60];
  }, [shownCals, shown]);
  const hours = Array.from({ length: (to - from) / 60 }, (_, i) => from + i * 60);
  const today = isoDay();
  const sel = selected ? appts.find((a) => a.id === selected) : null;

  const week = {
    count: shown.filter((a) => a.status !== "cancelled").length,
    noShows: shown.filter((a) => a.status === "no_show").length,
    paid: shown.filter((a) => a.paid && a.paid_via !== "package").reduce((s, a) => s + a.price, 0),
    unpaid: shown.filter((a) => !a.paid && a.price > 0 && a.status !== "cancelled").length,
  };
  const currency = active[0]?.currency || "";

  const newAt = (day, minutes) => {
    const cal = calId === "all" ? active[0] : active.find((c) => c.id === calId);
    if (!cal) return;
    const tp = cal.types.find((x) => x.active);
    setEditing({ calendar: cal.id, type: tp?.id || null, minutes: tp?.minutes || 30, price: tp?.price || 0, date: isoDay(day),
      time: fromMinutes(minutes), client: null, guest_name: "", guest_phone: "", notes: "" });
  };
  const offDay = (day) => shownCals.length > 0 && shownCals.every((c) => !(c.hours || {})[String((day.getDay() + 6) % 7)]?.on);
  const copyBooking = async (slug) => {
    try { await navigator.clipboard.writeText(bookingUrl(slug)); toast.success(t("copied")); } catch { toast.error(t("error")); }
  };

  if (!calendars) return <Spinner label={t("loading")} />;
  const linkCal = calId === "all" ? active[0] : active.find((c) => c.id === calId);

  return (
    <>
      <PageHeader
        title={t("appointments")}
        actions={(
          <>
            {linkCal && <button type="button" className="btn-secondary" onClick={() => copyBooking(linkCal.slug)}><Link2 className="h-4 w-4" />{t("bookingLink")}</button>}
            <div className="flex items-center rounded-lg border border-line bg-white">
              <button type="button" className="btn-ghost px-2" onClick={() => setStart(addDays(start, -7))} aria-label="previous"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
              <button type="button" className="px-2 text-sm font-semibold" onClick={() => setStart(weekStart(new Date()))}>
                {dayLabel(start, lang, { day: "numeric", month: "short" })} – {dayLabel(addDays(start, 6), lang, { day: "numeric", month: "short" })}
              </button>
              <button type="button" className="btn-ghost px-2" onClick={() => setStart(addDays(start, 7))} aria-label="next"><ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
            </div>
            <button type="button" className="btn-primary" onClick={() => newAt(fromIso(today) < start ? start : new Date(), 10 * 60)}><Plus className="h-4 w-4" />{t("newAppointment")}</button>
          </>
        )}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {active.length > 1 && (
          <button type="button" onClick={() => setCalId("all")} className={`chip ${calId === "all" ? "border-brand bg-brand-soft font-semibold text-brand" : ""}`}>{t("allCalendars")}</button>
        )}
        {active.map((c) => (
          <button key={c.id} type="button" onClick={() => setCalId(c.id)} className={`chip ${calId === c.id ? "border-brand bg-brand-soft font-semibold text-brand" : ""}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}
          </button>
        ))}
        <Link to="/dashboard/settings#calendars" className="chip border-dashed text-muted">+ {t("newCalendar")}</Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[[t("thisWeek"), week.count], [t("noShows"), week.noShows], [t("paidThisWeek"), money(week.paid, currency)], [t("unpaidVisits"), week.unpaid]].map(([label, value]) => (
          <div key={label} className="card px-4 py-3"><div className="text-xs text-muted">{label}</div><div className="num mt-1 text-xl font-bold">{value}</div></div>
        ))}
      </div>

      <div className={`grid gap-4 ${sel ? "xl:grid-cols-[1fr_340px]" : ""}`}>
        <div className="card overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid border-b border-line" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
              <div />
              {days.map((d) => (
                <div key={d.toISOString()} className={`px-1 py-2 text-center text-xs font-semibold ${isoDay(d) === today ? "text-brand" : ""}`}>
                  {dayLabel(d, lang, { weekday: "short" })}
                  <div className="font-normal text-muted">{dayLabel(d, lang, { day: "numeric", month: "short" })}</div>
                </div>
              ))}
            </div>
            <div className="relative grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)", height: (to - from) * PX_PER_MIN }}>
              <div className="relative">
                {hours.map((h) => (
                  <div key={h} className="num absolute end-2 text-[11px] text-muted" style={{ top: (h - from) * PX_PER_MIN - 6 }}>{fromMinutes(h)}</div>
                ))}
              </div>
              {days.map((d) => {
                const iso = isoDay(d);
                const list = shown.filter((a) => a.date === iso);
                return (
                  <div key={iso} className={`relative border-s border-line ${offDay(d) ? "bg-[repeating-linear-gradient(45deg,#fafafa,#fafafa_6px,#f2f4f3_6px,#f2f4f3_12px)]" : ""}`}
                    onClick={(e) => {
                      const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                      newAt(d, from + Math.floor(y / PX_PER_MIN / 30) * 30);
                    }}>
                    {hours.map((h) => <div key={h} className="absolute inset-x-0 border-t border-[#f0f2f1]" style={{ top: (h - from) * PX_PER_MIN }} />)}
                    {list.map((a) => (
                      <button key={a.id} type="button" onClick={(e) => { e.stopPropagation(); setSelected(a.id); }}
                        className={`absolute inset-x-1 overflow-hidden rounded-lg border-s-[3px] px-1.5 py-1 text-start text-[11px] leading-tight ${a.status === "cancelled" ? "opacity-40 line-through" : ""} ${selected === a.id ? "ring-2 ring-brand-ink" : ""}`}
                        style={{ top: (toMinutes(a.time) - from) * PX_PER_MIN + 1, height: Math.max(a.minutes * PX_PER_MIN - 2, 22), borderColor: a.color, background: `${a.color}1f` }}>
                        <b className="block truncate text-[11.5px]">{a.name}</b>
                        <span className="block truncate text-muted">{a.time} · {typeName(a, lang)}</span>
                        {a.status === "attended" && <span className="absolute end-1 top-1 font-bold text-ok">✓</span>}
                        {a.status === "no_show" && <span className="absolute end-1 top-1 font-bold text-bad">✗</span>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {sel && <DetailPanel appt={sel} account={account} onChanged={load} onEdit={() => setEditing(sel)} onClose={() => setSelected(null)} />}
      </div>
      {!shown.length && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted"><CalendarDays className="h-4 w-4" />{t("noAppointmentsWeek")}</p>
      )}
      {linkCal && (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          {t("bookingLinkHint")} <span dir="ltr" className="truncate">{bookingUrl(linkCal.slug)}</span>
          <button type="button" className="btn-ghost p-1" onClick={() => copyBooking(linkCal.slug)}><Copy className="h-3.5 w-3.5" /></button>
        </p>
      )}
      {editing && <AppointmentForm initial={editing} calendars={calendars} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
