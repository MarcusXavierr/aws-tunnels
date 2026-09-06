# [SUPERVISOR] Port probe with optional first-byte wait

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#17](https://github.com/MarcusXavierr/aws-tunnels/issues/17)
**Status:** created

**Depends on:** 01

## Goal

A probe that tells a live tunnel from a zombie tunnel without knowing any protocol.

## Context

The local port's `accept()` happens inside the plugin, on the local machine, so connect-and-close passes even with the channel to the bastion dead — which is exactly the WebSocket-recycling failure mode. Waiting for the first byte solves it: a received byte can only have come from the remote server. The reasoning and its limits are in ADR-0003.

## What needs to happen

`probe(port, { expectBanner, timeoutMs })` using `Bun.connect`: connects and, when `expectBanner`, waits for at least one byte for up to 2 s. Failure is signaled by rejection, with the cause distinguishing connection refused, connection timeout, and banner timeout. The socket is always closed.

## Done when

* A port with a server that sends a banner passes with `expectBanner`
* A port that accepts a connection and never sends a byte fails with `expectBanner` and passes without it
* A closed port fails as connection refused
* No probe leaves a socket open, even on error

## Subtasks

* **Connect and close** — Basic path and connection-error distinction. (#42)
* **Banner wait with a deadline** — Read at least one byte within the deadline. (#43)
