# [SUPERVISOR] Subir um túnel e confirmar que a porta abriu

**Type:** Task
**Priority:** P0
**Parent:** [EPIC] `awstun`: túneis de banco que se levantam sozinhos
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#16](https://github.com/MarcusXavierr/aws-tunnels/issues/16)
**Status:** created

**Depende de:** 08, 10

## Goal

Um túnel só é considerado no ar quando o `aws` confirma que a porta foi aberta.

## Context

Tratar o spawn como sucesso é o erro que a versão shell comete: o processo existe, a porta talvez não. O `aws` imprime `Port N opened` quando o encaminhamento fica pronto, e essa linha é a única confirmação disponível — o parsing de stdout é um contrato frágil assumido de propósito no ADR-0002. Sem ela em 30 segundos, é mais barato matar e tentar de novo do que esperar indefinidamente.

## What needs to happen

Montar o `--parameters` (host, `portNumber`, `localPortNumber`) e o `--document-name AWS-StartPortForwardingSessionToRemoteHost`, spawnar pelo `Spawner`, e aguardar a linha de confirmação com deadline de 30 s. Timeout mata a árvore e conta falha de subida. Linhas do processo são repassadas ao log, descartando o ruído de desligamento sobre filho morto por sinal.

## Acceptance Criteria

* Subida bem-sucedida loga o túnel pronto com a porta local
* Ausência da linha de confirmação em 30 s mata o processo e conta falha de subida
* Saída do `aws` aparece no log com escopo `grupo/túnel`
* O JSON de `--parameters` é montado a partir da config, sem string interpolada à mão

## Subtasks

* **Montagem do comando `start-session`** — Documento, região, alvo e parâmetros derivados da config. (#40)
* **Detector de porta aberta com deadline** — Casar a linha de confirmação em 30 s ou falhar. (#41)
