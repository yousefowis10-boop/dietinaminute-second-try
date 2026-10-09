import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BellOff, CalendarCheck, CalendarClock, ClipboardList, Inbox, MessageCircle, Plus, Wallet } from "lucide-react";
import API from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { Avatar, Badge, Card, Empty, PageHeader, Spinner } from "../ui";
import { reminderText, typeName } from "./Appointments";
import { dayLabel, isoDay, money, openWhatsApp } from "./schedule";

function Count({ n, tone = "brand" }) {
  const tones = { brand: "bg-brand-soft text-brand", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", ai: "bg-ai-soft text-ai" };
  return <span className={`rounded-full px-2 text-xs font-bold ${tones[tone]}`}>{n}</span>;
}

function Row({ to, name, sub, children }) {
  return (
    <li className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
      <Avatar name={name} size={30} />
      <Link to={to || "#"} className="min-w-0 flex-1 hover:text-brand">
        <span className="block truncate text-sm font-medium">{name}</span>
        {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
      </Link>
      {children}
    </li>
  );
}

const clientLink = (id, tab) => (id ? `/dashboard/clients/${id}${tab ? `?tab=${tab}` : ""}` : "/dashboard/appointments");

// The first screen each morning: today's visits and everything that needs the dietitian.
export default function Home() {
  const { account, user } = useAuth();
  const { t, lang, fmtDate } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    API.get("/nutrition/today/", { params: { date: isoDay() } }).then((r) => setData(r.data)).catch(() => setData({ error: true }));
  }, []);

  const name = account?.first_name || user?.username?.split("@")[0] || "";
  const pctTone = (p) => (p >= 75 ? "bg-ok" : p >= 50 ? "bg-warn" : "bg-bad");
  const message = (row) => openWhatsApp(row.phone, t("nudgeMsg", { name: row.name.split(" ")[0] }));
  const needs = data && !data.error
    ? data.checkins.length + data.stopped_logging.length + data.follow_ups.length + data.packages_ending.length + data.unpaid.length
    : 0;

  return (
    <>
      <PageHeader
        title={t("goodDay", { name })}
        subtitle={data && !data.error ? t("todaySub", { date: dayLabel(new Date(), lang, { weekday: "long", day: "numeric", month: "long" }), n: data.appointments.length, m: needs }) : t("homeSub")}
        actions={(
          <>
            <Link to="/dashboard/clients/new" className="btn-secondary"><Plus className="h-4 w-4" />{t("newClient")}</Link>
            <Link to="/dashboard/appointments" className="btn-primary"><Plus className="h-4 w-4" />{t("newAppointment")}</Link>
          </>
        )}
      />
      {!data ? <Spinner label={t("loading")} /> : data.error ? <Empty>{t("error")}</Empty> : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <Card title={<>{t("todaysAppointments")} <Count n={data.appointments.length} /></>} icon={<CalendarCheck className="h-4 w-4 text-brand" />}
              actions={<Link to="/dashboard/appointments" className="text-xs font-semibold text-brand">{t("openCalendar")}</Link>}>
              {data.appointments.length === 0 ? <p className="text-sm text-muted">{t("noAppointmentsToday")}</p> : (
                <ul>
                  {data.appointments.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                      <span className="num w-11 text-sm font-bold">{a.time}</span>
                      <Avatar name={a.name} size={30} />
                      <Link to={clientLink(a.client)} className="min-w-0 flex-1 hover:text-brand">
                        <span className="block truncate text-sm font-medium">{a.name}</span>
                        <span className="block truncate text-xs text-muted">{typeName(a, lang)} · {a.minutes} {t("minShort")}{a.status !== "booked" ? ` · ${t(`apptStatus_${a.status}`)}` : ""}</span>
                      </Link>
                      {a.price > 0 && <Badge tone={a.paid ? "ok" : "warn"}>{a.paid ? t("paid") : a.pay_method === "clinic" ? t("payAtClinic") : t("unpaid")}</Badge>}
                      {a.phone && a.status === "booked" && !a.reminder_sent_at && (
                        <button type="button" className="btn px-2.5 py-1 text-xs bg-[#1fa855] text-white hover:opacity-90"
                          onClick={() => { openWhatsApp(a.phone, reminderText(a, t, lang, account?.clinic_name)); API.post(`/nutrition/appointments/${a.id}/reminder/`).catch(() => {}); }}>
                          <MessageCircle className="h-3.5 w-3.5" />{t("remind")}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <div className="space-y-4">
              <Card title={<>{t("newCheckins")} <Count n={data.checkins.length} tone="ai" /></>} icon={<Inbox className="h-4 w-4 text-ai" />}>
                {data.checkins.length === 0 ? <p className="text-sm text-muted">{t("nothingNew")}</p> : (
                  <ul>
                    {data.checkins.map((c) => (
                      <Row key={c.id} to={clientLink(c.client_id, "progress")} name={c.name} sub={`${fmtDate(c.date)}${c.weight ? ` · ${c.weight} ${t("kg")}` : ""}`}>
                        <Link to={clientLink(c.client_id, "progress")} className="btn-primary px-3 py-1 text-xs">{t("review")}</Link>
                      </Row>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title={t("weekAdherence")} icon={<Activity className="h-4 w-4 text-brand" />}>
                {data.adherence.length === 0 ? <p className="text-sm text-muted">{t("noAdherenceYet")}</p> : (
                  <ul className="space-y-2">
                    {data.adherence.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 text-sm">
                        <Link to={clientLink(r.id)} className="min-w-0 flex-1 truncate hover:text-brand">{r.name}</Link>
                        <span className="h-2 w-28 overflow-hidden rounded-full bg-page"><span className={`block h-full rounded-full ${pctTone(r.pct)}`} style={{ width: `${Math.min(r.pct, 100)}%` }} /></span>
                        <span className="num w-10 text-end font-bold">{r.pct}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title={<>{t("stoppedLogging")} <Count n={data.stopped_logging.length} tone="bad" /></>} icon={<BellOff className="h-4 w-4 text-bad" />}>
              {data.stopped_logging.length === 0 ? <p className="text-sm text-muted">{t("everyoneLogging")}</p> : (
                <ul>
                  {data.stopped_logging.map((r) => (
                    <Row key={r.id} to={clientLink(r.id)} name={r.name} sub={t("noTicksDays", { n: r.days })}>
                      {r.phone && <button type="button" className="btn px-2.5 py-1 text-xs bg-[#1fa855] text-white hover:opacity-90" onClick={() => message(r)}>{t("message")}</button>}
                    </Row>
                  ))}
                </ul>
              )}
            </Card>
            <Card title={<>{t("followUpsDue")} <Count n={data.follow_ups.length} /></>} icon={<CalendarClock className="h-4 w-4 text-brand" />}>
              {data.follow_ups.length === 0 && data.interviews_waiting.length === 0 ? <p className="text-sm text-muted">{t("noFollowUps")}</p> : (
                <ul>
                  {data.interviews_waiting.map((c) => (
                    <Row key={`i${c.id}`} to={clientLink(c.id, "interview")} name={c.name} sub={t("interviewToReview")}>
                      <ClipboardList className="h-4 w-4 text-warn" />
                    </Row>
                  ))}
                  {data.follow_ups.map((r) => (
                    <Row key={r.id} to={clientLink(r.id)} name={r.name} sub={t("lastSeenDays", { n: r.days })}>
                      <Link to="/dashboard/appointments" className="btn-secondary px-2.5 py-1 text-xs">{t("book")}</Link>
                    </Row>
                  ))}
                </ul>
              )}
            </Card>
            <Card title={<>{t("moneyTitle")} <Count n={data.packages_ending.length + data.unpaid.length} tone="warn" /></>} icon={<Wallet className="h-4 w-4 text-warn" />}>
              <div className="text-xs font-semibold text-muted">{t("packagesEnding")}</div>
              {data.packages_ending.length === 0 ? <p className="mb-3 mt-1 text-sm text-muted">—</p> : (
                <ul className="mb-3">
                  {data.packages_ending.map((p) => (
                    <Row key={p.id} to={clientLink(p.client)} name={p.client_name}
                      sub={`${p.name} · ${p.left > 0 ? t("visitsLeft", { n: p.left }) : t("noVisitsLeft")}${p.end ? ` · ${t("endsOn", { date: fmtDate(p.end) })}` : ""}`} />
                  ))}
                </ul>
              )}
              <div className="flex items-center text-xs font-semibold text-muted">{t("unpaidBalances")}<span className="num ms-auto text-sm font-bold text-brand-ink">{money(data.unpaid_total, data.unpaid.find((u) => u.currency)?.currency)}</span></div>
              {data.unpaid.length === 0 ? <p className="mt-1 text-sm text-muted">—</p> : (
                <ul>
                  {data.unpaid.slice(0, 8).map((u) => (
                    <Row key={u.package ? `p${u.package}` : `a${u.id}`} to={clientLink(u.client)} name={u.name}
                      sub={`${fmtDate(u.date)}${u.package ? ` · ${t("package")}` : ""}`}>
                      <span className="num text-sm font-bold">{money(u.amount, u.currency)}</span>
                    </Row>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
