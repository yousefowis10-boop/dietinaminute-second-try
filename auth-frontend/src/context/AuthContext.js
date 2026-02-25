import { createContext, useContext, useEffect, useState } from "react";
import API from "../hooks/useApi"; // your axios instance

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // show loader during fetch
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);



  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
    window.location.href = "/login";
  };

  const fetchProfile = async () => {
    if (!localStorage.getItem("access")) return;
    setLoadingProfile(true);
    try {
      const res = await API.get("/nutrition/profile/");
      setProfile(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setProfile(null); // Profile doesn't exist
      } else {
        console.error("Failed to fetch profile", err);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const setUserFromLogin = async () => {
    try {
      const res = await API.get("/auth/me/");
      setUser(res.data);
    } catch (err) {
      logout();
    }
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (token) {
      setUserFromLogin();
      fetchProfile();
    }
    else setLoading(false);
  }, []);

  return (
    <AuthContext.Provider  value={{
      user,
      profile,
      hasProfile: !!profile,
      loadingProfile,
      isAuthenticated: !!user,
      logout,
      setUserFromLogin,
      refreshProfile: fetchProfile,
    }}>
      {loading ? (
        <div className="h-screen flex justify-center items-center text-gray-500">Loading...</div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
