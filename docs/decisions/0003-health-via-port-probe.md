---
status: "accepted"
date: 2026-09-06
decision-makers: Marcus Xavier
---

# Tunnel health measured by port probe, not process liveness

## Context and Problem Statement

There are two failure modes. In the first, Session Manager terminates the session after 20 minutes of inactivity and the plugin process exits, so the local port closes. In the second, documented by people who have encountered the issue, the WebSocket is recycled, the tunnel stops forwarding data, and **the plugin remains alive with the port in LISTEN**. Therefore, "the process exists" is not a health signal. Worse, the local port's `accept()` happens inside the plugin, on the local machine, so a bare `connect()` succeeds even when the channel to the bastion is dead. We need to decide what counts as proof that the tunnel is alive.

## Decision Drivers

* Detecting the zombie case is the CLI's primary reason to exist.
* The probe is also the keepalive: the inactivity timer resets only when traffic crosses the channel.
* The configuration must support services other than MySQL without a redesign.
* A false positive is expensive: restarting a healthy tunnel disconnects anyone using it.

## Considered Options

* Process liveness (`poll()` on the child)
* TCP `connect()` and close
* TCP `connect()` and, optionally, wait for the server's first byte (`expect_banner`)
* A complete MySQL handshake, including reading the server version

## Decision Outcome

Chosen option: "TCP `connect()` and, optionally, wait for the first byte", because it is the weakest option that still distinguishes a live tunnel from a zombie tunnel. A received byte can only have come from the remote server, so it proves the entire path without requiring the CLI to know any protocol. The `expect_banner` flag is configured per tunnel, enabled for today's four MySQL tunnels and disableable for a service where the client speaks first.

### Consequences

* Good, because one mechanism covers both failure modes, and the probe itself serves as the keepalive.
* Good, because no protocol code enters the CLI: `expect_banner` means only "did a byte arrive?".
* Bad, because it works only where the server speaks first; for Redis, Postgres, or HTTP, the probe falls back to a bare `connect()`, bringing back the zombie blind spot.
* Bad, because detection is sampled: with a 120 s interval and two strikes, a zombie tunnel can remain undetected for up to about 4 minutes.
* Bad, because the probe opens and closes a TCP connection every cycle without saying anything to the server, producing an `Aborted connection` entry in the MySQL error log for each probe.
* Neutral, because requiring two strikes before restarting trades detection latency for immunity to a network blip.

### Confirmation

The test harness's fake plugin has a `zombie` mode that accepts a connection and never sends a byte. The test requires two failed probes to trigger a restart and the tunnel to answer again afterward. A companion test ensures that a healthy tunnel is never restarted.

## Pros and Cons of the Options

### Process liveness

* Good, because it costs nothing: the child handle already exists.
* Bad, because it is exactly the signal that fails in the zombie case, the problem that motivated the project.

### `connect()` and close

* Good, because it is protocol-agnostic and sufficient to detect a closed port.
* Neutral, because it probably generates stream-opening traffic on the channel, serving as a keepalive.
* Bad, because `accept()` is local: it succeeds with a dead channel and does not detect a zombie.

### `connect()` with banner wait

* Good, because the received byte proves the path from the local machine to the bastion to the remote service.
* Good, because it takes ten lines of code and one Boolean configuration flag.
* Bad, because it does not apply to protocols in which the client speaks first.

### Complete MySQL handshake

* Good, because it provides the strongest possible detection, and logging the server version is excellent for debugging.
* Good, because it allows a MySQL error packet to be treated as "tunnel OK, server refusing", avoiding an unnecessary restart.
* Bad, because it couples the CLI to one protocol: the first non-MySQL tunnel would require refactoring the probe.

## More Information

If the `Aborted connection` entries in the MySQL log become a problem, the path forward is an optional `close_payload` field in the configuration, with `COM_QUIT` in hexadecimal, data rather than code, and reversible without changing this record.

References: [idle session timeout](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-timeout.html) (20 min by default; the timer resets with client input) and the report of a [tunnel that silently dies after WebSocket recycling](https://repost.aws/questions/QUCtP6EpYARgCPY86nT0YMxw/ssm-port-forwarding-tunnel-silently-dies-after-hours-plugin-fails-to-reconnect-after-periodic-websocket-recycling).
