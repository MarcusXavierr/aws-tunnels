# [INFRA] Trocar as funções do `~/.zshrc` por wrappers da CLI

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#27](https://github.com/MarcusXavierr/aws-tunnels/issues/27)
**Status:** created

**Depende de:** 21

## Goal

As 88 linhas de lógica saem do `~/.zshrc` e os comandos do dia a dia continuam com o mesmo nome.

## Context

As skills `mysql-prod-query` e `mysql-legacy`, no repositório `api`, fazem preflight com `pgrep -af tunnel_prod_db` antes de consultar o banco. Manter as funções como wrappers com `exec -a` preserva esse contrato sem tocar em outro repositório — o custo dessa escolha está no ADR-0005. O `exec` precisa rodar dentro de um subshell, senão substitui o shell interativo e fecha o terminal.

## What needs to happen

Substituir as linhas 302 a 389 do `~/.zshrc` (comentário, `export G4_PROD_TUNNEL_EIP` e as duas funções) por dois wrappers `( exec -a tunnel_prod_db awstun up prod )` e o equivalente de staging, mais um comentário curto apontando para a config e para este repositório. O default da EIP passa a viver na config, não no ambiente.

## Acceptance Criteria

* `zsh -n ~/.zshrc` sai sem erro
* `tunnel_prod_db` sobe os dois túneis de prod e o terminal não é substituído nem fechado
* `pgrep -af tunnel_prod_db` devolve uma linha com o túnel no ar
* Nenhuma referência a `G4_PROD_TUNNEL_EIP` sobra no `~/.zshrc`

## Subtasks

* **Substituir o bloco de funções** — Wrappers com `exec -a` em subshell e comentário novo. (#56)
* **Conferir sintaxe e contrato de nome** — `zsh -n` limpo e `pgrep` casando. (#57)
