# [SUPERVISOR] Encerrar tudo no Ctrl-C sem deixar órfão

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#22](https://github.com/MarcusXavierr/aws-tunnels/issues/22)
**Status:** created

**Depende de:** 09, 16

## Goal

Ctrl-C é o comando de desligar: nada de processo pendurado nem porta presa depois dele.

## Context

Na versão shell, matar o supervisor deixava o `session-manager-plugin` vivo segurando a porta, e a subida seguinte reclamava de porta ocupada — sintoma que obrigava a lembrar do `pkill -f session-manager-plugin`. Como o modo foreground faz do Ctrl-C a única forma de desligar (ADR-0001), esse caminho tem de ser à prova de falha.

## What needs to happen

Handlers de SIGINT e SIGTERM sinalizam parada, os laços saem, cada túnel passa por `killTree`, e uma varredura final garante que nenhum handle ficou. Exit 0 com uma linha de encerramento no log.

## Acceptance Criteria

* Após SIGINT, nenhum processo `session-manager-plugin` sobrevive
* Após SIGINT, nenhuma das portas do grupo continua em LISTEN
* O encerramento leva menos de 10 s mesmo com processo travado
* Exit code é 0 em desligamento pedido pelo usuário

## Subtasks

* **Handlers de sinal e parada dos laços** — SIGINT/SIGTERM sinalizam e os laços saem da espera. (#46)
* **Varredura final de remanescentes** — Garantir handle zerado e porta liberada antes de sair. (#47)
