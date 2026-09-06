# [SUPERVISOR] Restart on dead process and on failed probe

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#19](https://github.com/MarcusXavierr/aws-tunnels/issues/19)
**Status:** created

**Depends on:** 11, 13

## Goal

Both tunnel death modes lead to automatic restart, and a network blip does not take down a healthy tunnel.

## Context

These are failures of a different nature: the process exiting (session terminated for inactivity) is detected directly on the handle, while the zombie only shows up on the probe. Requiring two strikes before restarting is deliberate — a transient network spike does not justify taking down a session that is serving queries.

## What needs to happen

Per-tunnel state: process handle, probe failure counter, startup failure counter, and a mark of when it became healthy. A terminated handle leads to a restart with the exit code in the log. Two consecutive failed probes lead to `killTree` and a fresh startup. A successful probe resets the counter.

## Done when

* A dead process is detected and the tunnel comes back without intervention
* A single failed probe restarts nothing; the second consecutive one restarts
* A successful probe between two failures resets the counter
* The log says which of the two reasons caused each restart

## Subtasks

* **Restart on terminated process** — Detect handle exit and bring it back up. (#44)
* **Restart on two failed probes** — Strike counter, `killTree`, and a fresh startup. (#45)
