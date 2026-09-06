# Supervisor de túnel SSM em Python (auto-reconnect)

## Context

Pedido literal: fazer com que o túnel SSM suba de novo sozinho sempre que cair por inatividade, e migrar a "gambiarra shell" para Python.

Estado atual: `~/.zshrc` define `tunnel_prod_db` (linhas 302–365) e `tunnel_staging_db` (367–389). Cada uma sobe dois `aws ssm start-session` em background, um `sleep infinity` renomeado como sentinela para `pgrep`, e bloqueia num `wait`. Quando uma sessão morre, `wait` retorna e **as duas** caem — sem reinício.

Duas causas de queda, confirmadas nesta sessão:

1. A conta **não possui** o documento `SSM-SessionManagerRunShell` (`aws ssm get-document --name SSM-SessionManagerRunShell` → `InvalidDocument`), então valem os defaults do Session Manager: **20 minutos de inatividade encerram a sessão**. Nenhum tráfego passa pelas portas 13306/13307 enquanto ninguém consulta, então o timeout dispara sempre.
2. Caso pior documentado pela AWS (reciclagem periódica de websocket): o `session-manager-plugin` continua vivo e a porta continua em `LISTEN`, mas o túnel está morto. Portanto "o processo existe" **não** é sinal de saúde — é obrigatório sondar a porta de verdade.

Estado final: um supervisor Python em foreground (`tunnel_prod_db` / `tunnel_staging_db` continuam sendo os comandos) que mantém os dois túneis do ambiente de pé indefinidamente: sonda cada porta a cada 120 s (a sondagem serve de keepalive, matando a causa 1), detecta túnel zumbi (causa 2), reinicia com backoff, e derruba tudo limpo no Ctrl-C.

Modo de execução escolhido pelo usuário: **foreground apenas**. Nenhuma unit systemd, nenhum daemon.

## Approach

### 1. Criar `~/.config/nvim/zsh/g4_tunnel.py`

Diretório escolhido porque é onde vivem os outros helpers G4 (`g4-ssm.sh`, `g4-login.sh`, `workscripts.sh`), com symlinks em `~/.zsh/`. Não criar symlink novo: as funções zsh chamam o caminho absoluto.

Somente stdlib. **Sintaxe compatível com Python 3.9+** — sem `match`, sem `X | Y` em anotações avaliadas em runtime. Motivo: `python3` no PATH é o shim do pyenv (`/home/marcus/.pyenv/shims/python3` → 3.13.11) mas `/usr/bin/python3` é 3.12.1, e a versão do pyenv pode mudar por diretório.

Shebang `#!/usr/bin/env python3`, arquivo executável.

#### Tabela de ambientes (constante no topo)

Cada ambiente resolve o bastion **pela Elastic IP**, nunca por instance id. Motivo verificado: `i-0b68958c959cf379a` estava `stopped` e derrubou todo helper com id fixo; e o host legado `69.167.182.74` faz whitelist de IP de origem — dos dois hosts prod vivos, só o que carrega a EIP `107.20.138.57` completa o handshake (`i-01c67f5c442ee55f3` alcança o RDS mas dá timeout no legado).

```python
REGION = "us-east-1"

ENVS = {
    "prod": {
        "eip": "107.20.138.57",          # i-0922c3a2f55791977 hoje; o firewall do legado libera este IP
        "host_env": "G4_PROD_HOST",
        "eip_env": "G4_PROD_TUNNEL_EIP",
        "tunnels": [
            ("app",    "gfour-prod.cgbumsa6wr9j.us-east-1.rds.amazonaws.com", 3306, 13306),
            ("legacy", "69.167.182.74",                                       3306, 13307),
        ],
    },
    "staging": {
        "eip": "35.170.92.228",          # i-02d09c8f39f10bd74 hoje
        "host_env": "G4_STAGING_HOST",
        "eip_env": "G4_STAGING_TUNNEL_EIP",
        "tunnels": [
            ("app",    "gfour-staging.cgbumsa6wr9j.us-east-1.rds.amazonaws.com", 3306, 13316),
            ("legacy", "69.167.182.76",                                          3306, 13317),
        ],
    },
}
```

Tupla de túnel = `(rótulo, host_remoto, porta_remota, porta_local)`. Os quatro pares de portas batem com `~/.gfour/repositories/api/.mcp.json` (`mysql-prod` 13306, `mysql-legacy` 13307, `mysql-staging` 13316, `mysql-staging-legacy` 13317) — não alterar nenhuma porta.

