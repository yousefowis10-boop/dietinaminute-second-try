import { TriangleAlert } from "lucide-react";
import { useI18n } from "../../i18n";

const TONE = { low: "bg-bad-soft text-bad", high: "bg-warn-soft text-warn", normal: "bg-ok-soft text-ok" };

export function StatusPill({ status }) {
  const { t } = useI18n();
  if (!status) return null;
  return <span className={`rounded-full px-2 py-px text-[11px] font-bold ${TONE[status]}`}>{t(`bt_${status}`)}</span>;
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

