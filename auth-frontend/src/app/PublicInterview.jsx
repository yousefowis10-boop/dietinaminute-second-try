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
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get(`/public/interview/${token}/`)
      .then((r) => { setInfo(r.data); setState(r.data.submitted ? "already" : "intro"); })
      .catch(() => setState("notfound"));
  }, [token]);

  const steps = useMemo(() => INTERVIEW_STEPS.filter((s) => !s.onlyFor || s.onlyFor === info?.gender), [info]);
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
      <div className="mx-auto max-w-3xl">
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
        {state === "form" && (
          <div className="space-y-4">
            {steps.map((st, i) => (
              <section key={st.key} className="card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-line bg-[#fafbfa] px-5 py-3.5">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm font-bold text-white">{i + 1}</span>
                  <h2 className="text-base font-bold">{st[lang] || st.en}</h2>
                </div>
                <div className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
                  {visibleFields(st, answers, { publicOnly: true }).map((field) => (
                    <Question key={field.name} field={field} value={answers[field.name]} onChange={setAnswer(field.name)} foods={info?.foods || []}
                      blockedFoods={field.type === "foods" ? ["liked_foods", "never_foods", "less_foods"].filter((n) => n !== field.name).flatMap((n) => answers[n] || []) : []} />
                  ))}
                </div>
              </section>
            ))}
            {error && <p className="text-sm font-semibold text-bad">{error}</p>}
            <div className="sticky bottom-3 rounded-2xl border border-line bg-white p-3 shadow-lg">
              <button type="button" className="btn-primary w-full py-3" disabled={busy} onClick={submit}>{busy ? t("saving") : t("piSendAll")}</button>
            </div>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-muted" dir="ltr">Diet in a Minute</p>
      </div>
    </div>
  );
}
