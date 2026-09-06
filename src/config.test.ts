import { expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { ConfigError, loadConfig, validateConfig } from "./config.ts";

const fixtureDir = join(import.meta.dir, "fixtures", "config");


async function createRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "awstun-config-"));
}

async function installFixture(root: string, fixture: string, home = false): Promise<string> {
  const path = join(
    root,
    ...(home ? [".config", "aws-tunnels", "config.toml"] : ["aws-tunnels", "config.toml"]),
  );
  await mkdir(dirname(path), { recursive: true });
  await copyFile(join(fixtureDir, fixture), path);
  return path;
}

async function withRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = await createRoot();
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function expectConfigError(error: unknown): ConfigError {
  expect(error).toBeInstanceOf(ConfigError);
  if (!(error instanceof ConfigError)) throw error;
  return error;
}

test("loads the four migrated tunnels from a non-empty XDG configuration home", async () => {

  await withRoot(async (root) => {
    await installFixture(root, "valid-four-tunnels.toml");

    const result = await loadConfig({
      env: { XDG_CONFIG_HOME: root, HOME: join(root, "home") },
      homeDir: join(root, "ignored-home"),
    });

    expect(Object.keys(result.groups)).toEqual(["prod", "staging"]);
    expect(result.groups.prod?.bastion).toEqual({ eip: "107.20.138.57" });
    expect(result.groups.staging?.bastion).toEqual({ eip: "35.170.92.228" });
    expect(result.groups.prod?.tunnels.map((tunnel) => tunnel.label)).toEqual(["app", "legacy"]);
    expect(result.groups.staging?.tunnels.map((tunnel) => tunnel.label)).toEqual(["app", "legacy"]);
    expect(
      [
        ...(result.groups.prod?.tunnels ?? []),
        ...(result.groups.staging?.tunnels ?? []),
      ].map((tunnel) => [tunnel.remoteHost, tunnel.remotePort, tunnel.localPort, tunnel.expectBanner]),
    ).toEqual([
      ["gfour-prod.cgbumsa6wr9j.us-east-1.rds.amazonaws.com", 3306, 13306, true],
      ["69.167.182.74", 3306, 13307, true],
      ["gfour-staging.cgbumsa6wr9j.us-east-1.rds.amazonaws.com", 3306, 13316, true],
      ["69.167.182.76", 3306, 13317, true],
    ]);
  });
});

test("prefers non-empty XDG configuration and falls back to HOME otherwise", async () => {

  await withRoot(async (root) => {
    const xdgRoot = join(root, "xdg");
    const homeRoot = join(root, "home");
    await installFixture(xdgRoot, "valid-four-tunnels.toml");
    const fallbackPath = await installFixture(homeRoot, "valid-four-tunnels.toml", true);
    await Bun.write(
      fallbackPath,
      (await Bun.file(fallbackPath).text()).replace("local_port = 13306", "local_port = 23306"),
    );

    const xdgConfig = await loadConfig({
      env: { XDG_CONFIG_HOME: xdgRoot, HOME: homeRoot },
      homeDir: homeRoot,
    });
    expect(xdgConfig.groups.prod?.tunnels[0]?.localPort).toBe(13306);

    const homeConfig = await loadConfig({
      env: { XDG_CONFIG_HOME: "", HOME: homeRoot },
      homeDir: homeRoot,
    });
    expect(homeConfig.groups.prod?.tunnels[0]?.localPort).toBe(23306);

    const absentXdgConfig = await loadConfig({
      env: { HOME: homeRoot },
      homeDir: homeRoot,
    });
    expect(absentXdgConfig.groups.prod?.tunnels[0]?.localPort).toBe(23306);
  });
});

test("normalizes missing files and malformed TOML into ConfigError", async () => {

  await withRoot(async (root) => {
    const missingPath = join(root, "aws-tunnels", "config.toml");
    await expect(loadConfig({ env: { XDG_CONFIG_HOME: root }, homeDir: root })).rejects.toMatchObject({
      kind: "missing",
      configPath: missingPath,
      issues: [{ path: missingPath, reason: `Create the configuration at ${missingPath}.` }],
    });

    await installFixture(root, "invalid-syntax.toml");
    try {
      await loadConfig({ env: { XDG_CONFIG_HOME: root }, homeDir: root });
      throw new Error("Expected malformed TOML to fail");
    } catch (error) {
      const configError = expectConfigError(error);
      expect(configError).toMatchObject({
        kind: "parse",
        configPath: join(root, "aws-tunnels", "config.toml"),
      });
      expect(configError.issues[0]?.reason).toBeTruthy();
    }
  });
});

test("reports each semantic fixture as an ordered ConfigError issue", async () => {

  const cases = [
    ["duplicate-local-port.toml", "groups.staging.tunnels[0].local_port", "groups.prod.tunnels[0].local_port"],
    ["unknown-field.toml", "groups.prod.tunnels[0].unexpected_key", "Unknown key"],
    ["empty-tunnels.toml", "groups.prod.tunnels", "At least one tunnel"],
    ["incomplete-bastion.toml", "groups.prod.bastion", "incomplete"],
    ["ambiguous-bastion.toml", "groups.prod.bastion", "ambiguous"],
    ["port-out-of-range.toml", "groups.prod.tunnels[0].local_port", "between 1 and 65535"],
  ] as const;

  for (const [fixture, path, reason] of cases) {
    await withRoot(async (root) => {
      await installFixture(root, fixture);

      try {
        await loadConfig({ env: { XDG_CONFIG_HOME: root }, homeDir: root });
        throw new Error(`Expected ${fixture} to fail`);
      } catch (error) {
        const configError = expectConfigError(error);
        expect(configError).toMatchObject({ kind: "validation" });
        const issue = configError.issues.find((candidate) => candidate.path === path);
        expect(issue?.reason).toContain(reason);
      }
    });
  }
});

test("aggregates independent semantic faults in stable document order", () => {

  try {
    validateConfig({
      unexpected_root: true,
      groups: {
        prod: {
          unexpected_group_key: true,
          bastion: { eip: "", instance_id: "" },
          tunnels: [
            {
              unexpected_tunnel_key: true,
              label: "",
              remote_host: "",
              remote_port: 0,
              local_port: 0,
              expect_banner: "true",
            },
          ],
        },
      },
    });
    throw new Error("Expected multi-fault document to fail");
  } catch (error) {
    const configError = expectConfigError(error);
    expect(configError).toMatchObject({ kind: "validation" });
    expect(configError.issues.map((issue) => issue.path)).toEqual([
      "unexpected_root",
      "groups.prod.unexpected_group_key",
      "groups.prod.bastion",
      "groups.prod.tunnels[0].unexpected_tunnel_key",
      "groups.prod.tunnels[0].label",
      "groups.prod.tunnels[0].remote_host",
      "groups.prod.tunnels[0].remote_port",
      "groups.prod.tunnels[0].local_port",
      "groups.prod.tunnels[0].expect_banner",
    ]);
  }
});
