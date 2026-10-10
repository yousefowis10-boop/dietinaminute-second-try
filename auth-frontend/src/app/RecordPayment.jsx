import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import API from "../hooks/useApi";
import { useI18n } from "../i18n";
import { Field, Modal, Spinner, apiError } from "../ui";
import { isoDay, money } from "./schedule";

const METHODS = ["cash", "card", "transfer", "online"];

// Record money received: pick the client, what it is for (an unpaid visit, part or all of a package balance, or
// "other"), the amount, how they paid and the date. `preset` = {client, kind, id} opens it ready for one item.
export default function RecordPayment({ open, preset, currency = "", onClose, onSaved }) {
  const { t, lang, fmtDate } = useI18n();
  const [clients, setClients] = useState(null);
  const [client, setClient] = useState("");
  const [items, setItems] = useState(null);
  const [item, setItem] = useState("other");
  const [form, setForm] = useState({ amount: "", method: "cash", date: isoDay(), note: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ amount: "", method: "cash", date: isoDay(), note: "" });
    setClient(preset?.client ? String(preset.client) : "");
    setItem(preset?.kind ? `${preset.kind}:${preset.id}` : "other");
    if (!preset?.client) API.get("/nutrition/clients/").then((r) => setClients(r.data)).catch(() => setClients([]));
  }, [open, preset]);

  useEffect(() => {
    setItems(null);
    if (!open || !client) return;
    API.get(`/nutrition/clients/${client}/open-items/`).then((r) => {
      setItems(r.data);
      const key = preset?.kind ? `${preset.kind}:${preset.id}` : null;
      const hit = r.data.find((i) => `${i.kind}:${i.id}` === key) || null;
      if (hit) setForm((f) => ({ ...f, amount: String(hit.amount) }));
    }).catch(() => setItems([]));
  }, [open, client, preset]);

  const pick = (key) => {
    setItem(key);
    const hit = (items || []).find((i) => `${i.kind}:${i.id}` === key);
    setForm((f) => ({ ...f, amount: hit ? String(hit.amount) : "" }));
  };
  const save = async () => {
    const [kind, id] = item.split(":");
    setBusy(true);
    try {
      await API.post("/nutrition/payments/", {
        client: client || null, amount: form.amount, method: form.method, date: form.date, note: form.note,
        ...(kind === "package" ? { package: Number(id) } : kind === "visit" ? { appointment: Number(id) } : {}),
      });
      toast.success(t("paymentRecorded"));
      onSaved();
    } catch (err) { toast.error(apiError(err, t)); } finally { setBusy(false); }
  };
  const itemLabel = (i) => `${i.kind === "package" ? `${t("package")} · ${i.what}` : `${t("visit")}${i.what ? ` · ${(lang === "ar" && i.what_ar) || i.what}` : ""}`} · ${fmtDate(i.date)}`;

  return (
    <Modal open={open} onClose={onClose} title={t("recordPayment")}>
      <div className="space-y-3">
        {!preset?.client && (
          <Field label={t("client")}>
            {!clients ? <Spinner /> : (
              <select className="input" value={client} onChange={(e) => { setClient(e.target.value); setItem("other"); }}>
                <option value="">{t("noClientOther")}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </Field>
        )}
        {client && (
          <Field label={t("paymentFor")}>
            {!items ? <Spinner /> : (
              <div className="space-y-1.5">
                {items.map((i) => (
                  <label key={`${i.kind}:${i.id}`} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm ${item === `${i.kind}:${i.id}` ? "border-brand bg-brand-soft" : "border-line"}`}>
                    <input type="radio" checked={item === `${i.kind}:${i.id}`} onChange={() => pick(`${i.kind}:${i.id}`)} />
                    <span className="min-w-0 flex-1">{itemLabel(i)}</span>
                    <b className="num">{money(i.amount, currency)}</b>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm ${item === "other" ? "border-brand bg-brand-soft" : "border-line"}`}>
                  <input type="radio" checked={item === "other"} onChange={() => pick("other")} />{t("paymentOther")}
                </label>
                {!items.length && <p className="text-xs text-muted">{t("nothingOwedClient")}</p>}
              </div>
            )}
          </Field>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`${t("amount")}${currency ? ` (${currency})` : ""}`}>
            <input className="input num" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label={t("colDate")}><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        </div>
        {item.startsWith("package") && <p className="text-xs text-muted">{t("partPaymentOk")}</p>}
        <Field label={t("payMethod")}>
          <div className="inline-flex overflow-hidden rounded-xl border border-line text-sm font-semibold">
            {METHODS.map((m) => (
              <button key={m} type="button" onClick={() => setForm({ ...form, method: m })} className={`px-3 py-2 ${form.method === m ? "bg-brand text-white" : "bg-white hover:bg-page"}`}>{t(`via_${m}`)}</button>
            ))}
          </div>
        </Field>
        <Field label={t("supplementNote")}><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button type="button" className="btn-primary" disabled={busy || !(Number(form.amount) > 0)} onClick={save}>{busy ? t("saving") : t("recordPayment")}</button>
      </div>
    </Modal>
  );
}
