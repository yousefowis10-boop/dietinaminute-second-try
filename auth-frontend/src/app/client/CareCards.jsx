import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarDays, Copy, MessageCircle, Package, Plus, Send, Smartphone, Trash2 } from "lucide-react";
import API from "../../hooks/useApi";
import { useI18n } from "../../i18n";
import { Badge, Card, Field, InfoTip, Modal, apiError } from "../../ui";
import RecordPayment from "../RecordPayment";
import { STATUS_TONE, typeName } from "../Appointments";
import { addDays, clientAppUrl, dayLabel, fromIso, isoDay, money, openWhatsApp } from "../schedule";

// The client's phone page: link, how well they follow the plan, last two weeks of ticks.
export function ClientAppCard({ client }) {
  const { t, lang } = useI18n();
  const [info, setInfo] = useState(null);
  const load = useCallback(() => API.get(`/nutrition/clients/${client.id}/app/`, { params: { date: isoDay() } })
    .then((r) => setInfo(r.data)).catch(() => {}), [client.id]);
  useEffect(() => { load(); }, [load]);

  const create = async () => { await API.post(`/nutrition/clients/${client.id}/app/`, {}); load(); };
  const switchOff = async () => {
    if (!window.confirm(t("appSwitchOffConfirm"))) return;
    await API.delete(`/nutrition/clients/${client.id}/app/`);
    load();
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(clientAppUrl(info.token)); toast.success(t("copied")); } catch { toast.error(t("error")); }
  };
  const send = () => openWhatsApp(client.phone, t("appInviteMsg", { name: client.name.split(" ")[0], link: clientAppUrl(info.token) }));

  if (!info) return null;
  const logs = Object.fromEntries((info.logs || []).map((l) => [l.date, l]));
  const days = Array.from({ length: 14 }, (_, i) => isoDay(addDays(new Date(), i - 13)));
  const tone = info.adherence === null ? "neutral" : info.adherence >= 75 ? "ok" : info.adherence >= 50 ? "warn" : "bad";

  return (
    <Card title={t("clientApp")} info={t("clientAppHint")} icon={<Smartphone className="h-4 w-4 text-brand" />}
      actions={info.adherence !== null && <Badge tone={tone}>{t("followedPct", { pct: info.adherence })}</Badge>}>
      {info.token ? (
        <>
          <div className="mb-3 truncate rounded-lg bg-page px-3 py-2 text-xs text-muted" dir="ltr">{clientAppUrl(info.token)}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={copy}><Copy className="h-4 w-4" />{t("copyLink")}</button>
            {client.phone && <button type="button" className="btn-secondary" onClick={send}><MessageCircle className="h-4 w-4" />{t("sendWhatsApp")}</button>}
            <button type="button" className="btn-ghost ms-auto text-xs" onClick={switchOff}>{t("switchOff")}</button>
          </div>
          {info.meals_per_day > 0 && (
            <>
              <div className="mb-1.5 mt-4 text-xs font-semibold text-muted">{t("last14Days")}</div>
              <div className="grid grid-cols-[repeat(14,1fr)] gap-1">
                {days.map((d) => {
                  const l = logs[d];
                  const done = l ? Object.values(l.meals || {}).reduce((s, v) => s + Number(v), 0) : 0;
                  const pct = Math.min(done / info.meals_per_day, 1);
                  return (
                    <div key={d} title={`${dayLabel(fromIso(d), lang, { day: "numeric", month: "short" })}: ${done}/${info.meals_per_day} · ${t("water")} ${l ? l.water * 0.25 : 0} ${t("litre")}`}
                      className="h-7 rounded" style={{ background: l ? `rgba(47,158,110,${0.15 + pct * 0.85})` : "#eef1ef" }} />
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {info.last_log ? t("lastTick", { date: dayLabel(fromIso(info.last_log), lang, { day: "numeric", month: "short" }) }) : t("noTicksYet")}
                {" · "}{t("waterToday")}: <b className="num text-brand-ink">{(logs[isoDay()]?.water || 0) * 0.25} {t("litre")}</b>
              </p>
            </>
          )}
          {!client.phone && <p className="mt-2 text-xs text-muted">{t("addPhoneHint")}</p>}
        </>
      ) : (
        <button type="button" className="btn-primary" onClick={create}><Smartphone className="h-4 w-4" />{t("makeAppLink")}</button>
      )}
    </Card>
  );
}

function PackageForm({ clientId, onClose, onSaved }) {
  const { t } = useI18n();
  const [p, setP] = useState({ name: t("monthlyPackage"), visits: 4, start: isoDay(), end: isoDay(addDays(new Date(), 30)), price: "", paid_amount: "" });
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const save = async () => {
    try {
      await API.post(`/nutrition/clients/${clientId}/packages/`, p);
      onSaved();
    } catch (err) {
      toast.error(apiError(err, t));
    }
  };
  return (
    <Modal open onClose={onClose} title={t("newPackage")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("packageName")} className="sm:col-span-2"><input className="input" value={p.name} onChange={set("name")} /></Field>
        <Field label={t("visitsCount")}><input className="input num" type="number" min="1" value={p.visits} onChange={set("visits")} /></Field>
        <Field label={t("price")}><input className="input num" type="number" min="0" step="0.5" value={p.price} onChange={set("price")} /></Field>
        <Field label={t("startDate")}><input className="input" type="date" value={p.start} onChange={set("start")} /></Field>
        <Field label={t("endDate")}><input className="input" type="date" value={p.end} onChange={set("end")} /></Field>
        <Field label={t("paidSoFar")}><input className="input num" type="number" min="0" step="0.5" value={p.paid_amount} onChange={set("paid_amount")} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button type="button" className="btn-primary" disabled={!p.name} onClick={save}>{t("save")}</button>
      </div>
    </Modal>
  );
}

export function PackagesCard({ client }) {
  const { t, fmtDate } = useI18n();
  const [list, setList] = useState([]);
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => API.get(`/nutrition/clients/${client.id}/packages/`).then((r) => setList(r.data)).catch(() => {}), [client.id]);
  useEffect(() => { load(); }, [load]);

  const [paying, setPaying] = useState(null);
  const remove = async (p) => {
    if (!window.confirm(t("confirmDelete"))) return;
    await API.delete(`/nutrition/packages/${p.id}/`);
    load();
  };

  return (
    <Card title={t("packages")} icon={<Package className="h-4 w-4 text-brand" />}
      actions={<button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" />{t("newPackage")}</button>}>
      {list.length === 0 ? <p className="text-sm text-muted">{t("noPackages")}</p> : (
        <ul className="divide-y divide-line">
          {list.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted">{fmtDate(p.start)}{p.end ? ` – ${fmtDate(p.end)}` : ""}</div>
              </div>
              <Badge tone={p.left <= 1 ? "warn" : "brand"}>{t("visitsUsed", { used: p.used, total: p.visits })}</Badge>
              {p.balance > 0 ? (
                <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setPaying({ client: client.id, kind: "package", id: p.id })}>{t("owes")} {money(p.balance)} · {t("recordPayment")}</button>
              ) : p.price > 0 && <Badge tone="ok">{t("paid")}</Badge>}
              <button type="button" className="btn-ghost p-1 hover:text-bad" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      {adding && <PackageForm clientId={client.id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
      <RecordPayment open={Boolean(paying)} preset={paying} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); load(); }} />
    </Card>
  );
}


// A personal booking link: the client's name is filled in; optionally only the times you pick are offered.
function SendBookingLink({ client, onClose }) {
  const { t, lang } = useI18n();
  const [cals, setCals] = useState([]);
  const [calId, setCalId] = useState(null);
  const [typeId, setTypeId] = useState(null);
  const [day, setDay] = useState(isoDay(addDays(new Date(), 1)));
  const [free, setFree] = useState([]);
  const [picked, setPicked] = useState([]);
  const [link, setLink] = useState(null);
  useEffect(() => {
    API.get("/nutrition/calendars/").then((r) => {
      const list = r.data.filter((c) => c.active);
      setCals(list);
      setCalId(list[0]?.id || null);
      setTypeId(list[0]?.types.find((x) => x.active)?.id || null);
    }).catch(() => {});
  }, []);
  const cal = cals.find((c) => c.id === calId);
  const type = cal?.types.find((x) => x.id === typeId);
  useEffect(() => {
    if (!cal || !day) return;
    API.get(`/nutrition/calendars/${cal.id}/free-slots/`, { params: { date: day, minutes: type?.minutes || 30 } })
      .then((r) => setFree(r.data.slots)).catch(() => setFree([]));
  }, [cal, day, type]);
  const toggle = (v) => { setLink(null); setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v].sort())); };
  const make = async () => {
    const r = await API.post(`/nutrition/clients/${client.id}/booking-offer/`, { calendar: calId, type: typeId, slots: picked });
    const url = `${window.location.origin}/book/${r.data.slug}?o=${r.data.token}`;
    setLink(url);
    return url;
  };
  const send = async () => {
    const url = link || (await make());
    openWhatsApp(client.phone, t("bookingInviteMsg", { name: client.name.split(" ")[0], link: url }));
  };
  const copy = async () => {
    const url = link || (await make());
    try { await navigator.clipboard.writeText(url); toast.success(t("copied")); } catch { toast.error(t("error")); }
  };
  return (
    <Modal open onClose={onClose} title={t("sendBookingLink")}>
      <p className="mb-3 text-sm text-muted">{t("sendBookingLinkHint", { name: client.name.split(" ")[0] })}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("calendar")}>
          <select className="input" value={calId || ""} onChange={(e) => { setCalId(Number(e.target.value)); setPicked([]); setLink(null); }}>
            {cals.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t("visitType")}>
          <select className="input" value={typeId || ""} onChange={(e) => { setTypeId(Number(e.target.value)); setLink(null); }}>
            {(cal?.types || []).filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{lang === "ar" ? x.name_ar || x.name : x.name} · {x.minutes} {t("minShort")}</option>)}
          </select>
        </Field>
      </div>
      <div className="mb-2 mt-4 flex items-center gap-2 text-sm font-semibold">{t("offerTimesTitle")}<InfoTip text={t("offerTimesHint")} /></div>
      <input className="input mb-2 w-auto" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
      <div className="flex flex-wrap gap-1.5">
        {free.length === 0 && <span className="text-xs text-muted">{t("noFreeTimes")}</span>}
        {free.map((s) => {
          const v = `${day} ${s}`;
          return (
            <button key={v} type="button" onClick={() => toggle(v)}
              className={`num rounded-lg border px-2.5 py-1 text-xs ${picked.includes(v) ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{s}</button>
          );
        })}
      </div>
      {picked.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {picked.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
              {dayLabel(fromIso(v.slice(0, 10)), lang, { weekday: "short", day: "numeric", month: "short" })} · {v.slice(11)}
              <button type="button" onClick={() => toggle(v)} aria-label="remove">×</button>
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">{picked.length ? t("offerChosenCount", { n: picked.length }) : t("offerAnyFree")}</p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-secondary" disabled={!calId} onClick={copy}><Copy className="h-4 w-4" />{t("copyLink")}</button>
        {client.phone && <button type="button" className="btn bg-[#1fa855] text-white hover:opacity-90" disabled={!calId} onClick={send}><MessageCircle className="h-4 w-4" />{t("sendWhatsApp")}</button>}
      </div>
    </Modal>
  );
}

export function AppointmentsCard({ client }) {
  const { t, lang } = useI18n();
  const [list, setList] = useState([]);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    API.get("/nutrition/appointments/", { params: { client: client.id } }).then((r) => setList(r.data)).catch(() => {});
  }, [client.id]);
  const today = isoDay();
  const upcoming = list.filter((a) => a.date >= today && a.status === "booked").reverse();
  const past = list.filter((a) => !(a.date >= today && a.status === "booked")).slice(0, 5);

  const row = (a) => (
    <li key={a.id} className="flex items-center gap-2 py-2 text-sm">
      <span className="num w-28 shrink-0">{dayLabel(fromIso(a.date), lang, { day: "numeric", month: "short" })} · {a.time}</span>
      <span className="min-w-0 flex-1 truncate text-muted">{typeName(a, lang)}</span>
      <Badge tone={STATUS_TONE[a.status]}>{t(`apptStatus_${a.status}`)}</Badge>
      {a.price > 0 && a.status !== "cancelled" && <Badge tone={a.paid ? "ok" : "warn"}>{a.paid ? t("paid") : t("unpaid")}</Badge>}
    </li>
  );
  return (
    <Card title={t("appointments")} icon={<CalendarDays className="h-4 w-4 text-brand" />}
      actions={(
        <>
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setSending(true)}><Send className="h-3.5 w-3.5" />{t("sendBookingLink")}</button>
          <Link to="/dashboard/appointments" className="btn-ghost px-2 py-1 text-xs"><Plus className="h-3.5 w-3.5" />{t("book")}</Link>
        </>
      )}>
      {list.length === 0 ? <p className="text-sm text-muted">{t("noAppointmentsClient")}</p> : (
        <>
          {upcoming.length > 0 && <ul className="mb-2 divide-y divide-line">{upcoming.map(row)}</ul>}
          {past.length > 0 && (
            <>
              <div className="text-xs font-semibold text-muted">{t("pastVisits")}</div>
              <ul className="divide-y divide-line">{past.map(row)}</ul>
            </>
          )}
        </>
      )}
      {sending && <SendBookingLink client={client} onClose={() => setSending(false)} />}
    </Card>
  );
}
