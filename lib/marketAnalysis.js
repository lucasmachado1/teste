const { requestJson } = require('./http');

const ASSETS = [
  { symbol: 'BTCUSDT', coinbaseProduct: 'BTC-USD', ticker: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', coinbaseProduct: 'ETH-USD', ticker: 'ETH', name: 'Ethereum' },
  { symbol: 'XRPUSDT', coinbaseProduct: 'XRP-USD', ticker: 'XRP', name: 'XRP' },
  { symbol: 'ADAUSDT', coinbaseProduct: 'ADA-USD', ticker: 'ADA', name: 'Cardano' }
];

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';
const COINBASE_BASE_URL = 'https://api.exchange.coinbase.com';

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const percent = (current, previous) => previous ? ((current - previous) / previous) * 100 : 0;
const round = (value, digits = 4) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : null);

function sma(values, period) {
  if (values.length < period) return null;
  return mean(values.slice(-period));
}

function ema(values, period) {
  if (values.length < period) return null;
  const multiplier = 2 / (period + 1);
  let average = mean(values.slice(0, period));

  values.slice(period).forEach((value) => {
    average = value * multiplier + average * (1 - multiplier);
  });

  return average;
}

function rsi(values, period = 14) {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;

  for (let index = values.length - period; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) gains += change;
    if (change < 0) losses += Math.abs(change);
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;
  if (averageLoss === 0) return 100;

  const strength = averageGain / averageLoss;
  return 100 - (100 / (1 + strength));
}

function volatility(values, period = 20) {
  if (values.length < period + 1) return null;
  const returns = [];

  for (let index = values.length - period; index < values.length; index += 1) {
    returns.push(percent(values[index], values[index - 1]));
  }

  const average = mean(returns);
  const variance = mean(returns.map((value) => (value - average) ** 2));
  return Math.sqrt(variance);
}

function getSignal({ sma20, sma50, ema12, ema26, rsi14, change24h }) {
  let score = 0;
  const reasons = [];

  if (sma20 && sma50) {
    if (sma20 > sma50) {
      score += 2;
      reasons.push('SMA20 acima da SMA50 indica tendência curta positiva.');
    } else {
      score -= 2;
      reasons.push('SMA20 abaixo da SMA50 indica pressão vendedora.');
    }
  }

  if (ema12 && ema26) {
    if (ema12 > ema26) {
      score += 1;
      reasons.push('EMA12 acima da EMA26 reforça momentum comprador.');
    } else {
      score -= 1;
      reasons.push('EMA12 abaixo da EMA26 reduz o momentum de curto prazo.');
    }
  }

  if (rsi14 !== null) {
    if (rsi14 < 30) {
      score += 1;
      reasons.push('RSI abaixo de 30 sugere sobrevenda e possível repique.');
    } else if (rsi14 > 70) {
      score -= 1;
      reasons.push('RSI acima de 70 sugere sobrecompra e risco de correção.');
    } else {
      reasons.push('RSI em zona neutra, sem extremo técnico.');
    }
  }

  if (change24h > 1.5) score += 1;
  if (change24h < -1.5) score -= 1;

  if (score >= 3) return { label: 'compra forte', score, reasons };
  if (score >= 1) return { label: 'compra moderada', score, reasons };
  if (score <= -3) return { label: 'venda forte', score, reasons };
  if (score <= -1) return { label: 'venda moderada', score, reasons };
  return { label: 'neutro', score, reasons };
}

function forecastPrice(closes, currentPrice, sma20, sma50, ema12, ema26, rsi14) {
  const recentChanges = [];
  const start = Math.max(1, closes.length - 10);

  for (let index = start; index < closes.length; index += 1) {
    recentChanges.push(percent(closes[index], closes[index - 1]));
  }

  const averageRecentChange = recentChanges.length ? mean(recentChanges) : 0;
  const trendBias = sma20 && sma50 ? percent(sma20, sma50) * 0.18 : 0;
  const momentumBias = ema12 && ema26 ? percent(ema12, ema26) * 0.22 : 0;
  const rsiBias = rsi14 === null ? 0 : (50 - rsi14) * 0.015;
  const projectedChange = averageRecentChange * 0.45 + trendBias + momentumBias + rsiBias;
  const projectedPrice = currentPrice * (1 + projectedChange / 100);

  return {
    horizon: 'próximos 3 candles de 15m',
    projectedChange: round(projectedChange, 3),
    projectedPrice: round(projectedPrice, currentPrice > 100 ? 2 : 5),
    model: 'média das últimas variações + inclinação SMA20/SMA50 + momentum EMA12/EMA26 + ajuste RSI'
  };
}

