# [AWS] Invocação do `aws` CLI com timeout e erro legível

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#9](https://github.com/MarcusXavierr/aws-tunnels/issues/9)
**Status:** created

**Depende de:** 01

## Goal

Toda chamada ao `aws` passa por um ponto só, com timeout e erro que diz o que fazer.

## Context

A CLI delega o transporte ao `aws ssm start-session` (ver ADR-0002), então também depende do `aws` para descobrir o bastion. Essas chamadas travam quando a rede vai mal e falham de formas variadas: binário ausente, credencial expirada, permissão negada. Concentrar isso num wrapper evita repetir tratamento de erro em cada chamador e transforma `ENOENT` em instrução.

## What needs to happen

`runAws(args)` executando via `Bun.spawn`, com timeout de 30 s, stdout e stderr capturados e erro tipado distinguindo binário ausente, timeout e saída diferente de zero (com o stderr embutido na mensagem). `aws` fora do PATH produz mensagem dizendo que ele é requisito.

## Acceptance Criteria

* Chamada bem-sucedida devolve stdout já com `trim`
* Saída diferente de zero vira erro tipado carregando o stderr do `aws`
* Comando que passa de 30 s é morto e vira erro de timeout, não travamento
* `aws` ausente do PATH produz mensagem acionável, não `ENOENT`
