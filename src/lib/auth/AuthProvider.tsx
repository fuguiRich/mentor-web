import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  getProfile,
  login as apiLogin,
  logout as apiLogout,
} from "../api/endpoints/auth";
import type { AuthProfile, User } from "../api/types";
import { ApiError } from "../api/client";
import { hasPermission } from "./permissions";
import { noticeFromTokens } from "./login-notice";
import type { LoginNotice } from "./login-notice";
import { clearTokens, getTokens, setTokens } from "./token-store";

interface AuthContextValue {
  user: User | null;
  permissions: string[];
  loading: boolean;
  isSuperAdmin: boolean;
  can: (code: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  /** 登录后需要展示的 SSO 提示（回退本地密码 / 初始密码） */
  loginNotice: LoginNotice | null;
  dismissLoginNotice: (kind?: keyof LoginNotice) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NOTICE_KEY = "mentor-admin.login-notice";

function readNotice(): LoginNotice | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(NOTICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LoginNotice>;
    const notice: LoginNotice = {
      ssoUnavailable: parsed.ssoUnavailable === true,
      isDefaultPwd: parsed.isDefaultPwd === true,
    };
    return notice.ssoUnavailable || notice.isDefaultPwd ? notice : null;
  } catch {
    return null;
  }
}

function writeNotice(notice: LoginNotice | null): void {
  try {
    if (typeof window === "undefined") return;
    if (!notice) {
      window.sessionStorage.removeItem(NOTICE_KEY);
      return;
    }
    window.sessionStorage.setItem(NOTICE_KEY, JSON.stringify(notice));
  } catch {
    /* sessionStorage 不可用时只保留内存态 */
  }
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  window.location.assign("/login");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(getTokens()));
  const [loginNotice, setLoginNotice] = useState<LoginNotice | null>(() =>
    readNotice(),
  );

  const loadProfile = useCallback(async () => {
    try {
      const next = await getProfile();
      setProfile(next);
    } catch (error) {
      if (
        error instanceof ApiError &&
        [10002, 20102, 20104].includes(error.code)
      ) {
        clearTokens();
        setProfile(null);
        setLoginNotice(null);
        writeNotice(null);
        redirectToLogin();
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getTokens()) {
        setLoginNotice(null);
        writeNotice(null);
        setLoading(false);
        return;
      }
      try {
        const next = await getProfile();
        if (!cancelled) setProfile(next);
      } catch {
        clearTokens();
        if (!cancelled) {
          setProfile(null);
          setLoginNotice(null);
        }
        writeNotice(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // 同步任务可能更新姓名 / 部门，聚焦窗口或每 5 分钟刷新一次画像
  useEffect(() => {
    function refresh() {
      if (!getTokens()) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      void loadProfile().catch(() => {
        /* 401 / 停用已在 loadProfile 内处理 */
      });
    }

    const timer = window.setInterval(refresh, 5 * 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [loadProfile]);

  useEffect(() => {
    function onExpired() {
      setProfile(null);
      setLoginNotice(null);
      writeNotice(null);
      redirectToLogin();
    }
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await apiLogin({ username, password });
    setTokens(tokens);
    const notice = noticeFromTokens(tokens);
    setLoginNotice(notice);
    writeNotice(notice);
    try {
      const next = await getProfile();
      setProfile(next);
    } catch (error) {
      clearTokens();
      setProfile(null);
      setLoginNotice(null);
      writeNotice(null);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const tokens = getTokens();
    try {
      if (tokens) await apiLogout(tokens.refreshToken);
    } catch {
      /* 登出失败也要清本地令牌 */
    } finally {
      clearTokens();
      setProfile(null);
      setLoginNotice(null);
      writeNotice(null);
    }
  }, []);

  const dismissLoginNotice = useCallback((kind?: keyof LoginNotice) => {
    setLoginNotice((previous) => {
      if (!previous) return null;
      if (!kind) {
        writeNotice(null);
        return null;
      }
      const next: LoginNotice = { ...previous, [kind]: false };
      const final =
        next.ssoUnavailable || next.isDefaultPwd ? next : null;
      writeNotice(final);
      return final;
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = profile?.permissions ?? [];
    const isSuperAdmin = profile?.user.isSuperAdmin ?? false;
    return {
      user: profile?.user ?? null,
      permissions,
      loading,
      isSuperAdmin,
      can: (code: string) => hasPermission(permissions, code, isSuperAdmin),
      login,
      logout,
      reloadProfile: loadProfile,
      loginNotice,
      dismissLoginNotice,
    };
  }, [
    profile,
    loading,
    login,
    logout,
    loadProfile,
    loginNotice,
    dismissLoginNotice,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth 必须在 AuthProvider 内使用");
  }
  return context;
}
