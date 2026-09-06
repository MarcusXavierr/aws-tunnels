# [SPIKE] Evaluate opening the port forward without the aws CLI

**Type:** Task
**Priority:** P3
**Parent:** [EPIC] awstun post-MVP
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#31](https://github.com/MarcusXavierr/aws-tunnels/issues/31)
**Status:** created

**Depends on:** 16

## Goal

Decide, with measurement, whether speaking the Session Manager data channel in Bun is worth the risk.

## Context

Delegating to the `aws` CLI (ADR-0002) brings two external binaries and a startup confirmation based on matching a string in stdout. Speaking the protocol directly would eliminate both problems and give access to the WebSocket ping, making drop detection immediate instead of sampled. The risk is reimplementing an undocumented protocol — this spike measures before committing.

## What needs to happen

A prototype with `@aws-sdk/client-ssm` for `StartSession` and Bun's native `WebSocket` for the data channel, against a staging tunnel. The deliverable is written: whether it worked or not, estimated effort, what breaks when AWS changes, and a recommendation. If adopted, ADR-0002 is superseded by a new record.

## Done when

* The prototype manages (or provably fails) to forward a staging MySQL connection
* A document with LOE, risks, and a recommendation in `docs/`
* A recommendation to adopt comes with a new ADR superseding 0002
* No changes to production code in this task
