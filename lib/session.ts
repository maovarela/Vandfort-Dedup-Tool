// /lib/session.ts
// OAuth tokens live in sessionStorage only — never localStorage, never a server.
// Tokens are cleared automatically when the tab closes.

import type { CRMType } from "@/types";

const KEY_PREFIX = "vf_";

type TokenKey =
  | "hs_token"
  | "hs_refresh"
  | "hs_portal"
  | "hs_expires_at"
  | "sf_token"
  | "sf_refresh"
  | "sf_instance_url"
  | "sf_expires_at"
  | "sf_pkce_verifier";

const key = (k: TokenKey): string => `${KEY_PREFIX}${k}`;

function safeSession(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function setToken(k: TokenKey, value: string): void {
  safeSession()?.setItem(key(k), value);
}

export function getToken(k: TokenKey): string | null {
  return safeSession()?.getItem(key(k)) ?? null;
}

export function removeToken(k: TokenKey): void {
  safeSession()?.removeItem(key(k));
}

export function clearProvider(crm: CRMType): void {
  const store = safeSession();
  if (!store) return;
  const prefix = crm === "hubspot" ? "hs_" : "sf_";
  for (let i = store.length - 1; i >= 0; i--) {
    const storageKey = store.key(i);
    if (storageKey?.startsWith(`${KEY_PREFIX}${prefix}`)) {
      store.removeItem(storageKey);
    }
  }
}

export function clearAll(): void {
  const store = safeSession();
  if (!store) return;
  for (let i = store.length - 1; i >= 0; i--) {
    const storageKey = store.key(i);
    if (storageKey?.startsWith(KEY_PREFIX)) {
      store.removeItem(storageKey);
    }
  }
}

export function hasValidToken(crm: CRMType): boolean {
  const tokenKey: TokenKey = crm === "hubspot" ? "hs_token" : "sf_token";
  const expiresKey: TokenKey =
    crm === "hubspot" ? "hs_expires_at" : "sf_expires_at";
  const token = getToken(tokenKey);
  if (!token) return false;
  const expiresAt = getToken(expiresKey);
  if (!expiresAt) return true;
  return Date.now() < Number(expiresAt);
}
