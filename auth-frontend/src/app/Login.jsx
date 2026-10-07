import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import API from "../hooks/useApi";
import { Field } from "../ui";
import { LanguageSwitch } from "./AppLayout";

export default function Login({ mode: initialMode = "login" }) {
  const { setUserFromLogin } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const login = async (email, password) => {
    const res = await API.post("/auth/login/", { username: email.trim().toLowerCase(), password });
    localStorage.setItem("access", res.data.access);
    localStorage.setItem("refresh", res.data.refresh);
    await setUserFromLogin();
    navigate("/dashboard");
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await API.post("/auth/register/", {
          email: form.email.trim().toLowerCase(), password: form.password,
          first_name: form.first_name, last_name: form.last_name,
        });
      }
      await login(form.email, form.password);
    } catch (err) {
      const data = err?.response?.data;
      const message = mode === "login" ? t("loginFailed") : (data && typeof data === "object" ? Object.values(data).flat().join(" ") : t("error"));
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand p-12 text-white lg:flex lg:flex-col">
        <div className="text-lg font-bold" dir="ltr">Diet in a Minute</div>
        <div className="mt-auto max-w-md">
          <p className="text-3xl font-bold leading-snug">{t("tagline")}</p>
          <p className="mt-4 text-white/75">{t("loginSub")}</p>
        </div>
        <div className="absolute -bottom-24 -end-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -top-16 end-24 h-40 w-40 rounded-full bg-white/5" />
      </div>
      <div className="flex flex-col p-6 sm:p-10">
        <LanguageSwitch className="ms-auto w-48" />
        <form onSubmit={submit} className="m-auto w-full max-w-sm space-y-4 py-10">
          <div className="mb-2">
            <div className="mb-6 font-bold text-brand lg:hidden" dir="ltr">Diet in a Minute</div>
            <h1 className="text-2xl font-bold">{mode === "login" ? t("welcomeBack") : t("signup")}</h1>
            <p className="mt-1 text-sm text-muted">{mode === "login" ? t("loginSub") : t("signupSub")}</p>
          </div>
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("firstName")}><input className="input" required value={form.first_name} onChange={set("first_name")} /></Field>
              <Field label={t("lastName")}><input className="input" value={form.last_name} onChange={set("last_name")} /></Field>
            </div>
          )}
          <Field label={t("email")}>
            <input className="input" type="email" dir="ltr" required autoComplete="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label={t("password")}>
            <input className="input" type="password" dir="ltr" required minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={set("password")} />
          </Field>
          <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
            {busy ? t("loading") : mode === "login" ? t("login") : t("signup")}
          </button>
          <p className="text-center text-sm text-muted">
            {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
            <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? t("signup") : t("login")}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
