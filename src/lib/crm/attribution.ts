import type { Attribution } from "./types";

const ATTR_KEY = "crm-remix-attribution";

function device(): Attribution["device"] {
  if (typeof navigator === "undefined") return "escritorio";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "móvil";
  return "escritorio";
}

/**
 * Lee UTMs, referrer y página de entrada de la visita actual.
 * Se llama una sola vez por visitante: la primera captura manda (first touch).
 */
export function captureAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  const stored = getStoredAttribution();
  if (stored) return stored;

  const p = new URLSearchParams(window.location.search);
  const ref = document.referrer || "";
  const attr: Attribution = {
    ...(p.get("utm_source") ? { utmSource: p.get("utm_source")! } : {}),
    ...(p.get("utm_medium") ? { utmMedium: p.get("utm_medium")! } : {}),
    ...(p.get("utm_campaign") ? { utmCampaign: p.get("utm_campaign")! } : {}),
    ...(p.get("utm_term") ? { utmTerm: p.get("utm_term")! } : {}),
    ...(p.get("utm_content") ? { utmContent: p.get("utm_content")! } : {}),
    ...(ref ? { referrer: ref } : {}),
    landingPage: window.location.pathname + window.location.search,
    device: device(),
    firstSeenAt: new Date().toISOString(),
  };
  if (!attr.utmSource) {
    attr.utmSource = ref ? hostOf(ref) : "directo";
    attr.utmMedium = ref ? "referral" : "none";
  }
  try {
    localStorage.setItem(ATTR_KEY, JSON.stringify(attr));
  } catch {
    /* ignore */
  }
  return attr;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "referido";
  }
}

export function getStoredAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/**
 * Enganche para formularios públicos (landing): adjunta la atribución
 * capturada al lead que se está creando.
 */
export function withAttribution<T extends { attribution?: Attribution }>(record: T): T {
  const attr = getStoredAttribution() ?? captureAttribution();
  return attr ? { ...record, attribution: attr } : record;
}

export const ATTRIBUTION_LABELS: Record<keyof Attribution, string> = {
  utmSource: "utm_source",
  utmMedium: "utm_medium",
  utmCampaign: "utm_campaign",
  utmTerm: "utm_term",
  utmContent: "utm_content",
  referrer: "Referrer",
  landingPage: "Página de entrada",
  device: "Dispositivo",
  firstSeenAt: "Primer contacto",
};
