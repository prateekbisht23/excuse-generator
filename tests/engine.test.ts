import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decrypt, encrypt } from "../lib/crypto.ts";
import { bankExcuse, cleanExcuse } from "../lib/excuses/bank.ts";

process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

test("encryption round trip, with a fresh IV each time", () => {
  const a = encrypt("xoxp-secret");
  assert.equal(decrypt(a), "xoxp-secret");
  assert.notEqual(a, encrypt("xoxp-secret"));
});

test("tampered ciphertext is rejected", () => {
  const buf = Buffer.from(encrypt("hello"), "base64");
  buf[buf.length - 1] ^= 1;
  assert.throws(() => decrypt(buf.toString("base64")));
});

test("cleanExcuse strips quotes, keeps one line, rejects sensitive or odd output", () => {
  assert.equal(cleanExcuse('"My cat called a meeting."\nextra'), "My cat called a meeting.");
  assert.equal(cleanExcuse("A funeral came up suddenly."), null);
  assert.equal(cleanExcuse("ok"), null);
  assert.equal(cleanExcuse("x".repeat(200)), null);
});

test("bankExcuse avoids repeats when it can", () => {
  const first = bankExcuse("wfh");
  for (let i = 0; i < 30; i++) assert.notEqual(bankExcuse("wfh", [first]), first);
});
