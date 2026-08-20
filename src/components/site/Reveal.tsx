import type { ReactNode } from "react";

/**
 * Antes animaba la entrada por scroll. La parte pública se ha depurado de
 * animaciones decorativas, así que ahora solo envuelve el contenido y se
 * mantiene para no romper las páginas que ya lo usaban.
 */
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
