import { uid } from "./defaults";
import type { AuthToken, AuthTokenKind } from "./types";

/**
 * ⚠️ SIMULACIÓN DE CORREO Y TOKENS — SOLO PARA ESTA PLANTILLA.
 * Aquí los tokens de restablecimiento, verificación e invitación se generan en
 * el navegador y se guardan en localStorage junto al resto del estado. Eso
 * significa que son legibles y falsificables por cualquiera con acceso al
 * dispositivo, y que el "enlace recibido" se muestra en pantalla porque no hay
 * ningún servidor de correo detrás.
 * En producción NADA de esto es aceptable: el token lo emite y valida el
 * proveedor de autenticación (Supabase Auth / Lovable Cloud, Auth0, Clerk...),
 * viaja únicamente dentro del email y jamás se imprime en la interfaz.
 */

export const TOKEN_TTL_MS = {
  reset: 60 * 60 * 1000, // 1 hora
  verify: 24 * 60 * 60 * 1000,
  invite: 7 * 24 * 60 * 60 * 1000,
} as const;

export function makeToken(
  kind: AuthTokenKind,
  email: string,
  extra: Partial<AuthToken> = {},
): AuthToken {
  const now = Date.now();
  return {
    token: `${kind}_${uid()}${uid()}`,
    kind,
    email: email.trim().toLowerCase(),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TOKEN_TTL_MS[kind]).toISOString(),
    ...extra,
  };
}

export type TokenStatus = "ok" | "missing" | "expired" | "used" | "revoked";

export function tokenStatus(t: AuthToken | undefined): TokenStatus {
  if (!t) return "missing";
  if (t.revokedAt) return "revoked";
  if (t.usedAt) return "used";
  if (new Date(t.expiresAt).getTime() < Date.now()) return "expired";
  return "ok";
}

export const TOKEN_MESSAGES: Record<Exclude<TokenStatus, "ok">, string> = {
  missing: "Este enlace no es válido. Puede que se haya copiado mal o que ya no exista.",
  expired: "Este enlace ha caducado. Solicita uno nuevo para continuar.",
  used: "Este enlace ya se ha utilizado. Solicita uno nuevo si necesitas repetir el proceso.",
  revoked: "Este enlace ha sido anulado por un administrador de la organización.",
};

/** Construye el enlace absoluto del "correo" simulado. */
export function tokenLink(path: string, token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${path}?token=${token}`;
}

/** Fuerza de contraseña 0-4 con etiqueta. */
export function passwordStrength(pass: string): { score: number; label: string } {
  let score = 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/\d/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  const s = Math.min(score, 4);
  return { score: s, label: ["Muy débil", "Débil", "Aceptable", "Buena", "Excelente"][s]! };
}
