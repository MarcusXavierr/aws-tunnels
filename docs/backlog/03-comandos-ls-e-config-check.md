# [CLI] `awstun ls` e `awstun config check`

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#8](https://github.com/MarcusXavierr/aws-tunnels/issues/8)
**Status:** created

**Depende de:** 02

## Goal

Dá para conferir a configuração e descobrir que túneis existem sem abrir sessão nenhuma na AWS.

## Context

Quem edita o arquivo de configuração precisa de resposta imediata sobre se ele está correto, e quem esqueceu qual porta é de staging precisa de um lugar para olhar. Os dois comandos não tocam na AWS: leem o arquivo e respondem. É o que torna seguro editar a config sem credencial válida na mão.

## What needs to happen

`ls` imprime tabela de grupo, túnel, porta local e destino remoto. `config check` roda a validação da task 02 e sai 1 na primeira falha, listando todas as encontradas em vez de parar na primeira.

## Acceptance Criteria

* `awstun ls` lista os quatro túneis com suas portas e sai 0
* `awstun config check` numa config válida imprime confirmação e sai 0
* `awstun config check` com porta duplicada lista o conflito e sai 1
* Nenhum dos dois comandos executa o binário `aws`
