# [CLI] Read and validate the tunnel configuration file

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#7](https://github.com/MarcusXavierr/aws-tunnels/issues/7)
**Status:** created

**Depends on:** 01

## Goal

The tunnel list now lives in an editable TOML file instead of being written into `~/.zshrc`.

## Context

Every tunnel that exists today is hard-coded inside a shell function, so adding a connection means copying and pasting thirty lines. `awstun` reads everything from `~/.config/aws-tunnels/config.toml`: groups (`prod`, `staging`), each one's bastion, and the tunnel list with remote host, remote port, local port, and the `expect_banner` flag. A configuration error must point at the guilty key, because a malformed TOML in the middle of the morning cannot become a stack trace.

## What needs to happen

File types, a loader respecting `XDG_CONFIG_HOME`, and parsing with `Bun.TOML.parse` (available in Bun 1.4, zero dependencies). Validation separate from parsing: duplicate local port within the file, unknown field, group without tunnels, `bastion` with neither `eip` nor `instance_id`, port out of range. Every error carries the key path, for example `groups.prod.tunnels[1].local_port`.

## Done when

* A valid config with today's four tunnels loads and returns a typed structure
* Every validation error cites the key and the reason, and none of them propagates a raw exception
* A missing file produces a message saying where to create it, not `ENOENT`
* `XDG_CONFIG_HOME` is respected when set

## Subtasks

* **TOML types and loader** — Read the file from the correct path and return the typed structure, without validating. (#33)
* **Validation with errors pointing at the key** — Duplicate port, unknown field, incomplete bastion, port out of range. (#34)
* **Invalid config fixtures** — One TOML per failure mode, used by the validation tests. (#35)
