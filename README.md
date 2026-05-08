# Fiscal Crypto Pro

Bot profissional para fiscalizar **BTC, ETH, XRP e ADA** com preços reais, análise técnica, take profit, stop loss e envio de relatórios para o Telegram.

## O que o projeto faz

- Consulta candles reais de 15 minutos e ticker 24h usando Binance Spot API com fallback real na Coinbase Exchange API.
- Calcula SMA20, SMA50, EMA12, EMA26, RSI14, ATR14 e volatilidade dos últimos candles.
- Gera take profits, stop loss, risco percentual e relação risco/retorno para cada setup direcional.
- Gera um sinal técnico (`compra forte`, `compra moderada`, `neutro`, `venda moderada`, `venda forte`).
- Cria uma previsão estatística baseada em médias móveis, momentum e preços anteriores.
- Envia relatórios para o Telegram via bot com direção LONG/SHORT, entrada, TP1/TP2/TP3 e stop loss quando houver sinal direcional.
- Exibe um dashboard web profissional para acompanhar o mercado manualmente.

> A previsão, take profit e stop loss são estatísticos e não representam recomendação financeira.

## Configuração do Telegram

Crie um arquivo `.env.local` ou exporte as variáveis no ambiente:

```bash
TELEGRAM_BOT_TOKEN=123456:token_do_bot
TELEGRAM_CHAT_ID=123456789
ALERT_INTERVAL_MS=300000
ALERT_MIN_SCORE_DELTA=2
```

- `TELEGRAM_BOT_TOKEN`: token gerado pelo BotFather.
- `TELEGRAM_CHAT_ID`: id do chat, grupo ou canal que receberá as análises.
- `ALERT_INTERVAL_MS`: intervalo entre fiscalizações automáticas. O padrão é 5 minutos.
- `ALERT_MIN_SCORE_DELTA`: variação mínima do score técnico para filtrar alertas relevantes.

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

## Endpoints

- `GET /api/market`: retorna análise em tempo real para BTC, ETH, XRP e ADA. Se um provedor externo falhar, retorna dados parciais reais e uma lista `warnings`, evitando erro 502 por falha isolada de exchange.
- `POST /api/telegram`: gera uma nova análise e envia o relatório ao Telegram configurado, incluindo take profits e stop loss dos setups ativos.

## Observações técnicas

O projeto usa Next.js 10. O script `scripts/patch-postcss-exports.js` mantém compatibilidade com o PostCSS instalado no ambiente, e os scripts usam `NODE_OPTIONS=--openssl-legacy-provider` para suportar builds em Node moderno.
