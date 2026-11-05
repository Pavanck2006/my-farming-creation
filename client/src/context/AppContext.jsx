import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AppContext = createContext(null);
export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("cropwise-token"));
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("cropwise-token")));
  const [theme, setTheme] = useState(() => localStorage.getItem("cropwise-theme") || "light");
  const [language, setLanguage] = useState(() => localStorage.getItem("cropwise-language") || "en");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cropwise-theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("cropwise-language", language);
  }, [language]);
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then(({ data }) => setFarmer(data.farmer))
      .catch(() => { localStorage.removeItem("cropwise-token"); setToken(null); setFarmer(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = (newToken, profile) => {
    localStorage.setItem("cropwise-token", newToken);
    setToken(newToken);
    setFarmer(profile);
  };
  const logout = () => {
    localStorage.removeItem("cropwise-token");
    setToken(null);
    setFarmer(null);
  };
  const value = useMemo(() => ({ token, farmer, setFarmer, loading, login, logout, theme, setTheme, language, setLanguage }), [token, farmer, loading, theme, language]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export const useApp = () => useContext(AppContext);
