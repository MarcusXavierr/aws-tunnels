import { expect, test } from "bun:test";

import { createLogger, formatLine } from "./logger.ts";

const linePattern = /^\d{2}:\d{2}:\d{2} {2}(a|b) {2}msg-\d+$/;

function createChunkedSink(buffer: { value: string }) {
  return async (text: string) => {
    for (const character of text) {
      buffer.value += character;
      await Promise.resolve();
    }
  };
}

test("formats a log line with local zero-padded time and scopes", () => {
  expect(formatLine(new Date(2026, 8, 6, 7, 5, 3), "prod/legacy", "ready")).toBe(
    "07:05:03  prod/legacy  ready\n",
  );
});

test("writes a multi-line payload in one sink call without a trailing blank line", async () => {
  const calls: string[] = [];
  const logger = createLogger({
    clock: () => new Date(2026, 8, 6, 7, 5, 3),
    sink: (text) => {
      calls.push(text);
    },
  });

  await logger.log("prod", "a\nb\n");

  expect(calls).toEqual(["07:05:03  prod  a\n07:05:03  prod  b\n"]);
});

test("serializes concurrent log writes so chunked output never interleaves", async () => {
  const buffer = { value: "" };
  const logger = createLogger({
    clock: () => new Date(2026, 8, 6, 7, 5, 3),
    sink: createChunkedSink(buffer),
  });

  await Promise.all(
    Array.from({ length: 50 }, (_, index) => [
      logger.log("a", `msg-${index}`),
      logger.log("b", `msg-${index}`),
    ]).flat(),
  );

  const lines = buffer.value.split("\n").filter(Boolean);
  expect(lines).toHaveLength(100);
  expect(lines.every((line) => linePattern.test(line))).toBe(true);
});

test("the chunked sink control interleaves without logger serialization", async () => {
  const buffer = { value: "" };
  const sink = createChunkedSink(buffer);
  const lines = Array.from({ length: 50 }, (_, index) => [
    formatLine(new Date(2026, 8, 6, 7, 5, 3), "a", `msg-${index}`),
    formatLine(new Date(2026, 8, 6, 7, 5, 3), "b", `msg-${index}`),
  ]).flat();

  await Promise.all(lines.map((line) => sink(line)));

  expect(buffer.value.split("\n").filter(Boolean).some((line) => !linePattern.test(line))).toBe(true);
});

test("continues logging after a sink failure", async () => {
  const calls: string[] = [];
  let attempts = 0;
  const logger = createLogger({
    clock: () => new Date(2026, 8, 6, 7, 5, 3),
    sink: (text) => {
      attempts += 1;
      if (attempts === 1) throw new Error("EPIPE");
      calls.push(text);
    },
  });

  await expect(logger.log("prod", "lost")).resolves.toBeUndefined();
  await expect(logger.log("prod", "recovered")).resolves.toBeUndefined();

  expect(calls).toEqual(["07:05:03  prod  recovered\n"]);
});

test("creates a reusable scope-bound logger", async () => {
  const calls: string[] = [];
  const logger = createLogger({
    clock: () => new Date(2026, 8, 6, 7, 5, 3),
    sink: (text) => {
      calls.push(text);
    },
  });

  const logProdLegacy = logger.scoped("prod/legacy");
  await logProdLegacy("ready");
  await logProdLegacy("connected");

  expect(calls).toEqual([
    "07:05:03  prod/legacy  ready\n",
    "07:05:03  prod/legacy  connected\n",
  ]);
});
