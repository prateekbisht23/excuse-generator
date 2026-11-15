import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { gmailAuthUrl } from "@/lib/connectors/gmail";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const state = randomBytes(16).toString("hex");
  (await cookies()).set("gmail_oauth_state", state, {
    httpOnly: true, sameSite: "lax", secure: origin.startsWith("https"), maxAge: 600, path: "/",
  });
  return NextResponse.redirect(gmailAuthUrl(origin, state));
}