`staging` usa resolução por EIP igual a prod. Hoje `35.170.92.228` está associada a `i-02d09c8f39f10bd74`, exatamente a instância que a função atual usa fixa, então o comportamento é idêntico ao de hoje — e deixa de apodrecer se a instância for recriada. (Que o legado de staging `69.167.182.76` libere especificamente essa EIP é plausível mas *não verificado*; irrelevante, porque a resolução devolve a mesma instância de hoje.)

#### CLI

`g4_tunnel.py <prod|staging>`. Argumento ausente ou desconhecido → mensagem `usage: g4_tunnel.py <prod|staging>` em stderr e `sys.exit(2)`. Sem outras flags.

Overrides por env, todos opcionais:

| Env var | Efeito |
|---|---|
| `G4_PROD_HOST` / `G4_STAGING_HOST` | força o instance id, pula a resolução por EIP |
| `G4_PROD_TUNNEL_EIP` / `G4_STAGING_TUNNEL_EIP` | troca a EIP a resolver |
| `G4_TUNNEL_PROBE_SECS` | intervalo entre sondagens; default `120` |

`G4_TUNNEL_PROBE_SECS` é necessário para a verificação (permite testar recuperação em segundos em vez de minutos). Ler com `int(os.environ.get("G4_TUNNEL_PROBE_SECS", "120"))`; valor inválido → cai no default e loga aviso.

Por que 120 s: bem abaixo dos 20 min de idle timeout (então a sondagem é o keepalive), e limita a latência de detecção de túnel zumbi a ≤ 2 min. Custo por sondagem é um handshake TCP.

#### Resolução do bastion — `resolve_bastion(env_cfg)` → `str`

1. Se `os.environ.get(env_cfg["host_env"])` estiver preenchido, devolve esse valor sem consultar a AWS.
2. Senão: `aws ec2 describe-addresses --region us-east-1 --public-ips <eip> --query "Addresses[0].InstanceId" --output text`. Saída vazia ou `None` → levanta `RuntimeError("nenhuma instância carrega a EIP <eip> — verifique o console, ou exporte <HOST_ENV>=i-...")`.
3. Confere `aws ssm describe-instance-information --region us-east-1 --filters "Key=InstanceIds,Values=<id>" --query "InstanceInformationList[0].PingStatus" --output text`. Diferente de `Online` → `RuntimeError("<id> não está conectado ao SSM (instância parada, ou ssm-agent fora)")`.

Ambas as chamadas via `subprocess.run([...], capture_output=True, text=True, timeout=30)`; `.strip()` no stdout. Timeout ou `returncode != 0` → `RuntimeError` com o stderr embutido.

Resultado cacheado num atributo do supervisor. Invalidado (força re-resolução na próxima subida) quando qualquer túnel acumula **3 falhas consecutivas de subida** — cobre a instância ser substituída com o supervisor rodando.

`RuntimeError` na primeira resolução, antes de subir qualquer túnel → imprime a mensagem em stderr e `sys.exit(1)`. Depois disso, apenas loga e continua no backoff.

#### Sondagem — `probe(port)` → `str` (versão do servidor) ou levanta

Sonda ciente de MySQL, que também é o keepalive:

1. `socket.create_connection(("127.0.0.1", port), timeout=8)`, `settimeout(8)`.
2. `recv(128)`. Menos de 5 bytes → falha.
3. `data[4] == 0x0a` (protocolo 10) → saudável; versão = `data[5:].split(b"\x00")[0].decode(errors="replace")`.
4. `data[4] == 0xff` (pacote ERR do MySQL) → **também saudável**: o túnel entregou bytes reais do servidor. Versão = `"(ERR do servidor MySQL — túnel OK)"`. Cobre "too many connections" / host bloqueado sem provocar reinício inútil.
5. Qualquer outro primeiro byte → falha.
6. Antes de fechar, envia `b"\x01\x00\x00\x00\x01"` (COM_QUIT). Evita encher o error log do MySQL de `Aborted connection`. Erro no envio é ignorado.
7. `socket.timeout`, `ConnectionRefusedError`, `OSError` → falha.

Falha é sinalizada levantando; o chamador conta.

#### Loop por túnel — uma `threading.Thread` por túnel, `daemon=True`

Estado por thread: `proc` (`subprocess.Popen` ou `None`), `probe_failures`, `start_failures`, `backoff_idx`, `healthy_since`.

Cada iteração, com `stop_event.wait(interval)` no fim (para que Ctrl-C não espere o intervalo inteiro):

