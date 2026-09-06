# [SUPERVISOR] Modo daemon com `status`, `down` e `logs`

**Type:** Task
**Priority:** P2
**Parent:** [EPIC] `awstun` pós-MVP
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#32](https://github.com/MarcusXavierr/aws-tunnels/issues/32)
**Status:** created

**Depende de:** 17

## Goal

Os túneis passam a sobreviver ao fechamento do terminal, e dá para perguntar de outro shell se estão vivos.

## Context

O MVP é foreground de propósito (ADR-0001): cada ambiente ocupa um terminal e fechar a janela derruba tudo. Se isso incomodar no uso diário, o caminho é um daemon — o que traz consigo estado em disco, descoberta de processo de outro shell e política de órfãos, exatamente o que o MVP evita.

## What needs to happen

Desenhar antes de codar, porque a decisão precisa de novo ADR substituindo o 0001. Escopo esperado: `up --detach`, arquivo de estado, `status` sondando as portas conhecidas, `down` encerrando por grupo e `logs` lendo o log persistido.

## Acceptance Criteria

* Novo ADR substituindo o 0001 antes de qualquer código
* Túnel sobrevive ao fechamento do terminal que o subiu
* `status` distingue túnel saudável, zumbi e ausente
* `down` não deixa remanescente, com a mesma garantia do shutdown foreground
