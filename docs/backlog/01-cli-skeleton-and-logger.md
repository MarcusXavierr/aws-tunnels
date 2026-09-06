# [CLI] awstun command skeleton and scoped logging

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] awstun: database tunnels that bring themselves back up
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#6](https://github.com/MarcusXavierr/aws-tunnels/issues/6)
**Status:** created

**Depends on:** —

## Goal

A binary that recognizes the subcommands, answers `--help`, and logs readably over hours of execution.

## Context

Today, opening the database tunnels means calling an 88-line function in `~/.zshrc` that says nothing while it runs. `awstun` will replace it, and before any tunnel logic it needs the shell: subcommand routing, a usage message, and a log that can be followed in a terminal left open all day. Since the supervisor writes from several concurrent loops, the logger is born with a per-line lock, otherwise messages come out interleaved and unreadable.

## What needs to happen

Subcommand router using `parseArgs` from `node:util` (no CLI dependency). `up`, `ls`, and `config check` registered, even though the handlers only exist in the following tasks. Logger with the format `HH:MM:SS  scope  message`, where scope is `prod/legacy` for a tunnel or `prod` for the supervisor, with immediate flush and a per-line lock.

## Done when

* `awstun --help` lists the three subcommands and exits 0; `awstun banana` exits 2 with the usage message on stderr
* `awstun --version` prints the version from `package.json`
* Two concurrent writes to the logger never produce an interleaved line (covered by a test)
* Documented exit codes: 0 success, 1 execution failure, 2 incorrect usage
