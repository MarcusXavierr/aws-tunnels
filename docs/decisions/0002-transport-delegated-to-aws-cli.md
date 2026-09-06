---
status: "accepted"
date: 2026-09-06
decision-makers: Marcus Xavier
---

# Delegate transport to `aws ssm start-session`

## Context and Problem Statement

A Session Manager port forward is not an ordinary TCP tunnel: the client opens a session through the API, receives a WebSocket endpoint, and talks over a binary data channel that AWS does not document as a public contract. `awstun` needs to open that forwarding and, above all, know when it died. The choice is between reimplementing that channel in Bun or continuing to delegate to the official tools.

## Decision Drivers

* The data channel protocol has no stable public specification.
* Credentials and SSO already work in the machine's `aws` CLI; redoing that is work without value.
* The closer to the channel, the more control over keepalive and drop detection.
* External binary dependency is installation and failure surface.

## Considered Options

* Spawn `aws ssm start-session` with the `AWS-StartPortForwardingSessionToRemoteHost` document
* `@aws-sdk/client-ssm` for `StartSession` plus an owned data channel implementation over Bun's native `WebSocket`
* `ssh -L` with `ProxyCommand` using `AWS-StartSSHSession`

## Decision Outcome

Chosen option: "Spawn `aws ssm start-session`", because it is the only option where the protocol is maintained by whoever defines it, and because it preserves exact parity with the behavior that already works today. The native alternative is attractive for the control it offers, but trading a supervision problem for a binary-protocol reverse-engineering problem would invert the project's reason to exist.

### Consequences

* Good, because protocol changes, internal retries, and authentication remain AWS's problem.
* Good, because SSO, profiles, and `AWS_PROFILE` work without a line of code.
* Bad, because the CLI now depends on two external binaries on the PATH: `aws` and `session-manager-plugin`.
* Bad, because the process that actually holds the local port is the plugin, a child of `aws` — killing only the parent leaves the child orphaned holding the port, which forces giving each session its own process group and killing by group.
* Bad, because confirmation that the tunnel is up is parsing the string `Port N opened` on stdout, a fragile contract that a message change breaks silently.
* Bad, because there is no access to the channel's keepalive: traffic can only be generated from outside, through the local port.

### Confirmation

A tunnel startup is only considered successful when the `Port N opened` line appears within 30 s; the fake-plugin test covers the case where it never comes. Group shutdown is verified by the test that requires zero leftovers after SIGINT.

## Pros and Cons of the Options

### Spawn `aws ssm start-session`

* Good, because it is the supported path and the one already in production in `~/.zshrc`.
* Neutral, because the `aws` startup cost (Python) is only paid at startup and reconnection.
* Bad, because tunnel health must be inferred from outside the process.

### Native SDK with an owned data channel

* Good, because it eliminates the two external binaries and the stdout parsing.
* Good, because it gives access to the WebSocket ping/pong, making drop detection immediate instead of sampled.
* Bad, because it implements an undocumented protocol: any AWS change becomes our silent bug.
* Bad, because it forces reimplementing credential resolution, SSO, and token refresh.

### `ssh -L` with `ProxyCommand`

* Good, because SSH brings its own keepalive (`ServerAliveInterval`) and multiple forwardings over one connection.
* Bad, because it requires a key and a user on the bastion, something SSM access currently does without.
* Bad, because it adds an authentication layer to maintain, without solving the zombie case (the `ssh` can also stay alive with a dead channel).

## More Information

The native option is not discarded: there is a spike task in the backlog to measure it. If adopted, this record is superseded.
