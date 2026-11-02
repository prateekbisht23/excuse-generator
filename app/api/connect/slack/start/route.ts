import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SLACK_USER_SCOPES } from "@/lib/connectors/slack";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const state = randomBytes(16).toString("hex");
  (await cookies()).set("slack_oauth_state", state, {
    httpOnly: true, sameSite: "lax", secure: origin.startsWith("https"), maxAge: 600, path: "/",
  });

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID!);
  url.searchParams.set("user_scope", SLACK_USER_SCOPES.join(","));
  url.searchParams.set("redirect_uri", `${origin}/api/connect/slack/callback`);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
