export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

/** Clave real del consentimiento; es la que se documenta en la política de cookies. */
const KEY = "ventia-cookie-consent";
/** Claves anteriores: se migran una sola vez y se eliminan. */
const LEGACY_KEYS = ["ventia-cookie-consent-v1", "crm-remix-cookie-consent"];

function migrateLegacy() {
  if (typeof window === "undefined") return;
  try {
    for (const k of LEGACY_KEYS) {
      const raw = localStorage.getItem(k);
      if (raw === null) continue;
      if (localStorage.getItem(KEY) === null) localStorage.setItem(KEY, raw);
      localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

export function readConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    migrateLegacy();
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CookieConsent) : null;
  } catch {
    return null;
  }
}

export function writeConsent(c: Omit<CookieConsent, "necessary" | "decidedAt">): CookieConsent {
  const value: CookieConsent = { necessary: true, ...c, decidedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("ventia-consent"));
  return value;
}

export function clearConsent() {
  try {
    localStorage.removeItem(KEY);
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("ventia-consent"));
}
