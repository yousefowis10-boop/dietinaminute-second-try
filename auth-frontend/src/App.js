import { BrowserRouter as Router, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./i18n";
import AuthGuard from "./components/AuthGuard";
import GuestGuard from "./components/GuestGuard";
import AppLayout from "./app/AppLayout";
import Login from "./app/Login";
import Home from "./app/Home";
import Clients from "./app/Clients";
import ClientForm from "./app/ClientForm";
import ClientPage from "./app/ClientPage";
import PlanBuilder from "./app/PlanBuilder";
import PlanSheet from "./app/PlanSheet";
import Templates from "./app/Templates";
import Workouts from "./app/Workouts";
import Foods from "./app/Foods";
import Settings from "./app/Settings";
import PublicInterview from "./app/PublicInterview";
import PublicCheckIn from "./app/PublicCheckIn";
import PublicBooking from "./app/PublicBooking";
import ClientApp from "./app/ClientApp";
import Appointments from "./app/Appointments";

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
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
