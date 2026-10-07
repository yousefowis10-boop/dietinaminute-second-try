import { useState } from "react";
import { Line } from "react-chartjs-2";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Printer, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../hooks/useApi";
import { useI18n } from "../../i18n";
import { Card, Empty, TestModeBadge } from "../../ui";
import { AIUnavailableNote, useAIBlocker } from "./AIPanel";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function Change({ label, value, unit, goodWhenDown }) {
  const { num } = useI18n();
  if (value === null || value === undefined) return null;
  const good = goodWhenDown ? value < 0 : value > 0;
  const color = value === 0 ? "text-muted" : good ? "text-ok" : "text-bad";
  return (
    <div className="rounded-lg bg-page p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`num text-lg font-bold ${color}`} dir="ltr">{value > 0 ? "+" : ""}{num(value, 1)} {unit}</div>
    </div>
  );
}

export default function ProgressTab({ data }) {
  const { t, lang, fmtDate } = useI18n();
  const blocker = useAIBlocker();
  const c = data.client;
  const points = data.progress.filter((p) => p.weight);
  const change = data.progress_change;
  const lastFollowUp = data.ai_results.find((r) => r.kind === "followup");
  const [followUp, setFollowUp] = useState(lastFollowUp || null);
  const [busy, setBusy] = useState(false);
  const loseGoal = c.goal !== "gain";

  if (points.length < 2) return <Empty>{t("needTwoVisits")}</Empty>;

  const chartData = {
    labels: points.map((p) => fmtDate(p.date)),
    datasets: [
      { label: `${t("weight")} (${t("kg")})`, data: points.map((p) => p.weight), borderColor: "#1f6f5c", backgroundColor: "#1f6f5c", tension: 0.3, yAxisID: "y" },
      { label: `${t("bodyFat")} (%)`, data: points.map((p) => p.pbf), borderColor: "#b7791f", backgroundColor: "#b7791f", tension: 0.3, yAxisID: "y1" },
      { label: `${t("muscle")} (${t("kg")})`, data: points.map((p) => p.smm), borderColor: "#5b4bd6", backgroundColor: "#5b4bd6", tension: 0.3, yAxisID: "y1" },
    ],
  };
  const options = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
    plugins: { legend: { position: "bottom", rtl: lang === "ar" } },
    scales: { y: { position: "left" }, y1: { position: "right", grid: { drawOnChartArea: false } } },
  };

  const runFollowUp = async () => {
    setBusy(true);
    try {
      const r = await API.post(`/nutrition/ai/clients/${c.id}/follow-up/`, { language: lang });
      setFollowUp(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{t("progressReport")} – {c.name}</h1>
      </div>
      <Card title={t("progressTitle")} actions={<button type="button" className="btn-secondary no-print" onClick={() => window.print()}><Printer className="h-4 w-4" />{t("printReport")}</button>}>
        <div className="h-72"><Line data={chartData} options={options} /></div>
      </Card>
      {change && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title={t("sinceLast")}>
            <div className="grid grid-cols-3 gap-2">
              <Change label={t("weight")} value={change.since_last.weight} unit={t("kg")} goodWhenDown={loseGoal} />
              <Change label={t("bodyFat")} value={change.since_last.pbf} unit="%" goodWhenDown />
              <Change label={t("muscle")} value={change.since_last.smm} unit={t("kg")} />
            </div>
          </Card>
          <Card title={t("sinceStart")}>
            <div className="grid grid-cols-3 gap-2">
              <Change label={t("weight")} value={change.since_start.weight} unit={t("kg")} goodWhenDown={loseGoal} />
              <Change label={t("bodyFat")} value={change.since_start.pbf} unit="%" goodWhenDown />
              <Change label={t("muscle")} value={change.since_start.smm} unit={t("kg")} />
            </div>
          </Card>
        </div>
      )}
      <Card tone="ai" title={t("aiFollowUp")} icon={<Sparkles className="h-4 w-4 text-ai" />} actions={followUp?.content?.test_mode && <TestModeBadge />} className="no-print">
        {followUp?.content?.suggestion && <p className="mb-3 whitespace-pre-line text-sm leading-relaxed">{followUp.content.suggestion}</p>}
        {blocker ? <AIUnavailableNote reason={blocker} /> : (
          <button type="button" className="btn-ai" disabled={busy} onClick={runFollowUp}>
            <Sparkles className="h-4 w-4" />{busy ? t("aiThinking") : t("runFollowUp")}
          </button>
        )}
      </Card>
    </div>
  );
}
