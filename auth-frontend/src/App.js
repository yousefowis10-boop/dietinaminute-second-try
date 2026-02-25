import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import { Toaster } from 'react-hot-toast';

import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import AuthGuard from "./components/AuthGuard";
import GuestGuard from "./components/GuestGuard";
import MealPlanTable from "./pages/MealPlanTable";
import CustomPlanGenerator from "./pages/CustomPlanGenerator";
import CreateClient from "./pages/CreateClients";
import ClientList from "./pages/ListClients";
import EditClientProfile from "./pages/EditClient";
import MealBuilder from "./pages/MealBuilder";
import ClientDietPlans from "./pages/ClientDietPlans";
import MealPlanDetail from "./pages/MealPlanDetail";
import ClientHistory from "./pages/ClientHistory";
import ClientHistoryDetail from "./pages/ClientHistoryDetails";
import DietPlanSplitView from "./pages/DietPlanSplitView";
import MealEditor from "./pages/MealEditor";
import ClientProfileForm from "./pages/ClientProfileForm";
import BulkMealView from "./pages/BulkMealView";
import BulkMealListing from "./pages/BulkMealListing";

export default function App() {
  return (
    <>
    <Toaster
        position="top-right"
        toastOptions={{
          className: '',
          style: {
            background: '#fff',
            color: '#333',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
          },
        }}
      />
      <AuthProvider>
      <Router>
        <Routes>
          {/* Guest-only pages */}
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* Protected pages */}
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="create-client" element={<CreateClient />} />
              <Route path="client-profile/:clientId/" element={<ClientProfileForm />} />
              <Route path="list-client" element={<ClientList />} />
              <Route path="clients/:id/edit" element={<EditClientProfile />} />
              <Route path="clients/:id/build-meal" element={<MealBuilder />} />
              <Route path="clients/:id/plans" element={<ClientDietPlans />} />
              <Route path="clients/:id/history" element={<ClientHistory />} />
              <Route path="clients/:id/history/:index" element={<ClientHistoryDetail />} />
              <Route path="plans/:id" element={<MealPlanDetail />} />
              <Route path="bulk-plans/:ids" element={<BulkMealListing />} />
              <Route path="plans/:id/edit-meal" element={<MealEditor />} />
              <Route path="plan-view/:planId" element={<DietPlanSplitView />} />
              <Route path="bulk-view/:mealIds" element={<BulkMealView />} />
              <Route path="mealplan" element={<MealPlanTable />} />
              <Route path="custom" element={<CustomPlanGenerator />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      </AuthProvider>
    </>
  );
}
