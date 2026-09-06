# [DOCS] README, config de exemplo e troubleshooting

**Type:** Task
**Priority:** P1
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#30](https://github.com/MarcusXavierr/aws-tunnels/issues/30)
**Status:** created

**Depende de:** 21

## Goal

Alguém que nunca viu o projeto instala, configura e sabe o que fazer quando dá erro.

## Context

Os túneis são infraestrutura de trabalho: quando quebram, quebram no meio de outra coisa. O README precisa levar do zero ao túnel no ar e responder às três falhas previsíveis sem obrigar a ler código.

## What needs to happen

README com instalação, os três comandos, o formato da config e uma seção de troubleshooting cobrindo porta ocupada, EIP remanejada (só as portas legadas param de servir) e credencial expirada. Config de exemplo versionada com os quatro túneis de hoje.

## Acceptance Criteria

* Seguir o README do zero deixa um túnel de staging no ar
* A config de exemplo é aceita por `awstun config check` sem edição
* Troubleshooting cobre as três falhas com o comando de diagnóstico de cada uma
* O README aponta para `docs/decisions/` para o porquê das escolhas
