# [SUPERVISOR] Sondagem periódica que também mantém a sessão viva

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#18](https://github.com/MarcusXavierr/aws-tunnels/issues/18)
**Status:** created

**Depende de:** 12

## Goal

O laço de sondagem gera o tráfego que impede o Session Manager de encerrar a sessão por inatividade.

## Context

O Session Manager encerra sessão ociosa em 20 minutos por padrão, e o timer só reseta com tráfego do cliente — é a causa número um de os túneis de hoje morrerem sozinhos. Sondar de dois em dois minutos resolve as duas coisas ao mesmo tempo: mantém a sessão viva e limita a janela cega de detecção.

## What needs to happen

Laço por túnel com intervalo de `probe_interval` (default 120 s, sobrescrito por `AWSTUN_PROBE_INTERVAL` para tornar os testes rápidos). A espera é interrompível, para que Ctrl-C não fique preso aguardando o intervalo inteiro. Valor inválido cai no default com aviso no log.

## Acceptance Criteria

* Com `AWSTUN_PROBE_INTERVAL=1` a sondagem ocorre a cada segundo, comprovado por teste
* Ctrl-C durante a espera encerra em menos de um segundo, sem aguardar o intervalo
* `probe_interval` inválido usa o default e registra aviso
* Túnel saudável permanece no ar por mais de 20 minutos numa execução real
