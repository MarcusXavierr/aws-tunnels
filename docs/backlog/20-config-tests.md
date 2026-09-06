# [TEST] Cover config validation and listing

**Type:** Task
**Priority:** P1
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#25](https://github.com/MarcusXavierr/aws-tunnels/issues/25)
**Status:** created

**Depends on:** 03

## Goal

Configuration errors are caught by tests, not discovered while trying to bring a tunnel up.

## Context

Validation is the first thing the user meets and the easiest to let rot. With fixtures per failure mode, every error message becomes a verified contract.

## What needs to happen

Table-driven tests over the fixtures from task 02: duplicate port, syntactically invalid TOML, bastion without `eip` and without `instance_id`, unknown field, port out of range. Plus a stable-output test for `ls`.

## Done when

* Each invalid fixture produces an error citing the expected key
* A valid config with the four tunnels passes
* `config check` exits 1 on an invalid config and 0 on a valid one
* `ls` has deterministic output
