import { useEffect, useRef, useState } from "react";
import { ImagePlus, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { Badge, Card, Field, PageHeader } from "../ui";
import { LanguageSwitch } from "./AppLayout";
import CalendarSettings from "./CalendarSettings";

export default function Settings() {
  const { account, refreshAccount } = useAuth();
  const { t } = useI18n();
  const fileRef = useRef(null);
  const [clinicName, setClinicName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ current_password: "", new_password: "" });

  useEffect(() => { setClinicName(account?.clinic_name || ""); }, [account]);

  const sendBranding = async (form) => {
    setBusy(true);
    try {
      await API.put("/nutrition/account/branding/", form, form instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined);
      await refreshAccount();
      toast.success(t("saved"));
    } catch (err) {
      toast.error(err?.response?.data?.detail || t("error"));
    } finally {
      setBusy(false);
    }
  };
  const uploadLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("logo", file);
    sendBranding(form);
    e.target.value = "";
  };
  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await API.post("/auth/change-password/", pw);
      setPw({ current_password: "", new_password: "" });
      toast.success(t("passwordChanged"));
    } catch (err) {
      const data = err?.response?.data;
      toast.error(data && typeof data === "object" ? Object.values(data).flat().join(" ") : t("error"));
    }
  };

  const plan = { basic: t("planBasic"), pro: t("planPro"), clinic: t("planClinic") }[account?.plan_tier];

  return (
    <>
      <PageHeader title={t("settingsTitle")} />
      <div id="calendars" className="mb-4 scroll-mt-6"><CalendarSettings /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("brandingTitle")}>
          <Field label={t("clinicName")}>
            <div className="flex gap-2">
              <input className="input" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
              <button type="button" className="btn-primary" disabled={busy} onClick={() => sendBranding({ clinic_name: clinicName })}>{t("save")}</button>
            </div>
          </Field>
          <div className="mt-5">
            <span className="label">{t("logo")}</span>
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-page">
                {account?.logo_url ? <img src={account.logo_url} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="h-6 w-6 text-muted" />}
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" />{t("uploadLogo")}</button>
                {account?.logo_url && <button type="button" className="btn-ghost text-bad" disabled={busy} onClick={() => sendBranding({ remove_logo: true })}><Trash2 className="h-4 w-4" />{t("removeLogo")}</button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title={t("aiSettings")} icon={<Sparkles className="h-4 w-4 text-ai" />} actions={<Badge tone="brand">{t("yourPlan")}: {plan}</Badge>}>
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" checked={!!account?.ai.enabled} disabled={busy}
                onChange={(e) => sendBranding({ ai_enabled: e.target.checked })} />
              <span>
                <span className="block text-sm font-semibold">{t("aiToggle")}</span>
                <span className="block text-xs text-muted">{t("aiToggleHint")}</span>
                {!account?.ai.plan_allows && <span className="mt-1 block text-xs text-ai">{t("aiUpgrade")}</span>}
              </span>
            </label>
          </Card>
          <Card title={t("language")}><LanguageSwitch className="max-w-xs" /></Card>
          <Card title={t("changePassword")}>
            <form onSubmit={changePassword} className="space-y-3">
              <Field label={t("currentPassword")}><input className="input" type="password" dir="ltr" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
              <Field label={t("newPassword")}><input className="input" type="password" dir="ltr" required minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
              <button type="submit" className="btn-secondary">{t("changePassword")}</button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
