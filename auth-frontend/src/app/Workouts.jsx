import { useEffect, useMemo, useState } from "react";
import { Copy, Dumbbell, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Badge, Card, DraftBadge, Field, Modal, PageHeader, Spinner } from "../ui";
import { timeLabel } from "./foodUtils";

const GOALS = ["fat_loss", "muscle_gain", "muscle_focus", "general_health"];
const LEVELS = ["beginner", "intermediate", "advanced", "all_levels"];
const PLACES = ["home", "gym"];
const blankExercise = () => ({ name: "", name_ar: "", sets: "3", reps: "12", rest: "60s" });
const blankWorkout = () => ({ name: "", name_ar: "", goal: "fat_loss", level: "beginner", place: "home", is_safe_version: false, notes: "", notes_ar: "", days: [{ title: "Day 1", title_ar: "اليوم 1", exercises: [blankExercise()] }] });

function WorkoutEditor({ initial, onClose, onSaved }) {
  const { t } = useI18n();
  const [w, setW] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setW((x) => ({ ...x, [key]: value }));
  const setDay = (di, patch) => setW((x) => ({ ...x, days: x.days.map((d, i) => (i === di ? { ...d, ...patch } : d)) }));
  const setEx = (di, ei, patch) => setDay(di, { exercises: w.days[di].exercises.map((e, i) => (i === ei ? { ...e, ...patch } : e)) });

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...w, days: w.days.map((d) => ({ ...d, exercises: d.exercises.filter((e) => e.name || e.name_ar) })) };
      if (w.id && !w.is_shared) await API.put(`/nutrition/workouts/${w.id}/`, payload);
      else await API.post("/nutrition/workouts/", payload);
      toast.success(t("workoutSaved"));
      onSaved();
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={w.id && !w.is_shared ? t("edit") : t("newWorkout")} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name (English)"><input className="input" dir="ltr" value={w.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="الاسم (عربي)"><input className="input" dir="rtl" value={w.name_ar} onChange={(e) => set("name_ar", e.target.value)} /></Field>
        <Field label={t("goal")}><select className="input" value={w.goal} onChange={(e) => set("goal", e.target.value)}>{GOALS.map((g) => <option key={g} value={g}>{t(`goal_${g}`)}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label=" "><select className="input" value={w.level} onChange={(e) => set("level", e.target.value)}>{LEVELS.map((g) => <option key={g} value={g}>{t(`level_${g}`)}</option>)}</select></Field>
          <Field label=" "><select className="input" value={w.place} onChange={(e) => set("place", e.target.value)}>{PLACES.map((g) => <option key={g} value={g}>{t(`place_${g}`)}</option>)}</select></Field>
        </div>
        <Field label="Notes (English)"><textarea className="input" dir="ltr" rows={2} value={w.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <Field label="ملاحظات (عربي)"><textarea className="input" dir="rtl" rows={2} value={w.notes_ar} onChange={(e) => set("notes_ar", e.target.value)} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={w.is_safe_version} onChange={(e) => set("is_safe_version", e.target.checked)} />{t("safeVersion")}</label>
      <div className="mt-4 space-y-4">
        {w.days.map((day, di) => (
          <div key={di} className="rounded-xl border border-line p-3">
            <div className="mb-2 grid grid-cols-2 gap-2">
              <input className="input" dir="ltr" placeholder={t("dayTitle")} value={day.title} onChange={(e) => setDay(di, { title: e.target.value })} />
              <input className="input" dir="rtl" placeholder={t("dayTitle")} value={day.title_ar} onChange={(e) => setDay(di, { title_ar: e.target.value })} />
            </div>
            {day.exercises.map((ex, ei) => (
              <div key={ei} className="mb-1.5 grid grid-cols-[1fr_1fr_3.5rem_4.5rem_4rem_2rem] gap-1.5">
                <input className="input px-2 text-xs" dir="ltr" placeholder={t("exercise")} value={ex.name} onChange={(e) => setEx(di, ei, { name: e.target.value })} />
                <input className="input px-2 text-xs" dir="rtl" placeholder={t("exercise")} value={ex.name_ar} onChange={(e) => setEx(di, ei, { name_ar: e.target.value })} />
                <input className="input px-2 text-xs" placeholder={t("sets")} value={ex.sets} onChange={(e) => setEx(di, ei, { sets: e.target.value })} />
                <input className="input px-2 text-xs" placeholder={t("reps")} value={ex.reps} onChange={(e) => setEx(di, ei, { reps: e.target.value })} />
                <input className="input px-2 text-xs" placeholder={t("rest")} value={ex.rest} onChange={(e) => setEx(di, ei, { rest: e.target.value })} />
                <button type="button" className="btn-ghost p-1 hover:text-bad" onClick={() => setDay(di, { exercises: day.exercises.filter((_, i) => i !== ei) })}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <button type="button" className="btn-ghost mt-1 px-2 py-1 text-xs" onClick={() => setDay(di, { exercises: [...day.exercises, blankExercise()] })}><Plus className="h-3.5 w-3.5" />{t("addExercise")}</button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => set("days", [...w.days, { title: `Day ${w.days.length + 1}`, title_ar: `اليوم ${w.days.length + 1}`, exercises: [blankExercise()] }])}><Plus className="h-4 w-4" />{t("addDay")}</button>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button type="button" className="btn-primary" disabled={busy || !(w.name || w.name_ar)} onClick={save}>{busy ? t("saving") : t("save")}</button>
      </div>
    </Modal>
  );
}

export default function Workouts() {
  const { t, lang } = useI18n();
  const [workouts, setWorkouts] = useState(null);
  const [filter, setFilter] = useState({ goal: "", level: "", place: "" });
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(null);

  const load = () => API.get("/nutrition/workouts/").then((r) => setWorkouts(r.data));
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (workouts || []).filter((w) => Object.entries(filter).every(([k, v]) => !v || w[k] === v)
      && (!q || (w.name || "").toLowerCase().includes(q) || (w.name_ar || "").includes(q)));
  }, [workouts, filter, query]);
  const ar = lang === "ar";
  const remove = async (w) => {
    if (!window.confirm(t("confirmDelete"))) return;
    await API.delete(`/nutrition/workouts/${w.id}/`);
    load();
  };

  return (
    <>
      <PageHeader title={t("workoutsTitle")} actions={<button type="button" className="btn-primary" onClick={() => setEditing(blankWorkout())}><Plus className="h-4 w-4" />{t("newWorkout")}</button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input ps-9" placeholder={t("searchWorkouts")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {[["goal", GOALS, "allGoals", "goal_"], ["level", LEVELS, "allLevels", "level_"], ["place", PLACES, "allPlaces", "place_"]].map(([key, opts, all, prefix]) => (
          <select key={key} className="input w-auto" value={filter[key]} onChange={(e) => setFilter((f) => ({ ...f, [key]: e.target.value }))}>
            <option value="">{t(all)}</option>
            {opts.map((o) => <option key={o} value={o}>{t(`${prefix}${o}`)}</option>)}
          </select>
        ))}
      </div>
      {!workouts ? <Spinner label={t("loading")} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((w) => (
            <Card key={w.id} title={ar ? w.name_ar || w.name : w.name} icon={w.is_safe_version ? <ShieldCheck className="h-4 w-4 text-ok" /> : <Dumbbell className="h-4 w-4 text-brand" />}>
              <div className="mb-2 flex flex-wrap gap-1.5">
                <Badge tone="brand">{t(`goal_${w.goal}`)}</Badge><Badge>{t(`level_${w.level}`)}</Badge><Badge>{t(`place_${w.place}`)}</Badge>
                {w.is_draft && <DraftBadge />}
                {w.is_shared && <Badge>{t("sharedLibrary")}</Badge>}
              </div>
              <p className="mb-3 line-clamp-2 text-sm text-muted">{ar ? w.notes_ar || w.notes : w.notes}</p>
              <div className="flex gap-1.5">
                <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => setOpen(w)}>{t("open")}</button>
                {w.is_shared ? (
                  <button type="button" className="btn-ghost px-2.5 py-1.5" title={t("edit")} onClick={() => setEditing({ ...w, id: undefined, is_shared: false })}><Copy className="h-4 w-4" /></button>
                ) : (
                  <>
                    <button type="button" className="btn-ghost px-2.5 py-1.5" onClick={() => setEditing(w)}><Pencil className="h-4 w-4" /></button>
                    <button type="button" className="btn-ghost px-2.5 py-1.5 hover:text-bad" onClick={() => remove(w)}><Trash2 className="h-4 w-4" /></button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <WorkoutEditor initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? (ar ? open.name_ar || open.name : open.name) : ""} wide>
        {open && (
          <div className="space-y-3">
            <p className="whitespace-pre-line text-sm text-muted">{ar ? open.notes_ar || open.notes : open.notes}</p>
            {open.days.map((d, di) => (
              <div key={di} className="rounded-xl border border-line p-3">
                <div className="mb-1 font-bold">{ar ? d.title_ar || d.title : d.title}</div>
                {(d.note || d.note_ar) && <p className="mb-2 text-xs text-muted">{ar ? d.note_ar || d.note : d.note}</p>}
                <ul className="space-y-2 text-sm">
                  {d.exercises.map((e, ei) => (
                    <li key={ei} className="flex gap-3">
                      <div className="flex-1">
                        {(e.kind || e.kind_ar) && <span className="me-1 rounded-full bg-brand-soft px-1.5 py-px text-[10px] font-bold text-brand">{ar ? e.kind_ar || e.kind : e.kind}</span>}
                        {ar ? e.name_ar || e.name : e.name}
                        {(e.target || e.target_ar || e.tip || e.tip_ar) && (
                          <div className="text-xs text-muted">
                            {[ar ? e.equipment_ar || e.equipment : e.equipment, ar ? e.target_ar || e.target : e.target].filter(Boolean).join(" · ")}
                            {(e.tip || e.tip_ar) && <> — {ar ? e.tip_ar || e.tip : e.tip}</>}
                          </div>
                        )}
                      </div>
                      <span className="num whitespace-nowrap text-muted">{e.sets} × {timeLabel(e.reps, lang)} · {timeLabel(e.rest, lang)}</span>
                    </li>
                  ))}
                </ul>
                {(d.cardio || d.cardio_ar) && <p className="mt-2 text-xs"><b>{t("workoutCardio")}:</b> {ar ? d.cardio_ar || d.cardio : d.cardio}</p>}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
