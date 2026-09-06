# [SUPERVISOR] Shut everything down on Ctrl-C leaving no orphans

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#22](https://github.com/MarcusXavierr/aws-tunnels/issues/22)
**Status:** created

**Depends on:** 09, 16

## Goal

Ctrl-C is the shutdown command: no hanging process and no stuck port after it.

## Context

In the shell version, killing the supervisor left the `session-manager-plugin` alive holding the port, and the next startup complained about a busy port — a symptom that forced remembering `pkill -f session-manager-plugin`. Since foreground mode makes Ctrl-C the only way to shut down (ADR-0001), this path must be failure-proof.

## What needs to happen

SIGINT and SIGTERM handlers signal the stop, the loops exit, each tunnel goes through `killTree`, and a final sweep guarantees no handle remains. Exit 0 with a shutdown line in the log.

## Done when

* After SIGINT, no `session-manager-plugin` process survives
* After SIGINT, none of the group's ports stays in LISTEN
* Shutdown takes less than 10 s even with a stuck process
* Exit code is 0 on a user-requested shutdown

## Subtasks

* **Signal handlers and loop stopping** — SIGINT/SIGTERM signal and the loops leave the wait. (#46)
* **Final leftover sweep** — Guarantee a cleared handle and a released port before exiting. (#47)
