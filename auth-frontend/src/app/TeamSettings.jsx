import { useEffect, useState } from "react";
import { Building2, Copy, UserPlus, Users } from "lucide-react";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { Avatar, Badge, Card, Field, Modal, Spinner, apiError } from "../ui";

// Solo (freelancer) account, or a company whose admin adds and switches off dietitians.
export default function TeamSettings() {
  const { t } = useI18n();
  const { refreshAccount } = useAuth();
  const [team, setTeam] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [created, setCreated] = useState(null); // {member, password} shown once
  const [busy, setBusy] = useState(false);

  const load = () => API.get("/nutrition/team/").then((r) => setTeam(r.data));
  useEffect(() => { load(); }, []);
  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (err) { toast.error(err?.response?.data?.email === "exists" ? t("emailTaken") : apiError(err, t)); } finally { setBusy(false); }
  };

  if (!team) return <Card title={t("teamTitle")}><Spinner /></Card>;

  if (team.mode === "solo") {
    return (
      <Card title={t("teamTitle")} icon={<Users className="h-4 w-4 text-brand" />} info={t("teamSoloInfo")} actions={<Badge>{t("soloAccount")}</Badge>}>
        <p className="mb-3 text-sm">{t("soloLine")}</p>
        <Field label={t("companyName")}>
          <div className="flex gap-2">
            <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <button type="button" className="btn-primary whitespace-nowrap" disabled={busy || !companyName.trim()}
              onClick={() => run(async () => { setTeam((await API.post("/nutrition/team/", { name: companyName })).data); await refreshAccount(); toast.success(t("companyCreated")); })}>
              <Building2 className="h-4 w-4" />{t("makeCompany")}
            </button>
          </div>
        </Field>
      </Card>
    );
  }

  const setShare = (v) => run(async () => setTeam((await API.put("/nutrition/team/", { share_clients: v })).data));
  const toggle = (m, patch) => run(async () => { await API.put(`/nutrition/team/members/${m.id}/`, patch); await load(); });
  const add = () => run(async () => {
    const r = await API.post("/nutrition/team/members/", form);
    setCreated(r.data); setAdding(false); setForm({ name: "", email: "" }); await load();
  });

  return (
    <Card title={`${t("teamTitle")} · ${team.name}`} icon={<Building2 className="h-4 w-4 text-brand" />} info={t("teamCompanyInfo")}
      actions={team.is_admin && <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" />{t("addDietitian")}</button>}>
      {team.is_admin && (
        <label className="mb-3 flex items-start gap-3 rounded-xl bg-page px-3.5 py-2.5 text-sm">
          <input type="checkbox" className="mt-1" checked={team.share_clients} disabled={busy} onChange={(e) => setShare(e.target.checked)} />
          <span><b className="block">{t("shareClients")}</b><span className="text-xs text-muted">{t("shareClientsHint")}</span></span>
        </label>
      )}
      <ul className="divide-y divide-line">
        {team.members.map((m) => (
          <li key={m.id} className={`flex flex-wrap items-center gap-3 py-2.5 ${m.active ? "" : "opacity-50"}`}>
            <Avatar name={m.name} size={32} />
            <span className="min-w-0 flex-1"><b className="block text-sm">{m.name}</b><span className="block truncate text-xs text-muted" dir="ltr">{m.email}</span></span>
            {m.is_admin && <Badge tone="brand">{t("adminBadge")}</Badge>}
            {!m.active && <Badge>{t("switchedOff")}</Badge>}
            {team.is_admin && !m.is_admin && (
              <button type="button" className="btn-ghost px-2.5 py-1 text-xs" disabled={busy} onClick={() => toggle(m, { active: !m.active })}>{m.active ? t("memberOff") : t("switchOn")}</button>
            )}
          </li>
        ))}
      </ul>

      <Modal open={adding} onClose={() => setAdding(false)} title={t("addDietitian")}>
        <div className="space-y-3">
          <Field label={t("fullName")}><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={t("email")}><input className="input" dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>{t("cancel")}</button>
          <button type="button" className="btn-primary" disabled={busy || !form.name.trim() || !form.email.includes("@")} onClick={add}>{t("addDietitian")}</button>
        </div>
      </Modal>

      <Modal open={Boolean(created)} onClose={() => setCreated(null)} title={t("dietitianAdded")}>
        {created && (
          <>
            <p className="mb-3 text-sm">{t("passOnLogin", { name: created.member.name })}</p>
            <div className="space-y-2 rounded-xl bg-page p-3.5 text-sm" dir="ltr">
              <div><span className="text-muted">{t("email")}: </span><b>{created.member.email}</b></div>
              <div><span className="text-muted">{t("tempPassword")}: </span><b className="font-mono">{created.password}</b></div>
            </div>
            <p className="mt-2 text-xs text-warn">{t("shownOnce")}</p>
            <div className="mt-4 flex justify-end">
              <button type="button" className="btn-primary" onClick={() => navigator.clipboard.writeText(`${created.member.email}\n${created.password}`).then(() => toast.success(t("copied")))}>
                <Copy className="h-4 w-4" />{t("copy")}
              </button>
            </div>
          </>
        )}
      </Modal>
    </Card>
  );
}
