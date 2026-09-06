---
status: "accepted"
date: 2026-09-06
decision-makers: Marcus Xavier
---

# Bastion resolved by Elastic IP at runtime

## Context and Problem Statement

The tunnel needs a bastion, and the question is how to name it in the configuration. Hard-coding the instance id has already failed at a high cost: `i-0b68958c959cf379a` was stopped, and every helper carrying that id began failing with `TargetNotConnected`. There is an additional constraint that the instance id does not capture: the legacy host filters by source IP, so not every live instance works. Of the two prod machines, only the one carrying Elastic IP `107.20.138.57` completes the handshake, while `i-01c67f5c442ee55f3`, in the same VPC, subnet, and security group, reaches RDS and times out on the legacy host.

## Decision Drivers

* The only thing the legacy host's firewall sees is the egress IP.
* Instances are recreated; the whitelisted address is what persists.
* A resolution failure must say what to do, rather than raising a generic `TargetNotConnected`.
* A manual escape hatch is needed when reality diverges from the configuration.

## Considered Options

* Fixed instance id in the configuration
* Elastic IP in the configuration, resolved with `describe-addresses` on every startup
* Search by tag (for example, `Name=bastion`) with `describe-instances`

## Decision Outcome

Chosen option: "Elastic IP in the configuration, resolved with `describe-addresses`", because the EIP is the identity that actually matters for access to work: it is the address whitelisted by the legacy host. An alternative `{ instance_id = "i-…" }` field, together with the `--bastion` override and `AWSTUN_<GROUP>_BASTION` variable, is available as an escape hatch without editing the file.

### Consequences

* Good, because the configuration survives instance recreation and replacement, which was the failure actually observed.
* Good, because resolution converges on the only host that passes through the legacy firewall, rather than any host that happens to be online.
* Good, because checking `PingStatus=Online` before opening a session replaces `TargetNotConnected` with a message saying whether the instance is stopped or the ssm-agent is down.
* Bad, because each startup adds two AWS calls, with the corresponding latency and a requirement for `ec2:DescribeAddresses` and `ssm:DescribeInstanceInformation` in the policy.
* Bad, because if the legacy whitelist starts allowing a different address, the configuration remains syntactically valid and the failure appears far from its cause: only the legacy tunnel stops serving data while the application tunnel remains healthy.
* Bad, because nothing works without valid credentials, including discovering the target, which turns an expired token into "could not resolve the bastion".
* Neutral, because the EIP is written in the configuration as data rather than in two `~/.zshrc` environment variables as it is today.

### Confirmation

Manual verification against real AWS requires a handshake on all four ports: `13306` and `13316` prove the path to RDS, while `13307` and `13317` prove that egress used the whitelisted IP. If only the legacy ports fail, the whitelist changed.

## Pros and Cons of the Options

### Fixed instance id

* Good, because there is no resolution call and behavior is deterministic.
* Bad, because it silently rots: a stopped or recreated instance takes everything down, with an error that does not suggest the cause.
* Bad, because it does not express the constraint that actually governs access, which is the source IP.

### Elastic IP resolved at runtime

* Good, because it expresses the real constraint and survives instance replacement.
* Neutral, because it moves the failure point from the configuration to the API call.
* Bad, because it depends on credentials and EC2 permission before any tunnel can start.

### Search by tag

* Good, because it is readable and does not require knowing an address.
* Bad, because it resolves the wrong criterion: an instance named `bastion` may not carry the whitelisted EIP, reproducing the timeout on the legacy host.
* Bad, because a tag is an editable convention for anyone with console access.

## More Information

If resolution fails in the field, start with `--bastion i-…` to unblock the work, then fix the EIP in the configuration.
