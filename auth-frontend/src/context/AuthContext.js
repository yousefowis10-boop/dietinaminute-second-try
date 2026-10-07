import { createContext, useCallback, useContext, useEffect, useState } from "react";
import API from "../hooks/useApi";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
    setAccount(null);
    window.location.href = "/login";
  }, []);

  // Reload plan level, AI status and branding (after settings change, for example).
  const refreshAccount = useCallback(async () => {
    try {
      const res = await API.get("/nutrition/account/");
      setAccount(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  const setUserFromLogin = useCallback(async () => {
    try {
      const res = await API.get("/auth/me/");
      setUser(res.data);
      await refreshAccount();
    } catch {
      logout();
    }
    setLoading(false);
  }, [logout, refreshAccount]);

  useEffect(() => {
    if (localStorage.getItem("access")) setUserFromLogin();
    else setLoading(false);
  }, [setUserFromLogin]);

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        isAuthenticated: !!user,
        logout,
        setUserFromLogin,
        refreshAccount,
        // kept for older screens
        refreshProfile: refreshAccount,
      }}
    >
      {loading ? <div className="flex h-screen items-center justify-center text-muted">…</div> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
