# [AWS] Override manual do bastion e reresolução após falhas

**Type:** Task
**Priority:** P1
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#12](https://github.com/MarcusXavierr/aws-tunnels/issues/12)
**Status:** created

**Depende de:** 05

## Goal

Existe válvula de escape para forçar o bastion, e a CLI redescobre sozinha quando a instância é trocada durante a execução.

## Context

Quando a whitelist do host legado mudar de endereço, a config vai estar sintaticamente correta e ainda assim errada. O desbloqueio precisa ser imediato, sem editar arquivo: `--bastion i-…` ou `AWSTUN_<GRUPO>_BASTION`. No outro sentido, se a instância for substituída com o supervisor rodando, insistir para sempre no id velho é inútil — depois de três falhas seguidas de subida, o valor cacheado é descartado.

## What needs to happen

Precedência: flag, depois variável de ambiente, depois config. Cache do id resolvido por execução, invalidado quando um túnel acumula três falhas consecutivas de subida, forçando nova resolução na tentativa seguinte.

## Acceptance Criteria

* `--bastion i-…` pula a resolução e é usado por todos os túneis do grupo
* `AWSTUN_PROD_BASTION` tem efeito equivalente, e a flag ganha dela
* Três falhas consecutivas de subida invalidam o cache e a resolução roda de novo
* Precedência flag > ambiente > config coberta por teste
