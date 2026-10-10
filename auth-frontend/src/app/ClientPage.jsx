import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronDown, Droplet, Link2, Pencil, Plus, Trash2, Upload, UserCheck } from "lucide-react";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Avatar, Badge, Modal, Spinner, Tabs } from "../ui";
import { CheckInLinkBox } from "./client/CheckIn";
import OverviewTab from "./client/OverviewTab";
import InterviewTab from "./client/InterviewTab";
import PlansTab from "./client/PlansTab";
import ProgressTab from "./client/ProgressTab";
import BloodTab from "./client/BloodTab";
import HistoryTab from "./client/HistoryTab";

export default function ClientPage() {
  const { id } = useParams();
  const { t, num } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [checkin, setCheckin] = useState(null); // null | "manual" | "inbody"
  const [linkOpen, setLinkOpen] = useState(false);
  const [bloodUpload, setBloodUpload] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef(null);
  useEffect(() => {
    if (!addOpen) return undefined;
    const close = (e) => { if (addRef.current && !addRef.current.contains(e.target)) setAddOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [addOpen]);
  const navigate = useNavigate();

  const load = useCallback(() => {
    API.get(`/nutrition/clients/${id}/overview/`).then((r) => setData(r.data)).catch(() => setFailed(true));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  // Coming back to this window (e.g. after testing the client's link) shows what they just sent.
  useEffect(() => {
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  if (failed) return <p className="text-muted">{t("error")}</p>;
  if (!data) return <Spinner label={t("loading")} />;
  const c = data.client;
  const removeClient = async () => {
    if (!window.confirm(t("confirmDeleteClient", { name: c.name }))) return;
    try {
      await API.delete(`/nutrition/clients/${c.id}/`);
      navigate("/dashboard/clients");
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <>
      <Link to="/dashboard/clients" className="mb-2 inline-block text-sm text-muted hover:text-brand">← {t("clients")}</Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Avatar name={c.name} size={48} />
        <div className="min-w-0 flex-1 sm:min-w-[24rem]">
          <h1 className="flex items-center gap-2 text-2xl font-bold">{c.name}
            <Link to={`/dashboard/clients/${c.id}/edit`} className="btn-ghost p-1.5 text-muted" title={t("edit")} aria-label={t("edit")}><Pencil className="h-4 w-4" /></Link>
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chip">{num(c.age)} {t("years")} · {c.gender === "F" ? t("female") : t("male")}</span>
            <span className="chip num">{num(c.weight, 1)} {t("kg")} · {num(c.height)} {t("cm")}</span>
            {c.pbf ? <span className="chip">{t("bodyFat")} {num(c.pbf, 1)}%</span> : null}
            <span className="chip">{t(`ws_${c.work_style}`)}</span>
            <Badge tone="brand">{t("goal")}: {t(`goal_${c.goal || ""}`)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={addRef}>
            <button type="button" className="btn-secondary" onClick={() => setAddOpen((o) => !o)} aria-expanded={addOpen}>
              <Plus className="h-4 w-4" />{t("addMenu")}<ChevronDown className={`h-4 w-4 transition ${addOpen ? "rotate-180" : ""}`} />
            </button>
            {addOpen && (
              <div className="absolute end-0 z-30 mt-1 w-60 rounded-xl border border-line bg-white p-1.5 shadow-xl">
                {[
                  [UserCheck, t("newCheckin"), () => { setCheckin("manual"); setParams({ tab: "progress" }); }],
                  [Upload, t("uploadInbody"), () => { setCheckin("inbody"); setParams({ tab: "progress" }); }],
                  [Droplet, t("btUpload"), () => { setBloodUpload(true); setParams({ tab: "blood" }); }],
                  [Link2, t("checkinLink"), () => setLinkOpen(true)],
                ].map(([Icon, label, go]) => (
                  <button key={label} type="button" onClick={() => { setAddOpen(false); go(); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm hover:bg-page">
                    <Icon className="h-4 w-4 text-muted" />{label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link to={`/dashboard/clients/${c.id}/plans/new`} className="btn-primary"><Plus className="h-4 w-4" />{t("newPlan")}</Link>
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={(v) => setParams(v === "overview" ? {} : { tab: v })}
        tabs={[
          { value: "overview", label: t("tabOverview") },
          { value: "interview", label: t("tabInterview"), badge: c.interview_status === "submitted" ? "!" : null },
          { value: "plans", label: `${t("tabPlans")} (${data.plans.length})` },
          { value: "progress", label: t("tabProgressCi"), badge: data.progress.some((p) => !p.reviewed) ? "!" : null },
          { value: "blood", label: t("tabBlood") },
          { value: "history", label: t("tabHistory") },
        ]}
      />
      {tab === "overview" && <OverviewTab data={data} reload={load} />}
      {tab === "interview" && <InterviewTab data={data} reload={load} />}
      {tab === "plans" && <PlansTab data={data} reload={load} />}
      {tab === "progress" && <ProgressTab data={data} reload={load} checkin={checkin} setCheckin={setCheckin} />}
      {tab === "blood" && <BloodTab client={c} startUpload={bloodUpload} onUploadStarted={() => setBloodUpload(false)} />}
      {tab === "history" && <HistoryTab client={c} />}
      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title={t("checkinLink")}><CheckInLinkBox client={c} /></Modal>
      {tab === "overview" && (
        <div className="mt-8 border-t border-line pt-4">
          <button type="button" className="btn-ghost text-sm text-muted hover:text-bad" onClick={removeClient}>
            <Trash2 className="h-4 w-4" />{t("deleteClient")}
          </button>
        </div>
      )}
    </>
  );
}
