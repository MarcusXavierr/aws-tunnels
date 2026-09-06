# SSM tunnel supervisor in Python (auto-reconnect)

## Context

Literal request: make the SSM tunnel come back up on its own whenever it drops due to inactivity, and migrate the "shell hack" to Python.

Current state: `~/.zshrc` defines `tunnel_prod_db` (lines 302–365) and `tunnel_staging_db` (367–389). Each starts two `aws ssm start-session` processes in the background, a `sleep infinity` renamed as a sentinel for `pgrep`, and blocks on a `wait`. When one session dies, `wait` returns and **both** go down, with no restart.

Two confirmed causes of failure from this session:

1. The account **does not have** the `SSM-SessionManagerRunShell` document (`aws ssm get-document --name SSM-SessionManagerRunShell` → `InvalidDocument`), so Session Manager's defaults apply: **20 minutes of inactivity terminate the session**. No traffic passes through ports 13306/13307 while nobody is querying, so the timeout always fires.
2. The worse case documented by AWS (periodic WebSocket recycling): `session-manager-plugin` remains alive and the port remains in `LISTEN`, but the tunnel is dead. Therefore, "the process exists" **is not** a health signal, and the port must be probed for real.

Final state: a foreground Python supervisor (`tunnel_prod_db` / `tunnel_staging_db` remain the commands) that keeps both tunnels for the environment up indefinitely: it probes each port every 120 s (the probe serves as a keepalive, eliminating cause 1), detects a zombie tunnel (cause 2), restarts with backoff, and shuts everything down cleanly on Ctrl-C.

Execution mode chosen by the user: **foreground only**. No systemd unit and no daemon.

## Approach

### 1. Create `~/.config/nvim/zsh/g4_tunnel.py`

The directory was chosen because the other G4 helpers live there (`g4-ssm.sh`, `g4-login.sh`, `workscripts.sh`), with symlinks in `~/.zsh/`. Do not create a new symlink: the zsh functions call the absolute path.

Standard library only. **Syntax compatible with Python 3.9+**, with no `match` and no `X | Y` in annotations evaluated at runtime. Reason: `python3` on PATH is the pyenv shim (`/home/marcus/.pyenv/shims/python3` → 3.13.11), while `/usr/bin/python3` is 3.12.1, and the pyenv version may change by directory.

Shebang `#!/usr/bin/env python3`, executable file.

#### Environment table (constant at the top)

Each environment resolves the bastion **by Elastic IP**, never by instance id. Verified reason: `i-0b68958c959cf379a` was `stopped` and brought down every helper with a fixed id; the legacy host `69.167.182.74` also whitelists source IPs. Of the two live prod hosts, only the one carrying EIP `107.20.138.57` completes the handshake (`i-01c67f5c442ee55f3` reaches RDS but times out on the legacy host).

```python
REGION = "us-east-1"

ENVS = {
    "prod": {
        "eip": "107.20.138.57",          # i-0922c3a2f55791977 today; the legacy firewall allows this IP
        "host_env": "G4_PROD_HOST",
        "eip_env": "G4_PROD_TUNNEL_EIP",
        "tunnels": [
            ("app",    "gfour-prod.cgbumsa6wr9j.us-east-1.rds.amazonaws.com", 3306, 13306),
            ("legacy", "69.167.182.74",                                       3306, 13307),
        ],
    },
    "staging": {
        "eip": "35.170.92.228",          # i-02d09c8f39f10bd74 today
        "host_env": "G4_STAGING_HOST",
        "eip_env": "G4_STAGING_TUNNEL_EIP",
        "tunnels": [
            ("app",    "gfour-staging.cgbumsa6wr9j.us-east-1.rds.amazonaws.com", 3306, 13316),
            ("legacy", "69.167.182.76",                                          3306, 13317),
        ],
    },
}
```

A tunnel tuple is `(label, remote_host, remote_port, local_port)`. All four port pairs match `~/.gfour/repositories/api/.mcp.json` (`mysql-prod` 13306, `mysql-legacy` 13307, `mysql-staging` 13316, `mysql-staging-legacy` 13317), so do not change any port.

