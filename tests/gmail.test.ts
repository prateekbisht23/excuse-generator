import test from "node:test";
import assert from "node:assert/strict";
import { buildRawEmail, EMAIL_RE } from "../lib/connectors/gmail.ts";

const decode = (raw: string) => Buffer.from(raw, "base64url").toString("utf8");

test("raw email has headers and a base64 UTF-8 body", () => {
  const mime = decode(buildRawEmail("me@x.com", "boss@x.com", "Working from home today", "Cat sat on laptop 🐈"));
  assert.match(mime, /^From: me@x\.com\r\nTo: boss@x\.com\r\nSubject: Working from home today\r\n/);
  const body = mime.split("\r\n\r\n")[1];
  assert.equal(Buffer.from(body, "base64").toString("utf8"), "Cat sat on laptop 🐈");
});

test("non-ASCII subjects are RFC 2047 encoded", () => {
  const mime = decode(buildRawEmail("a@x.com", "b@x.com", "WFH 🏠", "hi"));
  assert.match(mime, /Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=/);
});

test("newlines cannot inject extra headers", () => {
  const mime = decode(buildRawEmail("a@x.com", "b@x.com\r\nBcc: evil@x.com", "hi\nBcc: evil@x.com", "body"));
  const headers = mime.split("\r\n\r\n")[0].split("\r\n");
  assert.ok(!headers.some((h) => h.startsWith("Bcc:")));
});

test("email validation", () => {
  assert.ok(EMAIL_RE.test("manager@company.com"));
  for (const bad of ["nope", "a@b", "a b@c.com", "a@b.com, c@d.com", "<a@b.com>"]) assert.ok(!EMAIL_RE.test(bad), bad);
});
