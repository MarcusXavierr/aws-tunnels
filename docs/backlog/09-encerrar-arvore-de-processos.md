# [SUPERVISOR] Matar a árvore de processos com escalada para SIGKILL

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#14](https://github.com/MarcusXavierr/aws-tunnels/issues/14)
**Status:** created

**Depende de:** 08

## Goal

Encerrar um túnel não deixa processo nem porta para trás, mesmo quando o plugin está travado.

## Context

SIGTERM resolve o caso normal, mas não o caso ruim: um plugin congelado (o cenário que o teste reproduz com `SIGSTOP`) nunca processa o sinal e ficaria pendurado com a porta em LISTEN para sempre. Sem escalada, o supervisor tentaria reiniciar um túnel cuja porta o próprio zumbi ainda ocupa.

## What needs to happen

`killTree(handle)`: SIGTERM no process group, esperar até 5 s pela saída, e no timeout SIGKILL no mesmo grupo com nova espera. Processo já morto é ignorado; o handle sempre termina zerado.

## Acceptance Criteria

* Processo que responde a SIGTERM sai sem SIGKILL
* Processo em `SIGSTOP` é encerrado pela escalada e a porta é liberada
* Chamar `killTree` num processo já morto não lança
* Depois de `killTree`, nenhum filho do grupo continua vivo

## Subtasks

* **SIGTERM no process group** — Sinal em grupo e espera com deadline. (#38)
* **Escalada para SIGKILL** — Timeout de 5 s, SIGKILL e segunda espera. (#39)
