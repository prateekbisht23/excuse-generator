import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

type OAuthAccess = {
  ok: boolean;
  error?: string;
  team?: { id: string; name: string };
  authed_user?: { id: string; access_token?: string; scope?: string };
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const fail = (reason: string) => NextResponse.redirect(`${origin}/dashboard?slack=${reason}`);

  const jar = await cookies();
  const expected = jar.get("slack_oauth_state")?.value;
  jar.delete("slack_oauth_state");
  const code = searchParams.get("code");
  if (searchParams.get("error")) return fail("denied");
  if (!code || !expected || searchParams.get("state") !== expected) return fail("state");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${origin}/api/connect/slack/callback`,
    }),
  });
  const data = (await res.json()) as OAuthAccess;
  const token = data.authed_user?.access_token;
  if (!data.ok || !token || !data.team || !data.authed_user) return fail("exchange");

  const { error } = await supabase.from("connections").upsert(
    {
      user_id: user.id,
      provider: "slack",
      external_account: `${data.team.id}:${data.authed_user.id}`,
      label: data.team.name,
      encrypted_tokens: encrypt(JSON.stringify({ access_token: token })),
      scopes: (data.authed_user.scope ?? "").split(",").filter(Boolean),
    },
    { onConflict: "user_id,provider,external_account" },
  );
  return fail(error ? "store" : "connected");
}
