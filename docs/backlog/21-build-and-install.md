# [INFRA] Compile the binary and install it in ~/.local/bin

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#26](https://github.com/MarcusXavierr/aws-tunnels/issues/26)
**Status:** created

**Depends on:** 17

## Goal

One command builds the binary and another puts it on the PATH, without requiring Bun installed to use it.

## Context

The CLI replaces a shell function, so it must always be available, including in a shell without Bun on the PATH. `bun build --compile` solves that in a single file, and the install step must be repeatable without dirtying anything.

## What needs to happen

A build script producing `dist/awstun` and an install script copying it to `~/.local/bin/awstun` (idempotent, warning if the directory is not on the PATH). Both exposed as `package.json` scripts.

## Done when

* `bun run build` produces an executable `dist/awstun`
* The binary runs with a PATH without Bun, proven with `env -i`
* `bun run install` is idempotent and overwrites the previous version
* `~/.local/bin` missing from the PATH produces a warning, not a silent failure

## Subtasks

* **Build target** — `bun build --compile` to `dist/awstun`. (#54)
* **Install script** — Idempotent copy to `~/.local/bin` with a PATH warning. (#55)
