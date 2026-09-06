# [CLI] Esqueleto do comando `awstun` e log com escopo

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#6](https://github.com/MarcusXavierr/aws-tunnels/issues/6)
**Status:** created

**Depende de:** —

## Goal

Um binário que reconhece os subcomandos, responde `--help` e loga de forma legível durante horas de execução.

## Context

Hoje abrir os túneis do banco é chamar uma função de 88 linhas no `~/.zshrc` que não avisa nada enquanto roda. A `awstun` vai substituí-la, e antes de qualquer lógica de túnel ela precisa da casca: roteamento de subcomando, mensagem de uso e um log que se possa acompanhar num terminal aberto o dia inteiro. Como o supervisor escreve de vários laços concorrentes, o logger nasce com trava de linha, senão as mensagens saem intercaladas e ilegíveis.

## What needs to happen

Roteador de subcomando usando `parseArgs` do `node:util` (nada de dependência de CLI). `up`, `ls` e `config check` registrados, ainda que os handlers só existam nas tasks seguintes. Logger com formato `HH:MM:SS  escopo  mensagem`, onde escopo é `prod/legacy` para um túnel ou `prod` para o supervisor, com flush imediato e trava por linha.

## Acceptance Criteria

* `awstun --help` lista os três subcomandos e sai 0; `awstun banana` sai 2 com a mensagem de uso em stderr
* `awstun --version` imprime a versão do `package.json`
* Duas escritas concorrentes no logger nunca produzem linha intercalada (coberto por teste)
* Exit codes documentados: 0 sucesso, 1 falha de execução, 2 uso incorreto
