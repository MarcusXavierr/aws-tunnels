import { homedir } from "node:os";
import { join } from "node:path";

export interface TunnelConfig {
  readonly label: string;
  readonly remoteHost: string;
  readonly remotePort: number;
  readonly localPort: number;
  readonly expectBanner: boolean;
}

export type BastionConfig =
  | { readonly eip: string }
  | { readonly instanceId: string };

export interface GroupConfig {
  readonly bastion: BastionConfig;
  readonly tunnels: readonly TunnelConfig[];
}

export interface Config {
  readonly groups: Readonly<Record<string, GroupConfig>>;
}

export interface ConfigIssue {
  readonly path: string;
  readonly reason: string;
}

export class ConfigError extends Error {
  readonly kind: "missing" | "parse" | "validation" | "read";
  readonly configPath: string;
  readonly issues: readonly ConfigIssue[];

  constructor(
    kind: ConfigError["kind"],
    configPath: string,
    issues: readonly ConfigIssue[],
  ) {
    super(issues.map((issue) => `${issue.path}: ${issue.reason}`).join("\n"));
    this.name = "ConfigError";
    this.kind = kind;
    this.configPath = configPath;
    this.issues = issues;
  }
}

/**
 * The only accepted configuration shape:
 *
 * [groups.prod.bastion]
 * eip = "107.20.138.57"
 *
 * [[groups.prod.tunnels]]
 * label = "app"
 * remote_host = "database.example.com"
 * remote_port = 3306
 * local_port = 13306
 * expect_banner = true
 */
export function resolveConfigPath(
  env: NodeJS.ProcessEnv = process.env,
  homeDir: string = homedir(),
): string {
  const configHome = env.XDG_CONFIG_HOME;
  return configHome
    ? join(configHome, "aws-tunnels", "config.toml")
    : join(homeDir, ".config", "aws-tunnels", "config.toml");
}

export function validateConfig(document: object): Config {
  const issues: ConfigIssue[] = [];
  const localPortPaths = new Map<number, string>();
  const groups: Record<string, GroupConfig> = {};

  if (!isRecord(document)) {
    throw validationError(issues, "configuration", "An object is required.");
  }

  addUnknownKeyIssues(document, new Set(["groups"]), "", issues);

  const groupsDocument = document.groups;
  if (!isRecord(groupsDocument) || Object.keys(groupsDocument).length === 0) {
    throw validationError(issues, "groups", "At least one group is required.");
  }

  for (const [groupName, groupDocument] of Object.entries(groupsDocument)) {
    const groupPath = `groups.${groupName}`;
    if (groupName.trim().length === 0) {
      issues.push({ path: groupPath, reason: "Group names must be non-empty." });
      continue;
    }
    if (!isRecord(groupDocument)) {
      issues.push({ path: groupPath, reason: "An object is required." });
      continue;
    }

    addUnknownKeyIssues(groupDocument, new Set(["bastion", "tunnels"]), groupPath, issues);

    const bastion = validateBastion(groupDocument.bastion, `${groupPath}.bastion`, issues);
    const tunnels = validateTunnels(
      groupDocument.tunnels,
      `${groupPath}.tunnels`,
      localPortPaths,
      issues,
    );

    if (bastion && tunnels) groups[groupName] = { bastion, tunnels };
  }

  if (issues.length > 0) throw new ConfigError("validation", "", issues);
  return { groups };
}

export async function loadConfig(options?: {
  readonly env?: NodeJS.ProcessEnv;
  readonly homeDir?: string;
}): Promise<Config> {
  let configPath: string;
  try {
    configPath = resolveConfigPath(options?.env, options?.homeDir);
  } catch (error) {
    throw new ConfigError("read", "", [
      { path: "configuration", reason: safeReason(error, "Unable to resolve the configuration path.") },
    ]);
  }

  let source: string;
  try {
    source = await Bun.file(configPath).text();
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      throw new ConfigError("missing", configPath, [
        { path: configPath, reason: `Create the configuration at ${configPath}.` },
      ]);
    }
    throw new ConfigError("read", configPath, [
      { path: configPath, reason: safeReason(error, "Unable to read the configuration file.") },
    ]);
  }

  let document: object;
  try {
    document = Bun.TOML.parse(source);
  } catch (error) {
    throw new ConfigError("parse", configPath, [
      { path: configPath, reason: safeReason(error, "Invalid TOML.") },
    ]);
  }

  try {
    return validateConfig(document);
  } catch (error) {
    if (error instanceof ConfigError) {
      if (error.kind === "validation") {
        throw new ConfigError(error.kind, configPath, error.issues);
      }
      throw error;
    }
    throw new ConfigError("validation", configPath, [
      { path: "configuration", reason: safeReason(error, "Invalid configuration.") },
    ]);
  }
}

