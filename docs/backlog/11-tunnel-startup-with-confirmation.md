# [SUPERVISOR] Bring a tunnel up and confirm the port is open

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#16](https://github.com/MarcusXavierr/aws-tunnels/issues/16)
**Status:** created

**Depends on:** 08, 10

## Goal

A tunnel is only considered up when `aws` confirms the port was opened.

## Context

Treating the spawn as success is the mistake the shell version makes: the process exists, the port maybe not. `aws` prints `Port N opened` when the forwarding is ready, and that line is the only confirmation available — stdout parsing is a fragile contract deliberately accepted in ADR-0002. Without it within 30 seconds, killing and retrying is cheaper than waiting indefinitely.

## What needs to happen

Build the `--parameters` (host, `portNumber`, `localPortNumber`) and the `--document-name AWS-StartPortForwardingSessionToRemoteHost`, spawn through the `Spawner`, and await the confirmation line with a 30 s deadline. Timeout kills the tree and counts a startup failure. Process lines are forwarded to the log, discarding the shutdown noise about a child killed by a signal.

## Done when

* A successful startup logs the tunnel ready with its local port
* Absence of the confirmation line within 30 s kills the process and counts a startup failure
* `aws` output appears in the log with the `group/tunnel` scope
* The `--parameters` JSON is built from the config, with no hand-interpolated string

## Subtasks

* **Building the `start-session` command** — Document, region, target, and parameters derived from the config. (#40)
* **Open-port detector with a deadline** — Match the confirmation line within 30 s or fail. (#41)