async function fetchBinanceMarketData(asset, interval = '15m', limit = 120) {
  const params = new URLSearchParams({ symbol: asset.symbol, interval, limit: String(limit) });
  const candles = await requestJson(`${BINANCE_BASE_URL}/klines?${params.toString()}`);
  const ticker = await requestJson(`${BINANCE_BASE_URL}/ticker/24hr?symbol=${asset.symbol}`);

  return {
    source: 'Binance Spot API',
    candles: candles.map((candle) => ({
      openTime: candle[0],
      open: Number(candle[1]),
      high: Number(candle[2]),
      low: Number(candle[3]),
      close: Number(candle[4]),
      volume: Number(candle[5]),
      closeTime: candle[6]
    })),
    ticker: {
      currentPrice: Number(ticker.lastPrice),
      previousClose: Number(ticker.prevClosePrice),
      open24h: Number(ticker.openPrice),
      change24h: Number(ticker.priceChangePercent),
      volume24h: Number(ticker.quoteVolume || 0)
    }
  };
}

async function fetchCoinbaseMarketData(asset, limit = 120) {
  const candleUrl = `${COINBASE_BASE_URL}/products/${asset.coinbaseProduct}/candles?granularity=900`;
  const rawCandles = await requestJson(candleUrl, { headers: { 'User-Agent': 'FiscalCryptoPro/1.0' } });
  const ticker = await requestJson(`${COINBASE_BASE_URL}/products/${asset.coinbaseProduct}/ticker`, { headers: { 'User-Agent': 'FiscalCryptoPro/1.0' } });
  const stats = await requestJson(`${COINBASE_BASE_URL}/products/${asset.coinbaseProduct}/stats`, { headers: { 'User-Agent': 'FiscalCryptoPro/1.0' } });

  const candles = rawCandles
    .slice(0, limit)
    .map((candle) => ({
      openTime: candle[0] * 1000,
      low: Number(candle[1]),
      high: Number(candle[2]),
      open: Number(candle[3]),
      close: Number(candle[4]),
      volume: Number(candle[5]),
      closeTime: candle[0] * 1000 + 899999
    }))
    .reverse();

  const currentPrice = Number(ticker.price || stats.last);
  const open24h = Number(stats.open || candles[0].open);

  return {
    source: 'Coinbase Exchange API',
    candles,
    ticker: {
      currentPrice,
      previousClose: open24h,
      open24h,
      change24h: percent(currentPrice, open24h),
      volume24h: Number(stats.volume || 0) * currentPrice
    }
  };
}

async function fetchMarketData(asset) {
  const providers = [
    { name: 'Binance', request: fetchBinanceMarketData(asset) },
    { name: 'Coinbase', request: fetchCoinbaseMarketData(asset) }
  ];

  try {
    return await Promise.any(providers.map((provider) => provider.request));
  } catch (error) {
    const errors = error.errors || [];
    throw new Error(providers.map((provider, index) => `${provider.name}: ${errors[index] ? errors[index].message : 'indisponível'}`).join(' | '));
  }
}

