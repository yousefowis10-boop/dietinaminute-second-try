import { useI18n } from "../i18n";
import { optionLabel } from "./interviewConfig";

// Renders one interview question. Used on the client's link and inside the app.
export function Question({ field, value, onChange }) {
  const { lang, t } = useI18n();
  const label = field[lang] || field.en;
  const choice = (v, selected, onClick) => (
    <button key={v} type="button" onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${selected ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line bg-white hover:border-brand/40"}`}>
      {optionLabel(v, lang)}
    </button>
  );
  let control;
  switch (field.type) {
    case "long":
      control = <textarea className="input" rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "option":
      control = field.options.length > 7 ? (
        <select className="input" value={value || ""} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {field.options.map((o) => <option key={o} value={o}>{optionLabel(o, lang)}</option>)}
        </select>
      ) : <div className="flex flex-wrap gap-2">{field.options.map((o) => choice(o, value === o, () => onChange(value === o ? null : o)))}</div>;
      break;
    case "checkbox": {
      const list = Array.isArray(value) ? value : [];
      control = (
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => choice(o, list.includes(o), () => onChange(list.includes(o) ? list.filter((x) => x !== o) : [...list, o])))}
        </div>
      );
      break;
    }
    case "boolean":
      control = (
        <div className="flex gap-2">
          {choice(t("yes"), value === true, () => onChange(value === true ? null : true))}
          {choice(t("no"), value === false, () => onChange(value === false ? null : false))}
        </div>
      );
      break;
    case "number":
      control = <input className="input num max-w-[10rem]" type="number" min="0" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />;
      break;
    case "time":
    case "date":
      control = <input className="input max-w-[12rem]" type={field.type} dir="ltr" value={value || ""} onChange={(e) => onChange(e.target.value || null)} />;
      break;
    default:
      control = <input className="input" type={field.type === "email" ? "email" : "text"} dir={field.type === "email" ? "ltr" : undefined} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{label}</div>
      {control}
    </div>
  );
}

export function visibleFields(step, answers, { publicOnly = false } = {}) {
  return step.fields.filter((f) => (!publicOnly || f.public !== false) && (!f.showIf || answers[f.showIf] === true));
}