`staging` uses EIP resolution just like prod. Today `35.170.92.228` is associated with `i-02d09c8f39f10bd74`, exactly the instance the current function uses as a fixed target, so behavior is identical to today and no longer rots if the instance is recreated. Whether the staging legacy host `69.167.182.76` specifically allows this EIP is plausible but *unverified*; it is irrelevant because resolution returns today's same instance.

#### CLI

`g4_tunnel.py <prod|staging>`. A missing or unknown argument → print `usage: g4_tunnel.py <prod|staging>` to stderr and call `sys.exit(2)`. No other flags.

All environment overrides are optional:

| Env var | Effect |
|---|---|
| `G4_PROD_HOST` / `G4_STAGING_HOST` | force the instance id and skip EIP resolution |
| `G4_PROD_TUNNEL_EIP` / `G4_STAGING_TUNNEL_EIP` | change the EIP to resolve |
| `G4_TUNNEL_PROBE_SECS` | interval between probes; default `120` |

`G4_TUNNEL_PROBE_SECS` is needed for verification, allowing recovery to be tested in seconds rather than minutes. Read it with `int(os.environ.get("G4_TUNNEL_PROBE_SECS", "120"))`; an invalid value falls back to the default and logs a warning.

Why 120 s: well below the 20-minute idle timeout, so the probe acts as a keepalive, and it limits zombie-tunnel detection latency to ≤ 2 min. The cost of each probe is one TCP handshake.

#### Bastion resolution, `resolve_bastion(env_cfg)` → `str`

1. If `os.environ.get(env_cfg["host_env"])` is populated, return that value without querying AWS.
2. Otherwise: `aws ec2 describe-addresses --region us-east-1 --public-ips <eip> --query "Addresses[0].InstanceId" --output text`. Empty output or `None` → raise `RuntimeError("no instance carries EIP <eip> — check the console, or export <HOST_ENV>=i-...")`.
3. Check `aws ssm describe-instance-information --region us-east-1 --filters "Key=InstanceIds,Values=<id>" --query "InstanceInformationList[0].PingStatus" --output text`. Anything other than `Online` → `RuntimeError("<id> is not connected to SSM (instance stopped, or ssm-agent is down)")`.

Both calls use `subprocess.run([...], capture_output=True, text=True, timeout=30)` and `.strip()` on stdout. A timeout or `returncode != 0` → raise `RuntimeError` with stderr embedded.

Cache the result in a supervisor attribute. Invalidate it, forcing resolution on the next startup, when any tunnel accumulates **3 consecutive startup failures**. This covers an instance being replaced while the supervisor is running.

A `RuntimeError` during the first resolution, before any tunnel starts → print the message to stderr and call `sys.exit(1)`. After that, only log the error and continue with backoff.

#### Probe, `probe(port)` → `str` (server version) or raise

MySQL-aware probe that also acts as the keepalive:

1. `socket.create_connection(("127.0.0.1", port), timeout=8)`, then `settimeout(8)`.
2. `recv(128)`. Fewer than 5 bytes → failure.
3. `data[4] == 0x0a` (protocol 10) → healthy; version = `data[5:].split(b"\x00")[0].decode(errors="replace")`.
4. `data[4] == 0xff` (MySQL ERR packet) → **also healthy**: the tunnel delivered real bytes from the server. Version = `"(MySQL server ERR, tunnel OK)"`. This covers "too many connections" / blocked host without causing a useless restart.
5. Any other first byte → failure.
6. Before closing, send `b"\x01\x00\x00\x00\x01"` (COM_QUIT). This prevents filling the MySQL error log with `Aborted connection`. Ignore errors while sending.
7. `socket.timeout`, `ConnectionRefusedError`, `OSError` → failure.

Signal a failure by raising; the caller counts it.

#### Per-tunnel loop, one `threading.Thread` per tunnel, `daemon=True`

Thread state: `proc` (`subprocess.Popen` or `None`), `probe_failures`, `start_failures`, `backoff_idx`, `healthy_since`.

Each iteration ends with `stop_event.wait(interval)`, so Ctrl-C does not wait out the entire interval:

