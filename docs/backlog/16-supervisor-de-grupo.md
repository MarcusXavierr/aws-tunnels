# [SUPERVISOR] Supervisionar todos os túneis do grupo de forma independente

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#21](https://github.com/MarcusXavierr/aws-tunnels/issues/21)
**Status:** created

**Depende de:** 14

## Goal

`awstun up prod` mantém os dois túneis do ambiente de pé, e a queda de um não afeta o outro.

## Context

É o defeito central da versão shell: ela espera nos dois processos ao mesmo tempo, então quando um cai o `wait` retorna e ambos vão embora. Cada túnel tem de ter ciclo de vida próprio, porque na prática é comum um cair e o outro estar em pleno uso.

## What needs to happen

`up <grupo>` resolve o bastion uma vez, loga a linha de abertura com bastion e mapa de portas, e sobe um laço por túnel. `up <grupo>.<túnel>` sobe apenas um. Falha de subida de um túnel não interrompe os demais, exceto porta ocupada, que aborta o grupo por decisão do ADR-0001.

## Acceptance Criteria

* `up prod` deixa 13306 e 13307 servindo dados simultaneamente
* Matar o processo de um dos túneis reinicia só ele; o outro não é tocado
* `up prod.legacy` sobe apenas a 13307
* Grupo ou túnel inexistente sai 2 com a lista de nomes válidos
