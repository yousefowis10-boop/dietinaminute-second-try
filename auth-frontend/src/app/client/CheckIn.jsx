import { useEffect, useRef, useState } from "react";
import { Copy, FileText, Link2, MessageCircle, RefreshCw, Sparkles, Upload } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../hooks/useApi";
import { useI18n } from "../../i18n";
import { apiError } from "../../ui";
import { useAIBlocker } from "./AIPanel";

const MAX_BYTES = 8 * 1024 * 1024;

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const checkinUrl = (token) => `${window.location.origin}/c/${token}`;

const FIELDS = [
  ["weight", "weight", "kg"], ["pbf", "pbfLbl", "%"], ["smm", "smmLbl", "kg"], ["body_fat_mass", "bodyFatMass", "kg"],
  ["visceral_fat", "visceralFat", ""], ["waist_hip", "waistHip", ""], ["inbody_bmr", "inbodyBmr", "kcal"],
];

// New check-in, typed or from an InBody sheet. mode = "manual" | "inbody".
export function CheckInPanel({ client, last, mode, onClose, onSaved }) {
  const { t, num } = useI18n();
  const blocker = useAIBlocker();
  const fileRef = useRef(null);
  const today = new Date().toISOString().slice(0, 10);
  const [values, setValues] = useState({ date: today });
  const [file, setFile] = useState(null); // {name, content_type, data, preview}
  const [read, setRead] = useState(false);
  const [busy, setBusy] = useState("");
  const [recalc, setRecalc] = useState(true);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const pick = async (f) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { toast.error(t("fileTooBig")); return; }
    const data = await readFileAsDataUrl(f);
    const next = { name: f.name, content_type: f.type || "application/octet-stream", data };
    setFile(next);
    if (blocker) return;
    setBusy("read");
    try {
      const r = await API.post(`/nutrition/clients/${client.id}/inbody-read/`, { file: next });
      const out = Object.fromEntries(Object.entries(r.data).filter(([k, v]) => v !== null && k !== "test_mode").map(([k, v]) => [k === "test_date" ? "date" : k, String(v)]));
      setValues((v) => ({ ...v, ...out }));
      setRead(true);
    } catch {
      toast(t("readFailed"), { icon: "⚠️" });
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    if (!values.weight) { toast.error(t("weightRequired")); return; }
    setBusy("save");
    try {
      const payload = { ...values, source: mode === "inbody" || file ? "inbody" : "manual", recalculate: recalc };
      if (file) payload.file = { name: file.name, content_type: file.content_type, data: file.data };
      const r = await API.post(`/nutrition/clients/${client.id}/checkins/`, payload);
      const { calories_before: a, calories_after: b } = r.data;
      toast.success(a && b && Math.round(a) !== Math.round(b) ? `${t("checkinSaved")} · ${t("calChanged", { a: num(a), b: num(b) })}` : t("checkinSaved"));
      onSaved();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy("");
    }
  };

  const showUpload = mode === "inbody";
  return (
    <div className={`card mb-4 grid overflow-hidden border-[1.5px] border-[#b8d6ca] ${showUpload ? "lg:grid-cols-[320px_1fr]" : ""}`}>
      {showUpload && (
        <div className="border-b border-line bg-[#f6faf8] p-5 lg:border-b-0 lg:border-e">
          <h3 className="text-[15px] font-bold">{t("uploadTitle")}</h3>
          <p className="mb-3 mt-1 text-[12.5px] text-muted">{t("uploadHint")}</p>
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
            className="grid h-48 w-full place-items-center overflow-hidden rounded-xl border border-dashed border-[#b9c3be] bg-white text-sm text-muted">
            {file?.content_type?.startsWith("image/") ? <img src={file.data} alt="" className="h-full w-full object-contain" />
              : file ? <span className="flex flex-col items-center gap-2"><FileText className="h-10 w-10 text-brand" />PDF</span>
                : <span className="flex flex-col items-center gap-2"><Upload className="h-8 w-8 text-brand" />{t("chooseFile")}</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {file && (
            <div className="mt-2.5 flex items-center gap-2 text-[12.5px] font-semibold">
              <FileText className="h-4 w-4 text-muted" /><span className="flex-1 truncate">{file.name}</span>
              <button type="button" className="text-brand" onClick={() => fileRef.current?.click()}>{t("changeFile")}</button>
            </div>
          )}
          {blocker && <p className="mt-3 text-xs text-muted">{t("aiForReading")}</p>}
        </div>
      )}
      <div className="p-5">
        <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
          <h3 className="text-[15px] font-bold">{showUpload ? t("readTitle") : t("manualTitle")}</h3>
          {busy === "read" && <span className="flex items-center gap-1.5 text-xs text-muted"><RefreshCw className="h-3.5 w-3.5 animate-spin" />{t("reading")}</span>}
          {read && <span className="inline-flex items-center gap-1 rounded-full bg-ai-soft px-2.5 py-0.5 text-xs font-semibold text-ai"><Sparkles className="h-3 w-3" />{t("readByAi")}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">{t("testDate")}</span>
            <input type="date" className="input num h-11" value={values.date || ""} max={today} onChange={set("date")} />
          </label>
          {FIELDS.map(([key, label, unit]) => {
            const prev = last?.[key];
            const hl = read && values[key] && ["weight", "pbf", "smm"].includes(key);
            return (
              <label key={key} className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">{t(label)}</span>
                <div className={`flex h-11 items-center rounded-xl border px-3 ${hl ? "border-[#9fd0bd] bg-[#f3fbf7]" : "border-line bg-white"}`}>
                  <input className="num w-full bg-transparent text-base font-bold outline-none" type="number" step="any" value={values[key] ?? ""} onChange={set(key)} />
                  {unit && <span className="text-[12.5px] text-muted">{unit === "kg" ? t("kg") : unit === "kcal" ? t("kcal") : unit}</span>}
                </div>
                {prev !== null && prev !== undefined && ["weight", "pbf", "smm"].includes(key) && (
                  <span className="num mt-1 block text-[11.5px] text-muted">{t("lastVal", { v: `${num(prev, 1)}${key === "pbf" ? " %" : ` ${t("kg")}`}` })}</span>
                )}
              </label>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex flex-1 items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" checked={recalc} onChange={(e) => setRecalc(e.target.checked)} />{t("recalcTarget")}
          </label>
          <button type="button" className="btn-secondary" onClick={onClose}>{t("cancel")}</button>
          <button type="button" className="btn-primary" disabled={busy === "save" || busy === "read"} onClick={save}>{busy === "save" ? t("saving") : t("saveCheckin")}</button>
        </div>
      </div>
    </div>
  );
}

export function CheckInLinkBox({ client }) {
  const { t } = useI18n();
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const get = async (fresh = false) => {
    setBusy(true);
    try { setToken((await API.post(`/nutrition/clients/${client.id}/checkin-link/`, fresh ? { new: true } : {})).data.token); }
    catch { toast.error(t("error")); } finally { setBusy(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { get(); }, [client.id]);
  const url = token ? checkinUrl(token) : "";
  return (
    <div>
      <p className="mb-3 text-sm text-muted">{t("checkinLinkHint")}</p>
      <div className="mb-3 truncate rounded-lg bg-page px-3 py-2 text-xs text-muted" dir="ltr">{url || "…"}</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" disabled={!token} onClick={() => navigator.clipboard.writeText(url).then(() => toast.success(t("copied")))}><Copy className="h-4 w-4" />{t("copyLink")}</button>
        <button type="button" className="btn-secondary" disabled={!token}
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(t("whatsappCheckin", { name: client.name.split(" ")[0], link: url }))}`, "_blank", "noopener")}>
          <MessageCircle className="h-4 w-4" />{t("sendWhatsApp")}
        </button>
        <button type="button" className="btn-ghost text-sm" disabled={busy} onClick={() => get(true)}><Link2 className="h-4 w-4" />{t("newLink")}</button>
      </div>
    </div>
  );
}
