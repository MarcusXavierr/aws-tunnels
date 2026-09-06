---
status: "accepted"
date: 2026-09-06
decision-makers: Marcus Xavier
---

# Foreground tunnel supervisor, no daemon

## Context and Problem Statement

The SSM tunnels to the prod and staging databases die on their own: Session Manager terminates an idle session after 20 minutes, and the two `tunnel_prod_db`/`tunnel_staging_db` functions in `~/.zshrc` restart nothing — when a session falls, the `wait` returns and both go away. The `awstun` CLI exists to keep those tunnels up, and the first question is who sustains the supervisor process: the terminal where the user ran the command, or a daemon that survives it.

## Decision Drivers

* Real usage is a work session: the tunnel is opened to work on the database and closed when done.
* The reconnection log must be visible without hunting for a file.
* On-disk state, IPC, and orphan recovery cost more code than the supervisor itself.
* Only one consumer needs to know whether the tunnel is alive, and it already uses `pgrep`.

## Considered Options

* Foreground supervisor, shut down by Ctrl-C
* Daemon with a client (`up` returns immediately, plus `status`, `down`, `logs`)
* `systemd --user` unit with `Restart=always`

## Decision Outcome

Chosen option: "Foreground supervisor, shut down by Ctrl-C", because it covers real usage with the smallest possible surface: no state file, no socket, no process that can be left behind with no owner. The supervisor is designed with spawn behind an interface (`Spawner`), so a daemon can be added later without rewriting the state machine.

### Consequences

* Good, because Ctrl-C is the shutdown command: there is no divergent state between what the CLI thinks is up and what is up.
* Good, because the reconnection log appears on the terminal, with no `logs` to implement.
* Good, because there is no orphan to recover: if the process dies, the whole process group goes with it.
* Bad, because closing the terminal (or losing the SSH session) takes the tunnels down.
* Bad, because each environment occupies a terminal, and there is no way to ask from another shell whether the tunnel is healthy.
* Bad, because a second `awstun up prod` on the same group is not idempotent: it aborts complaining that the port is busy.
* Neutral, because daemon mode is recorded as backlog work, not discarded.

### Confirmation

The clean-shutdown test (`bun test`) requires, after SIGINT, zero surviving `session-manager-plugin` processes and zero ports in LISTEN. No state file in `~/.local/state` or `~/.config/aws-tunnels` besides `config.toml` itself.

## Pros and Cons of the Options

### Foreground supervisor

* Good, because zero persistent state and an obvious lifecycle.
* Neutral, because it mirrors the behavior the shell functions already had, so there is no surprise for today's users.
* Bad, because it is coupled to the terminal's lifetime.

### Daemon with a client

* Good, because tunnels survive the terminal, and `status` answers from any shell.
* Good, because a single daemon serves every environment, without one terminal per group.
* Bad, because it requires a state file, an IPC protocol, discovery of someone else's process, and an orphan policy — more than doubling the MVP before any tunnel comes up.
* Bad, because it introduces the "daemon alive with a dead tunnel and nobody watching" failure mode, which is exactly what we are trying to eliminate.

### `systemd --user` unit

* Good, because restart and logging are the init system's job, and the tunnel comes back after boot.
* Bad, because systemd restarts the process, not the tunnel's health: the zombie case (plugin alive, tunnel dead) sails right through.
* Bad, because an interactive-session AWS credential is not in a user unit's environment, which requires solving authentication outside the scope.

## More Information

Daemon mode is recorded in the backlog together with `status`/`down`/`logs`. If it is adopted, this record is superseded, not edited.
