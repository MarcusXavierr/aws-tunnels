# [SUPERVISOR] Daemon mode with status, down, and logs

**Type:** Task
**Priority:** P2
**Parent:** [EPIC] awstun post-MVP
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#32](https://github.com/MarcusXavierr/aws-tunnels/issues/32)
**Status:** created

**Depends on:** 17

## Goal

The tunnels survive the terminal closing, and another shell can ask whether they are alive.

## Context

The MVP is foreground on purpose (ADR-0001): each environment occupies a terminal and closing the window takes everything down. If that becomes annoying in daily use, the way forward is a daemon — which brings with it on-disk state, process discovery from another shell, and an orphan policy, exactly what the MVP avoids.

## What needs to happen

Design before coding, because the decision needs a new ADR superseding 0001. Expected scope: `up --detach`, a state file, `status` probing the known ports, `down` shutting down per group, and `logs` reading the persisted log.

## Done when

* A new ADR superseding 0001 before any code
* A tunnel survives the closing of the terminal that started it
* `status` distinguishes healthy tunnel, zombie, and absent
* `down` leaves no leftovers, with the same guarantee as foreground shutdown
