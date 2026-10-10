import { useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import html2pdf from "html2pdf.js";
import { Check, Download, FileText, LineChart, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../hooks/useApi";
import { useI18n } from "../../i18n";
import { Card, FoldArrow, TestModeBadge, useFold } from "../../ui";
import { AIUnavailableNote, useAIBlocker } from "./AIPanel";
import { CheckInPanel } from "./CheckIn";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const SRC = { visit: "bg-warn-soft text-warn", manual: "bg-page text-muted", inbody: "bg-ai-soft text-ai", client_link: "bg-brand-soft text-brand" };

function Delta({ value, goodWhenDown = true }) {
  const { num } = useI18n();
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const v = Math.round(value * 10) / 10;
  const tone = v === 0 ? "bg-page text-muted" : (goodWhenDown ? v < 0 : v > 0) ? "bg-ok-soft text-[#1d7a52]" : "bg-bad-soft text-bad";
  return <span className={`num ms-1 rounded-full px-1.5 py-px text-[11.5px] font-bold ${tone}`} dir="ltr">{v > 0 ? "+" : ""}{num(v, 1)}</span>;
}

function MiniChart({ points, field, color, unit, labels }) {
  const vals = points.map((p) => p[field]);
  const data = {
    labels,
    datasets: [{ data: vals, borderColor: color, backgroundColor: `${color}14`, fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: "#fff", pointBorderColor: color, pointBorderWidth: 2, spanGaps: true }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.raw}${unit}` } } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#8a948f" } }, y: { grid: { color: "#eef1ef" }, ticks: { font: { size: 10 }, color: "#8a948f" } } },
  };
  return <div className="h-44"><Line data={data} options={options} /></div>;
}

export default function ProgressTab({ data, reload, checkin, setCheckin }) {
  const { t, lang, num, fmtDate } = useI18n();
  const blocker = useAIBlocker();
  const reportRef = useRef(null);
  const c = data.client;
  const all = data.progress || [];
  const points = all.filter((p) => p.weight);
  const lastFollowUp = data.ai_results.find((r) => r.kind === "followup");
  const [followUp, setFollowUp] = useState(lastFollowUp || null);
  const [busy, setBusy] = useState("");
  const loseGoal = c.goal !== "gain";
  const first = points[0];
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const weeks = first && last ? Math.max(1, Math.round((new Date(last.date) - new Date(first.date)) / (7 * 86400000))) : 0;
  const nextDue = last ? new Date(new Date(last.date).getTime() + 7 * 86400000) : null;
  const labels = points.map((p) => new Date(p.date).toLocaleDateString(lang === "ar" ? "ar-JO" : "en-GB", { day: "numeric", month: "short" }));
  const d = (field) => (prev && last && last[field] != null && prev[field] != null ? last[field] - prev[field] : null);
  const ds = (field) => (first && last && last[field] != null && first[field] != null ? last[field] - first[field] : null);

  const runFollowUp = async () => {
    setBusy("ai");
    try { setFollowUp((await API.post(`/nutrition/ai/clients/${c.id}/follow-up/`, { language: lang })).data); }
    catch (err) { toast.error(err?.response?.data?.detail || t("error")); } finally { setBusy(""); }
  };
  const openFile = async (id) => {
    try {
      const f = (await API.get(`/nutrition/checkins/${id}/file/`)).data;
      const bytes = Uint8Array.from(atob(f.data), (ch) => ch.charCodeAt(0));
      window.open(URL.createObjectURL(new Blob([bytes], { type: f.content_type })), "_blank", "noopener");
    } catch { toast.error(t("error")); }
  };
  const markSeen = async (id) => { await API.post(`/nutrition/checkins/${id}/`, {}); reload(); };
  const remove = async (id) => {
    if (!window.confirm(t("confirmDeleteCheckin"))) return;
    await API.delete(`/nutrition/checkins/${id}/`);
    reload();
  };
  const [chartsOpen, toggleCharts] = useFold("dim.fold.charts", true);
  const [listOpen, toggleList] = useFold("dim.fold.checkins", true);
  const downloadReport = async () => {
    setBusy("pdf");
    toggleCharts(true);
    toggleList(true);
    await new Promise((r) => setTimeout(r, 300)); // let the boxes open before the PDF is drawn
    try {
      await html2pdf().set({
        margin: 8, filename: `${c.name} - ${t("progressReport")}.pdf`, image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      }).from(reportRef.current).save();
    } finally { setBusy(""); }
  };

  const stats = [
    [t("weight"), last?.weight, t("kg"), d("weight"), ds("weight"), loseGoal],
    [t("bodyFat"), last?.pbf, "%", d("pbf"), ds("pbf"), true],
    [t("muscle"), last?.smm, t("kg"), d("smm"), ds("smm"), false],
  ];
  const rows = [...all].reverse();

  return (
    <div className="space-y-4">
      {checkin && <CheckInPanel client={c} last={last} mode={checkin} onClose={() => setCheckin(null)} onSaved={() => { setCheckin(null); reload(); }} />}
      <div ref={reportRef} className="space-y-4 bg-page">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(([label, v, unit, dl, dst, down]) => (
            <div key={label} className="card p-4">
              <div className="text-[12.5px] font-semibold text-muted">{label}</div>
              <div className="num my-1 text-[28px] font-bold">{v != null ? num(v, 1) : "—"} <small className="text-[13px] font-medium text-muted">{unit}</small></div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"><span>{t("sinceLastShort")}<Delta value={dl} goodWhenDown={down} /></span><span>{t("sinceStartShort")}<Delta value={dst} goodWhenDown={down} /></span></div>
            </div>
          ))}
          <div className="card p-4">
            <div className="text-[12.5px] font-semibold text-muted">{t("checkinsCount")}</div>
            <div className="num my-1 text-[28px] font-bold">{num(all.length)} <small className="text-[13px] font-medium text-muted">{weeks ? t("inWeeks", { n: weeks }) : ""}</small></div>
            <div className="text-xs text-muted">{nextDue ? t("nextDue", { date: fmtDate(nextDue) }) : "—"}</div>
          </div>
        </div>

        {points.length >= 2 && (
          <button type="button" data-html2canvas-ignore onClick={() => toggleCharts()} aria-expanded={chartsOpen}
            className="card flex w-full items-center gap-2 px-4 py-3 text-start text-[15px] font-bold hover:bg-[#fafbfa]">
            <LineChart className="h-4 w-4 text-brand" />{t("chartsTitle")}<FoldArrow open={chartsOpen} className="ms-auto" />
          </button>
        )}
        {points.length >= 2 && chartsOpen && (
          <div className="grid gap-4 lg:grid-cols-3">
            {[["weight", "#1f6f5c", ` ${t("kg")}`, t("weightChart"), ds("weight"), loseGoal], ["pbf", "#c2410c", "%", t("fatChart"), ds("pbf"), true], ["smm", "#2563a8", ` ${t("kg")}`, t("muscleChart"), ds("smm"), false]].map(([f, color, unit, title, delta, down]) => (
              <div key={f} className="card px-4 py-3.5">
                <div className="mb-1.5 flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} /><h4 className="text-sm font-bold">{title}</h4><span className="ms-auto"><Delta value={delta} goodWhenDown={down} /></span></div>
                <MiniChart points={points} field={f} color={color} unit={unit} labels={labels} />
              </div>
            ))}
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="flex items-center px-4 py-3.5">
            <button type="button" onClick={() => toggleList()} aria-expanded={listOpen} className="flex flex-1 items-center gap-2 text-start">
              <h3 className="text-[15px] font-bold">{t("allCheckins")}</h3><span className="num text-xs text-muted">({num(rows.length)})</span><FoldArrow open={listOpen} />
            </button>
            <button type="button" className="btn-secondary ms-auto" disabled={busy === "pdf"} data-html2canvas-ignore onClick={downloadReport}><Download className="h-4 w-4" />{busy === "pdf" ? t("loading") : t("progressPdf")}</button>
          </div>
          {!listOpen ? null : rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-[13.5px]">
                <thead><tr className="border-b border-line bg-[#fafbfa] text-xs text-muted">
                  {[t("colDate"), t("colSource"), t("weight"), t("bodyFat"), t("muscle"), t("colCalTarget"), t("colFile"), ""].map((h, i) => <th key={i} className="px-4 py-3 text-start font-semibold">{h}</th>)}
                </tr></thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const before = rows[idx + 1];
                    return (
                      <tr key={r.id} className="h-[50px] border-b border-[#f0f2f0]">
                        <td className="num px-4 font-bold">{fmtDate(r.date)}{!r.reviewed && <span className="ms-2 rounded-full bg-bad px-1.5 py-px text-[10.5px] font-bold text-white">{t("newBadge")}</span>}</td>
                        <td className="px-4"><span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${SRC[r.source] || SRC.manual}`}>{t(`src_${r.source}`)}</span></td>
                        <td className="num px-4">{r.weight != null ? `${num(r.weight, 1)} ${t("kg")}` : "—"}{before && <Delta value={r.weight - before.weight} goodWhenDown={loseGoal} />}</td>
                        <td className="num px-4">{r.pbf != null ? `${num(r.pbf, 1)}%` : "—"}{before && r.pbf != null && before.pbf != null && <Delta value={r.pbf - before.pbf} />}</td>
                        <td className="num px-4">{r.smm != null ? `${num(r.smm, 1)} ${t("kg")}` : "—"}{before && r.smm != null && before.smm != null && <Delta value={r.smm - before.smm} goodWhenDown={false} />}</td>
                        <td className="num px-4">{num(r.calorie_target)}</td>
                        <td className="px-4">{r.file && <button type="button" onClick={() => openFile(r.id)} className="text-muted hover:text-brand" aria-label={r.file.name}><FileText className="h-4 w-4" /></button>}</td>
                        <td className="px-4 text-end" data-html2canvas-ignore>
                          {!r.reviewed && <button type="button" className="me-3 inline-flex items-center gap-1 text-xs font-semibold text-brand" onClick={() => markSeen(r.id)}><Check className="h-3.5 w-3.5" />{t("markSeen")}</button>}
                          <button type="button" className="text-[#b9c0bc] hover:text-bad" onClick={() => remove(r.id)} aria-label={t("delete")}><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="px-4 pb-5 text-sm text-muted">{t("noCheckinsYet")}</p>}
        </div>
      </div>

      <Card tone="ai" title={t("aiFollowUp")} icon={<Sparkles className="h-4 w-4 text-ai" />} actions={followUp?.content?.test_mode && <TestModeBadge />}>
        {followUp?.content?.suggestion && <p className="mb-3 whitespace-pre-line text-sm leading-relaxed">{followUp.content.suggestion}</p>}
        {blocker ? <AIUnavailableNote reason={blocker} /> : (
          <button type="button" className="btn-ai" disabled={busy === "ai" || points.length < 2} onClick={runFollowUp}>
            <Sparkles className="h-4 w-4" />{busy === "ai" ? t("aiThinking") : t("runFollowUp")}
          </button>
        )}
      </Card>
    </div>
  );
}