- `proc is None` or `proc.poll() is not None` → the process died (or never started): when there was a process, log `exited with code <rc>, restarting`, then call `start_tunnel()`.
- Otherwise, try `probe(local_port)`:
  - Success → `probe_failures = 0`; if `healthy_since is None`, set it and log `ready → 127.0.0.1:<port>  <version>`. Once healthy for ≥ 60 s, reset `backoff_idx`.
  - Failure → `probe_failures += 1`. When it reaches **2**, log `probe failed 2x (zombie tunnel), restarting` and call `kill_proc()` followed by `start_tunnel()`.

Two strikes, not one, absorb a transient network spike without bringing down a healthy session.

#### `start_tunnel()`

1. If the local port is in `LISTEN` and does not belong to our `proc`, abort the **entire program** with `sys.exit(1)` and the message `port <n> is already taken by another process — kill the previous tunnel (pkill -f session-manager-plugin)`. Never compete for a port with another tunnel. Detect this by attempting `socket.socket(); s.bind(("127.0.0.1", port))` and closing it; `OSError` means the port is occupied. (Do this only when `proc is None`; during a restart, the previous `kill_proc()` has released the port.)
2. Wait `BACKOFF[min(backoff_idx, len(BACKOFF)-1)]` seconds using `stop_event.wait(...)`, with `BACKOFF = [0, 2, 4, 8, 16, 30]`. The first attempt does not wait.
3. If `start_failures >= 3`, invalidate the bastion cache and resolve again. A resolution error → log it, increment `backoff_idx` and `start_failures`, and return.
4. `subprocess.Popen` with:
   ```python
   [
       "aws", "ssm", "start-session",
       "--region", REGION,
       "--target", instance_id,
       "--document-name", "AWS-StartPortForwardingSessionToRemoteHost",
       "--parameters", json.dumps({
           "host": [remote_host],
           "portNumber": [str(remote_port)],
           "localPortNumber": [str(local_port)],
       }),
   ]
   ```
   `stdin=subprocess.DEVNULL`, `stdout=subprocess.PIPE`, `stderr=subprocess.STDOUT`, `text=True`, `bufsize=1`, **`start_new_session=True`**.

   `start_new_session=True` is mandatory: it gives `aws` its own process group, which allows killing its child `session-manager-plugin` with `os.killpg`. Without it, killing only `aws` leaves the plugin orphaned while holding the port, exactly the bug already observed in this environment.

5. A reader thread consumes `proc.stdout` line by line and forwards each line through `log()`. It discards shutdown-noise lines matching `died with <Signals.SIGTERM` (the `aws` wrapper complains about its dead child; this is not an error).
6. Wait up to 30 s for a line matching `r"Port \d+ opened"` (the reader signals a `threading.Event`). If it does not arrive → `kill_proc()`, log `did not open the port in 30s`, increment `backoff_idx` and `start_failures`, and return.
7. If it arrives → `start_failures = 0`, `healthy_since = None` (the first probe confirms readiness and logs `ready`).

#### `kill_proc()`

`os.killpg(os.getpgid(proc.pid), signal.SIGTERM)`; `proc.wait(timeout=5)`; on `subprocess.TimeoutExpired` → `os.killpg(..., signal.SIGKILL)` and `proc.wait(timeout=5)`. Ignore `ProcessLookupError`. Always set `proc = None`.

Escalating to SIGKILL is what resolves a plugin stopped with `SIGSTOP` or otherwise stuck, which would never process SIGTERM.

#### Shutdown

`signal.signal` handlers for `SIGINT` and `SIGTERM` → set `stop_event`. The main thread calls `stop_event.wait()` in a loop, then `join(timeout=10)` on each thread. It then calls `kill_proc()` for each remaining tunnel from the main thread, in case a thread has not exited. Log `shut down`. Exit with 0.

#### Log format

`log(scope, msg)` prints `f"{time.strftime('%H:%M:%S')}  {scope}  {msg}"` with `flush=True`. `scope` is `f"{env}/{label}"` (for example, `prod/legacy`) or `env` for supervisor messages. A `threading.Lock` around `print` prevents interleaved lines.

Opening line, before starting any tunnel:
`log(env, f"bastion {instance_id} — " + ", ".join(f"{local_port}={label}" for label, _, _, local_port in tunnels))`

### 2. Replace the two functions in `~/.zshrc`

