import type { ReactNode } from "react";
import Link from "next/link";

export type AppLink = { label: string; href: string; active?: boolean };

/** Full-width top bar with a centered inner container. Same type and hairline as the design system's Header. */
export function AppHeader({ links, children }: { links: AppLink[]; children?: ReactNode }) {
  return (
    <header className="ex-bar">
      <div className="ex-bar-in">
        <Link className="pk-header-name" href="/">Excuse generator</Link>
        <nav className="pk-nav" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={l.active ? "page" : undefined}>{l.label}</Link>
          ))}
          {children}
        </nav>
      </div>
    </header>
  );
}
