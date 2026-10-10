import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Search, Stethoscope, Trash2, UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";
import API, { cachedGet } from "../hooks/useApi";
import { MEAL_ORDER, useI18n } from "../i18n";
import { DraftBadge, Empty, FoldArrow, InfoTip, Modal, PageHeader, Spinner, useFold } from "../ui";
import { amountOf, sharesFor, tplDesc, tplName, unitLabel } from "./foodUtils";
import { COND_NAME, COND_TIPS, CONDITIONS } from "./medicalTips";

const MAIN = { meal1: "nm_breakfast", meal2: "nm_lunch", meal3: "nm_dinner" };

// A template: tap to see its meals with portions, totals and (for medical ones) what to include / avoid.
function TemplateCard({ tpl, foods, onUse, onDelete }) {
  const { t, lang, num, fmtDate, foodName } = useI18n();
  const [open, setOpen] = useState(false);
  const rows = tpl.items.map((i) => ({ ...i, food: foods[i.food_id] })).filter((i) => i.food);
  const tot = rows.reduce((s, i) => ({ p: s.p + i.food.protein * i.quantity, c: s.c + i.food.carb * i.quantity, f: s.f + i.food.fat * i.quantity }), { p: 0, c: 0, f: 0 });
  const kcal = tot.p * 4 + tot.c * 4 + tot.f * 9;
  const meals = MEAL_ORDER.map((m) => [m, rows.filter((i) => (i.meals || []).includes(m))]).filter(([, list]) => list.length);
  const unassigned = rows.filter((i) => !(i.meals || []).length);
  const line = (i, m) => {
    const share = m ? sharesFor({ meals: i.meals, shares: i.shares })[m] ?? 1 : 1;
    return (
      <li key={`${i.food_id}-${m}`} className="flex items-baseline gap-2 py-1 text-[13.5px]">
        <span className="num min-w-[84px] font-bold text-brand-ink">{num(amountOf(i.food, i.quantity * share), 1)} {unitLabel(i.food, lang)}</span>
        <span>{foodName(i.food)}</span>
      </li>
    );
  };
  return (
    <section className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-start hover:bg-[#fafbfa]">
        {tpl.is_medical && <Stethoscope className="h-4 w-4 shrink-0 text-brand" />}
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{tplName(tpl, lang)}</span>
          <span className="num text-xs text-muted">{num(kcal)} {t("kcal")} · {t("pShort")} {num(tot.p)} · {t("cShort")} {num(tot.c)} · {t("fShort")} {num(tot.f)} · {t("foodsCount", { n: rows.length })}</span>
        </span>
        {tpl.is_draft && <DraftBadge />}
        <FoldArrow open={open} />
      </button>
      {open && (
        <div className="border-t border-line px-5 pb-5 pt-4">
          {tplDesc(tpl, lang) && <p className="mb-4 rounded-xl bg-page px-3.5 py-2.5 text-sm">{tplDesc(tpl, lang)}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {meals.map(([m, list]) => (
              <div key={m} className="rounded-xl border border-line px-3.5 py-2.5">
                <div className="mb-1 text-xs font-bold text-muted">{t(MAIN[m] || m)}</div>
                <ul>{list.map((i) => line(i, m))}</ul>
              </div>
            ))}
            {unassigned.length > 0 && (
              <div className="rounded-xl border border-dashed border-line px-3.5 py-2.5"><ul>{unassigned.map((i) => line(i, null))}</ul></div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!tpl.is_shared && <span className="text-xs text-muted">{fmtDate(tpl.created_at)}</span>}
            {onDelete && <button type="button" className="btn-ghost px-2.5 py-1.5 text-sm hover:text-bad" onClick={() => onDelete(tpl)}><Trash2 className="h-4 w-4" />{t("delete")}</button>}
            <button type="button" className="btn-primary ms-auto" onClick={() => onUse(tpl)}><UserPlus className="h-4 w-4" />{t("useForClient")}</button>
          </div>
        </div>
      )}
    </section>
  );
}

// One folding group (My templates, or one health issue).
function Group({ id, title, icon, count, tips, children }) {
  const { t, lang } = useI18n();
  const [open, toggle] = useFold(id);
  const tip = tips?.[lang] || tips?.en;
  return (
    <section className="mb-4">
      <button type="button" onClick={() => toggle()} aria-expanded={open} className="mb-2 flex w-full items-center gap-2 py-1 text-start">
        {icon}<h2 className="font-bold">{title}</h2><span className="num rounded-full bg-page px-2 text-xs font-bold text-muted">{count}</span><FoldArrow open={open} />
      </button>
      {open && (
        <>
          {tip && (
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-ok-soft px-4 py-3 text-[13px]"><div className="mb-1 flex items-center gap-1.5 font-bold text-ok"><Check className="h-4 w-4" />{t("tipsGood")}</div>
                <ul className="list-disc space-y-0.5 ps-5">{tip.good.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div className="rounded-xl bg-bad-soft px-4 py-3 text-[13px]"><div className="mb-1 flex items-center gap-1.5 font-bold text-bad"><X className="h-4 w-4" />{t("tipsAvoid")}</div>
                <ul className="list-disc space-y-0.5 ps-5">{tip.avoid.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
          )}
          <div className="space-y-3">{children}</div>
        </>
      )}
    </section>
  );
}

// Pick the client a template is used for; opens the plan builder with the template already filled in.
function ClientPicker({ tpl, onClose }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { if (tpl) API.get("/nutrition/clients/").then((r) => setClients(r.data)).catch(() => setClients([])); }, [tpl]);
  const shown = (clients || []).filter((c) => !q || (c.name || "").toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal open={Boolean(tpl)} onClose={onClose} title={t("chooseClient")}>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input autoFocus className="input ps-9" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!clients ? <Spinner label={t("loading")} /> : (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto">
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" className="w-full px-2 py-2.5 text-start text-sm font-medium hover:bg-page"
                onClick={() => navigate(`/dashboard/clients/${c.id}/plans/new?template=${tpl.id}`)}>{c.name}</button>
            </li>
          ))}
          {!shown.length && <li className="px-2 py-3 text-sm text-muted">{t("noMatch")}</li>}
        </ul>
      )}
    </Modal>
  );
}

