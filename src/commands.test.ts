import { expect, test } from "bun:test";

import { COMMANDS, findCommand } from "./commands.ts";

test("registers the three documented command paths", () => {
  expect(COMMANDS.map((command) => command.path.join(" "))).toEqual(["up", "ls", "config check"]);
});

test("matches a complete command and keeps its remaining arguments", () => {
  const match = findCommand(["config", "check", "--strict"]);

  expect(match.kind).toBe("exact");
  if (match.kind === "exact") {
    expect(match.command.path).toEqual(["config", "check"]);
    expect(match.rest).toEqual(["--strict"]);
  }
});

test("reports a command-prefix as incomplete with its candidate usage", () => {
  const match = findCommand(["config"]);

  expect(match.kind).toBe("incomplete");
  if (match.kind === "incomplete") {
    expect(match.prefix).toBe("config");
    expect(match.candidates.map((command) => command.usage)).toEqual(["awstun config check"]);
  }
});

test("reports an unregistered command as unknown", () => {
  expect(findCommand(["banana"])).toEqual({ kind: "unknown", token: "banana" });
});
