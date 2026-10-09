import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { useI18n } from "../i18n";
import { timeLabel } from "./foodUtils";

// "Week: 1: Push · 2: Pull\nWarm-Up: 5 minutes…" -> { week: ["1: Push", …], tips: [["Warm-Up", "5 minutes…"]], other: […] }
function readNotes(text) {
  const out = { week: [], tips: [], other: [] };
  String(text || "").split("\n").map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const m = line.match(/^(Week|الأسبوع):\s*(.*)$/);
    if (m) { out.week = m[2].split(" · ").filter(Boolean); return; }
    const kv = line.match(/^([^:]{2,20}):\s+(.+)$/);
    if (kv && !/^\d/.test(kv[1])) out.tips.push([kv[1], kv[2]]);
    else out.other.push(line);
  });
  return out;
}

function DayTable({ day }) {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const pick = (en, arv) => (ar ? arv || en : en);
  return (
    <div className="break-inside-avoid">
      {(day.note || day.note_ar) && <p className="mb-2 rounded-lg bg-page px-3 py-2 text-xs text-[#4b5551]">{pick(day.note, day.note_ar)}</p>}
      {day.exercises.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
              <th className="w-8 py-2 text-start font-semibold">#</th>
              <th className="py-2 text-start font-semibold">{t("exercise")}</th>
              <th className="w-14 py-2 text-center font-semibold">{t("sets")}</th>
              <th className="w-16 py-2 text-center font-semibold">{t("reps")}</th>
              <th className="w-14 py-2 text-center font-semibold">{t("rest")}</th>
              <th className="hidden py-2 text-start font-semibold sm:table-cell">{t("howToDoIt")}</th>
            </tr>
          </thead>
          <tbody>
            {day.exercises.map((ex, i) => {
              const tip = pick(ex.tip, ex.tip_ar);
              const target = pick(ex.target, ex.target_ar);
              const names = pick(ex.name, ex.name_ar).split(" + ");
              return (
                <tr key={i} className="border-b border-[#f0f2f1] align-top">
                  <td className="py-2.5 text-base font-extrabold text-[#d4a62a]">{String(i + 1).padStart(2, "0")}</td>
                  <td className="py-2.5 pe-2">
                    {(ex.kind || ex.kind_ar) && <span className="mb-0.5 inline-block rounded bg-[#13213a] px-1.5 py-px text-[10px] font-extrabold text-[#d4a62a]">{pick(ex.kind, ex.kind_ar)}</span>}
                    {names.map((n, j) => <b key={j} className="block text-[14px] leading-snug">{j > 0 && "+ "}{n}</b>)}
                    {(ex.equipment || ex.equipment_ar) && <span className="block text-xs text-muted">{pick(ex.equipment, ex.equipment_ar)}</span>}
                    {(tip || target) && (
                      <span className="mt-1 block text-xs text-[#4b5551] sm:hidden">{target && <b className="text-brand">{target}</b>}{target && tip && " · "}{tip}</span>
                    )}
                  </td>
                  <td className="num py-2.5 text-center text-base font-extrabold">{ex.sets}</td>
                  <td className="num py-2.5 text-center text-base font-extrabold">{timeLabel(String(ex.reps || "").replace(/\s*each$/, ""), lang)}
                    {/each$/.test(String(ex.reps || "")) && <span className="block text-[10px] font-medium text-muted">{t("eachMove")}</span>}</td>
                  <td className="num py-2.5 text-center text-sm font-bold">{timeLabel(ex.rest, lang)}</td>
                  <td className="hidden py-2.5 text-xs sm:table-cell">
                    {target && <span className="mb-1 inline-block rounded-full bg-brand-soft px-2 py-px text-[11px] font-bold text-brand">{target}</span>}
                    {tip && <span className="block leading-relaxed text-[#4b5551]">{tip}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {(day.cardio || day.cardio_ar) && (
        <p className="mt-2 rounded-lg border border-[#d4a62a] px-3 py-2 text-xs"><b className="text-[#b9770e]">{t("workoutCardio")}</b> · {pick(day.cardio, day.cardio_ar)}</p>
      )}
    </div>
  );
}

// A workout as a clear plan: instructions, the week, then one day at a time (all days in the PDF).
export default function WorkoutView({ workout, allDays = false }) {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const [dayIdx, setDayIdx] = useState(0);
  const notes = readNotes(ar ? workout.notes_ar || workout.notes : workout.notes);
  const days = workout.days || [];
  const title = (d) => (ar ? d.title_ar || d.title : d.title);
  const hasGroups = days.some((d) => d.exercises.some((e) => e.kind));

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Dumbbell className="h-5 w-5 text-brand" />{t("workout")}: {ar ? workout.name_ar || workout.name : workout.name}</h2>

      <div className="mb-4 rounded-xl bg-[#13213a] px-4 py-3.5 text-[13px] text-[#d6dbe6]">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#d4a62a]">{t("workoutInstructions")}</div>
        {notes.week.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {notes.week.map((w) => <span key={w} className="rounded-lg bg-[#1c2c4a] px-2 py-1 text-xs">{t("wDay")} {w}</span>)}
          </div>
        )}
        <ul className="space-y-1.5 leading-relaxed">
          {notes.tips.map(([k, v]) => <li key={k}><b className="text-[#d4a62a]">{k}:</b> {v}</li>)}
          <li><b className="text-[#d4a62a]">{t("howToReadTitle")}:</b> {t("howToRead")}</li>
          {hasGroups && <li><b className="text-[#d4a62a]">{t("supersetTitle")}:</b> {t("supersetHow")}</li>}
          <li><b className="text-[#d4a62a]">{t("wProgressTitle")}:</b> {t("progressHow")}</li>
          {notes.other.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </div>

      {allDays ? (
        days.map((d, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <h3 className="mb-1.5 font-bold">{t("wDay")} {i + 1} · {title(d)}</h3>
            <DayTable day={d} />
          </div>
        ))
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {days.map((d, i) => (
              <button key={i} type="button" onClick={() => setDayIdx(i)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${dayIdx === i ? "border-[#13213a] bg-[#13213a] text-white" : "border-line bg-white"}`}>
                {t("wDay")} {i + 1} · {title(d)}
              </button>
            ))}
          </div>
          {days[dayIdx] && <DayTable day={days[dayIdx]} />}
        </>
      )}
      <p className="mt-2 text-xs text-muted">{t("activityGuide")}</p>
    </section>
  );
}
