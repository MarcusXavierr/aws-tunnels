---
status: "accepted"
date: 2026-09-06
decision-makers: Marcus Xavier
---

# Supervisor de túnel em foreground, sem daemon

## Context and Problem Statement

Os túneis SSM para os bancos de prod e staging morrem sozinhos: o Session Manager encerra sessão ociosa em 20 minutos, e as duas funções `tunnel_prod_db`/`tunnel_staging_db` do `~/.zshrc` não reiniciam nada — quando uma sessão cai, o `wait` retorna e as duas vão embora. A CLI `awstun` existe para manter esses túneis de pé, e a primeira pergunta é quem sustenta o processo supervisor: o terminal onde o usuário rodou o comando, ou um daemon que sobrevive a ele.

## Decision Drivers

* O uso real é uma sessão de trabalho: abre-se o túnel para mexer no banco e fecha-se ao terminar.
* O log de reconexão precisa ser visível sem ir procurar arquivo.
* Estado em disco, IPC e recuperação de órfãos custam mais código do que o supervisor em si.
* Só um consumidor precisa saber se o túnel está vivo, e ele já usa `pgrep`.

## Considered Options

* Supervisor em foreground, encerrado por Ctrl-C
* Daemon com cliente (`up` retorna na hora, mais `status`, `down`, `logs`)
* Unit `systemd --user` com `Restart=always`

## Decision Outcome

Chosen option: "Supervisor em foreground, encerrado por Ctrl-C", porque cobre o uso real com a menor superfície possível: nenhum state file, nenhum socket, nenhum processo que possa ficar para trás sem dono. O supervisor é desenhado com o spawn atrás de uma interface (`Spawner`), de modo que o daemon possa ser adicionado depois sem reescrever a máquina de estados.

### Consequences

* Good, because Ctrl-C é o comando de desligar: não existe estado divergente entre o que a CLI acha que está no ar e o que está.
* Good, because o log de reconexão aparece no terminal, sem `logs` para implementar.
* Good, because não há órfão a recuperar: se o processo morre, o process group inteiro vai com ele.
* Bad, because fechar o terminal (ou perder a sessão SSH) derruba os túneis.
* Bad, because cada ambiente ocupa um terminal, e não há como perguntar de outro shell se o túnel está saudável.
* Bad, because um segundo `awstun up prod` no mesmo grupo não é idempotente: aborta reclamando que a porta está ocupada.
* Neutral, because o modo daemon fica registrado como trabalho de backlog, não descartado.

### Confirmation

O teste de shutdown limpo (`bun test`) exige, depois de SIGINT, zero processo `session-manager-plugin` remanescente e zero porta em LISTEN. Nenhum arquivo de estado em `~/.local/state` ou `~/.config/aws-tunnels` além do próprio `config.toml`.

## Pros and Cons of the Options

### Supervisor em foreground

* Good, because zero estado persistente e ciclo de vida óbvio.
* Neutral, because espelha o comportamento que as funções shell já tinham, então não há surpresa para quem usa hoje.
* Bad, because acoplado à vida do terminal.

### Daemon com cliente

* Good, because túneis sobrevivem ao terminal, e `status` responde de qualquer shell.
* Good, because um único daemon serve todos os ambientes, sem um terminal por grupo.
* Bad, because exige state file, protocolo de IPC, descoberta de processo alheio e política de órfãos — mais que dobra o MVP antes de qualquer túnel subir.
* Bad, because introduz o modo de falha "daemon vivo com túnel morto e ninguém olhando", que é justamente o que estamos tentando eliminar.

### Unit `systemd --user`

* Good, because reinício e log ficam por conta do init, e o túnel volta depois do boot.
* Bad, because o reinício do systemd é do processo, não da saúde do túnel: o caso zumbi (plugin vivo, túnel morto) passa direto.
* Bad, because credencial AWS de sessão interativa não está no ambiente de uma unit de usuário, o que exige resolver autenticação fora do escopo.

## More Information

O modo daemon está registrado no backlog junto de `status`/`down`/`logs`. Se ele for adotado, este registro é superseded, não editado.
