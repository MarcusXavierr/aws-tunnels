# Architecture Decision Records

Cada arquivo registra uma decisão arquiteturalmente significativa, no formato [MADR](https://adr.github.io/madr/).

Um ADR aceito é imutável. Quando a decisão muda, não edite o registro antigo: escreva um novo e marque o `status` do anterior como `superseded by ADR-NNNN`. O valor do log está em preservar o motivo de a decisão ter sido tomada na época, inclusive o raciocínio que depois se mostrou errado.

| ADR | Decisão | Status |
| --- | --- | --- |
| [0001](0001-supervisor-em-foreground-sem-daemon.md) | O supervisor roda em foreground e morre com o terminal; daemon fica para depois | accepted |
| [0002](0002-transporte-delegado-ao-aws-cli.md) | O port forward é aberto por `aws ssm start-session`, não por implementação própria do data channel | accepted |
| [0003](0003-saude-por-sonda-na-porta.md) | Saúde do túnel é medida sondando a porta local, com espera opcional do primeiro byte | accepted |
| [0004](0004-bastion-resolvido-por-elastic-ip.md) | O bastion é resolvido pela Elastic IP em runtime, nunca por instance id fixo | accepted |
| [0005](0005-funcoes-zsh-como-interface-publica.md) | `tunnel_prod_db`/`tunnel_staging_db` continuam sendo a interface, via `exec -a` | accepted |

## Adicionando um

Copie um template da skill `writing-madrs`, numere na sequência e adicione a linha na tabela acima no mesmo commit.

Duas regras fazem a maior parte do trabalho:

* Registre as opções rejeitadas e por quê. Uma decisão sem alternativas é uma afirmação.
* Registre as consequências ruins junto das boas. Um ADR só com vantagens é marketing.
