import { useEffect, useState } from "react";
import { Stethoscope, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Card, DraftBadge, Empty, PageHeader, Spinner } from "../ui";
import { tplDesc, tplName } from "./foodUtils";

export default function Templates() {
  const { t, lang, fmtDate, foodName } = useI18n();
  const [templates, setTemplates] = useState(null);
  const [foods, setFoods] = useState({});

  const load = () => API.get("/nutrition/templates/").then((r) => setTemplates(r.data));
  useEffect(() => {
    load();
    API.get("/nutrition/foods/").then((r) => setFoods(Object.fromEntries(r.data.map((f) => [f.id, f]))));
  }, []);

  const remove = async (tpl) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try { await API.delete(`/nutrition/templates/${tpl.id}/`); load(); } catch { toast.error(t("error")); }
  };

  if (!templates) return <Spinner label={t("loading")} />;
  const medical = templates.filter((x) => x.is_shared);
  const mine = templates.filter((x) => !x.is_shared);
  const list = (items, canDelete) => (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((tpl) => (
        <Card key={tpl.id} title={tplName(tpl, lang)} icon={tpl.is_medical ? <Stethoscope className="h-4 w-4 text-brand" /> : null}
          actions={canDelete && <button type="button" className="btn-ghost p-1.5 hover:text-bad" onClick={() => remove(tpl)}><Trash2 className="h-4 w-4" /></button>}>
          {tpl.is_draft && <div className="mb-2"><DraftBadge /></div>}
          {tplDesc(tpl, lang) && <p className="mb-2 text-sm text-muted">{tplDesc(tpl, lang)}</p>}
          <p className="text-sm leading-relaxed">{tpl.items.map((i) => foodName(foods[i.food_id]) || "?").join(" · ")}</p>
          {!tpl.is_shared && <p className="mt-2 text-xs text-muted">{fmtDate(tpl.created_at)}</p>}
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader title={t("templatesTitle")} subtitle={t("startTemplateHint")} />
      <h2 className="mb-3 font-bold">{t("myTemplates")}</h2>
      {mine.length ? list(mine, true) : <Empty>{t("noTemplates")}</Empty>}
      <h2 className="mb-1 mt-8 font-bold">{t("medicalTemplates")}</h2>
      <p className="mb-3 text-sm text-warn">{t("draftWarn")}</p>
      {list(medical, false)}
    </>
  );
}
