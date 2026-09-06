# [SPIKE] Avaliar abrir o port forward sem o `aws` CLI

**Type:** Task
**Priority:** P3
**Parent:** [EPIC] `awstun` pós-MVP
**Tracker:** GitHub Issues (Project *AWS Tunnels*)
**Labels:** task
**Issue:** [#31](https://github.com/MarcusXavierr/aws-tunnels/issues/31)
**Status:** created

**Depende de:** 16

## Goal

Decidir, com medição, se falar o data channel do Session Manager em Bun vale o risco.

## Context

Delegar ao `aws` CLI (ADR-0002) traz dois binários externos e uma confirmação de subida baseada em casar string no stdout. Falar o protocolo direto eliminaria os dois problemas e daria acesso ao ping do WebSocket, tornando a detecção de queda imediata em vez de amostrada. O risco é reimplementar protocolo não documentado — este spike mede antes de comprometer.

## What needs to happen

Protótipo com `@aws-sdk/client-ssm` para `StartSession` e o `WebSocket` nativo do Bun para o data channel, contra um túnel de staging. Entregável é escrito: funcionou ou não, esforço estimado, o que quebra quando a AWS mudar, e recomendação. Se for adotado, o ADR-0002 é substituído por um novo registro.

## Acceptance Criteria

* Protótipo consegue (ou comprovadamente não consegue) encaminhar uma conexão MySQL de staging
* Documento com LOE, riscos e recomendação em `docs/`
* Recomendação de adotar vem acompanhada de novo ADR substituindo o 0002
* Nenhuma mudança no código de produção nesta task
