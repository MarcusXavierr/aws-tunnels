# [SUPERVISOR] Injectable spawner with its own process group

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#13](https://github.com/MarcusXavierr/aws-tunnels/issues/13)
**Status:** created

**Depends on:** 01

## Goal

The supervisor never calls `Bun.spawn` directly, and each session is born in a process group that can be killed whole.

## Context

The process that actually holds the local port is not `aws` but the `session-manager-plugin` it launches. Killing only the parent leaves the child alive, and the next startup hits a busy port — a bug already observed in the shell version. Giving each session its own process group (via `setsid`, present in `/usr/bin`) is what allows killing the tree in one shot. At the same time, every supervision test depends on swapping the real process for a fake one, so spawn goes behind an interface from the start.

## What needs to happen

A `Spawner` interface with a real implementation that executes `setsid aws …` via `Bun.spawn`, exposing pid, exit code, and the streams. No other module instantiates a process directly.

## Done when

* The real implementation returns a process whose pid is the leader of its own process group
* The supervisor receives the `Spawner` by injection and works with a fake implementation
* No module other than the real spawner references `Bun.spawn`
* A missing `setsid` on the system produces a clear error at startup
