# [TEST] Cover both failure modes, independence, and shutdown

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#24](https://github.com/MarcusXavierr/aws-tunnels/issues/24)
**Status:** created

**Depends on:** 18, 17

## Goal

`bun test` proves that supervision works, without AWS credentials and in seconds.

## Context

Recovery is the project's reason to exist, so it cannot be verified by hand alone. With the fake plugin and a short probing interval, each scenario runs in seconds and regresses automatically on every change.

## What needs to happen

One test per scenario, all using the fake `Spawner` and a low probing interval: a dead process restarts; tunnels are independent; a zombie is caught on the second probe and the restart escalates to SIGKILL; SIGINT leaves neither process nor port.

## Done when

* The suite runs without AWS credentials and without network
* Each of the four scenarios fails if the corresponding logic is removed
* The full suite finishes in under 30 s
* No test leaves a port busy for the next test

## Subtasks

* **Dead-process restart test** — `die` mode and the tunnel coming back. (#50)
* **Tunnel independence test** — One falling does not restart the other. (#51)
* **Zombie tunnel test** — `zombie` mode, two strikes, and SIGKILL escalation. (#52)
* **Orphan-free shutdown test** — SIGINT with process and port verification. (#53)
