import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Droplet, FileText, Plus, Share2, Sparkles, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import API from "../../hooks/useApi";
import { useI18n } from "../../i18n";
import { AIBadge, Card, Spinner, TestModeBadge, apiError } from "../../ui";
import { isoDay } from "../schedule";
import { useAIBlocker } from "./AIPanel";
import { readFileAsDataUrl } from "./CheckIn";

const TONE = { low: "bg-bad-soft text-bad", high: "bg-warn-soft text-warn", normal: "bg-ok-soft text-ok" };
const emptyRow = () => ({ name: "", value: "", unit: "", ref_low: "", ref_high: "" });

export function StatusPill({ status }) {
  const { t } = useI18n();
  if (!status) return null;
  return <span className={`rounded-full px-2 py-px text-[11px] font-bold ${TONE[status]}`}>{t(`bt_${status}`)}</span>;
}

const range = (r) => (r.ref_low != null && r.ref_high != null ? `${r.ref_low} – ${r.ref_high}` : r.ref_high != null ? `< ${r.ref_high}` : r.ref_low != null ? `> ${r.ref_low}` : "—");

// Check / type the results before saving (after the AI read them, or by hand).
function ReviewForm({ clientId, markers, initial, onCancel, onSaved }) {
  const { t, lang } = useI18n();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const setRow = (i, patch) => setForm((f) => ({ ...f, rows: f.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const pickName = (i, name) => {
    const m = markers.find((x) => x.name_en === name || x.name_ar === name);
    setRow(i, m ? { name: m.name_en, unit: form.rows[i].unit || m.unit } : { name });
  };
  const save = async () => {
    setBusy(true);
    try {
      await API.post(`/nutrition/clients/${clientId}/blood-tests/`, { date: form.date, lab: form.lab, file: form.file, results: form.rows.filter((r) => r.name && r.value !== "") });
      toast.success(t("saved"));
      onSaved();
    } catch (err) {
      toast.error(apiError(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={<>{t("btCheckTitle")} {form.read && <AIBadge>{t("btReadByAI")}</AIBadge>} {form.testMode && <TestModeBadge />}</>}>
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted">{t("btTestDate")}<input className="input mt-1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label className="text-xs text-muted sm:col-span-2">{t("btLab")}<input className="input mt-1" value={form.lab} onChange={(e) => setForm({ ...form, lab: e.target.value })} /></label>
      </div>
      <datalist id="bt-markers">{markers.map((m) => <option key={m.code} value={lang === "ar" ? m.name_ar : m.name_en} />)}</datalist>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b border-line text-xs text-muted">
            <th className="py-2 text-start font-semibold">{t("btTest")}</th><th className="py-2 text-start font-semibold">{t("btResult")}</th>
            <th className="py-2 text-start font-semibold">{t("btUnit")}</th><th className="py-2 text-start font-semibold">{t("btRangeLow")}</th>
            <th className="py-2 text-start font-semibold">{t("btRangeHigh")}</th><th />
          </tr></thead>
          <tbody>
            {form.rows.map((r, i) => (
              <tr key={i} className="border-b border-[#f0f2f1]">
                <td className="py-1.5 pe-2"><input className="input py-1.5" list="bt-markers" value={r.name} onChange={(e) => pickName(i, e.target.value)} /></td>
                <td className="py-1.5 pe-2"><input className="input num w-24 py-1.5 font-bold" type="number" step="any" value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} /></td>
                <td className="py-1.5 pe-2"><input className="input w-24 py-1.5" dir="ltr" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} /></td>
                <td className="py-1.5 pe-2"><input className="input num w-20 py-1.5" type="number" step="any" value={r.ref_low ?? ""} onChange={(e) => setRow(i, { ref_low: e.target.value })} /></td>
                <td className="py-1.5 pe-2"><input className="input num w-20 py-1.5" type="number" step="any" value={r.ref_high ?? ""} onChange={(e) => setRow(i, { ref_high: e.target.value })} /></td>
                <td><button type="button" className="btn-ghost p-1 hover:text-bad" onClick={() => setForm((f) => ({ ...f, rows: f.rows.filter((_, j) => j !== i) }))}><X className="h-3.5 w-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">{t("btRangeHint")}</p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-ghost me-auto px-2 text-xs" onClick={() => setForm((f) => ({ ...f, rows: [...f.rows, emptyRow()] }))}><Plus className="h-3.5 w-3.5" />{t("btAddTest")}</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>{t("cancel")}</button>
        <button type="button" className="btn-primary" disabled={busy || !form.date || !form.rows.some((r) => r.name && r.value !== "")} onClick={save}>{busy ? t("saving") : t("btSave")}</button>
      </div>
    </Card>
  );
}

export function AdviceCards({ advice }) {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  if (!advice.length) return <p className="text-sm text-muted">{t("btAllNormal")}</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {advice.map((a) => (
        <div key={a.code || a.name} className={`rounded-xl border p-3.5 text-sm ${a.refer ? "border-[#f6c7b1]" : "border-line"}`}>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <StatusPill status={a.status} />
            <b>{ar ? a.name_ar : a.name_en}</b>
            <span className="num text-xs text-muted">{a.value} {a.unit}</span>
          </div>
          {a.refer && <p className="mb-1.5 flex items-start gap-1.5 rounded-lg bg-bad-soft px-2.5 py-1.5 text-xs font-semibold text-bad"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t("btReferDoctor")}</p>}
          {(a.text_en || a.text_ar) && <p className="leading-relaxed text-[#4b5551]">{ar ? a.text_ar : a.text_en}</p>}
          {a.foods?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {a.foods.map((f) => (
                <span key={f.id} className={`rounded-lg px-2 py-0.5 text-xs ${f.in_plan ? "bg-ok-soft font-semibold text-ok" : "bg-page"}`}>
                  {ar ? f.name_ar || f.name : f.name}{f.in_plan && ` ✓ ${t("btInPlan")}`}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function BloodTab({ client, startUpload, onUploadStarted }) {
  const { t, lang } = useI18n();
  const blocker = useAIBlocker();
  const fileRef = useRef(null);
  const [data, setData] = useState(null);
  const [review, setReview] = useState(null);
  const [reading, setReading] = useState(false);

  const load = useCallback(() => API.get(`/nutrition/clients/${client.id}/blood-tests/`).then((r) => setData(r.data)).catch(() => setData({ tests: [], advice: [], markers: [] })), [client.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (startUpload && fileRef.current) { fileRef.current.click(); onUploadStarted?.(); }
  }, [startUpload, onUploadStarted, data]);

  const pick = async (f) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error(t("fileTooBig")); return; }
    const file = { name: f.name, content_type: f.type || "image/jpeg", data: await readFileAsDataUrl(f) };
    const base = { date: isoDay(), lab: "", file, rows: [emptyRow(), emptyRow(), emptyRow()] };
    if (blocker) { setReview(base); return; }
    setReading(true);
    try {
      const r = await API.post(`/nutrition/clients/${client.id}/blood-read/`, { file });
      setReview({ ...base, date: r.data.test_date || base.date, lab: r.data.lab || "", read: true, testMode: r.data.test_mode,
        rows: r.data.results.length ? r.data.results.map((x) => ({ ...x, ref_low: x.ref_low ?? "", ref_high: x.ref_high ?? "" })) : base.rows });
    } catch (err) {
      toast.error(apiError(err, t));
      setReview(base);
    } finally {
      setReading(false);
    }
  };
  const share = async (test) => { await API.put(`/nutrition/blood-tests/${test.id}/`, { shared: !test.shared }); load(); };
  const remove = async (test) => {
    if (!window.confirm(t("confirmDelete"))) return;
    await API.delete(`/nutrition/blood-tests/${test.id}/`);
    load();
  };
  const openFile = async (test) => {
    try {
      const r = await API.get(`/nutrition/blood-tests/${test.id}/file/`, { responseType: "blob" });
      window.open(URL.createObjectURL(r.data), "_blank", "noopener");
    } catch { toast.error(t("error")); }
  };

  if (!data) return <Spinner label={t("loading")} />;
  const latest = data.tests[0];

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      {!review && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" disabled={reading} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />{reading ? t("btReading") : t("btUpload")}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setReview({ date: isoDay(), lab: "", file: null, rows: [emptyRow(), emptyRow(), emptyRow()] })}>
            <Plus className="h-4 w-4" />{t("btTypeByHand")}
          </button>
          <span className="text-xs text-muted">{blocker ? t("btUploadHintManual") : t("btUploadHint")}</span>
        </div>
      )}
      {review && <ReviewForm clientId={client.id} markers={data.markers} initial={review} onCancel={() => setReview(null)} onSaved={() => { setReview(null); load(); }} />}

      {data.tests.length === 0 && !review ? (
        <div className="card p-8 text-center text-sm text-muted"><Droplet className="mx-auto mb-2 h-8 w-8 text-bad/60" />{t("btNone")}</div>
      ) : data.tests.length > 0 && (
        <>
          <Card title={<>{t("btAdvice")} <AIBadge>{t("btSuggested")}</AIBadge></>} icon={<Sparkles className="h-4 w-4 text-ai" />}
            actions={latest && (
              <button type="button" className={`btn px-3 py-1.5 text-xs ${latest.shared ? "bg-ok-soft text-ok" : "btn-secondary"}`} onClick={() => share(latest)}>
                <Share2 className="h-3.5 w-3.5" />{latest.shared ? t("btSharedWithClient") : t("btShareWithClient")}
              </button>
            )}>
            <AdviceCards advice={data.advice} />
            <p className="mt-3 text-xs text-muted">{t("btAdviceNote")}</p>
          </Card>

          <Card title={t("btAllTests")} icon={<FileText className="h-4 w-4 text-brand" />}>
            <ul className="divide-y divide-line">
              {data.tests.map((test) => (
                <li key={test.id} className="py-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <b className="num">{new Date(test.date).toLocaleDateString(lang === "ar" ? "ar-JO" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}</b>
                    {test.lab && <span className="text-muted">· {test.lab}</span>}
                    {test.low > 0 && <span className="rounded-full bg-bad-soft px-2 text-[11px] font-bold text-bad">{test.low} {t("bt_low")}</span>}
                    {test.high > 0 && <span className="rounded-full bg-warn-soft px-2 text-[11px] font-bold text-warn">{test.high} {t("bt_high")}</span>}
                    {test.shared && <span className="rounded-full bg-ok-soft px-2 text-[11px] font-bold text-ok">{t("btShared")}</span>}
                    <span className="ms-auto flex gap-1">
                      {test.has_file && <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => openFile(test)}><FileText className="h-3.5 w-3.5" />{t("btOriginal")}</button>}
                      <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => share(test)}><Share2 className="h-3.5 w-3.5" />{test.shared ? t("btUnshare") : t("btShare")}</button>
                      <button type="button" className="btn-ghost p-1 hover:text-bad" onClick={() => remove(test)}><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {test.results.map((r) => (
                      <span key={r.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1 text-xs" title={`${t("btRange")}: ${range(r)}`}>
                        {lang === "ar" ? r.name_ar : r.name_en} <b className="num">{r.value}</b> <span className="text-muted">{r.unit}</span>
                        {r.status && r.status !== "normal" && <StatusPill status={r.status} />}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{t("btHistoryHint")}</p>
          </Card>
        </>
      )}
    </div>
  );
}