- `proc is None` ou `proc.poll() is not None` → o processo morreu (ou nunca subiu): loga `saiu com código <rc>, reiniciando` quando havia processo, e chama `start_tunnel()`.
- Senão, tenta `probe(porta_local)`:
  - Sucesso → `probe_failures = 0`; se `healthy_since is None`, marca e loga `pronto → 127.0.0.1:<porta>  <versão>`. Se ficou saudável por ≥ 60 s, zera `backoff_idx`.
  - Falha → `probe_failures += 1`. Ao chegar em **2**, loga `sonda falhou 2x (túnel zumbi), reiniciando` e chama `kill_proc()` seguido de `start_tunnel()`.

Dois strikes, não um: absorve um pico transitório de rede sem derrubar uma sessão sadia.

#### `start_tunnel()`

1. Se a porta local está em `LISTEN` e não é do nosso `proc`, aborta o **programa inteiro** com `sys.exit(1)` e a mensagem `porta <n> já está tomada por outro processo — mate o túnel anterior (pkill -f session-manager-plugin)`. Nunca disputar a porta com outro túnel. Detecção: tentar `socket.socket(); s.bind(("127.0.0.1", port))` e fechar — `OSError` significa ocupada. (Só faz isso quando `proc is None`; num reinício a porta é liberada pelo `kill_proc()` anterior.)
2. Espera `BACKOFF[min(backoff_idx, len(BACKOFF)-1)]` segundos via `stop_event.wait(...)`, com `BACKOFF = [0, 2, 4, 8, 16, 30]`. Primeira tentativa não espera.
3. Se `start_failures >= 3`, invalida o cache do bastion; re-resolve. Erro de resolução → loga, `backoff_idx += 1`, `start_failures += 1`, retorna.
4. `subprocess.Popen` com:
   ```python
   [
       "aws", "ssm", "start-session",
       "--region", REGION,
       "--target", instance_id,
       "--document-name", "AWS-StartPortForwardingSessionToRemoteHost",
       "--parameters", json.dumps({
           "host": [remote_host],
           "portNumber": [str(remote_port)],
           "localPortNumber": [str(local_port)],
       }),
   ]
   ```
   `stdin=subprocess.DEVNULL`, `stdout=subprocess.PIPE`, `stderr=subprocess.STDOUT`, `text=True`, `bufsize=1`, **`start_new_session=True`**.

   `start_new_session=True` é obrigatório: dá ao `aws` um process group próprio, e é isso que permite matar o `session-manager-plugin` filho com `os.killpg`. Sem isso, matar só o `aws` deixa o plugin órfão segurando a porta — exatamente o bug já observado neste ambiente.

5. Thread leitora consome `proc.stdout` linha a linha e repassa via `log()`. Ela descarta as linhas de ruído de desligamento que casam com `died with <Signals.SIGTERM` (o wrapper `aws` reclama do filho morto; não é erro).
6. Espera até 30 s pela linha que casa `r"Port \d+ opened"` (o leitor sinaliza um `threading.Event`). Não veio → `kill_proc()`, loga `não abriu a porta em 30s`, `backoff_idx += 1`, `start_failures += 1`, retorna.
7. Veio → `start_failures = 0`, `healthy_since = None` (a primeira sondagem confirma e loga `pronto`).

#### `kill_proc()`

`os.killpg(os.getpgid(proc.pid), signal.SIGTERM)`; `proc.wait(timeout=5)`; em `subprocess.TimeoutExpired` → `os.killpg(..., signal.SIGKILL)` e `proc.wait(timeout=5)`. `ProcessLookupError` ignorado. Sempre zera `proc = None`.

A escalada para SIGKILL é o que resolve um plugin `SIGSTOP`ado/travado, que nunca processaria SIGTERM.

#### Encerramento

`signal.signal` para `SIGINT` e `SIGTERM` → seta `stop_event`. Main thread: `stop_event.wait()` num laço, depois `join(timeout=10)` em cada thread; em seguida `kill_proc()` para cada túnel remanescente (ainda no main thread, caso a thread não tenha saído). Loga `encerrado`. Sai com 0.

#### Formato de log

`log(scope, msg)` imprime `f"{time.strftime('%H:%M:%S')}  {scope}  {msg}"` com `flush=True`. `scope` é `f"{env}/{label}"` (ex. `prod/legacy`) ou `env` para mensagens do supervisor. Um `threading.Lock` em volta do `print` evita linhas intercaladas.

Linha de abertura, antes de subir qualquer túnel:
`log(env, f"bastion {instance_id} — " + ", ".join(f"{local_port}={label}" for label, _, _, local_port in tunnels))`

### 2. Trocar as duas funções em `~/.zshrc`

