import { Button } from "prateek-design-system";
import { ChannelManager } from "@/components/ChannelManager";
import { COMING_SOON, PROVIDERS } from "@/lib/providers";

export type Conn = { id: string; provider: string; label: string | null };
export type Dest = { id: string; connection_id: string; label: string; templates: unknown; persona_updated_at: string | null };

/** Every provider in one list: connected accounts with their destinations, then ones to connect, then coming soon. */
export function ConnectedApps({ conns, targets }: { conns: Conn[]; targets: Dest[] }) {
  return (
    <div className="ex-apps">
      {PROVIDERS.map((p) => {
        const mine = conns.filter((c) => c.provider === p.id);
        if (!mine.length) {
          return (
            <div key={p.id} className="ex-app">
              <div className="ex-app-head">
                <span className="ex-mono-badge muted" aria-hidden="true">{p.letter}</span>
                <div className="ex-app-name"><strong>{p.name}</strong><span>{p.blurb}</span></div>
                <Button variant="ghost" href={p.connectHref}>Connect {p.name}</Button>
              </div>
            </div>
          );
        }
        return mine.map((c, i) => (
          <div key={c.id} className="ex-app">
            <div className="ex-app-head">
              <span className="ex-mono-badge" aria-hidden="true">{p.letter}</span>
              <div className="ex-app-name">
                <strong>{p.name}</strong>
                <span>{p.id === "slack" ? `Workspace ${c.label}` : c.label}</span>
              </div>
              <span className="ex-tag on">Connected</span>
              {i === mine.length - 1 ? <Button variant="text" href={p.connectHref}>Add another</Button> : null}
            </div>
            <ChannelManager
              connectionId={c.id}
              provider={p.id}
              targets={targets.filter((t) => t.connection_id === c.id).map((t) => ({
                id: t.id, label: t.label, templates: t.templates as Record<string, string>, learned: Boolean(t.persona_updated_at),
              }))}
            />
          </div>
        ));
      })}
      {COMING_SOON.map((p) => (
        <div key={p.name} className="ex-app">
          <div className="ex-app-head">
            <span className="ex-mono-badge muted" aria-hidden="true">{p.letter}</span>
            <div className="ex-app-name"><strong style={{ color: "var(--ink-muted)" }}>{p.name}</strong><span>Coming soon</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}
