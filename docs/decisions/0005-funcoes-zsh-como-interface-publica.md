---
status: "accepted"
date: 2026-09-06
decision-makers: Marcus Xavier
---

# Funções zsh seguem sendo a interface pública dos túneis

## Context and Problem Statement

Os túneis não são usados só por gente. As skills `mysql-prod-query` e `mysql-legacy` do repositório `api` fazem preflight com `pgrep -af tunnel_prod_db` antes de consultar o banco, e o `.mcp.json` de lá fixa as portas `13306`, `13307`, `13316` e `13317`. Substituir as funções shell por um binário novo quebra esse contrato de nome de processo, e a decisão é onde absorver a mudança: aqui ou no outro repositório.

## Decision Drivers

* O contrato existente é um nome de processo em outro repositório, fora do controle deste projeto.
* Uma migração que exige mudança coordenada em dois repos atrasa o cutover.
* As portas são contrato de dados e não mudam em nenhum cenário.

## Considered Options

* Manter `tunnel_prod_db`/`tunnel_staging_db` como wrappers que chamam `awstun` com `exec -a`
* Trocar o comando para `awstun up prod` e atualizar as skills do repo `api`
* Expor `awstun status --json` e migrar as skills para um preflight de verdade

## Decision Outcome

Chosen option: "Manter as funções como wrappers com `exec -a`", porque `exec -a` reescreve o `argv[0]` do processo, então `pgrep -af tunnel_prod_db` continua casando e nenhum arquivo fora deste repositório precisa ser tocado. O `~/.zshrc` cai de 88 linhas de lógica para seis linhas de delegação, e o cutover fica contido em um commit.

### Consequences

* Good, because o cutover não depende de mudança coordenada com o repositório `api`.
* Good, because as 88 linhas de lógica duplicada saem do `~/.zshrc`, deixando uma fonte de verdade só.
* Bad, because o nome do processo passa a mentir: `ps` mostra `tunnel_prod_db` onde o binário é `awstun`, o que engana quem for depurar sem conhecer o truque.
* Bad, because perpetua um preflight por `pgrep`, que é justamente o sinal de saúde que o registro sobre sondagem rejeita: as skills continuam achando que processo vivo significa túnel vivo.
* Bad, because passam a existir dois nomes para a mesma ação, e a documentação tem de explicar os dois.
* Neutral, because `exec` precisa rodar dentro de um subshell `( … )`; direto na função ele substituiria o shell interativo e fecharia o terminal.

### Confirmation

Depois do cutover, `zsh -n ~/.zshrc` sai limpo, `pgrep -af tunnel_prod_db` devolve exatamente uma linha com o túnel no ar, e `SELECT 1` responde pelos MCPs `mysql-prod` e `mysql-legacy` — a cadeia completa do consumidor real, não só a sonda.

## Pros and Cons of the Options

### Wrappers com `exec -a`

* Good, because contrato preservado a custo praticamente zero.
* Neutral, because mantém o nome antigo como o comando que se digita no dia a dia.
* Bad, because esconde o binário real por trás de um `argv[0]` falso.

### Atualizar as skills do repo `api`

* Good, because acaba com o nome duplo e com o `argv[0]` mentiroso.
* Good, because seria a oportunidade de trocar o preflight por uma checagem de porta.
* Bad, because espalha a mudança por dois repositórios, e a skill quebra no intervalo entre os dois commits.

### `awstun status --json` e migrar as skills

* Good, because entrega às skills um preflight que mede o que importa: porta viva e sonda passando.
* Bad, because `status` precisa descobrir processo de outro terminal, o que arrasta estado compartilhado para dentro de um MVP deliberadamente sem estado.

## More Information

Quando o modo daemon existir, `status --json` passa a ser barato e as skills podem migrar. Este registro seria então superseded, não editado.
