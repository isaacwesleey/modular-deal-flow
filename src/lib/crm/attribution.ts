import type { Attribution } from "./types";
import { readConsent } from "@/lib/site/cookies";

/** Clave real de la atribución. Es la que se documenta en la política de cookies. */
const ATTR_KEY = "ventia-origen";
/** Clave de versiones anteriores de la plantilla: se migra y se elimina. */
const LEGACY_ATTR_KEY = "crm-remix-attribution";

/** Traslada la atribución antigua a la clave nueva y borra el rastro anterior. */
function migrateLegacyAttribution() {
  if (typeof window === "undefined") return;
  try {
    const legacy = localStorage.getItem(LEGACY_ATTR_KEY);
    if (legacy === null) return;
    if (localStorage.getItem(ATTR_KEY) === null) localStorage.setItem(ATTR_KEY, legacy);
    localStorage.removeItem(LEGACY_ATTR_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * LÓGICA DE CONSENTIMIENTO
 * La atribución (utm_source, campaña, referrer, dispositivo) es tratamiento de
 * marketing, así que NO puede capturarse por defecto:
 *  - Sin decisión del visitante o con marketing rechazado -> no se captura nada.
 *  - Si el visitante rechaza después de haber aceptado -> se borra lo guardado.
 *  - Si acepta más tarde -> se captura a partir de ese momento (no retroactivo).
 * El borrado lo dispara `syncAttributionConsent()`, que se llama al arrancar la
 * app y cada vez que cambia el consentimiento (evento "ventia-consent").
 */
export function hasAttributionConsent(): boolean {
  return readConsent()?.marketing === true;
}

export function clearAttribution() {
  try {
    localStorage.removeItem(ATTR_KEY);
    localStorage.removeItem(LEGACY_ATTR_KEY);
  } catch {
    /* ignore */
  }
}

/** Captura si hay consentimiento; borra la atribución previa si no lo hay. */
export function syncAttributionConsent(): Attribution | null {
  if (typeof window === "undefined") return null;
  migrateLegacyAttribution();
  if (!hasAttributionConsent()) {
    clearAttribution();
    return null;
  }
  return captureAttribution();
}

function device(): NonNullable<Attribution["device"]> {
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
  if (!hasAttributionConsent()) return null;
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
  if (!hasAttributionConsent()) return null;
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
