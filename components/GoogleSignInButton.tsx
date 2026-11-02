"use client";

import { useState } from "react";
import { Button } from "prateek-design-system";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setBusy(false);
  }

  return (
    <Button variant="solid" onClick={signIn} disabled={busy}>
      {busy ? "Opening Google" : "Continue with Google"}
    </Button>
  );
}
