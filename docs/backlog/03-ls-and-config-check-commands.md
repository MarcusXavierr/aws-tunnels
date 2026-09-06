# [CLI] awstun ls and awstun config check

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#8](https://github.com/MarcusXavierr/aws-tunnels/issues/8)
**Status:** created

**Depends on:** 02

## Goal

It is possible to check the configuration and find out which tunnels exist without opening any AWS session.

## Context

Whoever edits the configuration file needs immediate feedback on whether it is correct, and whoever forgot which port belongs to staging needs a place to look. Neither command touches AWS: they read the file and answer. That is what makes it safe to edit the config without a valid credential at hand.

## What needs to happen

`ls` prints a table of group, tunnel, local port, and remote destination. `config check` runs the validation from task 02 and exits 1 on the first failure, listing every failure found instead of stopping at the first one.

## Done when

* `awstun ls` lists the four tunnels with their ports and exits 0
* `awstun config check` on a valid config prints a confirmation and exits 0
* `awstun config check` with a duplicate port lists the conflict and exits 1
* Neither command executes the `aws` binary
