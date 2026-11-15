import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { exchangeCode } from "@/lib/connectors/gmail";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const done = (reason: string) => NextResponse.redirect(`${origin}/dashboard?gmail=${reason}`);

  const jar = await cookies();
  const expected = jar.get("gmail_oauth_state")?.value;
  jar.delete("gmail_oauth_state");
  const code = searchParams.get("code");
  if (searchParams.get("error")) return done("denied");
  if (!code || !expected || searchParams.get("state") !== expected) return done("state");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  let got: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    got = await exchangeCode(origin, code);
  } catch {
    return done("exchange");
  }
  if (!got.scopes.includes("https://www.googleapis.com/auth/gmail.send")) return done("scope");

  const { error } = await supabase.from("connections").upsert(
    {
      user_id: user.id,
      provider: "gmail",
      external_account: got.email,
      label: got.email,
      encrypted_tokens: encrypt(JSON.stringify({ refresh_token: got.refreshToken })),
      scopes: got.scopes,
    },
    { onConflict: "user_id,provider,external_account" },
  );
  return done(error ? "store" : "connected");
}
