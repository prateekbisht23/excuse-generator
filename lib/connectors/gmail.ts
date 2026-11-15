// Gmail connector: our own Google OAuth (separate from Supabase sign-in) with the gmail.send scope only.
export const GMAIL_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.send"];

export function gmailRedirectUri(origin: string) {
  return `${origin}/api/connect/gmail/callback`;
}

export function gmailAuthUrl(origin: string, state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", gmailRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline"); // we need a refresh token for scheduled sends
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url;
}

type TokenResponse = { access_token?: string; refresh_token?: string; id_token?: string; scope?: string; error?: string; error_description?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...params,
    }),
    cache: "no-store",
  });
  return (await res.json()) as TokenResponse;
}

/** Exchanges the OAuth code. Returns the refresh token, the Google account email and granted scopes. */
export async function exchangeCode(origin: string, code: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: gmailRedirectUri(origin) });
  if (!t.refresh_token || !t.id_token) throw new Error(t.error_description ?? t.error ?? "no refresh token");
  // The id_token comes straight from Google's token endpoint over TLS, so reading its payload is safe here.
  const claims = JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url").toString("utf8")) as { email?: string; sub: string };
  return { refreshToken: t.refresh_token, email: claims.email ?? claims.sub, scopes: (t.scope ?? "").split(" ").filter(Boolean) };
}

async function accessToken(refreshToken: string) {
  const t = await tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
  if (!t.access_token) {
    throw new Error(t.error === "invalid_grant" ? "Gmail access expired. Reconnect Gmail on the dashboard." : `gmail token: ${t.error ?? "unknown_error"}`);
  }
  return t.access_token;
}

/** RFC 2047 encoding so non-ASCII subjects (and emoji) survive. */
function encodeHeader(v: string) {
  return /^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`;
}

export function buildRawEmail(from: string, to: string, subject: string, body: string) {
  const clean = (s: string) => s.replace(/[\r\n]+/g, " ").trim(); // no header injection
  const mime = [
    `From: ${clean(from)}`,
    `To: ${clean(to)}`,
    `Subject: ${encodeHeader(clean(subject))}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf8").toString("base64"),
  ].join("\r\n");
  return Buffer.from(mime, "utf8").toString("base64url");
}

export async function sendEmail(refreshToken: string, from: string, to: string, subject: string, body: string) {
  const token = await accessToken(refreshToken);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: buildRawEmail(from, to, subject, body) }),
    cache: "no-store",
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`gmail send: ${j.error?.message ?? res.status}`);
  }
  return (await res.json()) as { id: string };
}

export const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
