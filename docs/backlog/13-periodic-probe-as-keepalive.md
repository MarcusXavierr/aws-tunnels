# [SUPERVISOR] Periodic probing that also keeps the session alive

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#18](https://github.com/MarcusXavierr/aws-tunnels/issues/18)
**Status:** created

**Depends on:** 12

## Goal

The probing loop generates the traffic that prevents Session Manager from terminating the session for inactivity.

## Context

Session Manager terminates an idle session after 20 minutes by default, and the timer only resets with client traffic — the number one cause of today's tunnels dying on their own. Probing every two minutes solves both things at once: it keeps the session alive and bounds the blind detection window.

## What needs to happen

A per-tunnel loop with a `probe_interval` interval (default 120 s, overridden by `AWSTUN_PROBE_INTERVAL` to make tests fast). The wait is interruptible, so Ctrl-C is not stuck waiting out the whole interval. An invalid value falls back to the default with a log warning.

## Done when

* With `AWSTUN_PROBE_INTERVAL=1` probing happens every second, proven by a test
* Ctrl-C during the wait shuts down in under a second, without waiting out the interval
* An invalid `probe_interval` uses the default and logs a warning
* A healthy tunnel stays up for more than 20 minutes in a real run