function validateBastion(
  value: unknown,
  path: string,
  issues: ConfigIssue[],
): BastionConfig | undefined {
  if (!isRecord(value)) {
    issues.push({ path, reason: "Bastion is incomplete: provide exactly one non-empty eip or instance_id." });
    return undefined;
  }

  addUnknownKeyIssues(value, new Set(["eip", "instance_id"]), path, issues);

  const eip = nonEmptyString(value.eip);
  const instanceId = nonEmptyString(value.instance_id);
  if (!eip && !instanceId) {
    issues.push({ path, reason: "Bastion is incomplete: provide exactly one non-empty eip or instance_id." });
    return undefined;
  }
  if (eip && instanceId) {
    issues.push({ path, reason: "Bastion is ambiguous: provide only one of eip or instance_id." });
    return undefined;
  }
  return eip ? { eip } : { instanceId: instanceId! };
}

function validateTunnels(
  value: unknown,
  path: string,
  localPortPaths: Map<number, string>,
  issues: ConfigIssue[],
): TunnelConfig[] | undefined {
  if (!Array.isArray(value)) {
    issues.push({ path, reason: "A non-empty tunnels array is required." });
    return undefined;
  }
  if (value.length === 0) {
    issues.push({ path, reason: "At least one tunnel is required." });
    return undefined;
  }

  const tunnels: TunnelConfig[] = [];
  for (const [index, tunnelDocument] of value.entries()) {
    const tunnelPath = `${path}[${index}]`;
    if (!isRecord(tunnelDocument)) {
      issues.push({ path: tunnelPath, reason: "An object is required." });
      continue;
    }

    addUnknownKeyIssues(
      tunnelDocument,
      new Set(["label", "remote_host", "remote_port", "local_port", "expect_banner"]),
      tunnelPath,
      issues,
    );

    const label = requiredString(tunnelDocument.label, `${tunnelPath}.label`, issues);
    const remoteHost = requiredString(
      tunnelDocument.remote_host,
      `${tunnelPath}.remote_host`,
      issues,
    );
    const remotePort = requiredPort(
      tunnelDocument.remote_port,
      `${tunnelPath}.remote_port`,
      issues,
    );
    const localPortPath = `${tunnelPath}.local_port`;
    const localPort = requiredPort(tunnelDocument.local_port, localPortPath, issues);
    const expectBanner = requiredBoolean(
      tunnelDocument.expect_banner,
      `${tunnelPath}.expect_banner`,
      issues,
    );

    if (localPort !== undefined) {
      const priorPath = localPortPaths.get(localPort);
      if (priorPath) {
        issues.push({ path: localPortPath, reason: `Duplicates local port configured at ${priorPath}.` });
      } else {
        localPortPaths.set(localPort, localPortPath);
      }
    }

    if (
      label !== undefined &&
      remoteHost !== undefined &&
      remotePort !== undefined &&
      localPort !== undefined &&
      expectBanner !== undefined
    ) {
      tunnels.push({ label, remoteHost, remotePort, localPort, expectBanner });
    }
  }

  return tunnels;
}

function addUnknownKeyIssues(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  path: string,
  issues: ConfigIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      issues.push({ path: path ? `${path}.${key}` : key, reason: "Unknown key." });
    }
  }
}

function requiredString(value: unknown, path: string, issues: ConfigIssue[]): string | undefined {
  const result = nonEmptyString(value);
  if (result === undefined) {
    issues.push({ path, reason: "Must be a non-empty string." });
  }
  return result;
}

function requiredPort(value: unknown, path: string, issues: ConfigIssue[]): number | undefined {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 65535) {
    issues.push({ path, reason: "Must be a safe integer between 1 and 65535." });
    return undefined;
  }
  return value;
}

function requiredBoolean(value: unknown, path: string, issues: ConfigIssue[]): boolean | undefined {
  if (typeof value !== "boolean") {
    issues.push({ path, reason: "Must be a boolean." });
    return undefined;
  }
  return value;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validationError(issues: ConfigIssue[], path: string, reason: string): ConfigError {
  issues.push({ path, reason });
  return new ConfigError("validation", "", issues);
}

function errorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === "string" ? error.code : undefined;
}

function safeReason(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0 ? error.message : fallback;
}
