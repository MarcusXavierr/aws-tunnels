# [SUPERVISOR] Abort when the local port is already in use

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#15](https://github.com/MarcusXavierr/aws-tunnels/issues/15)
**Status:** created

**Depends on:** 08

## Goal

Starting up with the port taken fails immediately, saying who holds it, instead of fighting over the forwarding.

## Context

Two sessions pointing at the same local port produce the worst kind of bug: queries go to a tunnel the supervisor does not control and cannot restart. The rule is not to fight — and the message must be enough to resolve it, meaning it must say which process is there.

## What needs to happen

Before the first startup, test `bind` on `127.0.0.1:<port>`; a busy port aborts the whole group (ADR-0001's decision, which rejects adopting someone else's tunnel). The message carries the pid and command line of the listener, read from `/proc`, plus the suggestion to shut down the previous tunnel. On restart there is no check: the port was released by `killTree`.

## Done when

* A free port proceeds to startup
* A busy port aborts the group with exit 1, citing the pid and command of its holder
* A tunnel with a busy port does not leave the rest of the group half-up
* Restarting a supervised tunnel is not blocked by its own port
