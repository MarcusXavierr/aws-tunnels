# [TEST] Fake plugin with controlled failure modes

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#23](https://github.com/MarcusXavierr/aws-tunnels/issues/23)
**Status:** created

**Depends on:** 08

## Goal

A fake process that imitates `aws`/`session-manager-plugin` and knows how to fail in every way that matters.

## Context

Recovery cannot be tested against real AWS: you cannot ask AWS to recycle a WebSocket at test time. The fake closes that gap by imitating the observable contract — it prints the port-open line, listens on the port, and knows how to die, freeze, or become a zombie that accepts connections and never responds.

## What needs to happen

An executable script used by the fake `Spawner` in tests: opens the requested local port, prints the confirmation line, and answers each connection with a banner. Modes via argument: `die` (exits after N seconds), `freeze` (stops responding but keeps the port), `zombie` (accepts and never sends a byte), `silent` (never prints the confirmation line).

## Done when

* Normal mode opens the port, prints the confirmation, and answers with a banner
* `zombie` mode accepts connections and never sends a byte
* `silent` mode never prints the confirmation, exercising the startup timeout
* The fake can be terminated by `killTree` like the real process

## Subtasks

* **Base fake server** — Open the port, print the confirmation, answer the banner. (#48)
* **die, freeze, zombie, and silent modes** — One argument per failure mode. (#49)