export default function Templates() {
  const { t, lang } = useI18n();
  const [templates, setTemplates] = useState(null);
  const [foods, setFoods] = useState({});
  const [useTpl, setUseTpl] = useState(null);

  const load = () => API.get("/nutrition/templates/").then((r) => setTemplates(r.data));
  useEffect(() => {
    load();
    cachedGet("/nutrition/foods/").then((r) => setFoods(Object.fromEntries(r.data.map((f) => [f.id, f]))));
  }, []);

  const remove = async (tpl) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try { await API.delete(`/nutrition/templates/${tpl.id}/`); load(); } catch { toast.error(t("error")); }
  };

  const groups = useMemo(() => {
    const medical = (templates || []).filter((x) => x.is_shared);
    const keys = [...CONDITIONS, ...new Set(medical.map((x) => x.condition).filter((c) => !CONDITIONS.includes(c)))];
    return keys.map((k) => [k, medical.filter((x) => (x.condition || "other") === k)]).filter(([, l]) => l.length);
  }, [templates]);

  if (!templates) return <Spinner label={t("loading")} />;
  const mine = templates.filter((x) => !x.is_shared);
  const card = (tpl, canDelete) => <TemplateCard key={tpl.id} tpl={tpl} foods={foods} onUse={setUseTpl} onDelete={canDelete ? remove : null} />;

  return (
    <>
      <PageHeader title={t("templatesTitle")} subtitle={t("startTemplateHint")} />
      <Group id="mine" title={t("myTemplates")} count={mine.length}>
        {mine.length ? mine.map((tpl) => card(tpl, true)) : <Empty>{t("noTemplates")}</Empty>}
      </Group>
      <div className="mb-2 mt-8 flex items-center gap-2">
        <h2 className="text-lg font-bold">{t("medicalTemplates")}</h2><InfoTip text={t("draftWarn")} />
      </div>
      {groups.map(([k, list]) => (
        <Group key={k} id={k} title={(COND_NAME[k] || COND_NAME.other)[lang] || (COND_NAME[k] || COND_NAME.other).en} count={list.length}
          icon={<Stethoscope className="h-4 w-4 text-brand" />} tips={COND_TIPS[k]}>
          {list.map((tpl) => card(tpl, false))}
        </Group>
      ))}
      <ClientPicker tpl={useTpl} onClose={() => setUseTpl(null)} />
    </>
  );
}
