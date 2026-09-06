# [AWS] Manual bastion override and re-resolution after failures

**Type:** Task
**Priority:** P1
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#12](https://github.com/MarcusXavierr/aws-tunnels/issues/12)
**Status:** created

**Depends on:** 05

## Goal

There is an escape valve to force the bastion, and the CLI rediscovers it on its own when the instance is replaced mid-run.

## Context

When the legacy host's whitelist changes address, the config will be syntactically correct and still wrong. Unblocking must be immediate, without editing a file: `--bastion i-…` or `AWSTUN_<GROUP>_BASTION`. In the other direction, if the instance is replaced while the supervisor is running, insisting forever on the old id is useless — after three consecutive startup failures, the cached value is discarded.

## What needs to happen

Precedence: flag, then environment variable, then config. Cache the resolved id per execution, invalidated when a tunnel accumulates three consecutive startup failures, forcing a new resolution on the next attempt.

## Done when

* `--bastion i-…` skips resolution and is used by every tunnel in the group
* `AWSTUN_PROD_BASTION` has an equivalent effect, and the flag beats it
* Three consecutive startup failures invalidate the cache and resolution runs again
* Flag > environment > config precedence covered by a test
