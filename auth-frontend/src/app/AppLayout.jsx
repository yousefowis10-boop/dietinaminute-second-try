import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BookUser, CalendarDays, ClipboardList, Wallet, Dumbbell, Home, LayoutGrid, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Salad, Settings, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { Avatar, Spinner } from "../ui";
import API from "../hooks/useApi";

function NavItem({ to, icon: Icon, label, badge, end, slim }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={slim ? label : undefined}
      className={({ isActive }) =>
        `relative mb-0.5 flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition ${slim ? "justify-center px-0" : "px-3"} ${
          isActive ? "bg-brand-soft text-brand" : "text-[#3b4541] hover:bg-page"
        }`
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
      {!slim && <span className="flex-1">{label}</span>}
      {badge ? (slim
        ? <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-warn" />
        : <span className="rounded-full bg-warn px-2 text-[11px] font-semibold text-white">{badge}</span>) : null}
    </NavLink>
  );
}

const SLIM_KEY = "dim.sidebarSlim";
function readSlim() {
  try { return localStorage.getItem(SLIM_KEY) === "1"; } catch { return false; }
}

export function LanguageSwitch({ className = "" }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`flex rounded-lg bg-page p-1 ${className}`}>
      {[["ar", "العربية"], ["en", "English"]].map(([code, label]) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs ${lang === code ? "bg-white font-semibold shadow-sm" : "text-muted"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function NotSubscribed() {
  const { t } = useI18n();
  const { logout } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-page p-6">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">{t("notSubscribedTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("notSubscribedBody")}</p>
        <div className="mt-6 flex justify-center gap-2">
          <LanguageSwitch />
          <button type="button" className="btn-secondary" onClick={logout}>{t("logout")}</button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, account, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const [slimPref, setSlimPref] = useState(readSlim);
  const toggleSlim = () => setSlimPref((v) => {
    try { localStorage.setItem(SLIM_KEY, v ? "0" : "1"); } catch { /* not saved, still works */ }
    return !v;
  });
  const [waiting, setWaiting] = useState(0);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!user?.is_subscribed) return;
    API.get("/nutrition/counts/").then((r) => setWaiting(r.data.interviews_waiting)).catch(() => {});
  }, [user, location.pathname]);

  if (user && !user.is_subscribed) return <NotSubscribed />;

  const planLabel = { basic: t("planBasic"), pro: t("planPro"), clinic: t("planClinic") }[account?.plan_tier] || "";
  const name = account?.first_name || user?.username?.split("@")[0] || "";

  const sidebar = (slim) => (
    <div className={`flex h-full flex-col py-5 ${slim ? "px-2.5" : "px-4"}`}>
      <div className={`mb-7 flex items-center gap-2.5 ${slim ? "flex-col" : "mx-1.5"}`}>
        {account?.logo_url ? (
          <img src={account.logo_url} alt="" className="h-9 w-9 rounded-lg border border-line object-contain" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-sm font-bold text-white">D</span>
        )}
        {!slim && (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate font-bold" dir="ltr">{t("appName")}</div>
            <div className="truncate text-xs text-muted">{account?.clinic_name || t("tagline")}</div>
          </div>
        )}
        {slim !== null && (
          <button type="button" onClick={toggleSlim} className="btn-ghost hidden p-1.5 text-muted lg:inline-flex" title={slim ? t("sidebarOpen") : t("sidebarClose")} aria-label={slim ? t("sidebarOpen") : t("sidebarClose")}>
            {slim ? <PanelLeftOpen className="h-[18px] w-[18px] rtl:-scale-x-100" /> : <PanelLeftClose className="h-[18px] w-[18px] rtl:-scale-x-100" />}
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto">
        <NavItem slim={slim} to="/dashboard" end icon={Home} label={t("today")} />
        <NavItem slim={slim} to="/dashboard/appointments" icon={CalendarDays} label={t("appointments")} />
        <NavItem slim={slim} to="/dashboard/clients" icon={Users} label={t("clients")} />
        <NavItem slim={slim} to="/dashboard/interviews" icon={ClipboardList} label={t("interviews")} badge={waiting} />
        <NavItem slim={slim} to="/dashboard/contacts" icon={BookUser} label={t("contactsNav")} />
        <NavItem slim={slim} to="/dashboard/finance" icon={Wallet} label={t("financeNav")} />
        {slim ? <div className="mx-2 my-3 border-t border-line" /> : <div className="mx-3 mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("library")}</div>}
        <NavItem slim={slim} to="/dashboard/templates" icon={LayoutGrid} label={t("planTemplates")} />
        <NavItem slim={slim} to="/dashboard/workouts" icon={Dumbbell} label={t("workoutPlans")} />
        <NavItem slim={slim} to="/dashboard/foods" icon={Salad} label={t("foodDatabase")} />
        {slim ? <div className="mx-2 my-3 border-t border-line" /> : <div className="mx-3 mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("account")}</div>}
        <NavItem slim={slim} to="/dashboard/settings" icon={Settings} label={t("settings")} />
      </nav>
      {slim ? (
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="h-8 w-10 rounded-lg bg-page text-xs font-semibold" title={lang === "ar" ? "English" : "العربية"}>{lang === "ar" ? "EN" : "ع"}</button>
          <span title={name}><Avatar name={name} size={34} /></span>
          <button type="button" onClick={logout} className="btn-ghost p-2" title={t("logout")}><LogOut className="h-4 w-4" /></button>
        </div>
      ) : (
        <>
          <LanguageSwitch className="mb-3" />
          <div className="flex items-center gap-2.5 px-1">
            <Avatar name={name} size={34} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="truncate text-[11px] text-muted">{planLabel}</div>
            </div>
            <button type="button" onClick={logout} className="btn-ghost p-2" title={t("logout")}><LogOut className="h-4 w-4" /></button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-page">
      <aside className={`fixed inset-y-0 start-0 z-20 hidden border-e border-line bg-white transition-[width] lg:block ${slimPref ? "w-[68px]" : "w-60"}`}>{sidebar(slimPref)}</aside>
      {/* phone / tablet */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
        <button type="button" className="btn-ghost p-1.5" onClick={() => setOpen(true)} aria-label="menu"><Menu className="h-5 w-5" /></button>
        <span className="font-bold" dir="ltr">{t("appName")}</span>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="absolute inset-y-0 start-0 w-72 bg-white" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn-ghost absolute end-2 top-2 p-1.5" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            {sidebar(null)}
          </aside>
        </div>
      )}
      <main className={`px-4 py-6 sm:px-7 ${slimPref ? "lg:ms-[68px]" : "lg:ms-60"}`}>
        <div className="mx-auto max-w-7xl">
          <Suspense fallback={<Spinner label={t("loading")} />}><Outlet /></Suspense>
        </div>
      </main>
    </div>
  );
}
