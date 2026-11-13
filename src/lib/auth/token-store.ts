import type { AuthTokens } from "../api/types";

const STORAGE_KEY = "mentor-admin.tokens";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** accessToken 过期的绝对时间（毫秒时间戳） */
  expiresAt: number;
}

const memory = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    /* 隐私模式等场景回退到内存 */
  }
  return memory.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    /* fallthrough */
  }
  memory.set(key, value);
}

function storageRemove(key: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* fallthrough */
  }
  memory.delete(key);
}

function read(): StoredTokens | null {
  try {
    const raw = storageGet(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTokens>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

let current: StoredTokens | null = read();

export function getTokens(): StoredTokens | null {
  return current;
}

export function getAccessToken(): string | null {
  return current?.accessToken ?? null;
}

export function setTokens(tokens: AuthTokens | null): void {
  if (!tokens) {
    current = null;
    storageRemove(STORAGE_KEY);
    return;
  }
  current = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  };
  storageSet(STORAGE_KEY, JSON.stringify(current));
}

/** 距过期不足 skewMs（默认 60s）时返回 true；无令牌时返回 false。 */
export function isExpiringSoon(skewMs = 60_000): boolean {
  if (!current) return false;
  return current.expiresAt - Date.now() <= skewMs;
}

export function clearTokens(): void {
  setTokens(null);
}
