# [SUPERVISOR] Backoff progressivo entre tentativas de subida

**Type:** Task
**Priority:** P1
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#20](https://github.com/MarcusXavierr/aws-tunnels/issues/20)
**Status:** created

**Depende de:** 14

## Goal

Falha persistente não vira laço apertado de `start-session`, e recuperação rápida não é penalizada.

## Context

Sem backoff, credencial expirada ou bastion inalcançável fazem a CLI martelar a API da AWS num laço de reinício, enchendo o log e arriscando throttling. Com backoff mas sem reset, um túnel que caiu cinco vezes ao longo do dia passaria a esperar meio minuto mesmo estando estável.

## What needs to happen

Sequência `[0, 2, 4, 8, 16, 30]` segundos, avançando a cada falha e saturando no último valor; primeira tentativa não espera. O índice volta a zero depois de 60 s de saúde contínua. A espera usa o mesmo mecanismo interrompível do laço de sondagem.

## Acceptance Criteria

* Primeira subida não tem espera
* Falhas sucessivas seguem a sequência e saturam em 30 s
* Sessenta segundos saudável zera o backoff, comprovado por teste com intervalo curto
* Ctrl-C durante a espera de backoff encerra imediatamente
