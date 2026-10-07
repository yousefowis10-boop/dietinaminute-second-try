import { useState } from "react";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { Card, TestModeBadge } from "../../ui";

// Why AI can't be used right now, or null when it can.
export function useAIBlocker() {
  const { account } = useAuth();
  const { t } = useI18n();
  if (!account) return t("loading");
  if (!account.ai.plan_allows) return t("aiUpgrade");
  if (!account.ai.enabled) return t("aiOff");
  if (!account.ai.server_ready) return t("aiNotReady");
  return null;
}

export function AIUnavailableNote({ reason }) {
  return <p className="rounded-lg bg-white/70 px-3 py-2 text-sm text-muted">{reason}</p>;
}

export default function AISummaryPanel({ clientId, last }) {
  const { t, lang, fmtDate } = useI18n();
  const blocker = useAIBlocker();
  const [result, setResult] = useState(last || null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const r = await API.post(`/nutrition/ai/clients/${clientId}/summary/`, { language: lang });
      setResult(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || t("error"));
    } finally {
      setBusy(false);
    }
  };

  const content = result?.content;
  return (
    <Card tone="ai" title={t("aiSummary")} icon={<Sparkles className="h-4 w-4 text-ai" />}
      actions={content?.test_mode && <TestModeBadge />}>
      {content ? (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>{content.summary}</p>
          {content.recommendations?.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-bold text-ai">{t("aiRecs")}</div>
              <ul className="space-y-1">
                {content.recommendations.map((r) => <li key={r} className="flex gap-2"><span className="text-ai">✓</span>{r}</li>)}
              </ul>
            </div>
          )}
          {content.red_flags?.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-bold text-warn">{t("aiFlags")}</div>
              <ul className="space-y-1">{content.red_flags.map((f) => <li key={f.flag}>⚠ <b>{f.flag}</b> — {f.why}</li>)}</ul>
            </div>
          )}
          <p className="text-xs text-muted">{fmtDate(result.created_at)} · {t("aiDecides")}</p>
        </div>
      ) : <p className="text-sm text-muted">{t("aiDecides")}</p>}
      <div className="mt-4">
        {blocker ? <AIUnavailableNote reason={blocker} /> : (
          <button type="button" className="btn-ai" disabled={busy} onClick={run}>
            <Sparkles className="h-4 w-4" />{busy ? t("aiThinking") : content ? t("rerun") : t("runSummary")}
          </button>
        )}
      </div>
    </Card>
  );
}