Substituir integralmente as linhas **302–389** (bloco de comentário + `export G4_PROD_TUNNEL_EIP` + `tunnel_prod_db` + `tunnel_staging_db`) por:

```zsh
# --- túneis de DB via SSM ---------------------------------------------------
# prod:    13306 = gfour (app)  | 13307 = gfoursys_gFour (legado)
# staging: 13316 = api (app)    | 13317 = gfoursys_gFour (legado)
#
# Supervisor: ~/.config/nvim/zsh/g4_tunnel.py — reconecta sozinho. O Session
# Manager mata sessão ociosa em 20 min, e o plugin às vezes fica vivo com o
# túnel morto, então o supervisor sonda as portas em vez de confiar no processo.
# O bastion é resolvido em runtime pela Elastic IP; nunca fixe o instance id.
# Overrides: G4_PROD_HOST / G4_STAGING_HOST, G4_PROD_TUNNEL_EIP, G4_TUNNEL_PROBE_SECS.
#
# `exec -a` dentro de subshell mantém o nome do processo, de que dependem as
# skills mysql-prod/mysql-legacy no preflight `pgrep -af tunnel_prod_db`.
function tunnel_prod_db() {
    ( exec -a tunnel_prod_db python3 "$HOME/.config/nvim/zsh/g4_tunnel.py" prod "$@" )
}

function tunnel_staging_db() {
    ( exec -a tunnel_staging_db python3 "$HOME/.config/nvim/zsh/g4_tunnel.py" staging "$@" )
}
```

Detalhes que não podem escapar:

- O `exec` **precisa** estar num subshell `( … )`. Direto na função, ele substituiria o shell interativo e fecharia o terminal.
- `export G4_PROD_TUNNEL_EIP` sai do `~/.zshrc`: o default passa a viver na tabela `ENVS`, uma fonte de verdade só. As env vars continuam sendo lidas como override opcional.
- O sentinela `sleep infinity` desaparece. O `pgrep -af tunnel_prod_db` continua casando porque `exec -a` renomeia `argv[0]` do próprio processo Python.
- `tunnel_staging_db` muda de comportamento de propósito: ganha supervisão e resolução por EIP. Deixar a versão antiga viva significaria manter duas cópias da mesma gambiarra.
- Não mexer em `~/.config/nvim/zsh/g4-ssm.sh` — aquele arquivo trata de `docker exec` em containers ECS, não de túnel de DB.

## Critical files & anchors

| Arquivo | Região | Por quê |
|---|---|---|
| `~/.zshrc` | 302–389 | Bloco exato a substituir: comentário + export + as duas funções. Reler antes de editar; a numeração muda a cada edição. |
| `~/.config/nvim/zsh/g4_tunnel.py` | arquivo novo | O supervisor. |
| `~/gfour/repositories/api/.mcp.json` | `mysql-prod`, `mysql-legacy`, `mysql-staging`, `mysql-staging-legacy` | Contrato de portas: 13306/13307/13316/13317. Somente leitura — confirmar que a tabela `ENVS` bate. |
| `~/gfour/repositories/api/.claude/skills/mysql-prod-query/SKILL.md` | seção "Preflight: Tunnel Check" | Documenta `pgrep -af tunnel_prod_db`. Não editar: o `exec -a` preserva o contrato. |

## Verification

Tudo em foreground, do `$HOME`. Prova ponta a ponta: os dois túneis sobem, a recuperação funciona nos **dois** modos de falha, e o Ctrl-C não deixa órfão.

**Pré-requisitos:** credenciais AWS válidas (`aws sts get-caller-identity` responde), nenhum túnel prod rodando (`pgrep -af 'session-manager-plugin|tunnel_prod_db'` vazio; se não, `pkill -f session-manager-plugin`).

1. **Sintaxe.** `zsh -n ~/.zshrc` → sem saída. `python3 -m py_compile ~/.config/nvim/zsh/g4_tunnel.py` → sem saída.

2. **Subida, com sonda rápida para o resto dos testes.** Num shell de teste:
   ```bash
   G4_TUNNEL_PROBE_SECS=5 zsh -ic 'tunnel_prod_db' > /tmp/g4t.log 2>&1 &
   sleep 25; cat /tmp/g4t.log
   ```
   Esperado no log: a linha de bastion citando `i-0922c3a2f55791977`, e duas linhas `pronto → 127.0.0.1:13306` / `:13307`.

