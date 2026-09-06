# [TEST] Plugin falso com modos de falha controlados

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#23](https://github.com/MarcusXavierr/aws-tunnels/issues/23)
**Status:** created

**Depende de:** 08

## Goal

Um processo falso que imita o `aws`/`session-manager-plugin` e sabe falhar de cada jeito que importa.

## Context

Não é possível testar recuperação contra a AWS real: não se pede à AWS para reciclar um WebSocket na hora do teste. O falso fecha essa lacuna imitando o contrato observável — imprime a linha de porta aberta, escuta na porta, e sabe morrer, congelar ou virar zumbi que aceita conexão e nunca responde.

## What needs to happen

Script executável usado pelo `Spawner` falso nos testes: abre a porta local pedida, imprime a linha de confirmação, e responde com banner por conexão. Modos por argumento: `die` (sai após N segundos), `freeze` (para de responder mas mantém a porta), `zombie` (aceita e nunca envia byte), `silent` (nunca imprime a linha de confirmação).

## Acceptance Criteria

* Modo normal abre a porta, imprime a confirmação e responde com banner
* Modo `zombie` aceita conexão e nunca envia byte
* Modo `silent` nunca imprime a confirmação, exercitando o timeout de subida
* O falso é encerrável por `killTree` como o processo real

## Subtasks

* **Servidor falso base** — Abrir porta, imprimir confirmação, responder banner. (#48)
* **Modos die, freeze, zombie e silent** — Um argumento por modo de falha. (#49)
