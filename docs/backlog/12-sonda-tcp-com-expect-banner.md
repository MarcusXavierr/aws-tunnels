# [SUPERVISOR] Sonda de porta com espera opcional do primeiro byte

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#17](https://github.com/MarcusXavierr/aws-tunnels/issues/17)
**Status:** created

**Depende de:** 01

## Goal

Uma sonda que distingue túnel vivo de túnel zumbi sem conhecer protocolo nenhum.

## Context

O `accept()` da porta local acontece dentro do plugin, na própria máquina, então conectar e fechar passa mesmo com o canal para o bastion morto — que é exatamente o modo de falha por reciclagem de WebSocket. Esperar o primeiro byte resolve: byte recebido só pode ter vindo do servidor remoto. O raciocínio e os limites estão no ADR-0003.

## What needs to happen

`probe(port, { expectBanner, timeoutMs })` usando `Bun.connect`: conecta e, quando `expectBanner`, aguarda ao menos um byte por até 2 s. Falha é sinalizada por rejeição, com a causa distinguindo conexão recusada, timeout de conexão e timeout de banner. O socket é sempre fechado.

## Acceptance Criteria

* Porta com servidor que envia banner passa com `expectBanner`
* Porta que aceita conexão e nunca envia byte falha com `expectBanner` e passa sem ele
* Porta fechada falha como conexão recusada
* Nenhuma sonda deixa socket aberto, mesmo em erro

## Subtasks

* **Conectar e fechar** — Caminho básico e distinção dos erros de conexão. (#42)
* **Espera de banner com deadline** — Ler ao menos um byte dentro do prazo. (#43)
