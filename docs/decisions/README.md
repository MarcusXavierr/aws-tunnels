# Architecture Decision Records

Each file records an architecturally significant decision, in the [MADR](https://adr.github.io/madr/) format.

An accepted ADR is immutable. When a decision changes, do not edit the old record: write a new one and mark the previous record's `status` as `superseded by ADR-NNNN`. The log's value lies in preserving the reason the decision was made at the time, including the reasoning that later proved wrong.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-foreground-supervisor-no-daemon.md) | The supervisor runs in the foreground and dies with the terminal; a daemon comes later | accepted |
| [0002](0002-transport-delegated-to-aws-cli.md) | The port forward is opened by `aws ssm start-session`, not by an owned data channel implementation | accepted |
| [0003](0003-health-via-port-probe.md) | Tunnel health is measured by probing the local port, with an optional first-byte wait | accepted |
| [0004](0004-bastion-resolved-by-elastic-ip.md) | The bastion is resolved by its Elastic IP at runtime, never by a fixed instance id | accepted |
| [0005](0005-zsh-functions-as-public-interface.md) | `tunnel_prod_db`/`tunnel_staging_db` remain the interface, via `exec -a` | accepted |

## Adding one

Copy a template from the `writing-madrs` skill, number it in sequence, and add the row to the table above in the same commit.

Two rules do most of the work:

* Record the rejected options and why. A decision without alternatives is an assertion.
* Record the bad consequences along with the good ones. An ADR with only upsides is marketing.
