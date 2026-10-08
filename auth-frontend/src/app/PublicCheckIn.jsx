import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Lock, Upload } from "lucide-react";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Spinner } from "../ui";
import { LanguageSwitch } from "./AppLayout";
import { readFileAsDataUrl } from "./client/CheckIn";

// The client's weekly check-in page (opened from the link, no login).
export default function PublicCheckIn() {
  const { token } = useParams();
  const { t, fmtDate } = useI18n();
  const fileRef = useRef(null);
  const [info, setInfo] = useState(null);
  const [state, setState] = useState("loading"); // loading | form | done | notfound
  const [values, setValues] = useState({ weight: "", pbf: "", smm: "", note: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get(`/public/checkin/${token}/`).then((r) => { setInfo(r.data); setState("form"); }).catch(() => setState("notfound"));
  }, [token]);

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const pick = async (f) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setError(t("fileTooBig")); return; }
    setFile({ name: f.name, content_type: f.type || "image/jpeg", data: await readFileAsDataUrl(f) });
  };
  const send = async () => {
    if (!values.weight) { setError(t("weightRequired")); return; }
    setBusy(true);
    setError("");
    try {
      await API.post(`/public/checkin/${token}/`, { ...values, file });
      setState("done");
    } catch (err) {
      setError(err?.response?.status === 429 ? t("error") : t("error"));
    } finally {
      setBusy(false);
    }
  };

  const box = (key, label, unit, required) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}{required && " *"}</span>
      <div className="flex h-12 items-center rounded-xl border border-line bg-white px-4">
        <input className="num w-full bg-transparent text-lg font-bold outline-none" type="number" step="0.1" inputMode="decimal" value={values[key]} onChange={set(key)} />
        <span className="text-sm text-muted">{unit}</span>
      </div>
    </label>
  );

  return (
    <div className="min-h-screen bg-page px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center gap-3">
          {info?.logo_url && <img src={info.logo_url} alt="" className="h-11 w-11 rounded-xl border border-line bg-white object-contain" />}
          <div className="min-w-0 flex-1 truncate font-bold">{info?.clinic_name || "Diet in a Minute"}</div>
          <LanguageSwitch className="w-40" />
        </header>
        {state === "loading" && <Spinner label={t("loading")} />}
        {state === "notfound" && <div className="card p-8 text-center text-muted">{t("piNotFound")}</div>}
        {state === "done" && (
          <div className="card p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-ok" />
            <h1 className="mt-3 text-xl font-bold">{t("ciThanks")}</h1>
            <button type="button" className="btn-secondary mt-5" onClick={() => { setValues({ weight: "", pbf: "", smm: "", note: "" }); setFile(null); setState("form"); }}>{t("ciAgain")}</button>
          </div>
        )}
        {state === "form" && (
          <div className="card space-y-4 p-6">
            <div>
              <h1 className="text-xl font-bold">{t("ciHello", { name: info.first_name })}</h1>
              <p className="mt-1 text-sm text-muted">{t("ciIntro")}</p>
              {info.last_date && <p className="mt-1 text-xs text-muted">{t("ciLast", { date: fmtDate(info.last_date) })}</p>}
            </div>
            {box("weight", t("weight"), t("kg"), true)}
            <div className="grid grid-cols-2 gap-3">{box("pbf", t("pbfLbl"), "%")}{box("smm", t("smmLbl"), t("kg"))}</div>
            <div>
              <span className="mb-1.5 block text-sm font-semibold">{t("ciPhoto")}</span>
              <button type="button" onClick={() => fileRef.current?.click()} className="flex h-24 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-[#b9c3be] bg-white text-sm text-muted">
                {file ? (file.content_type.startsWith("image/") ? <img src={file.data} alt="" className="h-full object-contain" /> : file.name) : <><Upload className="h-5 w-5 text-brand" />{t("chooseFile")}</>}
              </button>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">{t("ciNote")}</span>
              <textarea className="input" rows={2} value={values.note} onChange={set("note")} />
            </label>
            {error && <p className="text-sm font-semibold text-bad">{error}</p>}
            <button type="button" className="btn-primary w-full py-3" disabled={busy} onClick={send}>{busy ? t("saving") : t("ciSend")}</button>
            <p className="flex items-center gap-2 text-xs text-muted"><Lock className="h-3.5 w-3.5" />{t("piPrivacy")}</p>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-muted" dir="ltr">Diet in a Minute</p>
      </div>
    </div>
  );
}
