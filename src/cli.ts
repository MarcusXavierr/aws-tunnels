import { parseArgs } from "node:util";

import pkg from "../package.json";
import { COMMANDS, findCommand } from "./commands.ts";

export interface CliIo {
  out: (text: string) => void | Promise<void>;
  err: (text: string) => void | Promise<void>;
}

export const EXIT = { ok: 0, failure: 1, usage: 2 } as const;

export const defaultIo: CliIo = {
  out: (text) => {
    process.stdout.write(text);
  },
  err: (text) => {
    process.stderr.write(text);
  },
};

const USAGE_SHORT = `usage: awstun <command> [args]
commands: ${COMMANDS.map((command) => command.path.join(" ")).join(", ")}
try 'awstun --help' for details
`;

export function buildHelp(): string {
  const commands = COMMANDS.map((command) => {
    const usage = command.usage.slice("awstun ".length);
    return `  ${usage.padEnd(16)}${command.summary}`;
  });

  return [
    "awstun — SSM database tunnels that stay up",
    "",
    "usage: awstun <command> [args]",
    "",
    "commands:",
    ...commands,
    "",
    "options:",
    "  -h, --help      Show this help and exit",
    "      --version   Show the version and exit",
    "",
    "exit codes:",
    "  0  success",
    "  1  execution failure",
    "  2  incorrect usage",
    "",
  ].join("\n");
}

export async function runCli(argv: string[], io: CliIo = defaultIo): Promise<number> {
  const cut = argv.findIndex((token) => !token.startsWith("-"));
  const globals = cut < 0 ? argv : argv.slice(0, cut);
  let tokens = cut < 0 ? [] : argv.slice(cut);

  let values: { help?: boolean; version?: boolean };
  try {
    ({ values } = parseArgs({
      args: globals,
      options: {
        help: { type: "boolean", short: "h" },
        version: { type: "boolean" },
      },
      allowPositionals: false,
      strict: true,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await io.err(`awstun: ${message}\n\n${USAGE_SHORT}`);
    return EXIT.usage;
  }

  if (values.version) {
    await io.out(`awstun ${pkg.version}\n`);
    return EXIT.ok;
  }


  if (tokens.length === 0) {
    if (values.help) {
      await io.out(buildHelp());
      return EXIT.ok;
    }

    await io.err(USAGE_SHORT);
    return EXIT.usage;
  }

  const match = findCommand(tokens);
  if (match.kind === "unknown") {
    await io.err(`awstun: unknown command '${match.token}'\n\n${USAGE_SHORT}`);
    return EXIT.usage;
  }

  if (match.kind === "incomplete") {
    await io.err(
      `awstun: '${match.prefix}' is not a command by itself\n\ndid you mean:\n${match.candidates.map((command) => `  ${command.usage}\n`).join("")}`,
    );
    return EXIT.usage;
  }

  if (values.help || match.rest.includes("--help") || match.rest.includes("-h")) {
    await io.out(`${match.command.usage}\n\n${match.command.summary}\n`);
    return EXIT.ok;
  }

  if (match.command.run === undefined) {
    await io.err(`awstun: '${match.command.path.join(" ")}' is not implemented yet\n`);
    return EXIT.failure;
  }

  return match.command.run({ argv: match.rest, io });
}
