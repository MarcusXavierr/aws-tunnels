# [EPIC] awstun: database tunnels that bring themselves back up

**Type:** Epic
**Priority:** P0
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** epic
**Issue:** [#4](https://github.com/MarcusXavierr/aws-tunnels/issues/4)
**Status:** created

## Goal

Replace the shell functions that open the SSM tunnels to the databases with a compiled CLI that keeps each tunnel up on its own, reconnecting when it dies.

## Context

Querying the prod and staging databases depends on four SSM tunnels opened by two 88-line functions in `~/.zshrc`. They die on their own for two reasons: Session Manager terminates an idle session after 20 minutes, and the `session-manager-plugin` sometimes stays alive with the tunnel already dead after a WebSocket recycling. In both cases nothing restarts anything, and the discovery happens in the middle of something else, with a query that hangs. This epic delivers `awstun`: declarative TOML configuration, supervision with probing, restart with backoff, and clean shutdown.

The source plan is in [`ssm_tunnel_plan.md`](../../ssm_tunnel_plan.md) (written for Python, now in Bun). The structural decisions and what was rejected are in [`docs/decisions/`](../decisions/README.md).

## Scope

In: TOML config, bastion resolution by Elastic IP, startup and supervision of N tunnels per group, probe with banner wait, backoff, clean shutdown, tests with a fake plugin, compiled binary, `~/.zshrc` cutover, and verification against real AWS.

Out: daemon mode, `status`/`down`/`logs`, native transport without the `aws` CLI. Both live in the post-MVP epic.

## Done when

* `awstun up prod` keeps 13306 and 13307 serving data for more than 20 minutes without intervention
* Killing one tunnel's plugin, or freezing it with `SIGSTOP`, brings back only that tunnel; the other is untouched
* Ctrl-C leaves no `session-manager-plugin` process and no port in LISTEN
* `tunnel_prod_db` remains the command, and `pgrep -af tunnel_prod_db` keeps matching for the `api` repo skills
