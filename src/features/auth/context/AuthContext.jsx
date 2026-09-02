import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, logout as logoutApi, googleLogin as googleLoginApi } from "../services/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [membership, setMembership] = useState(null);
  const [guild, setGuild] = useState(null);
  const [onboarding, setOnboarding] = useState({
    needsOnboarding: false,
    profileCompleted: false,
    game: null,
    gameUid: null,
    region: null,
    inGameName: null,
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      setMembership(data.membership);
      setGuild(data.guild);
      setOnboarding(data.onboarding || {});
      setIsAuthenticated(true);
    } catch (err) {
      setUser(null);
      setMembership(null);
      setGuild(null);
      setOnboarding({ needsOnboarding: false, profileCompleted: false });
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    setError(null);
    try {
      await googleLoginApi(idToken);
      // Refresh to fetch full user/membership/guild data since googleAuth response is partial
      await refresh();
      return { success: true };
    } catch (err) {
      setError(err.message || "Google sign-in failed");
      return { success: false, error: err.message };
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // ignore
    }
    setUser(null);
    setMembership(null);
    setGuild(null);
    setOnboarding({ needsOnboarding: false, profileCompleted: false });
    setIsAuthenticated(false);
  }, []);

  const updateOnboarding = useCallback((data) => {
    setOnboarding((prev) => ({ ...prev, ...data }));
  }, []);

  const setUserData = useCallback((data) => {
    if (data.user) setUser(data.user);
    if (data.membership) setMembership(data.membership);
    if (data.guild) setGuild(data.guild);
    if (data.onboarding) setOnboarding(data.onboarding);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const role = membership?.role ?? "free";
  const isAdmin = ["leader", "acting_leader", "officer"].includes(role);
  const needsOnboarding = isAuthenticated && onboarding?.needsOnboarding && !membership;

  // Memoize the context value so consumers don't re-render on every parent
  // render unless one of the actual fields they read has changed.
  const value = useMemo(
    () => ({
      user,
      membership,
      guild,
      role,
      isAdmin,
      isAuthenticated,
      isLoading,
      onboarding,
      error,
      refresh,
      loginWithGoogle,
      logout,
      updateOnboarding,
      setUserData,
      needsOnboarding,
    }),
    [user, membership, guild, role, isAdmin, isAuthenticated, isLoading, onboarding, error, refresh, loginWithGoogle, logout, updateOnboarding, setUserData, needsOnboarding]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}