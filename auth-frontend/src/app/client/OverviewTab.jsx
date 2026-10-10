import { useEffect, useMemo, useState } from "react";
import { Ban, Copy, Inbox, Link2, MessageCircle, Plus, TriangleAlert, X } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import API, { cachedGet } from "../../hooks/useApi";
import { useI18n } from "../../i18n";
import { Badge, Card, SafetyFlags } from "../../ui";
import AISummaryPanel from "./AIPanel";
import { AppointmentsCard, ClientAppCard, PackagesCard } from "./CareCards";

export function interviewUrl(token) {
  return `${window.location.origin}/i/${token}`;
}

export function InterviewLinkCard({ data, reload }) {
  const { t } = useI18n();
  const c = data.client;
  const [busy, setBusy] = useState(false);
  const token = data.interview.token;
  const tone = { none: "neutral", sent: "brand", submitted: "warn", reviewed: "ok" }[data.interview.status];

  const create = async () => {
    setBusy(true);
    try {
      await API.post(`/nutrition/clients/${c.id}/interview-link/`, {});
      reload();
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(interviewUrl(token)); toast.success(t("copied")); } catch { toast.error(t("error")); }
  };
  const whatsapp = () => {
    const text = t("whatsappInvite", { name: c.name.split(" ")[0], link: interviewUrl(token) });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <Card title={t("interviewLink")} icon={<Link2 className="h-4 w-4 text-brand" />} actions={<Badge tone={tone}>{t(`istatus_${data.interview.status}`)}</Badge>}>
      <p className="mb-3 text-sm text-muted">{t("interviewLinkHint")}</p>
      {token && data.interview.status !== "reviewed" ? (
        <>
          <div className="mb-3 truncate rounded-lg bg-page px-3 py-2 text-xs text-muted" dir="ltr">{interviewUrl(token)}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={copy}><Copy className="h-4 w-4" />{t("copyLink")}</button>
            <button type="button" className="btn-secondary" onClick={whatsapp}><MessageCircle className="h-4 w-4" />{t("sendWhatsApp")}</button>
          </div>
        </>
      ) : (
        <button type="button" className="btn-primary" disabled={busy} onClick={create}><Link2 className="h-4 w-4" />{t("createLink")}</button>
      )}
    </Card>
  );
}

export function ExclusionsCard({ data, reload }) {
  const { t, foodName } = useI18n();
  const [foods, setFoods] = useState([]);
  const [query, setQuery] = useState("");
  const excluded = data.excluded_foods;

  useEffect(() => { cachedGet("/nutrition/foods/").then((r) => setFoods(r.data)); }, []);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const ids = new Set(excluded.map((f) => f.id));
    return foods.filter((f) => !ids.has(f.id) && ((f.name || "").toLowerCase().includes(q) || (f.name_ar || "").includes(q))).slice(0, 6);
  }, [query, foods, excluded]);

  const save = async (ids) => {
    try {
      await API.put(`/nutrition/clients/${data.client.id}/exclusions/`, { food_ids: ids });
      setQuery("");
      reload();
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <Card title={t("excludedFoods")} icon={<Ban className="h-4 w-4 text-bad" />}>
      <p className="mb-3 text-xs text-muted">{t("excludedHint")}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {excluded.map((f) => (
          <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-bad-soft px-2.5 py-1 text-xs font-semibold text-bad">
            {foodName(f)}
            <button type="button" onClick={() => save(excluded.filter((x) => x.id !== f.id).map((x) => x.id))} aria-label="remove"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Plus className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input className="input ps-9" placeholder={t("addExcluded")} value={query} onChange={(e) => setQuery(e.target.value)} />
        {matches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-lg">
            {matches.map((f) => (
              <li key={f.id}>
                <button type="button" className="block w-full px-3 py-2 text-start text-sm hover:bg-page" onClick={() => save([...excluded.map((x) => x.id), f.id])}>
                  {foodName(f)} <span className="text-xs text-muted">· {t(`type_${f.food_type}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export default function OverviewTab({ data, reload }) {
  const { t, num, fmtDate } = useI18n();
  const c = data.client;
  const lastSummary = data.ai_results.find((r) => r.kind === "summary");
  const newCheckins = data.progress.filter((r) => !r.reviewed).length;
  return (
    <>
    {newCheckins > 0 && (
      <Link to="?tab=progress" className="mb-4 flex items-center gap-2 rounded-xl border border-ai/20 bg-ai-soft px-4 py-3 text-sm font-semibold text-ai">
        <Inbox className="h-4 w-4" />{t("newCheckinsBanner", { n: newCheckins })}<span className="ms-auto">→</span>
      </Link>
    )}
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card title={t("dailyTarget")}>
          <div className="flex flex-wrap items-end gap-6">
            <div className="num text-4xl font-bold text-brand">{num(c.target_calories)}<span className="ms-1 text-base font-medium text-muted">{t("kcal")}</span></div>
            <div className="grid flex-1 grid-cols-3 gap-2 text-center">
              {[["target_protein", t("protein")], ["target_carb", t("carbs")], ["target_fat", t("fat")]].map(([k, label]) => (
                <div key={k} className="rounded-lg bg-page p-2">
                  <div className="num font-bold">{num(c[k])}{t("g")}</div>
                  <div className="text-[11px] text-muted">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-6 text-xs text-muted">
            <span>{t("visits")}: <b className="text-brand-ink">{data.visits}</b></span>
            <span>{t("lastVisit")}: <b className="text-brand-ink">{fmtDate(data.last_visit)}</b></span>
          </div>
        </Card>
        <Card tone="warn" title={t("needsReview")} icon={<TriangleAlert className="h-4 w-4 text-warn" />}>
          <SafetyFlags flags={data.safety_flags} />
        </Card>
        <ExclusionsCard data={data} reload={reload} />
      </div>
      <div className="space-y-4">
        <AppointmentsCard client={c} />
        <ClientAppCard client={c} />
        <PackagesCard client={c} />
        <AISummaryPanel clientId={c.id} last={lastSummary} />
        <InterviewLinkCard data={data} reload={reload} />
      </div>
    </div>
    </>
  );
}
