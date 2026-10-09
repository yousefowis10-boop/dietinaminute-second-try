import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, Copy, Plus, Trash2 } from "lucide-react";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Badge, Card, Field, Modal, apiError } from "../ui";
import { bookingUrl } from "./schedule";

// Monday = 0 ... Sunday = 6 (as stored); shown starting on Saturday.
const DAY_ORDER = [5, 6, 0, 1, 2, 3, 4];
const COLORS = ["#1f6f5c", "#2f5fb3", "#c06c84", "#6a4fc2", "#b9770e", "#0e7490"];

function dayName(d, lang) {
  const monday = new Date(2026, 0, 5);
  return new Date(monday.getTime() + d * 86400000).toLocaleDateString(lang === "ar" ? "ar-JO" : "en-GB", { weekday: "long" });
}

function Toggle({ on, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2 text-sm">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-[#cfd5d2]"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "end-0.5" : "start-0.5"}`} />
      </button>
    </label>
  );
}

function CalendarEditor({ initial, onClose, onSaved }) {
  const { t, lang } = useI18n();
  const [c, setC] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setC((x) => ({ ...x, [k]: v }));
  const setDay = (d, patch) => setC((x) => ({ ...x, hours: { ...x.hours, [d]: { ...x.hours[d], ...patch } } }));

  const save = async () => {
    setBusy(true);
    try {
      const body = { name: c.name, color: c.color, hours: c.hours, break_start: c.break_start, break_end: c.break_end,
        currency: c.currency, pay_online: c.pay_online, pay_at_clinic: c.pay_at_clinic, booking_open: c.booking_open,
        reminders: c.reminders, slot_minutes: c.slot_minutes };
      if (c.id) {
        await API.put(`/nutrition/calendars/${c.id}/`, body);
        for (const tp of c.types) {
          if (tp.id && tp._dirty) await API.put(`/nutrition/appointment-types/${tp.id}/`, tp);
          if (!tp.id && tp.name) await API.post(`/nutrition/calendars/${c.id}/types/`, tp);
        }
      } else {
        await API.post("/nutrition/calendars/", body);
      }
      toast.success(t("saved"));
      onSaved();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  };
  const setType = (i, patch) => set("types", c.types.map((x, j) => (j === i ? { ...x, ...patch, _dirty: true } : x)));
  const removeType = async (i) => {
    const tp = c.types[i];
    if (tp.id) await API.delete(`/nutrition/appointment-types/${tp.id}/`);
    set("types", c.types.filter((_, j) => j !== i));
  };

  return (
    <Modal open onClose={onClose} title={c.id ? `${t("edit")}: ${c.name}` : t("newCalendar")} wide>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label={t("calendarName")}><input className="input" value={c.name} placeholder={t("calendarNamePh")} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label={t("colour")}>
          <div className="flex h-[38px] items-center gap-1.5">
            {COLORS.map((col) => (
              <button key={col} type="button" onClick={() => set("color", col)} aria-label={col}
                className={`h-6 w-6 rounded-full ${c.color === col ? "ring-2 ring-brand-ink ring-offset-2" : ""}`} style={{ background: col }} />
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">{t("workingHours")}</div>
      <div className="mt-2 space-y-1.5">
        {DAY_ORDER.map((d) => {
          const h = c.hours[String(d)] || { on: false, start: "10:00", end: "17:00" };
          return (
            <div key={d} className="grid grid-cols-[6.5rem_1fr_1fr_auto] items-center gap-2 text-sm">
              <span>{dayName(d, lang)}</span>
              <input className="input num py-1.5" type="time" disabled={!h.on} value={h.start} onChange={(e) => setDay(String(d), { start: e.target.value })} />
              <input className="input num py-1.5" type="time" disabled={!h.on} value={h.end} onChange={(e) => setDay(String(d), { end: e.target.value })} />
              <Toggle on={h.on} onChange={(on) => setDay(String(d), { on })} label="" />
            </div>
          );
        })}
        <div className="grid grid-cols-[6.5rem_1fr_1fr_auto] items-center gap-2 text-sm">
          <span>{t("breakTime")}</span>
          <input className="input num py-1.5" type="time" value={c.break_start || ""} onChange={(e) => set("break_start", e.target.value)} />
          <input className="input num py-1.5" type="time" value={c.break_end || ""} onChange={(e) => set("break_end", e.target.value)} />
          <span className="w-9" />
        </div>
      </div>

      {c.id && (
        <>
          <div className="mt-5 text-[11px] font-bold uppercase tracking-wider text-muted">{t("visitTypes")}</div>
          <div className="mt-2 space-y-1.5">
            {c.types.filter((x) => x.active !== false).map((tp) => {
              const i = c.types.indexOf(tp);
              return (
                <div key={tp.id || `new${i}`} className="grid grid-cols-[1fr_1fr_4.5rem_5rem_2rem] items-center gap-1.5">
                  <input className="input px-2 text-xs" dir="ltr" placeholder="Name" value={tp.name} onChange={(e) => setType(i, { name: e.target.value })} />
                  <input className="input px-2 text-xs" dir="rtl" placeholder="الاسم" value={tp.name_ar} onChange={(e) => setType(i, { name_ar: e.target.value })} />
                  <input className="input num px-2 text-xs" type="number" min="5" step="5" title={t("lengthMin")} value={tp.minutes} onChange={(e) => setType(i, { minutes: e.target.value })} />
                  <input className="input num px-2 text-xs" type="number" min="0" step="0.5" title={t("price")} value={tp.price} onChange={(e) => setType(i, { price: e.target.value })} />
                  <button type="button" className="btn-ghost p-1 hover:text-bad" onClick={() => removeType(i)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
            <p className="text-[11px] text-muted">{t("visitTypesHint", { currency: c.currency })}</p>
            <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => set("types", [...c.types, { name: "", name_ar: "", minutes: 30, price: 0, color: "#2f5fb3", active: true }])}>
              <Plus className="h-3.5 w-3.5" />{t("addVisitType")}
            </button>
          </div>
        </>
      )}

      <div className="mt-5 text-[11px] font-bold uppercase tracking-wider text-muted">{t("bookingAndPayment")}</div>
      <div className="mt-1 divide-y divide-line">
        <Toggle on={c.booking_open} onChange={(v) => set("booking_open", v)} label={t("bookingOpen")} />
        <Toggle on={c.pay_at_clinic} onChange={(v) => set("pay_at_clinic", v)} label={t("payAtClinicOpt")} />
        <Toggle on={c.pay_online} onChange={(v) => set("pay_online", v)} label={t("payOnlineOpt")} />
        {c.pay_online && !c.online_payment_ready && <p className="py-2 text-xs text-warn">{t("onlinePayNotReady")}</p>}
        <Toggle on={c.reminders} onChange={(v) => set("reminders", v)} label={t("remindersOpt")} />
        <label className="flex items-center justify-between gap-3 py-2 text-sm">
          <span>{t("currency")}</span>
          <input className="input w-24 py-1.5 text-center" dir="ltr" value={c.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button type="button" className="btn-primary" disabled={busy || !c.name} onClick={save}>{busy ? t("saving") : t("save")}</button>
      </div>
    </Modal>
  );
}

export default function CalendarSettings() {
  const { t, lang } = useI18n();
  const [cals, setCals] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => API.get("/nutrition/calendars/").then((r) => setCals(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const blank = () => {
    const base = cals[0];
    return { name: "", color: COLORS[cals.length % COLORS.length], hours: base?.hours || {}, break_start: "13:00", break_end: "14:00",
      currency: base?.currency || "JOD", pay_online: false, pay_at_clinic: true, booking_open: true, reminders: true, slot_minutes: 30,
      types: [], online_payment_ready: base?.online_payment_ready };
  };
  const copy = async (slug) => {
    try { await navigator.clipboard.writeText(bookingUrl(slug)); toast.success(t("copied")); } catch { toast.error(t("error")); }
  };
  const remove = async (c) => {
    if (!window.confirm(t("confirmDeleteCalendar"))) return;
    await API.delete(`/nutrition/calendars/${c.id}/`);
    load();
  };

  return (
    <Card title={t("calendars")} icon={<CalendarDays className="h-4 w-4 text-brand" />} className="scroll-mt-6"
      actions={<button type="button" className="btn-secondary px-3 py-1.5" onClick={() => setEditing(blank())}><Plus className="h-4 w-4" />{t("newCalendar")}</button>}>
      <p className="mb-3 text-sm text-muted">{t("calendarsHint")}</p>
      <ul className="divide-y divide-line">
        {cals.filter((c) => c.active).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
            <span className="min-w-0 flex-1 font-semibold">{c.name}</span>
            <Badge>{[c.pay_at_clinic && t("payAtClinic"), c.pay_online && t("payOnline")].filter(Boolean).join(" + ")}</Badge>
            <span className="text-xs text-muted">{c.types.filter((x) => x.active).map((x) => (lang === "ar" ? x.name_ar || x.name : x.name)).join(" · ")}</span>
            <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => copy(c.slug)}><Copy className="h-3.5 w-3.5" />{t("bookingLink")}</button>
            <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => setEditing(c)}>{t("edit")}</button>
            {cals.filter((x) => x.active).length > 1 && <button type="button" className="btn-ghost p-1 hover:text-bad" onClick={() => remove(c)}><Trash2 className="h-3.5 w-3.5" /></button>}
          </li>
        ))}
      </ul>
      {editing && <CalendarEditor initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </Card>
  );
}
