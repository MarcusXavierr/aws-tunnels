# [TEST] Cobrir validação de config e listagem

**Type:** Task
**Priority:** P1
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#25](https://github.com/MarcusXavierr/aws-tunnels/issues/25)
**Status:** created

**Depende de:** 03

## Goal

Erros de configuração são pegos por teste, não descobertos ao tentar subir um túnel.

## Context

A validação é a primeira coisa que o usuário encontra e a mais fácil de deixar apodrecer. Com fixtures por modo de falha, cada mensagem de erro passa a ser um contrato verificado.

## What needs to happen

Testes de tabela sobre as fixtures da task 02: porta duplicada, TOML sintaticamente inválido, bastion sem `eip` e sem `instance_id`, campo desconhecido, porta fora de faixa. Mais um teste de saída estável do `ls`.

## Acceptance Criteria

* Cada fixture inválida produz erro citando a chave esperada
* Config válida com os quatro túneis passa
* `config check` sai 1 em config inválida e 0 em válida
* `ls` tem saída determinística
