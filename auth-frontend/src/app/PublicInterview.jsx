import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Lock } from "lucide-react";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Spinner } from "../ui";
import { LanguageSwitch } from "./AppLayout";
import { INTERVIEW_STEPS } from "./interviewConfig";
import { Question, visibleFields } from "./InterviewFields";

export default function PublicInterview() {
  const { token } = useParams();
  const { t, lang } = useI18n();
  const [info, setInfo] = useState(null);
  const [state, setState] = useState("loading"); // loading | intro | form | done | notfound | already
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get(`/public/interview/${token}/`)
      .then((r) => { setInfo(r.data); setState(r.data.submitted ? "already" : "intro"); })
      .catch(() => setState("notfound"));
  }, [token]);

  const steps = useMemo(() => INTERVIEW_STEPS.filter((s) => !s.onlyFor || s.onlyFor === info?.gender), [info]);
  const step = steps[stepIndex];
  const setAnswer = (name) => (value) => setAnswers((a) => ({ ...a, [name]: value }));

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const clean = Object.fromEntries(Object.entries(answers).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && !v.length)));
      await API.post(`/public/interview/${token}/`, { answers: clean });
      setState("done");
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err?.response?.status === 409 ? t("piAlready") : t("error"));
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <header className="mb-6 flex items-center gap-3">
      {info?.logo_url ? <img src={info.logo_url} alt="" className="h-11 w-11 rounded-xl border border-line bg-white object-contain" /> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{info?.clinic_name || t("piTitle")}</div>
        {info?.clinic_name && <div className="text-xs text-muted">{t("piTitle")}</div>}
      </div>
      <LanguageSwitch className="w-44" />
    </header>
  );

  return (
    <div className="min-h-screen bg-page px-4 py-6">
      <div className="mx-auto max-w-xl">
        {header}
        {state === "loading" && <Spinner label={t("loading")} />}
        {state === "notfound" && <div className="card p-8 text-center text-muted">{t("piNotFound")}</div>}
        {(state === "already" || state === "done") && (
          <div className="card p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-ok" />
            <h1 className="mt-3 text-xl font-bold">{t("piThanks")}</h1>
            <p className="mt-2 text-sm text-muted">{state === "done" ? t("piThanksBody") : t("piAlready")}</p>
          </div>
        )}
        {state === "intro" && (
          <div className="card p-8">
            <h1 className="text-2xl font-bold">{t("piHello", { name: info.first_name })}</h1>
            <p className="mt-3 leading-relaxed text-muted">{t("piIntro")}</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted"><Lock className="h-3.5 w-3.5" />{t("piPrivacy")}</p>
            <button type="button" className="btn-primary mt-6 w-full py-3" onClick={() => setState("form")}>{t("piStart")}</button>
          </div>
        )}
        {state === "form" && step && (
          <div className="card p-6">
            <div className="mb-1 text-xs font-semibold text-muted">{t("piStep", { n: stepIndex + 1, total: steps.length })}</div>
            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-page">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
            </div>
            <h2 className="mb-5 text-lg font-bold">{step[lang] || step.en}</h2>
            <div className="space-y-6">
              {visibleFields(step, answers, { publicOnly: true }).map((field) => (
                <Question key={field.name} field={field} value={answers[field.name]} onChange={setAnswer(field.name)} />
              ))}
            </div>
            {error && <p className="mt-4 text-sm font-semibold text-bad">{error}</p>}
            <div className="mt-8 flex gap-2">
              {stepIndex > 0 && <button type="button" className="btn-secondary" onClick={() => { setStepIndex(stepIndex - 1); window.scrollTo(0, 0); }}>{t("back")}</button>}
              {stepIndex < steps.length - 1 ? (
                <button type="button" className="btn-primary ms-auto px-8" onClick={() => { setStepIndex(stepIndex + 1); window.scrollTo(0, 0); }}>{t("next")}</button>
              ) : (
                <button type="button" className="btn-primary ms-auto px-8" disabled={busy} onClick={submit}>{busy ? t("saving") : t("piSubmit")}</button>
              )}
            </div>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-muted" dir="ltr">Diet in a Minute</p>
      </div>
    </div>
  );
}
