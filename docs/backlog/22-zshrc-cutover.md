# [INFRA] Replace the ~/.zshrc functions with CLI wrappers

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#27](https://github.com/MarcusXavierr/aws-tunnels/issues/27)
**Status:** created

**Depends on:** 21

## Goal

The 88 lines of logic leave `~/.zshrc` and the day-to-day commands keep the same name.

## Context

The `mysql-prod-query` and `mysql-legacy` skills, in the `api` repository, preflight with `pgrep -af tunnel_prod_db` before querying the database. Keeping the functions as wrappers with `exec -a` preserves that contract without touching another repository — the cost of this choice is in ADR-0005. The `exec` must run inside a subshell, otherwise it replaces the interactive shell and closes the terminal.

## What needs to happen

Replace lines 302 to 389 of `~/.zshrc` (comment, `export G4_PROD_TUNNEL_EIP`, and the two functions) with two wrappers `( exec -a tunnel_prod_db awstun up prod )` and the staging equivalent, plus a short comment pointing at the config and at this repository. The EIP default now lives in the config, not in the environment.

## Done when

* `zsh -n ~/.zshrc` exits without errors
* `tunnel_prod_db` brings up both prod tunnels and the terminal is neither replaced nor closed
* `pgrep -af tunnel_prod_db` returns one line with the tunnel up
* No reference to `G4_PROD_TUNNEL_EIP` remains in `~/.zshrc`

## Subtasks

* **Replace the function block** — `exec -a` wrappers in a subshell and a new comment. (#56)
* **Check syntax and name contract** — Clean `zsh -n` and matching `pgrep`. (#57)
