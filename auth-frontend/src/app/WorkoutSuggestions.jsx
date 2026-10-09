import { useEffect, useState } from "react";
import { Dumbbell, Footprints } from "lucide-react";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Card, Modal, Spinner } from "../ui";
import { WorkoutBlock } from "./PlanSheet";

const GOALS = ["fat_loss", "muscle_gain", "muscle_focus"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const PLACES = ["gym", "home", "none"];

// The 3 workouts that best fit the client, shown on the plan sheet until one is added.
export default function WorkoutSuggestions({ planId, clientName, workouts, onAttach }) {
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);
  const [change, setChange] = useState(null); // {goal, level, place} the dietitian picked
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const params = change ? { ...change } : {};
    API.get(`/nutrition/plan/${planId}/workout-suggestions/`, { params }).then((r) => setData(r.data)).catch(() => setData({ error: true }));
  }, [planId, change]);

  if (!data) return <Spinner label={t("loading")} />;
  if (data.error) return null;
  const p = data.profile;
  const place = p.place || "none";
  const pick = (key, value) => setChange({ goal: p.goal, level: p.level, place, [key]: value });
  const full = (id) => workouts.find((w) => w.id === id);
  const select = (key, options, value, prefix) => (
    <select className="input w-auto py-1 text-xs" value={value} onChange={(e) => pick(key, e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{t(`${prefix}${o}`)}</option>)}
    </select>
  );

  return (
    <Card title={t("suggestedWorkoutsFor", { name: clientName.split(" ")[0] })} icon={<Dumbbell className="h-4 w-4 text-brand" />}
      actions={<span className="text-xs text-muted">{t(p.source === "interview" ? "fromInterview" : p.source === "changed" ? "changedByYou" : "guessed")}</span>}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {select("goal", GOALS, p.goal, "goal_")}
        {place !== "none" && select("level", LEVELS, p.level, "level_")}
        {select("place", PLACES, place, "wplace_")}
      </div>
      {place === "none" ? (
        <div className="flex items-center gap-3 rounded-xl bg-page px-4 py-3 text-sm">
          <Footprints className="h-5 w-5 text-brand" />{t("walkingGoal")}
        </div>
      ) : data.workouts.length === 0 ? <p className="text-sm text-muted">{t("noWorkoutMatch")}</p> : (
        <div className="grid gap-3 md:grid-cols-3">
          {data.workouts.map((w, i) => (
            <div key={w.id} className={`flex flex-col overflow-hidden rounded-xl border ${i === 0 ? "border-2 border-brand" : "border-line"}`}>
              <div className="bg-[#13213a] px-3.5 py-3 text-white">
                <div className="text-[10.5px] font-bold tracking-widest text-[#d4a62a]">{i === 0 ? t("bestMatch") : t(`place_${w.place}`)}</div>
                <div className="mt-0.5 text-sm font-bold leading-snug">{lang === "ar" ? w.name_ar || w.name : w.name}</div>
              </div>
              <div className="flex-1 space-y-1 px-3.5 py-2.5 text-xs text-muted">
                <div className="flex justify-between"><span>{t("trainingDays")}</span><b className="text-brand-ink">{w.training_days}</b></div>
                {w.sets_reps && <div className="flex justify-between"><span>{t("setsReps")}</span><b className="num text-brand-ink" dir="ltr">{w.sets_reps.replace("each", "")}</b></div>}
                <div className="flex justify-between"><span>{t("level")}</span><b className="text-brand-ink">{t(`level_${w.level}`)} · {t(`place_${w.place}`)}</b></div>
              </div>
              <div className="flex gap-1.5 px-3.5 pb-3">
                <button type="button" className="btn-secondary flex-1 px-2 py-1.5 text-xs" onClick={() => setOpen(full(w.id))} disabled={!full(w.id)}>{t("preview")}</button>
                <button type="button" className="btn-primary flex-1 px-2 py-1.5 text-xs" onClick={() => onAttach(w.id)}>{t("addToPlan")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? (lang === "ar" ? open.name_ar || open.name : open.name) : ""} wide>
        {open && <WorkoutBlock workout={open} />}
        <div className="mt-4 flex justify-end"><button type="button" className="btn-primary" onClick={() => { onAttach(open.id); setOpen(null); }}>{t("addToPlan")}</button></div>
      </Modal>
    </Card>
  );
}
