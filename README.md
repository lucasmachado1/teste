# Guardian Chain Watch

Guardian Chain Watch é um painel Next.js para consultar saldos reais, em tempo quase real, de endereços BTC, ETH, XRP e ADA previamente autorizados.

## Segurança e uso permitido

Este projeto foi desenhado para auditoria defensiva, inventário patrimonial, reconciliação contábil e monitoramento de carteiras próprias. Ele **não** tenta descobrir carteiras abandonadas, quebrar criptografia, gerar private keys aleatórias, derivar seeds, expor private keys ou facilitar acesso a fundos de terceiros.

A varredura implementada é real, mas limitada a **endereços autorizados**: o backend consulta provedores públicos/nós configurados para obter saldos on-chain por endereço. Nenhum fluxo do projeto cria, armazena ou testa private keys de carteiras. O mini gerador cria apenas segredos operacionais locais para API keys/tokens/senhas, sem envio ao servidor e sem histórico.

## Funcionalidades

- Dashboard responsivo com métricas de carteiras consultadas, carteiras com moedas, carteiras sem saldo, redes suportadas e alertas de provedor.
- Filtro para exibir somente endereços com saldo.
- Atualização automática a cada 30 segundos.
- API interna `/api/wallets` com opção `?funded=true`.
- Consulta real de saldos BTC via mempool.space REST API.
- Consulta real de saldos ETH via `eth_getBalance` em `ETH_RPC_URL` ou endpoint público padrão.
- Consulta real de saldos XRP via `account_info` em `XRPL_RPC_URL` ou endpoint público padrão.
- Consulta real de saldos ADA via Blockfrost quando `BLOCKFROST_PROJECT_ID` estiver configurado.
- Validação básica de formato para BTC, ETH, XRP e ADA.
- Links para explorers públicos por endereço.
- Mini gerador local de secret keys para API keys, tokens e senhas operacionais usando Web Crypto.

## Variáveis de ambiente

```bash
# Opcional: sobrescreve a lista de endereços autorizados.
WALLET_WATCHLIST_JSON='[{"id":"meu-btc","owner":"Tesouraria","chain":"btc","address":"...","source":"auditoria"}]'

# Opcional para Ethereum. Se ausente, usa endpoint público padrão.
ETH_RPC_URL=https://ethereum-rpc.publicnode.com

# Opcional para XRP. Se ausente, usa endpoint público padrão.
XRPL_RPC_URL=https://s1.ripple.com:51234/

# Necessário para consulta real de ADA via Blockfrost.
BLOCKFROST_PROJECT_ID=mainnet...
BLOCKFROST_API_URL=https://cardano-mainnet.blockfrost.io/api/v0
```

## Como executar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Próximos passos de produção

1. Hospedar nós próprios ou provedores com SLA para BTC, ETH, XRP e ADA.
2. Armazenar a watchlist autorizada em banco com trilhas de auditoria.
3. Adicionar autenticação, RBAC e criptografia de dados sensíveis em repouso.
4. Publicar métricas operacionais em Prometheus/OpenTelemetry.
