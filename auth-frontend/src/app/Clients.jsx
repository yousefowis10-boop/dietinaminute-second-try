import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Avatar, Badge, Empty, PageHeader, Spinner } from "../ui";

export default function Clients({ onlyInterviews = false }) {
  const { t, num, dir } = useI18n();
  const [clients, setClients] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    API.get("/nutrition/clients/").then((r) => setClients(r.data)).catch(() => setClients([]));
  }, []);

  const shown = useMemo(() => {
    let list = clients || [];
    if (onlyInterviews) list = list.filter((c) => c.interview_status === "submitted" || c.interview_status === "sent");
    const q = query.trim().toLowerCase();
    return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
  }, [clients, query, onlyInterviews]);

  const Arrow = dir === "rtl" ? ChevronLeft : ChevronRight;
  const statusTone = { submitted: "warn", sent: "brand", reviewed: "ok", none: "neutral" };

  return (
    <>
      <PageHeader
        title={onlyInterviews ? t("interviews") : t("clientList")}
        actions={!onlyInterviews && <Link to="/dashboard/clients/new" className="btn-primary"><Plus className="h-4 w-4" />{t("newClient")}</Link>}
      />
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input className="input ps-9" placeholder={t("searchClients")} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {!clients ? <Spinner label={t("loading")} /> : !shown.length ? (
        <Empty action={!onlyInterviews && <Link to="/dashboard/clients/new" className="btn-primary"><Plus className="h-4 w-4" />{t("newClient")}</Link>}>
          {onlyInterviews ? t("interviewsEmpty") : t("noClients")}
        </Empty>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {shown.map((c) => (
            <Link
              key={c.id}
              to={`/dashboard/clients/${c.id}${onlyInterviews ? "?tab=interview" : ""}`}
              className="flex items-center gap-4 px-4 py-3 transition hover:bg-page"
            >
              <Avatar name={c.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{c.name}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                  <span>{num(c.age)} {t("years")}</span>
                  <span>{num(c.weight, 1)} {t("kg")}</span>
                  {c.pbf ? <span>{t("bodyFat")} {num(c.pbf, 1)}%</span> : null}
                  <span>{t(`goal_${c.goal || ""}`)}</span>
                </div>
              </div>
              {c.interview_status !== "none" && <Badge tone={statusTone[c.interview_status]}>{t(`istatus_${c.interview_status}`)}</Badge>}
              <div className="hidden text-end sm:block">
                <div className="num font-semibold">{num(c.target_calories)}</div>
                <div className="text-xs text-muted">{t("kcal")}</div>
              </div>
              <Arrow className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
