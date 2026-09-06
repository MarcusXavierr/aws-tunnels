# [CLI] Ler e validar o arquivo de configuração de túneis

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#7](https://github.com/MarcusXavierr/aws-tunnels/issues/7)
**Status:** created

**Depende de:** 01

## Goal

A lista de túneis passa a viver num TOML editável em vez de estar escrita no `~/.zshrc`.

## Context

Cada túnel que existe hoje está codificado dentro de uma função shell, então adicionar uma conexão significa copiar e colar trinta linhas. A `awstun` lê tudo de `~/.config/aws-tunnels/config.toml`: grupos (`prod`, `staging`), o bastion de cada um e a lista de túneis com host remoto, porta remota, porta local e o flag `expect_banner`. Erro de configuração precisa apontar a chave culpada, porque um TOML mal formado no meio da manhã não pode virar stack trace.

## What needs to happen

Tipos do arquivo, loader respeitando `XDG_CONFIG_HOME` e parse com `Bun.TOML.parse` (disponível no Bun 1.4, zero dependência). Validação separada do parse: porta local duplicada dentro do arquivo, campo desconhecido, grupo sem túnel, `bastion` sem `eip` nem `instance_id`, porta fora de faixa. Todo erro carrega o caminho da chave, por exemplo `groups.prod.tunnels[1].local_port`.

## Acceptance Criteria

* Config válida com os quatro túneis de hoje carrega e devolve estrutura tipada
* Cada erro de validação cita a chave e a razão, e nenhum deles propaga exceção crua
* Arquivo ausente produz mensagem dizendo onde criá-lo, não `ENOENT`
* `XDG_CONFIG_HOME` é respeitado quando definido

## Subtasks

* **Tipos e loader do TOML** — Ler o arquivo do caminho correto e devolver a estrutura tipada, sem validar. (#33)
* **Validação com erro apontando a chave** — Porta duplicada, campo desconhecido, bastion incompleto, porta fora de faixa. (#34)
* **Fixtures de config inválida** — Um TOML por modo de falha, usados pelos testes de validação. (#35)
