import { useEffect, useState } from "react";
import { ChevronDown, History } from "lucide-react";
import API from "../../hooks/useApi";
import { useI18n } from "../../i18n";
import { Card, InfoTip, Spinner } from "../../ui";
import { StatusPill } from "./bloodUi";

function Spark({ points, low, high }) {
  if (points.length < 2) return <span className="text-xs text-muted">—</span>;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals, low ?? Infinity);
  const hi = Math.max(...vals, high ?? -Infinity);
  const span = hi - lo || 1;
  const w = 110;
  const h = 28;
  const xy = (p, i) => [4 + (i * (w - 8)) / (points.length - 1), h - 4 - ((p.value - lo) / span) * (h - 8)];
  const band = low != null || high != null
    ? [h - 4 - (((high ?? hi) - lo) / span) * (h - 8), h - 4 - (((low ?? lo) - lo) / span) * (h - 8)] : null;
  return (
    <svg width={w} height={h} className="overflow-visible">
      {band && <rect x="0" y={band[0]} width={w} height={Math.max(band[1] - band[0], 1)} fill="#e4f5ec" />}
      <polyline fill="none" stroke="#1f6f5c" strokeWidth="2" points={points.map((p, i) => xy(p, i).join(",")).join(" ")} />
      {points.map((p, i) => {
        const [x, y] = xy(p, i);
        return <circle key={i} cx={x} cy={y} r="2.5" fill={p.status === "low" ? "#c2410c" : p.status === "high" ? "#b7791f" : "#1f6f5c"} />;
      })}
    </svg>
  );
}

function Row({ s }) {
  const { lang, num, fmtDate } = useI18n();
  const [open, setOpen] = useState(false);
  const first = s.points[0];
  const last = s.points[s.points.length - 1];
  const change = s.points.length > 1 ? last.value - first.value : null;
  const digits = s.unit === "kcal" ? 0 : 2;
  return (
    <>
      <tr className="cursor-pointer border-b border-[#f0f2f1] hover:bg-page/60" onClick={() => setOpen((o) => !o)}>
        <td className="py-2.5 ps-1 font-medium">{lang === "ar" ? s.name_ar : s.name_en}</td>
        <td className="num py-2.5 font-bold">{num(last.value, digits)} <span className="text-xs font-normal text-muted">{s.unit}</span> {last.status && last.status !== "normal" && <StatusPill status={last.status} />}</td>
        <td className="num py-2.5 text-xs">{change === null ? "—" : <span className="font-semibold">{change > 0 ? "+" : ""}{num(change, digits)}</span>}</td>
        <td className="py-2.5"><Spark points={s.points} low={s.ref_low} high={s.ref_high} /></td>
        <td className="py-2.5 text-xs text-muted">{s.points.length} · {fmtDate(last.date)}</td>
        <td className="py-2.5 text-muted"><ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} /></td>
      </tr>
      {open && (
        <tr className="border-b border-[#f0f2f1] bg-page/50">
          <td colSpan={6} className="px-2 py-2">
            <div className="flex flex-wrap gap-1.5">
              {[...s.points].reverse().map((p, i) => (
                <span key={i} className="rounded-lg border border-line bg-white px-2 py-1 text-xs">
                  {fmtDate(p.date)} · <b className="num">{num(p.value, digits)}</b> {p.status && p.status !== "normal" && <StatusPill status={p.status} />}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Everything ever measured for the client: body (check-ins, InBody) and every blood test value.
export default function HistoryTab({ client }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  useEffect(() => {
    API.get(`/nutrition/clients/${client.id}/history/`).then((r) => setData(r.data)).catch(() => setData({ body: [], blood: [] }));
  }, [client.id]);
  if (!data) return <Spinner label={t("loading")} />;
  const table = (rows) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead><tr className="border-b border-line text-xs text-muted">
          <th className="py-2 ps-1 text-start font-semibold">{t("hMeasure")}</th><th className="py-2 text-start font-semibold">{t("hLatest")}</th>
          <th className="py-2 text-start font-semibold">{t("hChange")}</th><th className="py-2 text-start font-semibold">{t("hTrend")}</th>
          <th className="py-2 text-start font-semibold">{t("hTimes")}</th><th />
        </tr></thead>
        <tbody>{rows.map((s) => <Row key={s.key} s={s} />)}</tbody>
      </table>
    </div>
  );
  return (
    <div className="space-y-4">
      <Card title={t("hBody")} icon={<History className="h-4 w-4 text-brand" />}>
        {data.body.length ? table(data.body) : <p className="text-sm text-muted">{t("hNoBody")}</p>}
      </Card>
      <Card title={t("hBlood")} icon={<History className="h-4 w-4 text-bad" />}>
        {data.blood.length ? table(data.blood) : <p className="text-sm text-muted">{t("hNoBlood")}</p>}
      </Card>
      <div className="flex items-center gap-2 text-xs text-muted"><InfoTip text={t("hHint")} /></div>
    </div>
  );
}
