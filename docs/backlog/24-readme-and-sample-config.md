# [DOCS] README, sample config, and troubleshooting

**Type:** Task
**Priority:** P1
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#30](https://github.com/MarcusXavierr/aws-tunnels/issues/30)
**Status:** created

**Depends on:** 21

## Goal

Someone who has never seen the project installs it, configures it, and knows what to do when something breaks.

## Context

The tunnels are work infrastructure: when they break, they break in the middle of something else. The README must take the reader from zero to a tunnel up and answer the three predictable failures without forcing anyone to read code.

## What needs to happen

A README with installation, the three commands, the config format, and a troubleshooting section covering busy port, a reassigned EIP (only the legacy ports stop serving), and an expired credential. A versioned sample config with today's four tunnels.

## Done when

* Following the README from scratch leaves a staging tunnel up
* The sample config is accepted by `awstun config check` without edits
* Troubleshooting covers the three failures with the diagnostic command for each
* The README points to `docs/decisions/` for the why behind the choices
