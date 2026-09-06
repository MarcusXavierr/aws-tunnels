# [INFRA] Compilar o binário e instalar em `~/.local/bin`

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#26](https://github.com/MarcusXavierr/aws-tunnels/issues/26)
**Status:** created

**Depende de:** 17

## Goal

Um comando gera o binário e outro o coloca no PATH, sem exigir Bun instalado para usar.

## Context

A CLI substitui uma função de shell, então precisa estar sempre disponível, inclusive num shell que não tem Bun no PATH. O `bun build --compile` resolve isso num arquivo único, e o passo de instalação tem de ser repetível sem sujar nada.

## What needs to happen

Script de build gerando `dist/awstun` e script de install copiando para `~/.local/bin/awstun` (idempotente, avisando se o diretório não estiver no PATH). Os dois expostos como scripts do `package.json`.

## Acceptance Criteria

* `bun run build` produz `dist/awstun` executável
* O binário roda com o PATH sem Bun, comprovado com `env -i`
* `bun run install` é idempotente e sobrescreve versão anterior
* `~/.local/bin` fora do PATH gera aviso, não falha silenciosa

## Subtasks

* **Target de build** — `bun build --compile` para `dist/awstun`. (#54)
* **Script de instalação** — Cópia idempotente para `~/.local/bin` com aviso de PATH. (#55)
