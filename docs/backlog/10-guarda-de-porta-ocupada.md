# [SUPERVISOR] Abortar quando a porta local já está em uso

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#15](https://github.com/MarcusXavierr/aws-tunnels/issues/15)
**Status:** created

**Depende de:** 08

## Goal

Subir com a porta tomada falha na hora dizendo quem a segura, em vez de disputar o encaminhamento.

## Context

Duas sessões apontando para a mesma porta local produzem o pior tipo de bug: as consultas vão para um túnel que o supervisor não controla e não consegue reiniciar. A regra é não disputar — e a mensagem precisa ser suficiente para resolver, ou seja, dizer qual processo está ali.

## What needs to happen

Antes da primeira subida, testar `bind` em `127.0.0.1:<porta>`; ocupada aborta o grupo inteiro (decisão do ADR-0001, que rejeita adotar túnel alheio). A mensagem traz pid e linha de comando de quem escuta, lidos de `/proc`, mais a sugestão de encerrar o túnel anterior. Em reinício não há checagem: a porta foi liberada pelo `killTree`.

## Acceptance Criteria

* Porta livre segue para a subida
* Porta ocupada aborta o grupo com exit 1, citando pid e comando de quem a detém
* Um túnel com porta ocupada não deixa os outros do grupo no ar pela metade
* Reinício de túnel supervisionado não é bloqueado pela própria porta
