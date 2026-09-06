---
status: "accepted"
date: 2026-09-06
decision-makers: Marcus Xavier
---

# Delegar o transporte ao `aws ssm start-session`

## Context and Problem Statement

Um port forward do Session Manager não é um túnel TCP comum: o cliente abre uma sessão pela API, recebe um endpoint de WebSocket e conversa por um data channel binário que a AWS não documenta como contrato público. A `awstun` precisa abrir esse encaminhamento e, principalmente, saber quando ele morreu. A escolha é entre reimplementar esse canal em Bun ou continuar delegando para as ferramentas oficiais.

## Decision Drivers

* O protocolo do data channel não tem especificação pública estável.
* Credencial e SSO já funcionam no `aws` CLI da máquina; refazer isso é trabalho sem valor.
* Quanto mais perto do canal, mais controle sobre keepalive e detecção de queda.
* Dependência de binário externo é superfície de instalação e de falha.

## Considered Options

* Spawn de `aws ssm start-session` com o documento `AWS-StartPortForwardingSessionToRemoteHost`
* `@aws-sdk/client-ssm` para `StartSession` e implementação própria do data channel sobre o `WebSocket` nativo do Bun
* `ssh -L` com `ProxyCommand` usando `AWS-StartSSHSession`

## Decision Outcome

Chosen option: "Spawn de `aws ssm start-session`", porque é a única opção em que o protocolo é mantido por quem o define, e porque preserva paridade exata com o comportamento que já funciona hoje. A alternativa nativa é atraente pelo controle que oferece, mas trocar um problema de supervisão por um problema de reverse engineering de protocolo binário inverteria a razão de existir do projeto.

### Consequences

* Good, because mudanças de protocolo, retry interno e autenticação continuam sendo problema da AWS.
* Good, because SSO, perfis e `AWS_PROFILE` funcionam sem uma linha de código.
* Bad, because a CLI passa a depender de dois binários externos no PATH: `aws` e `session-manager-plugin`.
* Bad, because o processo que realmente segura a porta local é o plugin, filho do `aws` — matar só o pai deixa o filho órfão segurando a porta, o que obriga a dar process group próprio a cada sessão e matar em grupo.
* Bad, because a confirmação de que o túnel subiu é o parsing da string `Port N opened` no stdout, um contrato frágil que uma mudança de mensagem quebra silenciosamente.
* Bad, because não há acesso ao keepalive do canal: só é possível gerar tráfego por fora, pela porta local.

### Confirmation

A subida de túnel só é considerada bem-sucedida quando a linha `Port N opened` aparece dentro de 30 s; o teste com o plugin falso cobre o caso em que ela nunca vem. O encerramento em grupo é verificado pelo teste que exige zero remanescente após SIGINT.

## Pros and Cons of the Options

### Spawn de `aws ssm start-session`

* Good, because é o caminho suportado e o que já está em produção no `~/.zshrc`.
* Neutral, because o custo de startup do `aws` (Python) só é pago na subida e na reconexão.
* Bad, because a saúde do túnel tem de ser inferida de fora do processo.

### SDK nativo com data channel próprio

* Good, because elimina os dois binários externos e o parsing de stdout.
* Good, because dá acesso ao ping/pong do WebSocket, tornando a detecção de queda imediata em vez de amostrada.
* Bad, because implementa protocolo não documentado: qualquer mudança da AWS vira bug silencioso nosso.
* Bad, because obriga a reimplementar resolução de credencial, SSO e refresh de token.

### `ssh -L` com `ProxyCommand`

* Good, because o SSH traz keepalive próprio (`ServerAliveInterval`) e reencaminhamento múltiplo em uma conexão.
* Bad, because exige chave e usuário no bastion, coisa que o acesso por SSM hoje dispensa.
* Bad, because acrescenta uma camada de autenticação a manter, sem resolver o caso zumbi (o `ssh` também pode ficar vivo com o canal morto).

## More Information

A opção nativa não está descartada: existe uma task de spike no backlog para medi-la. Se for adotada, este registro é superseded.
