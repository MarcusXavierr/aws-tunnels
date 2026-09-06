import { expect, test } from "bun:test";

import pkg from "../package.json";
import { EXIT, runCli, type CliIo } from "./cli.ts";

function createIo(): { io: CliIo; out: () => string; err: () => string } {
  let stdout = "";
  let stderr = "";

  return {
    io: {
      out: (text) => {
        stdout += text;
      },
      err: (text) => {
        stderr += text;
      },
    },
    out: () => stdout,
    err: () => stderr,
  };
}

async function run(argv: string[]) {
  const capture = createIo();
  const exitCode = await runCli(argv, capture.io);
  return { exitCode, ...capture };
}

test("prints the documented help for --help", async () => {
  const result = await run(["--help"]);

  expect(result.exitCode).toBe(EXIT.ok);
  expect(result.out()).toContain("up <group>");
  expect(result.out()).toContain("ls");
  expect(result.out()).toContain("config check");
  expect(result.out()).toContain("2  incorrect usage");
  expect(result.err()).toBe("");
});

test("reports missing commands as incorrect usage", async () => {
  const result = await run([]);

  expect(result.exitCode).toBe(EXIT.usage);
  expect(result.err()).toContain("usage: awstun <command> [args]");
  expect(result.out()).toBe("");
});

test("reports unknown commands with usage on stderr", async () => {
  const result = await run(["banana"]);

  expect(result.exitCode).toBe(EXIT.usage);
  expect(result.err()).toContain("unknown command 'banana'");
  expect(result.err()).toContain("usage: awstun <command> [args]");
  expect(result.out()).toBe("");
});

test("reports unknown global options as incorrect usage", async () => {
  const result = await run(["--banana"]);

  expect(result.exitCode).toBe(EXIT.usage);
  expect(result.err()).toContain("Unknown option");
});

test("prints the package version", async () => {
  const result = await run(["--version"]);

  expect(result.exitCode).toBe(EXIT.ok);
  expect(result.out().trim()).toBe(`awstun ${pkg.version}`);
});

test("suggests a complete config command for its incomplete prefix", async () => {
  const result = await run(["config"]);

  expect(result.exitCode).toBe(EXIT.usage);
  expect(result.err()).toContain("awstun config check");
});

test("reports unimplemented up as an execution failure", async () => {
  const result = await run(["up"]);

  expect(result.exitCode).toBe(EXIT.failure);
  expect(result.err()).toBe("awstun: 'up' is not implemented yet\n");
});

test("prints command help without invoking an unimplemented command", async () => {
  const result = await run(["up", "--help"]);

  expect(result.exitCode).toBe(EXIT.ok);
  expect(result.out()).toContain("awstun up <group>");
});

test("reports unimplemented ls as an execution failure", async () => {
  const result = await run(["ls"]);

  expect(result.exitCode).toBe(EXIT.failure);
  expect(result.err()).toContain("'ls' is not implemented yet");
});

test("the entrypoint preserves returned process exit codes", () => {
  const help = Bun.spawnSync(["bun", "src/main.ts", "--help"]);
  expect(help.exitCode).toBe(0);

  const bad = Bun.spawnSync(["bun", "src/main.ts", "banana"]);
  expect(bad.exitCode).toBe(2);
  expect(bad.stdout.toString()).toBe("");
  expect(bad.stderr.toString()).toContain("usage: awstun");
});
