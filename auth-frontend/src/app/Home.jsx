import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ClipboardList, FileText, Plus, Users } from "lucide-react";
import API from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { Avatar, Card, Empty, PageHeader, Spinner } from "../ui";

function Stat({ icon: Icon, label, value, tone = "brand" }) {
  const tones = { brand: "bg-brand-soft text-brand", warn: "bg-warn-soft text-warn", ai: "bg-ai-soft text-ai" };
  return (
    <div className="card flex items-center gap-4 p-4">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      <div>
        <div className="num text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { account, user } = useAuth();
  const { t, fmtDate } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    API.get("/nutrition/dashboard/").then((r) => setData(r.data)).catch(() => setData({ error: true }));
  }, []);

  const name = account?.first_name || user?.username?.split("@")[0] || "";
  return (
    <>
      <PageHeader
        title={t("goodDay", { name })}
        subtitle={t("homeSub")}
        actions={<Link to="/dashboard/clients/new" className="btn-primary"><Plus className="h-4 w-4" />{t("newClient")}</Link>}
      />
      {!data ? <Spinner label={t("loading")} /> : data.error ? <Empty>{t("error")}</Empty> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={Users} label={t("statClients")} value={data.counts.clients} />
            <Stat icon={FileText} label={t("statPlans")} value={data.counts.plans_this_month} />
            <Stat icon={ClipboardList} label={t("statInterviews")} value={data.counts.interviews_waiting} tone="warn" />
            <Stat icon={CalendarClock} label={t("statFollowUps")} value={data.counts.follow_ups_due} tone="ai" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title={t("interviewsWaiting")}>
              {data.interviews_waiting.length ? (
                <ul className="divide-y divide-line">
                  {data.interviews_waiting.map((c) => (
                    <li key={c.id}>
                      <Link to={`/dashboard/clients/${c.id}?tab=interview`} className="flex items-center gap-3 py-2.5 hover:text-brand">
                        <Avatar name={c.name} size={30} /><span className="text-sm font-medium">{c.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">{t("interviewsEmpty")}</p>}
            </Card>
            <Card title={t("followUpsDue")}>
              {data.follow_ups_due.length ? (
                <ul className="divide-y divide-line">
                  {data.follow_ups_due.map((c) => (
                    <li key={c.id}>
                      <Link to={`/dashboard/clients/${c.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand">
                        <Avatar name={c.name} size={30} />
                        <span className="flex-1 text-sm font-medium">{c.name}</span>
                        <span className="text-xs text-muted">{t("lastVisit")}: {fmtDate(c.last_visit)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">{t("followUpsEmpty")}</p>}
            </Card>
            <Card title={t("recentPlans")}>
              {data.recent_plans.length ? (
                <ul className="divide-y divide-line">
                  {data.recent_plans.map((p) => (
                    <li key={p.id}>
                      <Link to={`/dashboard/plans/${p.id}`} className="block py-2.5 hover:text-brand">
                        <div className="text-sm font-medium">{p.client}</div>
                        <div className="text-xs text-muted">{p.name} · {fmtDate(p.created_at)}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">{t("recentEmpty")}</p>}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