Replace lines **302–389** in their entirety (the comment block + `export G4_PROD_TUNNEL_EIP` + `tunnel_prod_db` + `tunnel_staging_db`) with:

```zsh
# --- DB tunnels via SSM -----------------------------------------------------
# prod:    13306 = gfour (app)  | 13307 = gfoursys_gFour (legacy)
# staging: 13316 = api (app)    | 13317 = gfoursys_gFour (legacy)
#
# Supervisor: ~/.config/nvim/zsh/g4_tunnel.py — reconnects on its own. Session
# Manager terminates an idle session after 20 min, and the plugin sometimes stays
# alive with the tunnel dead, so the supervisor probes the ports instead of
# trusting the process.
# The bastion is resolved at runtime by Elastic IP; never hard-code the instance id.
# Overrides: G4_PROD_HOST / G4_STAGING_HOST, G4_PROD_TUNNEL_EIP, G4_TUNNEL_PROBE_SECS.
#
# `exec -a` inside a subshell preserves the process name required by the
# mysql-prod/mysql-legacy skills' `pgrep -af tunnel_prod_db` preflight.
function tunnel_prod_db() {
    ( exec -a tunnel_prod_db python3 "$HOME/.config/nvim/zsh/g4_tunnel.py" prod "$@" )
}

function tunnel_staging_db() {
    ( exec -a tunnel_staging_db python3 "$HOME/.config/nvim/zsh/g4_tunnel.py" staging "$@" )
}
```

Details that must not be missed:

- `exec` **must** be inside a subshell `( … )`. Directly in the function, it would replace the interactive shell and close the terminal.
- `export G4_PROD_TUNNEL_EIP` leaves `~/.zshrc`: the default now lives in the `ENVS` table, a single source of truth. The environment variables continue to be read as optional overrides.
- The `sleep infinity` sentinel disappears. `pgrep -af tunnel_prod_db` continues to match because `exec -a` renames `argv[0]` of the Python process itself.
- `tunnel_staging_db` intentionally changes behavior: it gains supervision and EIP resolution. Leaving the old version alive would mean keeping two copies of the same hack.
- Do not touch `~/.config/nvim/zsh/g4-ssm.sh`; that file handles `docker exec` in ECS containers, not database tunnels.

## Critical files & anchors

| File | Region | Why |
|---|---|---|
| `~/.zshrc` | 302–389 | Exact block to replace: comment + export + both functions. Reread before editing; line numbers change after each edit. |
| `~/.config/nvim/zsh/g4_tunnel.py` | new file | The supervisor. |
| `~/gfour/repositories/api/.mcp.json` | `mysql-prod`, `mysql-legacy`, `mysql-staging`, `mysql-staging-legacy` | Port contract: 13306/13307/13316/13317. Read-only, confirm that the `ENVS` table matches. |
| `~/gfour/repositories/api/.claude/skills/mysql-prod-query/SKILL.md` | `Preflight: Tunnel Check` section | Documents `pgrep -af tunnel_prod_db`. Do not edit; `exec -a` preserves the contract. |

## Verification

Everything runs in the foreground from `$HOME`. End-to-end proof: both tunnels start, recovery works in **both** failure modes, and Ctrl-C leaves no orphan.

**Prerequisites:** valid AWS credentials (`aws sts get-caller-identity` responds), and no prod tunnel running (`pgrep -af 'session-manager-plugin|tunnel_prod_db'` is empty; if not, run `pkill -f session-manager-plugin`).

1. **Syntax.** `zsh -n ~/.zshrc` → no output. `python3 -m py_compile ~/.config/nvim/zsh/g4_tunnel.py` → no output.

2. **Startup, with a fast probe for the remaining tests.** In a test shell:
   ```bash
   G4_TUNNEL_PROBE_SECS=5 zsh -ic 'tunnel_prod_db' > /tmp/g4t.log 2>&1 &
   sleep 25; cat /tmp/g4t.log
   ```
   Expected in the log: the bastion line citing `i-0922c3a2f55791977`, and two `ready → 127.0.0.1:13306` / `:13307` lines.

