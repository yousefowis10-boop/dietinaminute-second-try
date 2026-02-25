import { Navigate, Outlet } from "react-router-dom";

const AuthGuard = () => {
  const token = localStorage.getItem("access");
  return token ? <Outlet /> : <Navigate to="/login" />;
};

export default AuthGuard;
