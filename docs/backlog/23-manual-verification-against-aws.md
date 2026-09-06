# [TEST] Run the verification runbook against prod and staging

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#29](https://github.com/MarcusXavierr/aws-tunnels/issues/29)
**Status:** created

**Depends on:** 22

## Goal

Proof that the thing works against real AWS, not just against the fake plugin.

## Context

The fake plugin covers the supervision logic, but not bastion resolution, IAM permission, the legacy host whitelist, or the real consumer. This verification closes that gap, and the runbook is documented so it can be repeated after any supervisor change.

## What needs to happen

Run the runbook with a short probing interval: bring up prod, confirm the handshake on all four ports, kill one plugin with `kill -9`, freeze another with `kill -STOP`, shut down with Ctrl-C and check for leftovers, and finally `SELECT 1` through the `mysql-prod` and `mysql-legacy` MCPs. Repeat the startup on staging.

## Done when

* All four ports (13306, 13307, 13316, 13317) return a MySQL banner
* `kill -9` on a plugin restarts only that tunnel; `kill -STOP` is detected by the probe and escalated
* After Ctrl-C, neither process nor port remains
* `SELECT 1` answers through both prod MCPs, and the runbook is versioned in the repository

## Subtasks

* **Handshake on all four ports** — MySQL banner on prod and staging. (#58)
* **Reproduction of both failure modes** — `kill -9` and `kill -STOP` with the log checked. (#59)
* **Shutdown and absence of leftovers** — Ctrl-C and a process-and-port sweep. (#60)
* **Full chain through the MCPs** — `SELECT 1` on `mysql-prod` and `mysql-legacy`. (#61)