3. **Real handshake on both ports** (proof that the tunnel delivers data, not merely listens):
   ```bash
   python3 - <<'PY'
   import socket
   for p in (13306, 13307):
       s = socket.create_connection(("127.0.0.1", p), timeout=10); s.settimeout(10)
       d = s.recv(128); s.close()
       print(p, "->", d[5:].split(b"\x00")[0].decode(errors="replace"))
   PY
   ```
   Expected: `13306 -> 11.4.10-MariaDB-log` and `13307 -> 5.5.5-10.5.29-MariaDB-log`. These values were measured in this session against these hosts; a different version is acceptable, but **a failure or timeout is not**.

4. **Recovery, mode 1, dead process (the literal request).** Kill only the plugin for 13307 and confirm that it returns:
   ```bash
   PID=$(ss -ltnp 2>/dev/null | awk '/:13307/{match($0,/pid=([0-9]+)/,m); print m[1]}')
   kill -9 "$PID"
   sleep 20
   grep -E '13307' /tmp/g4t.log | tail -5
   ```
   Expected: an `exited with code …, restarting` line followed by a new `ready → 127.0.0.1:13307`. Repeat step 3 on 13307; the handshake must work again. 13306 **must not** have been restarted, because tunnels are independent.

5. **Recovery, mode 2, zombie tunnel (AWS's nasty case).** `SIGSTOP` freezes the plugin: the port remains in `LISTEN` but no data passes, so only the probe detects it. This also exercises SIGKILL escalation, since a stopped process does not handle SIGTERM:
   ```bash
   PID=$(ss -ltnp 2>/dev/null | awk '/:13306/{match($0,/pid=([0-9]+)/,m); print m[1]}')
   kill -STOP "$PID"
   sleep 40
   grep -E '13306' /tmp/g4t.log | tail -5
   ```
   Expected: `probe failed 2x (zombie tunnel), restarting`, followed by a new `ready → 127.0.0.1:13306`. Confirm that the frozen PID no longer exists (`ps -p "$PID"` → no process), then repeat the handshake from step 3 on 13306.

6. **Skills' preflight contract.** `pgrep -af tunnel_prod_db` → one line containing `tunnel_prod_db`. If it is empty, `exec -a` is wrong and the `mysql-prod`/`mysql-legacy` skills will fail.

7. **Clean shutdown.** Run `pkill -INT -f tunnel_prod_db; sleep 5`, then:
   `pgrep -af 'session-manager-plugin|ssm start-session'` → nothing; `ss -ltn | grep -E '1330[67]'` → nothing.

8. **Complete chain through MCP.** Start `tunnel_prod_db` (without a probe override) and run `SELECT 1` through the `mysql-prod` MCP and `SELECT 1` through `mysql-legacy`. Both must respond. This proves that the real consumer works, not only the probe.

9. **Staging.** Run `G4_TUNNEL_PROBE_SECS=5 zsh -ic 'tunnel_staging_db'`, wait for both `ready` lines (13316, 13317), perform the handshake on both ports, then send Ctrl-C. The failure tests do not need to be repeated; they use the same code.

## Assumptions & contingencies

- **EIP `107.20.138.57` is the egress address allowed by the firewall on `69.167.182.74`.** Verified by elimination: `i-0922c3a2f55791977` (the EIP owner) completes the legacy handshake; `i-01c67f5c442ee55f3`, in the same VPC/subnet/security group, times out. If 13307 ever stops starting while 13306 continues, the whitelist changed IP; find the new bastion and run with `G4_PROD_HOST=i-...` until the constant is updated.
- **Staging: `35.170.92.228` → `i-02d09c8f39f10bd74`.** Association verified. If only 13317 fails in step 9, use `G4_STAGING_HOST=i-02d09c8f39f10bd74` (today's behavior) and report it; this means the staging EIP was reassigned.
- **A 120 s probe as keepalive assumes a 20-minute idle timeout** (the account default, because `SSM-SessionManagerRunShell` does not exist). If someone creates that document with an `idleSessionTimeout` below about 3 min, lower the `G4_TUNNEL_PROBE_SECS` default to half the new value. Auto-reconnect continues to cover failures in the meantime.
- **Foreground only, by user choice.** Closing the terminal takes down the tunnels. If logout survival is needed later, the path is a `systemd --user` unit with `Restart=always` calling `/usr/bin/python3` (not the pyenv shim), outside this plan's scope.
