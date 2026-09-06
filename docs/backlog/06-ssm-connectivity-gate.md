# [AWS] Require SSM-connected instance before opening a session

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#11](https://github.com/MarcusXavierr/aws-tunnels/issues/11)
**Status:** created

**Depends on:** 05

## Goal

A stopped instance or one with a dead agent fails immediately, with a diagnosis, instead of a generic AWS error.

## Context

When the bastion exists but is not talking to Systems Manager, `start-session` returns `TargetNotConnected`, a message that does not say whether the machine is stopped, the ssm-agent died, or the id is wrong. Asking first costs one call and turns that into a diagnosis.

## What needs to happen

After resolving the bastion, check `describe-instance-information` filtered by the id and require `PingStatus=Online`. Otherwise, abort with a message saying the instance is stopped or the ssm-agent is down. The check runs once per resolution, not per tunnel.

## Done when

* An `Online` bastion follows the normal flow
* A `PingStatus` other than `Online` aborts before any `start-session`, with the likely cause in the message
* The check runs once per resolution even with several tunnels in the group
