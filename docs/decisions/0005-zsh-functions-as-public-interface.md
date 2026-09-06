---
status: "accepted"
date: 2026-09-06
decision-makers: Marcus Xavier
---

# zsh functions remain the public tunnel interface

## Context and Problem Statement

The tunnels are not used only by people. The `mysql-prod-query` and `mysql-legacy` skills in the `api` repository run a preflight with `pgrep -af tunnel_prod_db` before querying the database, and that repository's `.mcp.json` fixes ports `13306`, `13307`, `13316`, and `13317`. Replacing the shell functions with a new binary would break this process-name contract. The decision is where to absorb the change: here or in the other repository.

## Decision Drivers

* The existing contract is a process name in another repository, outside this project's control.
* A migration requiring coordinated changes in two repositories delays the cutover.
* The ports are a data contract and do not change in any scenario.

## Considered Options

* Keep `tunnel_prod_db`/`tunnel_staging_db` as wrappers that call `awstun` with `exec -a`
* Change the command to `awstun up prod` and update the `api` repository's skills
* Expose `awstun status --json` and migrate the skills to a real preflight check

## Decision Outcome

Chosen option: "Keep the functions as wrappers with `exec -a`", because `exec -a` rewrites the process's `argv[0]`, so `pgrep -af tunnel_prod_db` continues to match and no file outside this repository needs to change. `~/.zshrc` drops from 88 lines of logic to six lines of delegation, and the cutover stays within one commit.

### Consequences

* Good, because the cutover does not depend on a coordinated change with the `api` repository.
* Good, because the 88 lines of duplicated logic leave `~/.zshrc`, leaving one source of truth.
* Bad, because the process name becomes a lie: `ps` shows `tunnel_prod_db` while the binary is `awstun`, which can mislead anyone debugging without knowing the trick.
* Bad, because it perpetuates a `pgrep` preflight, exactly the health signal rejected by the probe decision: the skills continue to treat a live process as proof that the tunnel is alive.
* Bad, because there are now two names for the same action, and the documentation must explain both.
* Neutral, because `exec` must run inside a subshell `( … )`; directly in the function it would replace the interactive shell and close the terminal.

### Confirmation

After the cutover, `zsh -n ~/.zshrc` exits cleanly, `pgrep -af tunnel_prod_db` returns exactly one line with the tunnel running, and `SELECT 1` responds through the `mysql-prod` and `mysql-legacy` MCPs, the full real-consumer chain rather than just the probe.

## Pros and Cons of the Options

### Wrappers with `exec -a`

* Good, because the contract is preserved at practically zero cost.
* Neutral, because the old name remains the command typed day to day.
* Bad, because it hides the real binary behind a false `argv[0]`.

### Update the `api` repository's skills

* Good, because it removes the duplicate name and the misleading `argv[0]`.
* Good, because it would be an opportunity to replace the preflight with a port check.
* Bad, because it spreads the change across two repositories, and the skill breaks in the interval between the two commits.

### `awstun status --json` and migrate the skills

* Good, because it gives the skills a preflight that measures what matters: a live port with a passing probe.
* Bad, because `status` must discover a process from another terminal, pulling shared state into an MVP deliberately designed without state.

## More Information

When daemon mode exists, `status --json` becomes inexpensive and the skills can migrate. This record would then be superseded, not edited.
