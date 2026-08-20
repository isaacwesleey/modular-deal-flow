/**
 * Marca del PRODUCTO (Ventia). No confundir con `state.branding`, que es la
 * marca configurable de cada organización dentro de la aplicación.
 */
export const VENTIA = {
  name: "Ventia",
  claim: "El CRM que tu equipo sí usa",
  legalName: "[Razón social del titular]",
} as const;

export function VentiaMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="Ventia">
      <defs>
        <linearGradient id="ventia-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.46 0.11 205)" />
          <stop offset="100%" stopColor="oklch(0.72 0.14 178)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ventia-g)" />
      <path
        d="M11 12.5 L20 27.5 L29 12.5"
        fill="none"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29" cy="12.5" r="3.6" fill="oklch(0.81 0.16 78)" />
    </svg>
  );
}

export function VentiaLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <VentiaMark className="h-8 w-8" />
      <span className="display text-lg font-bold tracking-tight text-ventia-ink">Ventia</span>
    </span>
  );
}
