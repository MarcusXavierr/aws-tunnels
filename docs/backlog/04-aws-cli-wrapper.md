# [AWS] aws CLI invocation with timeout and readable errors

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#9](https://github.com/MarcusXavierr/aws-tunnels/issues/9)
**Status:** created

**Depends on:** 01

## Goal

Every call to `aws` goes through a single point, with a timeout and an error that says what to do.

## Context

The CLI delegates transport to `aws ssm start-session` (see ADR-0002), so it also depends on `aws` to discover the bastion. These calls hang when the network goes bad and fail in varied ways: missing binary, expired credential, denied permission. Concentrating this in a wrapper avoids repeating error handling in every caller and turns `ENOENT` into an instruction.

## What needs to happen

`runAws(args)` executing via `Bun.spawn`, with a 30 s timeout, stdout and stderr captured, and a typed error distinguishing missing binary, timeout, and non-zero exit (with stderr embedded in the message). `aws` absent from the PATH produces a message saying it is a requirement.

## Done when

* A successful call returns stdout already trimmed
* A non-zero exit becomes a typed error carrying the `aws` stderr
* A command exceeding 30 s is killed and becomes a timeout error, not a hang
* `aws` missing from the PATH produces an actionable message, not `ENOENT`
