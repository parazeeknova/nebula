export const COOKIE_NAME = "nebula_user_name";
export const COOKIE_EMAIL = "nebula_user_email";
export const COOKIE_SESSION = "nebula_session";

export const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") {
    return null;
  }
  const escaped = name.replaceAll(/[$()*+./?[\\\]^{|}-]/gu, "\\$&");
  const match = new RegExp(`(?:^|; )${escaped}=([^;]*)`, "u").exec(
    document.cookie
  );
  return match && match[1] !== undefined ? decodeURIComponent(match[1]) : null;
};

export const setCookie = (name: string, value: string, days = 365): void => {
  if (typeof document === "undefined") {
    return;
  }
  const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
  // oxlint-disable-next-line unicorn/no-document-cookie
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

export interface UserSession {
  email: string;
  hasSession: boolean;
  name: string;
}

export const getUserSession = (): UserSession => {
  if (typeof window === "undefined") {
    return { email: "", hasSession: false, name: "" };
  }
  const name =
    localStorage.getItem("nebula_user_name") || getCookie(COOKIE_NAME) || "";
  const email =
    localStorage.getItem("nebula_user_email") || getCookie(COOKIE_EMAIL) || "";
  const hasSession = Boolean(name.trim() && email.trim());
  return {
    email: email.trim(),
    hasSession,
    name: name.trim(),
  };
};

export const saveUserSession = (name: string, email: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  const cleanName = name.trim();
  const cleanEmail = email.trim();
  if (cleanName) {
    localStorage.setItem("nebula_user_name", cleanName);
    setCookie(COOKIE_NAME, cleanName);
  }
  if (cleanEmail) {
    localStorage.setItem("nebula_user_email", cleanEmail);
    setCookie(COOKIE_EMAIL, cleanEmail);
  }
  localStorage.setItem("nebula_onboarded", "true");
  setCookie(COOKIE_SESSION, "1");
};
