# [SUPERVISOR] Reiniciar por processo morto e por sonda falha

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#19](https://github.com/MarcusXavierr/aws-tunnels/issues/19)
**Status:** created

**Depende de:** 11, 13

## Goal

Os dois modos de morte do túnel levam a reinício automático, e blip de rede não derruba túnel saudável.

## Context

São falhas de natureza diferente: o processo sair (sessão encerrada por inatividade) é detectado direto no handle, enquanto o zumbi só aparece na sonda. Exigir dois strikes antes de reiniciar é deliberado — um pico transitório de rede não justifica derrubar uma sessão que está servindo consultas.

## What needs to happen

Estado por túnel: handle do processo, contador de falhas de sonda, contador de falhas de subida e marca de quando ficou saudável. Handle encerrado leva a reinício com o código de saída no log. Duas sondas falhas consecutivas levam a `killTree` e nova subida. Sonda bem-sucedida zera o contador.

## Acceptance Criteria

* Processo morto é detectado e o túnel volta sem intervenção
* Uma única sonda falha não reinicia nada; a segunda consecutiva reinicia
* Sonda bem-sucedida entre duas falhas zera o contador
* O log diz qual dos dois motivos causou cada reinício

## Subtasks

* **Reinício por processo encerrado** — Detectar saída do handle e resubir. (#44)
* **Reinício por duas sondas falhas** — Contador de strikes, `killTree` e nova subida. (#45)
