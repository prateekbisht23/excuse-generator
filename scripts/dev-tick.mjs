// Local stand-in for the production scheduler: calls /api/cron/tick every minute.
// Production uses Supabase pg_cron + pg_net instead. Run with: npm run dev:tick  (add -- --dry to skip sending)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const base = process.env.TICK_URL ?? "http://localhost:3000";
const dry = process.argv.includes("--dry") ? "?dry=1" : "";

async function tick() {
  try {
    const res = await fetch(`${base}/api/cron/tick${dry}`, { method: "POST", headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
    const json = await res.json();
    console.log(new Date().toISOString(), res.status, JSON.stringify(json));
  } catch (e) {
    console.log(new Date().toISOString(), "tick failed:", e.message);
  }
}
await tick();
setInterval(tick, 60_000);
