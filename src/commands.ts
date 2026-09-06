import type { CliIo } from "./cli.ts";

export interface CommandContext {
  argv: string[];
  io: CliIo;
}

export interface Command {
  readonly path: readonly string[];
  readonly usage: string;
  readonly summary: string;
  readonly run?: (ctx: CommandContext) => Promise<number>;
}

export const COMMANDS: readonly Command[] = [
  {
    path: ["up"],
    usage: "awstun up <group>",
    summary: "Bring up every tunnel of a group and supervise it",
  },
  { path: ["ls"], usage: "awstun ls", summary: "List configured groups and tunnels" },
  {
    path: ["config", "check"],
    usage: "awstun config check",
    summary: "Validate the configuration file",
  },
];

export type CommandMatch =
  | { kind: "exact"; command: Command; rest: string[] }
  | { kind: "incomplete"; prefix: string; candidates: Command[] }
  | { kind: "unknown"; token: string };

export function findCommand(tokens: readonly string[]): CommandMatch {
  const [first] = tokens;
  if (first === undefined) throw new Error("findCommand requires at least one token");

  const byLongestPath = [...COMMANDS].sort((left, right) => right.path.length - left.path.length);
  for (const command of byLongestPath) {
    if (
      tokens.length >= command.path.length &&
      command.path.every((segment, index) => tokens[index] === segment)
    ) {
      return { kind: "exact", command, rest: tokens.slice(command.path.length) };
    }
  }

  const candidates = COMMANDS.filter(
    (command) =>
      tokens.length < command.path.length &&
      tokens.every((token, index) => command.path[index] === token),
  );
  if (candidates.length > 0) return { kind: "incomplete", prefix: first, candidates };

  return { kind: "unknown", token: first };
}
