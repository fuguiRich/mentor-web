import { apiFetch } from "../client";
import type {
  AuthProfile,
  AuthTokens,
  ChangePasswordBody,
  LoginBody,
  User,
} from "../types";

export function login(body: LoginBody): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/login", {
    method: "POST",
    body,
    skipAuth: true,
  });
}

export function logout(refreshToken: string): Promise<void> {
  return apiFetch<void>("/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
}

export function getProfile(): Promise<AuthProfile> {
  return apiFetch<AuthProfile>("/auth/profile");
}

export function changePassword(body: ChangePasswordBody): Promise<User> {
  return apiFetch<User>("/auth/password", { method: "PUT", body });
}
