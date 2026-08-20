import type { ReactNode } from "react";
import { SiteShell } from "./SiteShell";
import { Reveal } from "./Reveal";

/**
 * Marco de las páginas legales. Los textos entre corchetes son marcadores:
 * el titular del sitio debe sustituirlos por sus datos reales.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <SiteShell>
      <div className="ventia-hero-bg border-b border-ventia-line">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mt-3 text-ventia-ink-soft">{intro}</p>
          <p className="mt-2 text-xs text-ventia-ink-soft">Última actualización: {updated}</p>
        </div>
      </div>
      <Reveal>
        <article className="mx-auto max-w-3xl space-y-8 px-4 py-14 text-[15px] leading-relaxed">
          {children}
        </article>
      </Reveal>
    </SiteShell>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Marcador visible para los datos que debe completar el titular. */
export function Fill({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-ventia-accent/25 px-1 py-0.5 text-[13px] font-semibold text-ventia-ink">
      [{children}]
    </mark>
  );
}