async function analyzeAsset(asset) {
  const marketData = await fetchMarketData(asset);
  const closes = marketData.candles.map((candle) => candle.close).filter(Number.isFinite);

  if (closes.length < 50) {
    throw new Error(`${asset.ticker}: histórico insuficiente para médias móveis.`);
  }

  const currentPrice = marketData.ticker.currentPrice || closes[closes.length - 1];
  const previousClose = marketData.ticker.previousClose || closes[closes.length - 2];
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const rsi14 = rsi(closes, 14);
  const change24h = Number.isFinite(marketData.ticker.change24h) ? marketData.ticker.change24h : percent(currentPrice, previousClose);
  const signal = getSignal({ sma20, sma50, ema12, ema26, rsi14, change24h });

  return {
    symbol: asset.symbol,
    ticker: asset.ticker,
    name: asset.name,
    source: marketData.source,
    updatedAt: new Date().toISOString(),
    price: round(currentPrice, currentPrice > 100 ? 2 : 5),
    change24h: round(change24h, 3),
    volume24h: round(Number(marketData.ticker.volume24h || 0), 2),
    indicators: {
      sma20: round(sma20, currentPrice > 100 ? 2 : 5),
      sma50: round(sma50, currentPrice > 100 ? 2 : 5),
      ema12: round(ema12, currentPrice > 100 ? 2 : 5),
      ema26: round(ema26, currentPrice > 100 ? 2 : 5),
      rsi14: round(rsi14, 2),
      volatility20: round(volatility(closes, 20), 3)
    },
    signal,
    forecast: forecastPrice(closes, currentPrice, sma20, sma50, ema12, ema26, rsi14),
    candles: marketData.candles.slice(-24)
  };
}

async function analyzeMarket() {
  const settled = await Promise.allSettled(ASSETS.map(analyzeAsset));
  const assets = settled.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  const warnings = settled
    .map((result, index) => (result.status === 'rejected' ? `${ASSETS[index].ticker}: ${result.reason.message}` : null))
    .filter(Boolean);
  const averageScore = assets.length ? mean(assets.map((asset) => asset.signal.score)) : 0;
  const strongest = assets.length ? [...assets].sort((a, b) => b.signal.score - a.signal.score)[0] : null;
  const weakest = assets.length ? [...assets].sort((a, b) => a.signal.score - b.signal.score)[0] : null;
  const sources = [...new Set(assets.map((asset) => asset.source))];

  return {
    updatedAt: new Date().toISOString(),
    source: sources.length ? sources.join(' + ') : 'sem fonte disponível no momento',
    interval: '15m',
    status: assets.length === ASSETS.length ? 'ok' : assets.length ? 'partial' : 'unavailable',
    assets,
    warnings,
    summary: {
      averageScore: round(averageScore, 2),
      bias: averageScore >= 1 ? 'mercado com viés comprador' : averageScore <= -1 ? 'mercado com viés vendedor' : 'mercado misto/neutro',
      strongest: strongest ? strongest.ticker : 'n/d',
      weakest: weakest ? weakest.ticker : 'n/d'
    }
  };
}

function formatTelegramMessage(report) {
  const lines = [
    '🤖 *Fiscal Crypto Pro*',
    `Atualização: ${new Date(report.updatedAt).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC`,
    `Fonte: ${report.source} | Candle: ${report.interval}`,
    `Resumo: *${report.summary.bias}*`,
    ''
  ];

  if (!report.assets.length) {
    lines.push('⚠️ Nenhum provedor de mercado respondeu com dados reais agora.');
    report.warnings.forEach((warning) => lines.push(`- ${warning}`));
    lines.push('');
  }

  report.assets.forEach((asset) => {
    lines.push(`*${asset.ticker}* $${asset.price} (${asset.change24h}%)`);
    lines.push(`Fonte: ${asset.source}`);
    lines.push(`Sinal: *${asset.signal.label}* | RSI: ${asset.indicators.rsi14} | Vol: ${asset.indicators.volatility20}%`);
    lines.push(`Previsão: $${asset.forecast.projectedPrice} (${asset.forecast.projectedChange}%)`);
    lines.push(`Motivo: ${asset.signal.reasons[0] || 'Dados técnicos consolidados.'}`);
    lines.push('');
  });

  lines.push('_Análise estatística, não é recomendação financeira._');
  return lines.join('\n');
}

module.exports = {
  ASSETS,
  analyzeMarket,
  formatTelegramMessage
};
