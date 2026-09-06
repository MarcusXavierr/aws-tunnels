# [SUPERVISOR] Spawner injetável com process group próprio

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#13](https://github.com/MarcusXavierr/aws-tunnels/issues/13)
**Status:** created

**Depende de:** 01

## Goal

O supervisor nunca chama `Bun.spawn` direto, e cada sessão nasce num process group que dá para matar inteiro.

## Context

O processo que realmente segura a porta local não é o `aws`, é o `session-manager-plugin` que ele lança. Matar só o pai deixa o filho vivo, e a próxima subida bate em porta ocupada — bug já observado na versão shell. Dar a cada sessão um process group próprio (via `setsid`, presente em `/usr/bin`) é o que permite matar a árvore de uma vez. Ao mesmo tempo, todo teste de supervisão depende de trocar o processo real por um falso, então o spawn entra atrás de uma interface desde o começo.

## What needs to happen

Interface `Spawner` com implementação real que executa `setsid aws …` via `Bun.spawn`, expondo pid, código de saída e as streams. Nenhum outro módulo instancia processo diretamente.

## Acceptance Criteria

* A implementação real devolve um processo cujo pid é líder do próprio process group
* O supervisor recebe o `Spawner` por injeção e funciona com uma implementação falsa
* Nenhum módulo além do spawner real referencia `Bun.spawn`
* Ausência de `setsid` no sistema produz erro claro na subida
