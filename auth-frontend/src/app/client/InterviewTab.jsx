import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../hooks/useApi";
import { useI18n } from "../../i18n";
import { Badge, Card, Field, Spinner } from "../../ui";
import { INTERVIEW_STEPS, MEASUREMENT_FIELDS, MEASUREMENT_LABELS } from "../interviewConfig";
import { Question, visibleFields } from "../InterviewFields";
import { InterviewLinkCard } from "./OverviewTab";

export default function InterviewTab({ data, reload }) {
  const { t, lang } = useI18n();
  const c = data.client;
  const [answers, setAnswers] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    API.get(`/nutrition/clients/${c.id}/detailed-profile/`).then((r) => setAnswers(r.data)).catch(() => setAnswers({}));
  }, [c.id]);

  const set = (name) => (value) => { setAnswers((a) => ({ ...a, [name]: value })); setDirty(true); };

  const save = async () => {
    setBusy(true);
    try {
      const payload = Object.fromEntries(Object.entries(answers).filter(([k]) => !["id", "user", "client"].includes(k)));
      await API.put(`/nutrition/clients/${c.id}/detailed-profile/`, payload);
      setDirty(false);
      toast.success(t("saved"));
    } catch (err) {
      const errors = err?.response?.data;
      toast.error(errors && typeof errors === "object" ? Object.keys(errors).join(", ") : t("error"));
    } finally {
      setBusy(false);
    }
  };

  const markReviewed = async () => {
    await API.post(`/nutrition/clients/${c.id}/interview-reviewed/`, {});
    reload();
  };

  if (!answers) return <Spinner label={t("loading")} />;
  const steps = INTERVIEW_STEPS.filter((s) => !s.onlyFor || s.onlyFor === c.gender);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {data.interview.status === "submitted" && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4">
            <ClipboardList className="h-5 w-5 text-warn" />
            <span className="flex-1 text-sm font-semibold text-[#5a4a2c]">{t("istatus_submitted")}</span>
            <button type="button" className="btn-primary" onClick={markReviewed}><CheckCircle2 className="h-4 w-4" />{t("markReviewed")}</button>
          </div>
        )}
        {steps.map((step) => (
          <Card key={step.key} title={step[lang] || step.en}>
            <div className="space-y-5">
              {visibleFields(step, answers).map((field) => (
                <Question key={field.name} field={field} value={answers[field.name]} onChange={set(field.name)} />
              ))}
            </div>
          </Card>
        ))}
        <Card title={t("measurements")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MEASUREMENT_FIELDS.map((f) => (
              <Field key={f} label={`${MEASUREMENT_LABELS[f][lang === "ar" ? 0 : 1]}${f === "waist_to_hip_ratio" ? "" : ` (${t("cm")})`}`}>
                <input className="input num" type="number" step="0.1" value={answers[f] ?? ""} onChange={(e) => set(f)(e.target.value === "" ? null : Number(e.target.value))} />
              </Field>
            ))}
          </div>
        </Card>
      </div>
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Badge tone={dirty ? "warn" : "ok"}>{dirty ? "●" : "✓"}</Badge>
            <span className="text-sm text-muted">{t("answeredFields", { n: data.interview.answered_fields })}</span>
          </div>
          <button type="button" className="btn-primary w-full" disabled={busy || !dirty} onClick={save}>{busy ? t("saving") : t("save")}</button>
        </Card>
        <InterviewLinkCard data={data} reload={reload} />
      </div>
    </div>
  );
}
