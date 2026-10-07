import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ClipboardList, Dumbbell, Home, LayoutGrid, LogOut, Menu, Salad, Settings, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";
import { Avatar } from "../ui";
import API from "../hooks/useApi";

function NavItem({ to, icon: Icon, label, badge, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive ? "bg-brand-soft text-brand" : "text-[#3b4541] hover:bg-page"
        }`
      }
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      <span className="flex-1">{label}</span>
      {badge ? <span className="rounded-full bg-warn px-2 text-[11px] font-semibold text-white">{badge}</span> : null}
    </NavLink>
  );
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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!user?.is_subscribed) return;
    API.get("/nutrition/dashboard/").then((r) => setWaiting(r.data.counts.interviews_waiting)).catch(() => {});
  }, [user, location.pathname]);

  if (user && !user.is_subscribed) return <NotSubscribed />;

  const planLabel = { basic: t("planBasic"), pro: t("planPro"), clinic: t("planClinic") }[account?.plan_tier] || "";
  const name = account?.first_name || user?.username?.split("@")[0] || "";

  const sidebar = (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="mx-1.5 mb-7 flex items-center gap-2.5">
        {account?.logo_url ? (
          <img src={account.logo_url} alt="" className="h-9 w-9 rounded-lg border border-line object-contain" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-sm font-bold text-white">D</span>
        )}
        <div className="min-w-0 leading-tight">
          <div className="truncate font-bold" dir="ltr">{t("appName")}</div>
          <div className="truncate text-xs text-muted">{account?.clinic_name || t("tagline")}</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <NavItem to="/dashboard" end icon={Home} label={t("home")} />
        <NavItem to="/dashboard/clients" icon={Users} label={t("clients")} />
        <NavItem to="/dashboard/interviews" icon={ClipboardList} label={t("interviews")} badge={waiting} />
        <div className="mx-3 mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("library")}</div>
        <NavItem to="/dashboard/templates" icon={LayoutGrid} label={t("planTemplates")} />
        <NavItem to="/dashboard/workouts" icon={Dumbbell} label={t("workoutPlans")} />
        <NavItem to="/dashboard/foods" icon={Salad} label={t("foodDatabase")} />
        <div className="mx-3 mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("account")}</div>
        <NavItem to="/dashboard/settings" icon={Settings} label={t("settings")} />
      </nav>
      <LanguageSwitch className="mb-3" />
      <div className="flex items-center gap-2.5 px-1">
        <Avatar name={name} size={34} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="truncate text-[11px] text-muted">{planLabel}</div>
        </div>
        <button type="button" onClick={logout} className="btn-ghost p-2" title={t("logout")}><LogOut className="h-4 w-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-page">
      <aside className="fixed inset-y-0 start-0 hidden w-60 border-e border-line bg-white lg:block">{sidebar}</aside>
      {/* phone / tablet */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
        <button type="button" className="btn-ghost p-1.5" onClick={() => setOpen(true)} aria-label="menu"><Menu className="h-5 w-5" /></button>
        <span className="font-bold" dir="ltr">{t("appName")}</span>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="absolute inset-y-0 start-0 w-72 bg-white" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn-ghost absolute end-2 top-2 p-1.5" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className="px-4 py-6 sm:px-7 lg:ms-60">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
