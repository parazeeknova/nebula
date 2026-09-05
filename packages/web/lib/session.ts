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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

/** Validate an email address; returns an error message or null. */
export const validateEmail = (email: string): string | null => {
  const clean = email.trim();
  if (!clean) {
    return "Email is required.";
  }
  if (!EMAIL_RE.test(clean)) {
    return "Enter a valid email address.";
  }
  if (clean.length > 254) {
    return "Email is too long.";
  }
  return null;
};

export interface UserSession {
  email: string;
  hasSession: boolean;
  name: string;
  /** True once the user has completed onboarding (profile + first room). */
  onboarded: boolean;
}

/** Whether the user has completed onboarding. */
export const getOnboarded = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    localStorage.getItem("nebula_onboarded") === "true" ||
    getCookie(COOKIE_SESSION) === "1"
  );
};

export const getUserSession = (): UserSession => {
  if (typeof window === "undefined") {
    return { email: "", hasSession: false, name: "", onboarded: false };
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
    onboarded: getOnboarded(),
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
