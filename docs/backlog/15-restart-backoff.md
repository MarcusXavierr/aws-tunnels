# [SUPERVISOR] Progressive backoff between startup attempts

**Type:** Task
**Priority:** P1
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#20](https://github.com/MarcusXavierr/aws-tunnels/issues/20)
**Status:** created

**Depends on:** 14

## Goal

A persistent failure does not become a tight `start-session` loop, and a quick recovery is not penalized.

## Context

Without backoff, an expired credential or an unreachable bastion makes the CLI hammer the AWS API in a restart loop, flooding the log and risking throttling. With backoff but no reset, a tunnel that fell five times over the day would start waiting half a minute even while stable.

## What needs to happen

The sequence `[0, 2, 4, 8, 16, 30]` seconds, advancing on each failure and saturating at the last value; the first attempt does not wait. The index returns to zero after 60 s of continuous health. The wait uses the same interruptible mechanism as the probing loop.

## Done when

* The first startup has no wait
* Successive failures follow the sequence and saturate at 30 s
* Sixty healthy seconds reset the backoff, proven by a test with a short interval
* Ctrl-C during the backoff wait shuts down immediately
