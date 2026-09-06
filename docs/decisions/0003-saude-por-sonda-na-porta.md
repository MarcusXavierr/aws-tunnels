---
status: "accepted"
date: 2026-09-06
decision-makers: Marcus Xavier
---

# Saúde do túnel medida por sonda na porta, não por liveness do processo

## Context and Problem Statement

Existem dois modos de morte. No primeiro, o Session Manager encerra a sessão por 20 minutos de inatividade e o processo do plugin sai — a porta local fecha. No segundo, documentado por quem já apanhou disso, o WebSocket é reciclado, o túnel para de passar dados e **o plugin continua vivo com a porta em LISTEN**. Logo, "o processo existe" não é sinal de saúde. Pior: o `accept()` da porta local acontece dentro do plugin, na própria máquina, então um `connect()` seco é aceito mesmo com o canal para o bastion morto. É preciso decidir o que conta como prova de que o túnel está vivo.

## Decision Drivers

* Detectar o caso zumbi é o motivo principal de a CLI existir.
* A sonda também é o keepalive: o timer de inatividade só reseta com tráfego pelo canal.
* A config precisa aceitar serviços que não sejam MySQL sem redesenho.
* Falso positivo custa caro: reiniciar um túnel saudável derruba conexão de quem estava usando.

## Considered Options

* Liveness de processo (`poll()` no filho)
* `connect()` TCP e fechar
* `connect()` TCP e, opcionalmente, esperar o primeiro byte do servidor (`expect_banner`)
* Handshake MySQL completo, com leitura da versão do servidor

## Decision Outcome

Chosen option: "`connect()` TCP e, opcionalmente, esperar o primeiro byte", porque é a opção mais fraca que ainda distingue túnel vivo de túnel zumbi. Um byte recebido só pode ter vindo do servidor remoto, então prova o caminho inteiro sem que a CLI conheça protocolo nenhum. O flag `expect_banner` fica por túnel na config, ligado para os quatro túneis MySQL de hoje e desligável para serviço em que o cliente fala primeiro.

### Consequences

* Good, because cobre os dois modos de morte com um único mecanismo, e a própria sondagem serve de keepalive.
* Good, because nenhum código de protocolo entra na CLI: `expect_banner` é "chegou byte ou não".
* Bad, because só funciona onde o servidor fala primeiro; para Redis, Postgres ou HTTP a sonda volta a ser um `connect()` seco, com o ponto cego do zumbi de volta.
* Bad, because a detecção é amostrada: com intervalo de 120 s e dois strikes, um túnel zumbi pode passar até ~4 minutos invisível.
* Bad, because a sonda abre e fecha uma conexão TCP a cada ciclo sem dizer nada ao servidor, o que rende uma entrada `Aborted connection` no error log do MySQL por sondagem.
* Neutral, because exigir dois strikes antes de reiniciar troca latência de detecção por imunidade a blip de rede.

### Confirmation

O plugin falso do harness de testes tem um modo `zombie` que aceita conexão e nunca envia byte; o teste exige que duas sondas falhas levem a um reinício e que o túnel volte a responder depois. Um teste irmão garante que um túnel saudável nunca é reiniciado.

## Pros and Cons of the Options

### Liveness de processo

* Good, because custa zero: já se tem o handle do filho.
* Bad, because é exatamente o sinal que falha no caso zumbi, o problema que motivou o projeto.

### `connect()` e fechar

* Good, because agnóstico de protocolo e suficiente para detectar porta fechada.
* Neutral, because provavelmente gera tráfego de abertura de stream no canal, servindo de keepalive.
* Bad, because o `accept()` é local: passa com o canal morto e não detecta zumbi.

### `connect()` com espera de banner

* Good, because o byte recebido prova o caminho local → bastion → serviço remoto.
* Good, because dez linhas de código e um flag booleano na config.
* Bad, because inaplicável a protocolo em que o cliente fala primeiro.

### Handshake MySQL completo

* Good, because a detecção mais forte possível, e a versão do servidor no log é ótima para depurar.
* Good, because permite tratar um pacote de erro do MySQL como "túnel OK, servidor recusando", evitando reinício inútil.
* Bad, because amarra a CLI a um protocolo: o primeiro túnel não-MySQL obriga a refatorar a sonda.

## More Information

Se as entradas `Aborted connection` no log do MySQL incomodarem, o caminho é um campo opcional `close_payload` na config, com o `COM_QUIT` em hexadecimal — dado, não código, e reversível sem mexer neste registro.

Referências: [idle session timeout](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-timeout.html) (20 min por padrão, timer reseta com input do cliente) e o relato de [túnel que morre em silêncio após reciclagem de WebSocket](https://repost.aws/questions/QUCtP6EpYARgCPY86nT0YMxw/ssm-port-forwarding-tunnel-silently-dies-after-hours-plugin-fails-to-reconnect-after-periodic-websocket-recycling).
