import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Phone, Search } from "lucide-react";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { Avatar, Badge, Empty, InfoTip, PageHeader, Spinner } from "../ui";
import { openWhatsApp } from "./schedule";

const TONE = { ending: "warn", ended: "bad", active: "ok", none: undefined };
const FILTERS = ["all", "ending", "ended", "active", "none"];

// One row: notes are saved when you leave the box.
function NotesBox({ row }) {
  const { t } = useI18n();
  const [value, setValue] = useState(row.notes || "");
  const save = async () => {
    if (value === (row.notes || "")) return;
    try { await API.put(`/nutrition/clients/${row.id}/contact-notes/`, { notes: value }); row.notes = value; toast.success(t("saved")); }
    catch { toast.error(t("error")); }
  };
  return <textarea className="input min-h-[38px] py-1.5 text-xs" rows={1} placeholder={t("contactNotesPh")} value={value} onChange={(e) => setValue(e.target.value)} onBlur={save} />;
}

// Contacts: every client with phone, subscription start / end, visits left, renewal reminder and notes.
export default function Contacts() {
  const { t, num, fmtDate } = useI18n();
  const { account } = useAuth();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  useEffect(() => { API.get("/nutrition/contacts/").then((r) => setRows(r.data)).catch(() => setRows([])); }, []);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, (rows || []).filter((r) => f === "all" || r.status === f).length])), [rows]);
  const shown = (rows || []).filter((r) => (filter === "all" || r.status === filter)
    && (!q || r.name.toLowerCase().includes(q.trim().toLowerCase()) || (r.phone || "").includes(q.trim())));
  const renew = (r) => openWhatsApp(r.phone, t("renewMsg", {
    name: r.name.split(" ")[0], pkg: r.package?.name || "", date: r.package?.end ? fmtDate(r.package.end) : "", clinic: account?.clinic_name || "",
  }));

  return (
    <>
      <PageHeader title={t("contactsTitle")} subtitle={t("contactsSub")} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input ps-9" placeholder={t("searchNamePhone")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="inline-flex flex-wrap overflow-hidden rounded-xl border border-line bg-white text-xs font-semibold">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`px-3 py-2 ${filter === f ? "bg-brand text-white" : "hover:bg-page"}`}>
              {t(`sub_${f}`)} <span className="num opacity-70">{num(counts[f] || 0)}</span>
            </button>
          ))}
        </div>
        <InfoTip text={t("contactsInfo")} />
      </div>
      {!rows ? <Spinner label={t("loading")} /> : !shown.length ? <Empty>{t("noMatch")}</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13.5px]">
            <thead className="bg-[#fafbfa] text-xs text-muted"><tr>
              {[t("client"), t("phone"), t("subscription"), t("subStart"), t("subEnd"), t("visitsLeftCol"), t("notes"), ""].map((h, i) => <th key={i} className="px-3 py-2.5 text-start font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`border-t border-line align-middle ${r.status === "ending" ? "bg-warn-soft/40" : ""}`}>
                  <td className="px-3 py-2">
                    <Link to={`/dashboard/clients/${r.id}`} className="flex items-center gap-2 font-semibold hover:text-brand"><Avatar name={r.name} size={28} />{r.name}</Link>
                  </td>
                  <td className="num px-3 py-2" dir="ltr">{r.phone ? <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-brand"><Phone className="h-3.5 w-3.5" />{r.phone}</a> : "—"}</td>
                  <td className="px-3 py-2">
                    {r.package ? <span className="block font-medium">{r.package.name}</span> : <span className="text-muted">—</span>}
                    <Badge tone={TONE[r.status]}>{t(`sub_${r.status}`)}{r.status === "ending" && r.days_left !== null ? ` · ${t("daysLeft", { n: num(r.days_left) })}` : ""}</Badge>
                  </td>
                  <td className="num px-3 py-2">{r.package ? fmtDate(r.package.start) : "—"}</td>
                  <td className="num px-3 py-2">{r.package?.end ? fmtDate(r.package.end) : "—"}</td>
                  <td className="num px-3 py-2">{r.package ? `${num(r.package.left)} / ${num(r.package.visits)}` : "—"}</td>
                  <td className="w-[220px] px-3 py-2"><NotesBox row={r} /></td>
                  <td className="px-3 py-2 text-end">
                    {r.phone && (r.status === "ending" || r.status === "ended") && (
                      <button type="button" className="btn whitespace-nowrap px-2.5 py-1 text-xs bg-[#1fa855] text-white hover:opacity-90" onClick={() => renew(r)}>
                        <MessageCircle className="h-3.5 w-3.5" />{t("remindRenewal")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
