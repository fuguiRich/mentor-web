import type { ApiEnvelope, AuthTokens, FieldError } from "./types";
import {
  clearTokens,
  getTokens,
  isExpiringSoon,
  setTokens,
} from "../auth/token-store";

const API_BASE = (
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:3001"
).replace(/\/$/, "");

export class ApiError extends Error {
  readonly code: number;
  readonly httpStatus: number;
  readonly fields?: FieldError[];
  readonly traceId?: string;

  constructor(
    message: string,
    options: {
      code: number;
      httpStatus: number;
      fields?: FieldError[];
      traceId?: string;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.fields = options.fields;
    this.traceId = options.traceId;
  }
}

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: object;
  /** 登录 / 刷新等免鉴权接口设为 true */
  skipAuth?: boolean;
}

function buildUrl(path: string, query?: object): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

function notifyExpired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:expired"));
  }
}

async function parseJson(response: Response): Promise<ApiEnvelope<unknown> | null> {
  try {
    return (await response.json()) as ApiEnvelope<unknown>;
  } catch {
    return null;
  }
}

function toApiError(
  response: Response,
  payload: ApiEnvelope<unknown> | null,
): ApiError {
  const data = payload?.data as { fields?: FieldError[] } | undefined;
  return new ApiError(
    payload?.message ?? `请求失败（HTTP ${response.status}）`,
    {
      code: payload?.code ?? response.status,
      httpStatus: response.status,
      fields: data?.fields,
      traceId: payload?.traceId,
    },
  );
}

let refreshPromise: Promise<boolean> | null = null;

/** 单飞刷新：并发请求共享同一次 /auth/refresh。 */
export function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const tokens = getTokens();
  if (!tokens) return Promise.resolve(false);

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      const payload = await parseJson(response);
      if (!response.ok || !payload || payload.code !== 0) return false;
      setTokens(payload.data as AuthTokens);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function isAuthEndpoint(path: string): boolean {
  return (
    path === "/auth/login" ||
    path === "/auth/refresh" ||
    path === "/auth/sso/authorize" ||
    path === "/auth/sso/callback"
  );
}

async function request<T>(
  path: string,
  init: ApiRequestInit = {},
  retried = false,
): Promise<T> {
  const { body, query, skipAuth, headers, ...rest } = init;
  const tokens = getTokens();

  if (tokens && !skipAuth && !isAuthEndpoint(path) && isExpiringSoon()) {
    const refreshed = await refreshTokens();
    if (!refreshed) {
      clearTokens();
      notifyExpired();
      throw new ApiError("登录状态已过期，请重新登录", {
        code: 10002,
        httpStatus: 401,
      });
    }
  }

  const finalHeaders = new Headers(headers);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData && !finalHeaders.has("content-type")) {
    finalHeaders.set("content-type", "application/json");
  }
  const currentTokens = getTokens();
  if (currentTokens && !skipAuth && !finalHeaders.has("authorization")) {
    finalHeaders.set("authorization", `Bearer ${currentTokens.accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("网络异常，请检查网络后重试", {
      code: -1,
      httpStatus: 0,
    });
  }

  if (response.status === 204) return undefined as T;

  const payload = await parseJson(response);

  if (!response.ok || !payload || payload.code !== 0) {
    // 账号已停用：不尝试刷新，直接清令牌回登录页（SSO 同步删人/毕业场景）
    if (payload?.code === 20102) {
      clearTokens();
      notifyExpired();
      throw toApiError(response, payload);
    }

    const shouldRefresh =
      !skipAuth &&
      !retried &&
      !isAuthEndpoint(path) &&
      (response.status === 401 ||
        payload?.code === 10002 ||
        payload?.code === 20104);

    if (shouldRefresh) {
      const refreshed = await refreshTokens();
      if (refreshed) return request<T>(path, init, true);
      clearTokens();
      notifyExpired();
    }

    throw toApiError(response, payload);
  }

  return payload.data as T;
}

export function apiFetch<T>(path: string, init?: ApiRequestInit): Promise<T> {
  return request<T>(path, init);
}

function filenameFromDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1];
}

export interface BlobResult {
  blob: Blob;
  filename?: string;
}

/** 预览 / 下载 / CSV 导出：返回字节流，不走统一 JSON 外壳。 */
export async function apiBlob(
  path: string,
  init: ApiRequestInit = {},
  retried = false,
): Promise<BlobResult> {
  const { query, skipAuth, headers, body: ignoredBody, ...rest } = init;
  void ignoredBody;
  const tokens = getTokens();

  if (tokens && !skipAuth && isExpiringSoon()) {
    const refreshed = await refreshTokens();
    if (!refreshed) {
      clearTokens();
      notifyExpired();
      throw new ApiError("登录状态已过期，请重新登录", {
        code: 10002,
        httpStatus: 401,
      });
    }
  }

  const finalHeaders = new Headers(headers);
  const currentTokens = getTokens();
  if (currentTokens && !skipAuth && !finalHeaders.has("authorization")) {
    finalHeaders.set("authorization", `Bearer ${currentTokens.accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers: finalHeaders,
    });
  } catch {
    throw new ApiError("网络异常，请检查网络后重试", {
      code: -1,
      httpStatus: 0,
    });
  }

  if (!response.ok) {
    const payload = await parseJson(response);
    if (
      !skipAuth &&
      !retried &&
      (response.status === 401 || payload?.code === 10002)
    ) {
      const refreshed = await refreshTokens();
      if (refreshed) return apiBlob(path, init, true);
      clearTokens();
      notifyExpired();
    }
    throw toApiError(response, payload);
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(
      response.headers.get("content-disposition"),
    ),
  };
}

export { API_BASE, filenameFromDisposition };
