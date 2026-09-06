# [EPIC] `awstun`: túneis de banco que se levantam sozinhos

**Type:** Epic
**Priority:** P0
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** epic
**Issue:** [#4](https://github.com/MarcusXavierr/aws-tunnels/issues/4)
**Status:** created

## Goal

Substituir as funções de shell que abrem os túneis SSM para os bancos por uma CLI compilada que mantém cada túnel de pé sozinho, reconectando quando ele morre.

## Context

Consultar os bancos de prod e staging depende de quatro túneis SSM abertos por duas funções de 88 linhas no `~/.zshrc`. Eles morrem sozinhos por dois motivos: o Session Manager encerra sessão ociosa em 20 minutos, e o `session-manager-plugin` às vezes continua vivo com o túnel já morto depois de uma reciclagem de WebSocket. Nos dois casos ninguém reinicia nada, e a descoberta acontece no meio de outra coisa, com uma consulta que trava. Este épico entrega `awstun`: configuração declarativa em TOML, supervisão com sonda, reinício com backoff e desligamento limpo.

O plano de origem está em [`ssm_tunel_plan.md`](../../ssm_tunel_plan.md) (escrito para Python, agora em Bun). As decisões estruturais e o que foi rejeitado estão em [`docs/decisions/`](../decisions/README.md).

## Escopo

Dentro: config TOML, resolução de bastion por Elastic IP, subida e supervisão de N túneis por grupo, sonda com espera de banner, backoff, shutdown limpo, testes com plugin falso, binário compilado, cutover do `~/.zshrc` e verificação contra a AWS real.

Fora: modo daemon, `status`/`down`/`logs`, transporte nativo sem o `aws` CLI. Os dois estão no épico de pós-MVP.

## Acceptance Criteria

* `awstun up prod` mantém 13306 e 13307 servindo dados por mais de 20 minutos sem intervenção
* Matar o plugin de um túnel, ou congelá-lo com `SIGSTOP`, faz só aquele túnel voltar; o outro não é tocado
* Ctrl-C não deixa processo `session-manager-plugin` nem porta em LISTEN
* `tunnel_prod_db` continua sendo o comando, e `pgrep -af tunnel_prod_db` continua casando para as skills do repo `api`
