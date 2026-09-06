# [AWS] Discover the bastion by its Elastic IP

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#10](https://github.com/MarcusXavierr/aws-tunnels/issues/10)
**Status:** created

**Depends on:** 04

## Goal

The group points at an Elastic IP and the CLI discovers, on the spot, which instance carries it.

## Context

Hard-coding the instance id has already been costly: `i-0b68958c959cf379a` was stopped and every helper carrying that id started failing with `TargetNotConnected`. Worse, the legacy host filters by source IP, so only the instance carrying the whitelisted EIP will do — the full reasoning is in ADR-0004. This task implements the resolution and the alternative explicit instance id path.

## What needs to happen

`resolveBastion(group)`: with `{ eip }`, call `describe-addresses --public-ips <eip>` and extract `Addresses[0].InstanceId`; empty output or `None` becomes a named error saying to check the console or use the override. With `{ instance_id }`, return it directly without calling AWS.

## Done when

* An associated EIP returns the correct instance id
* An EIP nobody carries produces an error citing the EIP and suggesting the override
* `{ instance_id }` in the config triggers no AWS call
* An `aws` failure reaches the user with the original stderr visible

## Subtasks

* **Resolve via `describe-addresses`** — Call, id extraction, and error when nobody carries the EIP. (#36)
* **Explicit instance id path** — Short-circuit when the config already carries the id. (#37)
