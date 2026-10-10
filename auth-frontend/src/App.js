import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./i18n";
import AuthGuard from "./components/AuthGuard";
import GuestGuard from "./components/GuestGuard";
import AppLayout from "./app/AppLayout";
import { Spinner } from "./ui";

// Pages load on demand, so the client phone page and booking page stay small.
const Login = lazy(() => import("./app/Login"));
const Home = lazy(() => import("./app/Home"));
const Clients = lazy(() => import("./app/Clients"));
const ClientForm = lazy(() => import("./app/ClientForm"));
const ClientPage = lazy(() => import("./app/ClientPage"));
const PlanBuilder = lazy(() => import("./app/PlanBuilder"));
const PlanSheet = lazy(() => import("./app/PlanSheet"));
const Templates = lazy(() => import("./app/Templates"));
const Workouts = lazy(() => import("./app/Workouts"));
const Foods = lazy(() => import("./app/Foods"));
const Settings = lazy(() => import("./app/Settings"));
const PublicInterview = lazy(() => import("./app/PublicInterview"));
const PublicCheckIn = lazy(() => import("./app/PublicCheckIn"));
const PublicBooking = lazy(() => import("./app/PublicBooking"));
const ClientApp = lazy(() => import("./app/ClientApp"));
const Appointments = lazy(() => import("./app/Appointments"));

// Old links (bookmarks, shared sheets) keep working.
function OldPlanLink() {
  const { planId, id } = useParams();
  return <Navigate to={`/dashboard/plans/${planId || id}`} replace />;
}
function OldClientLink() {
  const { id, clientId } = useParams();
  return <Navigate to={`/dashboard/clients/${id || clientId}`} replace />;
}

export default function App() {
  return (
    <LanguageProvider>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: "10px", fontSize: "14px" } }} />
      <AuthProvider>
        <Router>
          <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
          <Routes>
            {/* The client's interview link: public, no login. */}
            <Route path="/i/:token" element={<PublicInterview />} />
            <Route path="/c/:token" element={<PublicCheckIn />} />
            <Route path="/m/:token" element={<ClientApp />} />
            <Route path="/book/:slug" element={<PublicBooking />} />

            <Route element={<GuestGuard />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Login mode="signup" />} />
            </Route>

            <Route element={<AuthGuard />}>
              <Route path="/dashboard" element={<AppLayout />}>
                <Route index element={<Home />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="clients" element={<Clients />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/:id" element={<ClientPage />} />
                <Route path="clients/:id/edit" element={<ClientForm />} />
                <Route path="clients/:clientId/plans/new" element={<PlanBuilder />} />
                <Route path="clients/:clientId/plans/:planId/edit" element={<PlanBuilder />} />
                <Route path="plans/:planId" element={<PlanSheet />} />
                <Route path="interviews" element={<Clients onlyInterviews />} />
                <Route path="templates" element={<Templates />} />
                <Route path="workouts" element={<Workouts />} />
                <Route path="foods" element={<Foods />} />
                <Route path="settings" element={<Settings />} />
                {/* old addresses */}
                <Route path="list-client" element={<Navigate to="/dashboard/clients" replace />} />
                <Route path="create-client" element={<Navigate to="/dashboard/clients/new" replace />} />
                <Route path="client-profile/:clientId" element={<OldClientLink />} />
                <Route path="clients/:id/plans" element={<OldClientLink />} />
                <Route path="clients/:id/history" element={<OldClientLink />} />
                <Route path="clients/:id/build-meal" element={<OldClientLink />} />
                <Route path="plan-view/:planId" element={<OldPlanLink />} />
                <Route path="plans/:id/edit-meal" element={<OldPlanLink />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
