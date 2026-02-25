import { Navigate, Outlet } from "react-router-dom";

export default function GuestGuard() {
  const token = localStorage.getItem("access");
  return token ? <Navigate to="/dashboard" /> : <Outlet />;
}
