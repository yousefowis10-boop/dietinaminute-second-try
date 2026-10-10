import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Plus, Trash2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { Badge, Empty, FoldArrow, PageHeader, Spinner, useFold } from "../ui";
import { isoDay, money, openWhatsApp } from "./schedule";
import RecordPayment from "./RecordPayment";

const PERIODS = ["thisMonth", "lastMonth", "last3Months", "thisYear"];

function rangeOf(p) {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  if (p === "lastMonth") return [isoDay(new Date(y, m - 1, 1)), isoDay(new Date(y, m, 0))];
  if (p === "last3Months") return [isoDay(new Date(y, m - 2, 1)), isoDay(d)];
  if (p === "thisYear") return [isoDay(new Date(y, 0, 1)), isoDay(d)];
  return [isoDay(new Date(y, m, 1)), isoDay(d)];
}

function Section({ title, count, children }) {
  const [open, toggle] = useFold(title);
  return (
    <section className="card overflow-hidden">
      <button type="button" onClick={() => toggle()} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-start hover:bg-[#fafbfa]">
        <h3 className="text-[15px] font-bold">{title}</h3>{count !== undefined && <span className="num rounded-full bg-page px-2 text-xs font-bold text-muted">{count}</span>}<FoldArrow open={open} />
      </button>
      {open && <div className="border-t border-line">{children}</div>}
    </section>
  );
}

// Finances & reports: revenue received, unpaid (with a WhatsApp reminder), expected, by method, last 6 months.
export default function Finance() {
  const { t, lang, num, fmtDate } = useI18n();
  const { account } = useAuth();
  const [period, setPeriod] = useState("thisMonth");
  const [data, setData] = useState(null);
  const [paying, setPaying] = useState(null); // {} = new payment, or {client, kind, id}
  const ar = lang === "ar";

  const load = useCallback(() => {
    const [from, to] = rangeOf(period);
    return API.get("/nutrition/finance/", { params: { from, to } }).then((r) => setData(r.data)).catch(() => setData({ error: true }));
  }, [period]);
  useEffect(() => { setData(null); load(); }, [load]);

  const cur = data?.currency || "";
  const remind = (o) => openWhatsApp(o.phone, t("payReminderMsg", { name: o.name.split(" ")[0], amount: money(o.amount, cur), clinic: account?.clinic_name || "" }));
  const undo = async (r) => {
    if (!window.confirm(t("undoPaymentConfirm"))) return;
    try { await API.delete(`/nutrition/payments/${r.id}/`); load(); } catch { toast.error(t("error")); }
  };

  const stats = data && !data.error ? [
    [t("revenueReceived"), data.received, "text-ok"],
    [t("stillUnpaid"), data.owed_total, "text-bad"],
    [t("expectedBooked"), data.expected, "text-brand-ink"],
  ] : [];
  const maxMonth = data?.months ? Math.max(1, ...data.months.map((m) => m.received)) : 1;

  return (
    <>
      <PageHeader title={t("financeTitle")} subtitle={t("financeSub")} actions={(
        <>
          <div className="inline-flex overflow-hidden rounded-xl border border-line bg-white text-sm font-semibold">
            {PERIODS.map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)} className={`px-3 py-2 ${period === p ? "bg-brand text-white" : "hover:bg-page"}`}>{t(p)}</button>
            ))}
          </div>
          <button type="button" className="btn-primary" onClick={() => setPaying({})}><Plus className="h-4 w-4" />{t("recordPayment")}</button>
        </>
      )} />
      {!data ? <Spinner label={t("loading")} /> : data.error ? <Empty>{t("error")}</Empty> : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map(([label, v, tone]) => (
              <div key={label} className="card p-4">
                <div className="text-[12.5px] font-semibold text-muted">{label}</div>
                <div className={`num mt-1 text-[28px] font-bold ${tone}`}>{money(v, cur)}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h3 className="mb-3 text-[15px] font-bold">{t("simpleReport")}</h3>
              <ul className="space-y-1.5 text-sm">
                <li className="flex"><span className="text-muted">{t("revenueReceived")}</span><b className="num ms-auto">{money(data.received, cur)}</b></li>
                <li className="flex"><span className="text-muted">{t("billedInPeriod")}</span><b className="num ms-auto">{money(data.billed, cur)}</b></li>
                <li className="flex"><span className="text-muted">{t("unpaidInPeriod")}</span><b className="num ms-auto text-bad">{money(data.unpaid_in_period, cur)}</b></li>
                <li className="flex"><span className="text-muted">{t("paidVisits")}</span><b className="num ms-auto">{num(data.visits_paid)}</b></li>
                <li className="flex"><span className="text-muted">{t("newPackages")}</span><b className="num ms-auto">{num(data.new_packages)}</b></li>
                <li className="flex"><span className="text-muted">{t("payingClients")}</span><b className="num ms-auto">{num(data.clients_paying)}</b></li>
              </ul>
              {data.by_via.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <div className="mb-1.5 text-xs font-bold text-muted">{t("byMethod")}</div>
                  <div className="flex flex-wrap gap-2">
                    {data.by_via.map((v) => <Badge key={v.via}>{t(`via_${v.via}`)} · <span className="num">{money(v.amount, cur)}</span></Badge>)}
                  </div>
                </div>
              )}
            </div>
            <div className="card p-4">
              <h3 className="mb-3 text-[15px] font-bold">{t("last6Months")}</h3>
              <div className="flex h-40 items-end gap-2">
                {data.months.map((m) => (
                  <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="num text-[10.5px] font-semibold text-muted">{m.received ? num(m.received) : ""}</span>
                    <div className="w-full rounded-t-md bg-brand" style={{ height: `${Math.max((100 * m.received) / maxMonth, m.received ? 4 : 1)}%` }} />
                    <span className="text-[11px] text-muted">{new Date(m.month).toLocaleDateString(ar ? "ar-JO" : "en-GB", { month: "short" })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Section title={t("stillUnpaid")} count={data.owed.length}>
            {!data.owed.length ? <p className="p-4 text-sm text-muted">{t("nothingOwed")}</p> : (
              <ul className="divide-y divide-line">
                {data.owed.map((o) => (
                  <li key={`${o.kind}${o.id}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      {o.client ? <Link to={`/dashboard/clients/${o.client}`} className="font-semibold hover:text-brand">{o.name}</Link> : <b>{o.name}</b>}
                      <span className="block text-xs text-muted">{fmtDate(o.date)} · {o.kind === "package" ? `${t("package")} · ${o.what}` : t("visit")}</span>
                    </span>
                    <b className="num text-bad">{money(o.amount, cur)}</b>
                    {o.phone && <button type="button" className="btn px-2.5 py-1 text-xs bg-[#1fa855] text-white hover:opacity-90" onClick={() => remind(o)}><MessageCircle className="h-3.5 w-3.5" />{t("remind")}</button>}
                    {o.client && <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setPaying({ client: o.client, kind: o.kind, id: o.id })}><Wallet className="h-3.5 w-3.5" />{t("recordPayment")}</button>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("paymentsReceived")} count={data.rows.length}>
            {!data.rows.length ? <p className="p-4 text-sm text-muted">{t("noPaymentsPeriod")}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13.5px]">
                  <thead className="bg-[#fafbfa] text-xs text-muted"><tr>
                    {[t("colDate"), t("client"), t("item"), t("amount"), t("payMethod"), ""].map((h, i) => <th key={i} className="px-4 py-2.5 text-start font-semibold">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={`${r.kind}${r.id}`} className="border-t border-line">
                        <td className="num px-4 py-2">{fmtDate(r.date)}</td>
                        <td className="px-4 py-2">{r.name}</td>
                        <td className="px-4 py-2 text-muted">{r.kind === "package" || r.for === "package" ? `${t("package")} · ${r.what}` : r.for === "other" ? (r.what || t("paymentOther")) : (ar && r.what_ar) || r.what || t("visit")}</td>
                        <td className="num px-4 py-2 font-semibold">{money(r.paid_amount, cur)}</td>
                        <td className="px-4 py-2"><Badge tone="ok">{t(`via_${r.via || "other"}`)}</Badge></td>
                        <td className="px-4 py-2 text-end">{r.kind === "payment" && <button type="button" className="text-[#b9c0bc] hover:text-bad" onClick={() => undo(r)} aria-label={t("delete")}><Trash2 className="h-4 w-4" /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
          <p className="flex items-center gap-2 text-xs text-muted"><Wallet className="h-3.5 w-3.5" />{t("financeNote")}</p>
        </div>
      )}
      <RecordPayment open={Boolean(paying)} preset={paying?.client ? paying : null} currency={cur} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); load(); }} />
    </>
  );
}
