# Backlog: `awstun`

**Epics:** [#4](https://github.com/MarcusXavierr/aws-tunnels/issues/4) `00-epic-awstun-mvp.md` (tasks 01–24) and [#5](https://github.com/MarcusXavierr/aws-tunnels/issues/5) `99-epic-post-mvp.md` (tasks 25–26)
**Source:** [`ssm_tunnel_plan.md`](../../ssm_tunnel_plan.md) and [`docs/decisions/`](../decisions/README.md)
**Tracker:** GitHub Issues, Project [AWS Tunnels](https://github.com/users/MarcusXavierr/projects/5)
**Total:** 2 epics, 26 tasks, 29 subtasks

Codebase grounding was waived: the repository is a `bun init` scaffold, with no production code to point at. The ticket references are the source plan, the ADRs, and the `~/.zshrc` being replaced.

## Sequencing

```
01 CLI skeleton ─┬─ 02 config ── 03 ls/config check ── 20 config tests
                 ├─ 04 aws wrapper ── 05 bastion by EIP ─┬─ 06 SSM gate
                 │                                       └─ 07 overrides and cache
                 ├─ 08 spawner ─┬─ 09 kill tree
                 │              ├─ 10 port guard
                 │              ├─ 11 startup with confirmation
                 │              └─ 18 fake plugin
                 └─ 12 probe ── 13 periodic probing
                                    │
             11 + 13 ── 14 state machine ─┬─ 15 backoff
                                          └─ 16 group supervisor ── 17 shutdown
                                                                       │
                     17 + 18 ── 19 recovery tests                      │
                                                         21 build ─────┴── 22 zshrc cutover ── 23 real verification
                                                             └── 24 README

post-MVP: 25 native transport spike · 26 daemon mode
```

Parallelizable from the start: the `02 → 03`, `04 → 05`, `08`, and `12` branches are independent of each other after task 01.

## Tasks

| # | Title | Pri | Depends on | Subtasks | Issue |
|---|---|---|---|---|---|
| 01 | [CLI] awstun command skeleton and scoped logging | P0 | — | 0 | [#6](https://github.com/MarcusXavierr/aws-tunnels/issues/6) |
| 02 | [CLI] Read and validate the tunnel configuration file | P0 | 01 | 3 | [#7](https://github.com/MarcusXavierr/aws-tunnels/issues/7) |
| 03 | [CLI] awstun ls and awstun config check | P0 | 02 | 0 | [#8](https://github.com/MarcusXavierr/aws-tunnels/issues/8) |
| 04 | [AWS] aws CLI invocation with timeout and readable errors | P0 | 01 | 0 | [#9](https://github.com/MarcusXavierr/aws-tunnels/issues/9) |
| 05 | [AWS] Discover the bastion by its Elastic IP | P0 | 04 | 2 | [#10](https://github.com/MarcusXavierr/aws-tunnels/issues/10) |
| 06 | [AWS] Require SSM-connected instance before opening a session | P0 | 05 | 0 | [#11](https://github.com/MarcusXavierr/aws-tunnels/issues/11) |
| 07 | [AWS] Manual bastion override and re-resolution after failures | P1 | 05 | 0 | [#12](https://github.com/MarcusXavierr/aws-tunnels/issues/12) |
| 08 | [SUPERVISOR] Injectable spawner with its own process group | P0 | 01 | 0 | [#13](https://github.com/MarcusXavierr/aws-tunnels/issues/13) |
| 09 | [SUPERVISOR] Kill the process tree with SIGKILL escalation | P0 | 08 | 2 | [#14](https://github.com/MarcusXavierr/aws-tunnels/issues/14) |
| 10 | [SUPERVISOR] Abort when the local port is already in use | P0 | 08 | 0 | [#15](https://github.com/MarcusXavierr/aws-tunnels/issues/15) |
| 11 | [SUPERVISOR] Bring a tunnel up and confirm the port is open | P0 | 08, 10 | 2 | [#16](https://github.com/MarcusXavierr/aws-tunnels/issues/16) |
| 12 | [SUPERVISOR] Port probe with optional first-byte wait | P0 | 01 | 2 | [#17](https://github.com/MarcusXavierr/aws-tunnels/issues/17) |
| 13 | [SUPERVISOR] Periodic probing that also keeps the session alive | P0 | 12 | 0 | [#18](https://github.com/MarcusXavierr/aws-tunnels/issues/18) |
| 14 | [SUPERVISOR] Restart on dead process and on failed probe | P0 | 11, 13 | 2 | [#19](https://github.com/MarcusXavierr/aws-tunnels/issues/19) |
| 15 | [SUPERVISOR] Progressive backoff between startup attempts | P1 | 14 | 0 | [#20](https://github.com/MarcusXavierr/aws-tunnels/issues/20) |
| 16 | [SUPERVISOR] Supervise every tunnel in the group independently | P0 | 14 | 0 | [#21](https://github.com/MarcusXavierr/aws-tunnels/issues/21) |
| 17 | [SUPERVISOR] Shut everything down on Ctrl-C leaving no orphans | P0 | 09, 16 | 2 | [#22](https://github.com/MarcusXavierr/aws-tunnels/issues/22) |
| 18 | [TEST] Fake plugin with controlled failure modes | P0 | 08 | 2 | [#23](https://github.com/MarcusXavierr/aws-tunnels/issues/23) |
| 19 | [TEST] Cover both failure modes, independence, and shutdown | P0 | 18, 17 | 4 | [#24](https://github.com/MarcusXavierr/aws-tunnels/issues/24) |
| 20 | [TEST] Cover config validation and listing | P1 | 03 | 0 | [#25](https://github.com/MarcusXavierr/aws-tunnels/issues/25) |
| 21 | [INFRA] Compile the binary and install it in ~/.local/bin | P0 | 17 | 2 | [#26](https://github.com/MarcusXavierr/aws-tunnels/issues/26) |
| 22 | [INFRA] Replace the ~/.zshrc functions with CLI wrappers | P0 | 21 | 2 | [#27](https://github.com/MarcusXavierr/aws-tunnels/issues/27) |
| 23 | [TEST] Run the verification runbook against prod and staging | P0 | 22 | 4 | [#29](https://github.com/MarcusXavierr/aws-tunnels/issues/29) |
| 24 | [DOCS] README, sample config, and troubleshooting | P1 | 21 | 0 | [#30](https://github.com/MarcusXavierr/aws-tunnels/issues/30) |
| 25 | [SPIKE] Evaluate opening the port forward without the aws CLI | P3 | 16 | 0 | [#31](https://github.com/MarcusXavierr/aws-tunnels/issues/31) |
| 26 | [SUPERVISOR] Daemon mode with status, down, and logs | P2 | 17 | 0 | [#32](https://github.com/MarcusXavierr/aws-tunnels/issues/32) |

## Related decisions

| ADR | Decision | Affected tasks |
|---|---|---|
| [0001](../decisions/0001-foreground-supervisor-no-daemon.md) | Foreground, no daemon | 10, 16, 17, 26 |
| [0002](../decisions/0002-transport-delegated-to-aws-cli.md) | Transport via the `aws` CLI | 04, 08, 11, 25 |
| [0003](../decisions/0003-health-via-port-probe.md) | Health via port probe | 12, 13, 14, 18, 19 |
| [0004](../decisions/0004-bastion-resolved-by-elastic-ip.md) | Bastion by Elastic IP | 05, 06, 07, 23 |
| [0005](../decisions/0005-zsh-functions-as-public-interface.md) | zsh functions as the interface | 22, 23 |
