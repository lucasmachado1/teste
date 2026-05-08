# Fiscal Crypto Pro

Bot profissional para fiscalizar **BTC, ETH, XRP e ADA** com preços reais, análise técnica, previsão de 5 minutos, take profit, stop loss e envio automático de alertas para o Telegram.

## O que o projeto faz

- Consulta candles reais de 5 minutos e ticker 24h usando Binance Spot API com fallback real na Coinbase Exchange API.
- Calcula SMA20, SMA50, EMA12, EMA26, RSI14, ATR14 e volatilidade dos últimos candles.
- Gera take profits, stop loss, risco percentual e relação risco/retorno para cada setup direcional.
- Gera um sinal técnico (`compra forte`, `compra moderada`, `neutro`, `venda moderada`, `venda forte`).
- Cria uma previsão estatística para os próximos 5 minutos baseada em médias móveis, momentum e preços anteriores.
- Mantém uma banca virtual padrão de **R$ 100 por ativo** (`BTC`, `ETH`, `XRP` e `ADA`) para estimar resultado parcial, lucro no take profit ou perda no stop loss.
- Faz check automático a cada 5 minutos, envia no Telegram quando bater take profit, quando bater stop loss e também quando ainda não bateu nenhum alvo.
- Envia relatórios para o Telegram via bot com direção LONG/SHORT, entrada, TP1/TP2/TP3, stop loss, previsão de 5 minutos e resultado estimado da banca virtual.
- Exibe um dashboard web profissional para acompanhar o mercado manualmente.

> A previsão, take profit, stop loss e banca virtual são estatísticos e não representam recomendação financeira.

## Configuração do Telegram

Crie um arquivo `.env.local` ou exporte as variáveis no ambiente:

```bash
TELEGRAM_BOT_TOKEN=123456:token_do_bot
TELEGRAM_CHAT_ID=123456789
CHECK_INTERVAL_MS=300000
BANKROLL_PER_ASSET_BRL=100
FULL_REPORT_EVERY_CYCLES=12
```

- `TELEGRAM_BOT_TOKEN`: token gerado pelo BotFather.
- `TELEGRAM_CHAT_ID`: id do chat, grupo ou canal que receberá as análises.
- `CHECK_INTERVAL_MS`: intervalo entre previsão e fiscalização automática. O padrão é `300000` ms, ou seja, 5 minutos.
- `BANKROLL_PER_ASSET_BRL`: banca virtual usada em cada ativo para estimar lucro/prejuízo. O padrão é `100` reais por ativo.
- `FULL_REPORT_EVERY_CYCLES`: frequência para enviar o relatório técnico completo além do check de TP/SL. O padrão é a cada 12 ciclos; com check de 5 minutos, equivale a 1 hora. O primeiro ciclo sempre envia relatório completo.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` para ver o dashboard.

Para rodar o fiscalizador automático do Telegram:

```bash
npm run bot
```

## Como funciona o monitor de take profit e stop loss

1. A cada ciclo de 5 minutos o bot busca dados reais e refaz a análise.
2. Quando o ativo tem setup direcional (`LONG` ou `SHORT`), o bot abre uma posição virtual com `BANKROLL_PER_ASSET_BRL`.
3. Em todos os ciclos seguintes ele compara o preço real com TP1/TP2/TP3 e stop loss.
4. Se bater algum take profit, envia alerta `TAKE PROFIT BATIDO` com alvo, percentual e resultado estimado em reais.
5. Se bater stop loss, envia alerta `STOP LOSS BATIDO` e encerra aquela posição virtual.
6. Se não bater nenhum alvo, também envia o check informando que ainda não bateu, com resultado parcial e alvos pendentes.
7. Se todos os take profits forem tocados, a posição virtual é encerrada e uma nova só será aberta quando houver novo setup direcional.

## Endpoints

- `GET /api/market`: retorna análise em tempo real para BTC, ETH, XRP e ADA. Se um provedor externo falhar, retorna dados parciais reais e uma lista `warnings`, evitando erro 502 por falha isolada de exchange.
- `POST /api/telegram`: gera uma nova análise e envia o relatório ao Telegram configurado, incluindo take profits e stop loss dos setups ativos.

## Observações técnicas

O projeto usa Next.js 10. O script `scripts/patch-postcss-exports.js` mantém compatibilidade com o PostCSS instalado no ambiente, e os scripts usam `NODE_OPTIONS=--openssl-legacy-provider` para suportar builds em Node moderno.
