# [SUPERVISOR] Kill the process tree with SIGKILL escalation

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#14](https://github.com/MarcusXavierr/aws-tunnels/issues/14)
**Status:** created

**Depends on:** 08

## Goal

Shutting down a tunnel leaves neither process nor port behind, even when the plugin is stuck.

## Context

SIGTERM handles the normal case, but not the bad one: a frozen plugin (the scenario the test reproduces with `SIGSTOP`) never processes the signal and would hang forever with the port in LISTEN. Without escalation, the supervisor would try to restart a tunnel whose port the zombie itself still occupies.

## What needs to happen

`killTree(handle)`: SIGTERM to the process group, wait up to 5 s for exit, and on timeout SIGKILL to the same group with a new wait. An already-dead process is ignored; the handle always ends up cleared.

## Done when

* A process that responds to SIGTERM exits without SIGKILL
* A process in `SIGSTOP` is terminated by the escalation and the port is released
* Calling `killTree` on an already-dead process does not throw
* After `killTree`, no child of the group stays alive

## Subtasks

* **SIGTERM to the process group** — Group signal and wait with a deadline. (#38)
* **SIGKILL escalation** — 5 s timeout, SIGKILL, and a second wait. (#39)
