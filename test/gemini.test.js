import test from "node:test";
import assert from "node:assert/strict";
import { callGeminiWithRetry } from "../lib/gemini.js";

const reply = (status) => ({ ok: status >= 200 && status < 300, status });
const noSleep = async () => {};

test("retries a transient 503 and succeeds on the next attempt", async () => {
  const statuses = [503, 200];
  let calls = 0;
  const { response, attempts } = await callGeminiWithRetry({
    url: "x", init: {}, sleep: noSleep,
    fetchImpl: async () => reply(statuses[calls++]),
  });
  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
});

test("does not retry a non-transient 400", async () => {
  let calls = 0;
  await assert.rejects(
    callGeminiWithRetry({ url: "x", init: {}, sleep: noSleep, fetchImpl: async () => { calls++; return reply(400); } }),
    (error) => error.status === 400,
  );
  assert.equal(calls, 1);
});

test("gives up with a 503 after three transient failures", async () => {
  let calls = 0;
  await assert.rejects(
    callGeminiWithRetry({ url: "x", init: {}, sleep: noSleep, fetchImpl: async () => { calls++; return reply(503); } }),
    (error) => error.status === 503 && /tried 3 times/.test(error.message),
  );
  assert.equal(calls, 3);
});

test("retries after a network error", async () => {
  let calls = 0;
  const { attempts } = await callGeminiWithRetry({
    url: "x", init: {}, sleep: noSleep,
    fetchImpl: async () => { if (calls++ === 0) throw new TypeError("fetch failed"); return reply(200); },
  });
  assert.equal(attempts, 2);
});
