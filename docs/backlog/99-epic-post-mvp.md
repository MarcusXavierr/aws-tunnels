# [EPIC] awstun post-MVP: terminal survival and owned transport

**Type:** Epic
**Priority:** P2
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** epic
**Issue:** [#5](https://github.com/MarcusXavierr/aws-tunnels/issues/5)
**Status:** created

## Goal

Remove two limitations deliberately accepted in the MVP: the tunnels die with the terminal, and startup depends on two external binaries with confirmation via string matching.

## Context

The MVP is foreground and delegates transport to `aws ssm start-session`, and both choices are recorded with their costs in [ADR-0001](../decisions/0001-foreground-supervisor-no-daemon.md) and [ADR-0002](../decisions/0002-transport-delegated-to-aws-cli.md). Neither hurts enough to delay the MVP, but both have a known way out. This epic exists so that way out is not lost, and nothing here starts before the MVP is in use.

## Done when

* Each change of direction lands as a new ADR superseding the previous one, never as an edit to the accepted record
* The native transport spike delivers a written recommendation, with effort and risk, without touching production code
* If the daemon is adopted, it keeps the same shutdown guarantee as foreground mode: zero leftovers
