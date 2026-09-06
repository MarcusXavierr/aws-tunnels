# [AWS] Exigir instância conectada ao SSM antes de abrir sessão

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#11](https://github.com/MarcusXavierr/aws-tunnels/issues/11)
**Status:** created

**Depende de:** 05

## Goal

Instância parada ou com agente caído falha na hora, com diagnóstico, em vez de erro genérico da AWS.

## Context

Quando o bastion existe mas não está falando com o Systems Manager, o `start-session` devolve `TargetNotConnected`, mensagem que não diz se a máquina está parada, se o ssm-agent morreu ou se o id está errado. Perguntar antes custa uma chamada e transforma isso em diagnóstico.

## What needs to happen

Após resolver o bastion, checar `describe-instance-information` filtrando pelo id e exigir `PingStatus=Online`. Diferente disso, abortar com mensagem dizendo instância parada ou ssm-agent fora do ar. A checagem roda uma vez por resolução, não por túnel.

## Acceptance Criteria

* Bastion `Online` segue o fluxo normal
* `PingStatus` diferente de `Online` aborta antes de qualquer `start-session`, com a causa provável na mensagem
* A checagem é feita uma vez por resolução mesmo com vários túneis no grupo
