---
status: "accepted"
date: 2026-09-06
decision-makers: Marcus Xavier
---

# Bastion resolvido pela Elastic IP em tempo de execução

## Context and Problem Statement

O túnel precisa de um bastion, e a pergunta é como nomeá-lo na configuração. Fixar o instance id já falhou de forma cara: `i-0b68958c959cf379a` foi parado e todo helper que carregava esse id começou a falhar com `TargetNotConnected`. Há um agravante que o instance id não captura — o host legado `69.167.182.74` filtra por IP de origem, então nem toda instância viva serve: das duas máquinas de prod, apenas a que carrega a Elastic IP `107.20.138.57` completa o handshake, enquanto `i-01c67f5c442ee55f3`, na mesma VPC, subnet e security group, alcança o RDS e dá timeout no legado.

## Decision Drivers

* A única coisa que o firewall do host legado enxerga é o IP de saída.
* Instâncias são recriadas; o endereço whitelistado é o que persiste.
* Falha de resolução tem de dizer o que fazer, não estourar `TargetNotConnected` genérico.
* É preciso uma válvula de escape manual quando a realidade divergir da config.

## Considered Options

* Instance id fixo na config
* Elastic IP na config, resolvida por `describe-addresses` a cada subida
* Busca por tag (por exemplo `Name=bastion`) via `describe-instances`

## Decision Outcome

Chosen option: "Elastic IP na config, resolvida por `describe-addresses`", porque a EIP é a identidade que de fato importa para o acesso funcionar: é ela que está na whitelist do host legado. Um campo alternativo `{ instance_id = "i-…" }`, mais o override `--bastion` e a variável `AWSTUN_<GRUPO>_BASTION`, ficam disponíveis como escape sem editar arquivo.

### Consequences

* Good, because a configuração sobrevive à recriação e à troca de instância, que foi a falha real observada.
* Good, because a resolução converge para o único host que atravessa o firewall do legado, em vez de um qualquer que esteja online.
* Good, because a checagem de `PingStatus=Online` antes de abrir sessão troca `TargetNotConnected` por uma mensagem que diz se a instância está parada ou se o ssm-agent caiu.
* Bad, because acrescenta duas chamadas AWS em cada subida, com a latência correspondente e a exigência de `ec2:DescribeAddresses` e `ssm:DescribeInstanceInformation` na policy.
* Bad, because se a whitelist do legado passar a liberar outro endereço, a config continua sintaticamente válida e a falha aparece longe da causa: só o túnel legado deixa de servir dados, enquanto o de aplicação segue saudável.
* Bad, because nada funciona sem credencial válida, nem para descobrir o alvo — o que transforma token expirado em "não consegui resolver o bastion".
* Neutral, because a EIP fica escrita na config como dado, e não em duas variáveis de ambiente do `~/.zshrc` como hoje.

### Confirmation

A verificação manual contra a AWS real exige handshake nas quatro portas: `13306` e `13316` provam o caminho até o RDS, `13307` e `13317` provam que o egresso saiu pelo IP whitelistado. Se apenas as portas legadas falharem, a whitelist mudou.

## Pros and Cons of the Options

### Instance id fixo

* Good, because zero chamada de resolução e comportamento determinístico.
* Bad, because apodrece silenciosamente: instância parada ou recriada derruba tudo, com erro que não sugere a causa.
* Bad, because não expressa a restrição que realmente governa o acesso, que é o IP de origem.

### Elastic IP resolvida em runtime

* Good, because expressa a restrição real e sobrevive à troca de instância.
* Neutral, because desloca o ponto de falha da config para a chamada de API.
* Bad, because depende de credencial e de permissão de EC2 antes de qualquer túnel.

### Busca por tag

* Good, because legível, e não exige saber endereço nenhum.
* Bad, because resolve o critério errado: uma instância chamada `bastion` pode perfeitamente não carregar a EIP whitelistada, o que reproduz o timeout no host legado.
* Bad, because tag é convenção editável por qualquer pessoa com acesso ao console.

## More Information

Se a resolução falhar em campo, o procedimento é subir com `--bastion i-…` para desbloquear e só então corrigir a EIP na config.
