import { Link } from "react-router-dom";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../hooks/useApi";
import { useI18n } from "../../i18n";
import { Empty } from "../../ui";

export default function PlansTab({ data, reload }) {
  const { t, num, fmtDate } = useI18n();
  const c = data.client;

  const remove = async (plan) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await API.delete(`/nutrition/plan/${plan.id}/delete/`);
      reload();
    } catch {
      toast.error(t("error"));
    }
  };

  if (!data.plans.length) {
    return (
      <Empty action={<Link to={`/dashboard/clients/${c.id}/plans/new`} className="btn-primary"><Plus className="h-4 w-4" />{t("newPlan")}</Link>}>
        {t("noPlans")}
      </Empty>
    );
  }
  return (
    <div className="card divide-y divide-line overflow-hidden">
      {data.plans.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{p.name || t("defaultPlanName", { date: fmtDate(p.created_at) })}</div>
            <div className="text-xs text-muted">{fmtDate(p.created_at)}</div>
          </div>
          <div className="flex gap-4 text-xs text-muted">
            <span><b className="num text-sm text-brand-ink">{num(p.kcal)}</b> {t("kcal")}</span>
            <span className="num">P {num(p.total_protein)} · C {num(p.total_carb)} · F {num(p.total_fat)}</span>
          </div>
          <div className="flex gap-1.5">
            <Link to={`/dashboard/plans/${p.id}`} className="btn-secondary px-3 py-1.5"><FileText className="h-4 w-4" />{t("viewSheet")}</Link>
            <Link to={`/dashboard/clients/${c.id}/plans/${p.id}/edit`} className="btn-ghost px-2.5 py-1.5" title={t("editPlan")}><Pencil className="h-4 w-4" /></Link>
            <button type="button" className="btn-ghost px-2.5 py-1.5 hover:text-bad" title={t("delete")} onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
