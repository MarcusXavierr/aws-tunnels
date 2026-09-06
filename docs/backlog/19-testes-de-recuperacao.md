# [TEST] Cobrir os dois modos de falha, a independência e o shutdown

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#24](https://github.com/MarcusXavierr/aws-tunnels/issues/24)
**Status:** created

**Depende de:** 18, 17

## Goal

`bun test` prova que a supervisão funciona, sem credencial AWS e em segundos.

## Context

A recuperação é a razão de existir do projeto, então ela não pode ser verificada só à mão. Com o plugin falso e o intervalo de sondagem curto, cada cenário roda em segundos e regride automaticamente a cada mudança.

## What needs to happen

Um teste por cenário, todos usando o `Spawner` falso e intervalo de sondagem baixo: processo morto reinicia; túneis são independentes; zumbi é pego na segunda sonda e o reinício escala para SIGKILL; SIGINT não deixa processo nem porta.

## Acceptance Criteria

* Suite roda sem credencial AWS e sem rede
* Cada um dos quatro cenários falha se a lógica correspondente for removida
* Suite completa termina em menos de 30 s
* Nenhum teste deixa porta ocupada para o teste seguinte

## Subtasks

* **Teste de reinício por processo morto** — Modo `die` e volta do túnel. (#50)
* **Teste de independência entre túneis** — Queda de um não reinicia o outro. (#51)
* **Teste de túnel zumbi** — Modo `zombie`, dois strikes e escalada para SIGKILL. (#52)
* **Teste de shutdown sem órfão** — SIGINT com verificação de processo e porta. (#53)
