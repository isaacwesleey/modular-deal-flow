/**
 * Marca del PRODUCTO (Ventia): logotipo puramente tipográfico, sin símbolo.
 * El carácter está en la tipografía: peso alto, tracking cerrado, la "t" con un
 * corte propio y un punto final como remate.
 * No confundir con `state.branding`, que es la marca configurable de cada
 * organización dentro de la aplicación.
 */
export const VENTIA = {
  name: "Ventia",
  claim: "El CRM que tu equipo sí usa",
  legalName: "[Razón social del titular]",
} as const;

/** Logotipo. `tone` adapta el color al fondo. */
export function VentiaLogo({
  className = "",
  tone = "ink",
  size = "md",
}: {
  className?: string;
  tone?: "ink" | "invert";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" } as const;
  return (
    <span
      className={`display inline-flex items-baseline font-extrabold ${sizes[size]} ${
        tone === "invert" ? "text-white" : "text-ventia-ink"
      } ${className}`}
      style={{ letterSpacing: "-0.045em" }}
    >
      <span>Ventia</span>
      <span aria-hidden className="text-ventia">.</span>
    </span>
  );
}
