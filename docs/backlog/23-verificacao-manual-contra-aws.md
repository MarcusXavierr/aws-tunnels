# [TEST] Executar o roteiro de verificação contra prod e staging

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#29](https://github.com/MarcusXavierr/aws-tunnels/issues/29)
**Status:** created

**Depende de:** 22

## Goal

Prova de que a coisa funciona contra a AWS real, não só contra o plugin falso.

## Context

O plugin falso cobre a lógica de supervisão, mas não cobre resolução de bastion, permissão IAM, whitelist do host legado nem o consumidor real. Esta verificação fecha a lacuna, e o roteiro fica documentado para repetir depois de qualquer mudança no supervisor.

## What needs to happen

Rodar o roteiro com intervalo de sondagem curto: subir prod, confirmar handshake nas quatro portas, matar um plugin com `kill -9`, congelar outro com `kill -STOP`, encerrar com Ctrl-C e conferir remanescentes, e por fim `SELECT 1` pelos MCPs `mysql-prod` e `mysql-legacy`. Repetir a subida em staging.

## Acceptance Criteria

* As quatro portas (13306, 13307, 13316, 13317) devolvem banner do MySQL
* `kill -9` num plugin reinicia só aquele túnel; `kill -STOP` é detectado pela sonda e escalado
* Depois do Ctrl-C não sobra processo nem porta
* `SELECT 1` responde pelos dois MCPs de prod, e o roteiro fica versionado no repositório

## Subtasks

* **Handshake nas quatro portas** — Banner do MySQL em prod e staging. (#58)
* **Reprodução dos dois modos de falha** — `kill -9` e `kill -STOP` com log conferido. (#59)
* **Shutdown e ausência de remanescentes** — Ctrl-C e varredura de processo e porta. (#60)
* **Cadeia completa pelos MCPs** — `SELECT 1` em `mysql-prod` e `mysql-legacy`. (#61)
