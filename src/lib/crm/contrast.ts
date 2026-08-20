/**
 * Calcula un color de texto legible sobre el color de marca.
 * Acepta valores oklch("oklch(L C H)") y hex (#rrggbb).
 */
function brandLightness(color: string): number {
  const oklch = color.match(/oklch\(\s*([\d.]+%?)/i);
  if (oklch?.[1]) {
    const raw = oklch[1];
    const n = parseFloat(raw);
    return raw.endsWith("%") ? n / 100 : n;
  }
  const hex = color.trim().match(/^#?([0-9a-f]{6})$/i);
  if (hex?.[1]) {
    const int = parseInt(hex[1], 16);
    const srgb = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    // aproximación perceptual similar a la L de oklch
    return Math.cbrt(lum);
  }
  return 0.55;
}

/** Umbral: marcas claras (ámbar, lima...) necesitan texto oscuro. */
export function brandForeground(color: string): string {
  return brandLightness(color) > 0.68
    ? "oklch(0.21 0.03 264)" // texto oscuro
    : "oklch(0.985 0.003 248)"; // texto claro
}