# [SUPERVISOR] Supervise every tunnel in the group independently

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#21](https://github.com/MarcusXavierr/aws-tunnels/issues/21)
**Status:** created

**Depends on:** 14

## Goal

`awstun up prod` keeps both tunnels of the environment up, and one going down does not affect the other.

## Context

This is the shell version's central flaw: it waits on both processes at once, so when one falls the `wait` returns and both go away. Each tunnel must have its own lifecycle, because in practice it is common for one to fall while the other is in full use.

## What needs to happen

`up <group>` resolves the bastion once, logs the opening line with the bastion and port map, and starts one loop per tunnel. `up <group>.<tunnel>` starts just one. One tunnel's startup failure does not interrupt the others, except a busy port, which aborts the group by ADR-0001's decision.

## Done when

* `up prod` leaves 13306 and 13307 serving data simultaneously
* Killing one tunnel's process restarts only it; the other is untouched
* `up prod.legacy` starts only 13307
* A nonexistent group or tunnel exits 2 with the list of valid names
