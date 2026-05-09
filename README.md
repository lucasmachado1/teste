# Guardian Chain Watch

Guardian Chain Watch é um painel Next.js para monitorar, em tempo quase real, endereços BTC, ETH, XRP e ADA previamente autorizados.

## Segurança e uso permitido

Este projeto foi desenhado para auditoria defensiva, inventário patrimonial, reconciliação contábil e monitoramento de carteiras próprias. Ele **não** tenta descobrir carteiras abandonadas, quebrar criptografia, derivar seeds, expor private keys ou facilitar acesso a fundos de terceiros.

## Funcionalidades

- Dashboard responsivo com métricas de carteiras varridas, carteiras com moedas, carteiras sem saldo e redes suportadas.
- Filtro para exibir somente endereços com saldo.
- Atualização automática a cada 12 segundos.
- API interna `/api/wallets` com opção `?funded=true`.
- Validação básica de formato para BTC, ETH, XRP e ADA.
- Links para explorers públicos por endereço.

## Como executar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Próximos passos de produção

1. Substituir os saldos simulados em `lib/walletMonitor.js` por conectores oficiais ou nós próprios de cada rede.
2. Armazenar a watchlist autorizada em banco com trilhas de auditoria.
3. Adicionar autenticação, RBAC e criptografia de dados sensíveis em repouso.
4. Publicar métricas operacionais em Prometheus/OpenTelemetry.
