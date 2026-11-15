"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "prateek-design-system";

export function DisconnectButton({ id, name, destinations }: { id: string; name: string; destinations: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    const extra = destinations ? ` Its ${destinations} destination${destinations === 1 ? "" : "s"} and their schedules are removed too.` : "";
    if (!confirm(`Disconnect ${name}?${extra} Your history is kept.`)) return;
    setBusy(true);
    await fetch(`/api/connections/${id}`, { method: "DELETE" });
    setBusy(false); router.refresh();
  }
  return <Button variant="text" onClick={go} disabled={busy}>{busy ? "Disconnecting" : "Disconnect"}</Button>;
}
