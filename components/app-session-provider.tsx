"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getBootstrap, logout as apiLogout, ApiError } from "@/lib/api";
import type { BootstrapResponse } from "@/lib/types";
import {
  canSeeAdminNav,
  compactRoles,
  getInitials,
  getSessionDisplayName,
  primaryAppRole,
} from "@/lib/session-roles";

export type AppSessionState = {
  loading: boolean;
  error: string | null;
  bootstrap: BootstrapResponse | null;
  displayName: string;
  email: string;
  /** Profile photo URL from Laravel when set. */
  avatarUrl: string | null;
  initials: string;
  roles: string[];
  primaryRole: string;
  rolesShown: string[];
  rolesExtra: number;
  showAdminNav: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const defaultState: AppSessionState = {
  loading: true,
  error: null,
  bootstrap: null,
  displayName: "",
  email: "",
  avatarUrl: null,
  initials: "?",
  roles: [],
  primaryRole: "",
  rolesShown: [],
  rolesExtra: 0,
  showAdminNav: false,
  logout: async () => {},
  refresh: async () => {},
};

const SessionContext = createContext<AppSessionState>(defaultState);

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBootstrap();
      setBootstrap(data);
    } catch (err) {
      const fe = err as ApiError;
      setError(fe.message || "Session failed");
      setBootstrap(null);
      if (fe.status === 401 || fe.status === 403) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = useCallback(async () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("immuno_explicit_logout", "1");
    }
    setBootstrap(null);
    try {
      await apiLogout();
    } catch {
      // Session may still clear via Set-Cookie; login page handles stubborn sessions.
    }
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value = useMemo((): AppSessionState => {
    const user = bootstrap?.user;
    if (!user) {
      return {
        loading,
        error,
        bootstrap,
        displayName: loading ? "…" : "",
        email: "",
        avatarUrl: null,
        initials: loading ? "…" : "?",
        roles: [],
        primaryRole: "",
        rolesShown: [],
        rolesExtra: 0,
        showAdminNav: false,
        logout,
        refresh: load,
      };
    }
    const displayName = getSessionDisplayName(user);
    const { shown, extra } = compactRoles(user.roles);
    const avatarUrl =
      user.avatar_url && user.avatar_url.length > 0 ? user.avatar_url : null;
    return {
      loading,
      error,
      bootstrap,
      displayName,
      email: user.email || user.user || user.name || "",
      avatarUrl,
      initials: getInitials(displayName),
      roles: user.roles,
      primaryRole: primaryAppRole(user.roles),
      rolesShown: shown,
      rolesExtra: extra,
      showAdminNav: canSeeAdminNav(user.roles),
      logout,
      refresh: load,
    };
  }, [bootstrap, loading, error, logout, load]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useAppSession(): AppSessionState {
  return useContext(SessionContext);
}
