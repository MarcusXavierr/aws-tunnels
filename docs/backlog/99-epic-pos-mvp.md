# [EPIC] `awstun` pós-MVP: sobrevivência ao terminal e transporte próprio

**Type:** Epic
**Priority:** P2
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** epic
**Issue:** [#5](https://github.com/MarcusXavierr/aws-tunnels/issues/5)
**Status:** created

## Goal

Tirar duas limitações assumidas de propósito no MVP: os túneis morrem com o terminal, e a subida depende de dois binários externos com confirmação por casamento de string.

## Context

O MVP é foreground e delega o transporte ao `aws ssm start-session`, e as duas escolhas estão registradas com seus custos em [ADR-0001](../decisions/0001-supervisor-em-foreground-sem-daemon.md) e [ADR-0002](../decisions/0002-transporte-delegado-ao-aws-cli.md). Nenhuma das duas dói o suficiente para atrasar o MVP, mas ambas têm um caminho de saída conhecido. Este épico existe para que esse caminho não se perca, e nada aqui começa antes de o MVP estar em uso.

## Acceptance Criteria

* Cada mudança de rumo entra como novo ADR substituindo o anterior, nunca como edição do registro aceito
* O spike de transporte nativo entrega recomendação escrita, com esforço e risco, sem tocar em código de produção
* Se o daemon for adotado, ele mantém a mesma garantia de desligamento do modo foreground: zero remanescente