3. **Handshake real nas duas portas** (a prova de que o túnel entrega dados, não só escuta):
   ```bash
   python3 - <<'PY'
   import socket
   for p in (13306, 13307):
       s = socket.create_connection(("127.0.0.1", p), timeout=10); s.settimeout(10)
       d = s.recv(128); s.close()
       print(p, "->", d[5:].split(b"\x00")[0].decode(errors="replace"))
   PY
   ```
   Esperado: `13306 -> 11.4.10-MariaDB-log` e `13307 -> 5.5.5-10.5.29-MariaDB-log`. Valores medidos nesta sessão contra estes hosts; uma versão diferente é aceitável, mas **falha ou timeout não é**.

4. **Recuperação, modo 1 — processo morto (o pedido literal).** Mata só o plugin da 13307 e confirma que ele volta:
   ```bash
   PID=$(ss -ltnp 2>/dev/null | awk '/:13307/{match($0,/pid=([0-9]+)/,m); print m[1]}')
   kill -9 "$PID"
   sleep 20
   grep -E '13307' /tmp/g4t.log | tail -5
   ```
   Esperado: linha `saiu com código …, reiniciando` seguida de novo `pronto → 127.0.0.1:13307`. Repetir o passo 3 na 13307 → handshake volta a funcionar. A 13306 **não** pode ter sido reiniciada (túneis são independentes).

5. **Recuperação, modo 2 — túnel zumbi (o caso nasty da AWS).** `SIGSTOP` congela o plugin: a porta segue em `LISTEN` mas nenhum dado passa, então só a sonda detecta. Também exercita a escalada para `SIGKILL`, já que um processo parado não trata `SIGTERM`:
   ```bash
   PID=$(ss -ltnp 2>/dev/null | awk '/:13306/{match($0,/pid=([0-9]+)/,m); print m[1]}')
   kill -STOP "$PID"
   sleep 40
   grep -E '13306' /tmp/g4t.log | tail -5
   ```
   Esperado: `sonda falhou 2x (túnel zumbi), reiniciando` e depois novo `pronto → 127.0.0.1:13306`. Confirmar que o PID congelado não existe mais (`ps -p "$PID"` → sem processo) e repetir o handshake do passo 3 na 13306.

6. **Contrato de preflight das skills.** `pgrep -af tunnel_prod_db` → uma linha com `tunnel_prod_db`. Se vier vazio, o `exec -a` está errado e as skills `mysql-prod`/`mysql-legacy` quebram.

7. **Desligamento limpo.** `pkill -INT -f tunnel_prod_db; sleep 5`, então:
   `pgrep -af 'session-manager-plugin|ssm start-session'` → nada; `ss -ltn | grep -E '1330[67]'` → nada.

8. **Cadeia completa via MCP.** Subir `tunnel_prod_db` (sem override de sonda) e rodar `SELECT 1` pelo MCP `mysql-prod` e `SELECT 1` pelo `mysql-legacy`. Ambos devem responder. Prova que o consumidor real funciona, não só a sonda.

9. **Staging.** `G4_TUNNEL_PROBE_SECS=5 zsh -ic 'tunnel_staging_db'`, esperar as duas linhas `pronto` (13316, 13317), handshake nas duas portas, Ctrl-C. Não precisa repetir os testes de falha — é o mesmo código.

## Assumptions & contingencies

- **A EIP `107.20.138.57` é o egresso liberado no firewall de `69.167.182.74`.** Verificado por eliminação: `i-0922c3a2f55791977` (dona da EIP) completa o handshake do legado; `i-01c67f5c442ee55f3`, mesmo VPC/subnet/SG, dá timeout. Se um dia a 13307 parar de subir e a 13306 continuar: a whitelist mudou de IP — descobrir o novo bastion e rodar com `G4_PROD_HOST=i-...` até ajustar a constante.
- **Staging: `35.170.92.228` → `i-02d09c8f39f10bd74`.** Associação verificada. Se o passo 9 falhar só na 13317, use `G4_STAGING_HOST=i-02d09c8f39f10bd74` (comportamento de hoje) e reporte — significa que a EIP de staging foi remanejada.
- **Sonda de 120 s como keepalive assume idle timeout de 20 min** (default da conta, já que não existe `SSM-SessionManagerRunShell`). Se alguém criar esse documento com `idleSessionTimeout` menor que ~3 min, baixe o default de `G4_TUNNEL_PROBE_SECS` para metade do novo valor. O auto-reconnect continua cobrindo enquanto isso.
- **Foreground apenas, por escolha do usuário.** Fechar o terminal derruba os túneis. Se depois quiser sobrevivência a logout, o caminho é uma unit `systemd --user` com `Restart=always` chamando `/usr/bin/python3` (não o shim do pyenv) — fora do escopo deste plano.
