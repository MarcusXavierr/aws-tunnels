# [AWS] Descobrir o bastion pela Elastic IP

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#10](https://github.com/MarcusXavierr/aws-tunnels/issues/10)
**Status:** created

**Depende de:** 04

## Goal

O grupo aponta para uma Elastic IP e a CLI descobre, na hora, qual instância a carrega.

## Context

Fixar o instance id já custou caro: `i-0b68958c959cf379a` foi parado e todos os helpers com esse id passaram a falhar com `TargetNotConnected`. Pior, o host legado filtra por IP de origem, então só serve a instância que carrega a EIP whitelistada — o raciocínio completo está no ADR-0004. Esta task implementa a resolução e o caminho alternativo de instance id explícito.

## What needs to happen

`resolveBastion(group)`: com `{ eip }`, chama `describe-addresses --public-ips <eip>` e extrai `Addresses[0].InstanceId`; saída vazia ou `None` vira erro nomeado dizendo para checar o console ou usar o override. Com `{ instance_id }`, devolve direto sem chamar a AWS.

## Acceptance Criteria

* EIP associada devolve o instance id correto
* EIP que ninguém carrega produz erro citando a EIP e sugerindo o override
* `{ instance_id }` na config não dispara nenhuma chamada AWS
* Falha do `aws` chega ao usuário com o stderr original visível

## Subtasks

* **Resolver via `describe-addresses`** — Chamada, extração do id e erro quando ninguém carrega a EIP. (#36)
* **Caminho de instance id explícito** — Curto-circuito quando a config já traz o id. (#37)
