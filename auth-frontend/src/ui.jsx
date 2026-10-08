import { useEffect } from "react";
import { Check, Loader2, Sparkles, TriangleAlert, X } from "lucide-react";
import { useI18n } from "./i18n";

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-6 flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        {back}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, icon, actions, children, className = "", tone }) {
  const toneClass =
    tone === "ai" ? "border-ai/20 bg-gradient-to-b from-ai-soft/70 to-white"
      : tone === "warn" ? "border-warn/30 bg-warn-soft"
      : "";
  return (
    <section className={`card p-5 ${toneClass} ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center gap-2">
          {icon}
          {title && <h3 className={`text-sm font-bold ${tone === "ai" ? "text-ai" : tone === "warn" ? "text-warn" : ""}`}>{title}</h3>}
          {actions && <div className="ms-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function Empty({ children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
      <p>{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-page text-muted",
    brand: "bg-brand-soft text-brand",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    ai: "bg-ai-soft text-ai",
  };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function DraftBadge() {
  const { t } = useI18n();
  return <Badge tone="warn"><TriangleAlert className="h-3 w-3" />{t("draftBadge")}</Badge>;
}

export function TestModeBadge() {
  const { t } = useI18n();
  return <Badge tone="warn">{t("testMode")}</Badge>;
}

export function AIBadge({ children }) {
  return <Badge tone="ai"><Sparkles className="h-3 w-3" />{children}</Badge>;
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            value === tab.value ? "border-brand text-brand" : "border-transparent text-muted hover:text-brand-ink"
          }`}
        >
          {tab.label}
          {tab.badge ? <span className="ms-2 rounded-full bg-warn px-1.5 text-[11px] text-white">{tab.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function StepBar({ steps, current }) {
  return (
    <div className="card mb-5 flex items-center gap-2 overflow-x-auto px-4 py-3">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <div key={label} className="flex flex-1 items-center gap-2 whitespace-nowrap">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                done ? "border-ok bg-ok text-white" : active ? "border-brand bg-brand text-white" : "border-line text-muted"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={`text-sm ${active ? "font-bold text-brand" : done ? "font-medium" : "text-muted"}`}>{label}</span>
            {index < steps.length - 1 && <span className={`mx-2 h-0.5 min-w-6 flex-1 ${done ? "bg-ok" : "bg-line"}`} />}
          </div>
        );
      })}
    </div>
  );
}

// Status of a value against its target: within 5% = on, within 15% = near, else off.
export function targetStatus(value, target) {
  if (!target) return "none";
  const ratio = value / target;
  if (ratio >= 0.95 && ratio <= 1.05) return "on";
  if (ratio >= 0.85 && ratio <= 1.15) return "near";
  return "off";
}

const STATUS_COLOR = { on: "#2f9e6e", near: "#b7791f", off: "#c2410c", none: "#9aa3a0" };

export function CalorieRing({ value, target, size = 120 }) {
  const { t, num } = useI18n();
  const radius = size / 2 - 9;
  const circumference = 2 * Math.PI * radius;
  const ratio = target ? Math.min(value / target, 1) : 0;
  const status = targetStatus(value, target);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#edf0ee" strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={STATUS_COLOR[status]} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray .4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-tight">
        <div>
          <div className="num text-xl font-bold">{num(value)}</div>
          <div className="text-[11px] text-muted">{t("ofTarget", { target: num(target) })} {t("kcal")}</div>
        </div>
      </div>
    </div>
  );
}

export function MacroBar({ label, value, target, unit }) {
  const { t, num } = useI18n();
  const status = targetStatus(value, target);
  const width = target ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs">
        <b>{label}</b>
        <span className="num text-muted">{num(value)} / {num(target)} {unit || t("g")}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#edf0ee]">
        <i className="block h-full rounded-full transition-all" style={{ width: `${width}%`, background: STATUS_COLOR[status] }} />
      </div>
    </div>
  );
}

export function StatusPill({ totals, targets }) {
  const { t } = useI18n();
  const statuses = ["protein", "carb", "fat"].map((m) => targetStatus(totals[m], targets[m]));
  const overall = statuses.every((s) => s === "on") ? "on" : statuses.some((s) => s === "off") ? "off" : "near";
  const tone = { on: "ok", near: "warn", off: "bad" }[overall];
  const label = { on: t("onTarget"), near: t("nearTarget"), off: t("offTarget") }[overall];
  return <Badge tone={tone}>● {label}</Badge>;
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center">
          <h3 className="text-base font-bold">{title}</h3>
          <button type="button" className="btn-ghost ms-auto p-1.5" onClick={onClose} aria-label="close"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Avatar({ name, size = 36 }) {
  const initials = (name || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
}

export function SafetyFlags({ flags }) {
  const { t, lang } = useI18n();
  if (!flags?.length) return <p className="text-sm text-muted">{t("noFlags")}</p>;
  return (
    <ul className="space-y-2">
      {flags.map((flag) => (
        <li key={flag.code} className="flex gap-2 text-sm leading-relaxed text-[#5a4a2c]">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <span>{lang === "ar" ? flag.ar : flag.en}</span>
        </li>
      ))}
    </ul>
  );
}

// Turn an API error into a message for the dietitian.
export function apiError(err, t) {
  const data = err?.response?.data;
  if (data?.error === "excluded_foods") return t("excludedBlocked", { foods: (data.foods || []).join("، ") });
  if (data?.detail && typeof data.detail === "string") return data.detail;
  return t("error");
}
