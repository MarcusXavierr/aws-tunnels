# Backlog: `awstun`

**Épicos:** [#4](https://github.com/MarcusXavierr/aws-tunnels/issues/4) `00-epic-awstun-mvp.md` (tasks 01–24) e [#5](https://github.com/MarcusXavierr/aws-tunnels/issues/5) `99-epic-pos-mvp.md` (tasks 25–26)
**Fonte:** [`ssm_tunel_plan.md`](../../ssm_tunel_plan.md) e [`docs/decisions/`](../decisions/README.md)
**Tracker:** GitHub Issues, Project [AWS Tunnels](https://github.com/users/MarcusXavierr/projects/5)
**Total:** 2 épicos, 26 tasks, 29 subtasks

Grounding de codebase foi dispensado: o repositório é um scaffold de `bun init`, sem código de produção para apontar. As referências dos tickets são o plano de origem, os ADRs e o `~/.zshrc` que está sendo substituído.

## Sequenciamento

```
01 esqueleto CLI ─┬─ 02 config ── 03 ls/config check ── 20 testes de config
                  ├─ 04 wrapper aws ── 05 bastion por EIP ─┬─ 06 gate SSM
                  │                                        └─ 07 overrides e cache
                  ├─ 08 spawner ─┬─ 09 kill tree
                  │              ├─ 10 guarda de porta
                  │              ├─ 11 subida com confirmação
                  │              └─ 18 plugin falso
                  └─ 12 sonda ── 13 sondagem periódica
                                     │
              11 + 13 ── 14 máquina de estados ─┬─ 15 backoff
                                                └─ 16 supervisor de grupo ── 17 shutdown
                                                                               │
                          17 + 18 ── 19 testes de recuperação                  │
                                                                 21 build ─────┴── 22 cutover zshrc ── 23 verificação real
                                                                     └── 24 README

pós-MVP: 25 spike de transporte nativo · 26 modo daemon
```

Paralelizável desde o início: os ramos `02 → 03`, `04 → 05`, `08` e `12` são independentes entre si depois da task 01.

## Tasks

| # | Título | Pri | Depende | Subtasks | Issue |
|---|---|---|---|---|---|
| 01 | [CLI] Esqueleto do comando `awstun` e log com escopo | P0 | — | 0 | [#6](https://github.com/MarcusXavierr/aws-tunnels/issues/6) |
| 02 | [CLI] Ler e validar o arquivo de configuração de túneis | P0 | 01 | 3 | [#7](https://github.com/MarcusXavierr/aws-tunnels/issues/7) |
| 03 | [CLI] `awstun ls` e `awstun config check` | P0 | 02 | 0 | [#8](https://github.com/MarcusXavierr/aws-tunnels/issues/8) |
| 04 | [AWS] Invocação do `aws` CLI com timeout e erro legível | P0 | 01 | 0 | [#9](https://github.com/MarcusXavierr/aws-tunnels/issues/9) |
| 05 | [AWS] Descobrir o bastion pela Elastic IP | P0 | 04 | 2 | [#10](https://github.com/MarcusXavierr/aws-tunnels/issues/10) |
| 06 | [AWS] Exigir instância conectada ao SSM antes de abrir sessão | P0 | 05 | 0 | [#11](https://github.com/MarcusXavierr/aws-tunnels/issues/11) |
| 07 | [AWS] Override manual do bastion e reresolução após falhas | P1 | 05 | 0 | [#12](https://github.com/MarcusXavierr/aws-tunnels/issues/12) |
| 08 | [SUPERVISOR] Spawner injetável com process group próprio | P0 | 01 | 0 | [#13](https://github.com/MarcusXavierr/aws-tunnels/issues/13) |
| 09 | [SUPERVISOR] Matar a árvore de processos com escalada para SIGKILL | P0 | 08 | 2 | [#14](https://github.com/MarcusXavierr/aws-tunnels/issues/14) |
| 10 | [SUPERVISOR] Abortar quando a porta local já está em uso | P0 | 08 | 0 | [#15](https://github.com/MarcusXavierr/aws-tunnels/issues/15) |
| 11 | [SUPERVISOR] Subir um túnel e confirmar que a porta abriu | P0 | 08, 10 | 2 | [#16](https://github.com/MarcusXavierr/aws-tunnels/issues/16) |
| 12 | [SUPERVISOR] Sonda de porta com espera opcional do primeiro byte | P0 | 01 | 2 | [#17](https://github.com/MarcusXavierr/aws-tunnels/issues/17) |
| 13 | [SUPERVISOR] Sondagem periódica que também mantém a sessão viva | P0 | 12 | 0 | [#18](https://github.com/MarcusXavierr/aws-tunnels/issues/18) |
| 14 | [SUPERVISOR] Reiniciar por processo morto e por sonda falha | P0 | 11, 13 | 2 | [#19](https://github.com/MarcusXavierr/aws-tunnels/issues/19) |
| 15 | [SUPERVISOR] Backoff progressivo entre tentativas de subida | P1 | 14 | 0 | [#20](https://github.com/MarcusXavierr/aws-tunnels/issues/20) |
| 16 | [SUPERVISOR] Supervisionar todos os túneis do grupo de forma independente | P0 | 14 | 0 | [#21](https://github.com/MarcusXavierr/aws-tunnels/issues/21) |
| 17 | [SUPERVISOR] Encerrar tudo no Ctrl-C sem deixar órfão | P0 | 09, 16 | 2 | [#22](https://github.com/MarcusXavierr/aws-tunnels/issues/22) |
| 18 | [TEST] Plugin falso com modos de falha controlados | P0 | 08 | 2 | [#23](https://github.com/MarcusXavierr/aws-tunnels/issues/23) |
| 19 | [TEST] Cobrir os dois modos de falha, a independência e o shutdown | P0 | 18, 17 | 4 | [#24](https://github.com/MarcusXavierr/aws-tunnels/issues/24) |
| 20 | [TEST] Cobrir validação de config e listagem | P1 | 03 | 0 | [#25](https://github.com/MarcusXavierr/aws-tunnels/issues/25) |
| 21 | [INFRA] Compilar o binário e instalar em `~/.local/bin` | P0 | 17 | 2 | [#26](https://github.com/MarcusXavierr/aws-tunnels/issues/26) |
| 22 | [INFRA] Trocar as funções do `~/.zshrc` por wrappers da CLI | P0 | 21 | 2 | [#27](https://github.com/MarcusXavierr/aws-tunnels/issues/27) |
| 23 | [TEST] Executar o roteiro de verificação contra prod e staging | P0 | 22 | 4 | [#29](https://github.com/MarcusXavierr/aws-tunnels/issues/29) |
| 24 | [DOCS] README, config de exemplo e troubleshooting | P1 | 21 | 0 | [#30](https://github.com/MarcusXavierr/aws-tunnels/issues/30) |
| 25 | [SPIKE] Avaliar abrir o port forward sem o `aws` CLI | P3 | 16 | 0 | [#31](https://github.com/MarcusXavierr/aws-tunnels/issues/31) |
| 26 | [SUPERVISOR] Modo daemon com `status`, `down` e `logs` | P2 | 17 | 0 | [#32](https://github.com/MarcusXavierr/aws-tunnels/issues/32) |

## Decisões relacionadas

| ADR | Decisão | Tasks afetadas |
|---|---|---|
| [0001](../decisions/0001-supervisor-em-foreground-sem-daemon.md) | Foreground, sem daemon | 10, 16, 17, 26 |
| [0002](../decisions/0002-transporte-delegado-ao-aws-cli.md) | Transporte pelo `aws` CLI | 04, 08, 11, 25 |
| [0003](../decisions/0003-saude-por-sonda-na-porta.md) | Saúde por sonda na porta | 12, 13, 14, 18, 19 |
| [0004](../decisions/0004-bastion-resolvido-por-elastic-ip.md) | Bastion por Elastic IP | 05, 06, 07, 23 |
| [0005](../decisions/0005-funcoes-zsh-como-interface-publica.md) | Funções zsh como interface | 22, 23 |
