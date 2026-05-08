const { analyzeMarket, formatTelegramMessage } = require('../lib/marketAnalysis');
const { sendTelegramMessage } = require('../lib/telegram');

const intervalMs = Number(process.env.ALERT_INTERVAL_MS || 300000);
const minScoreDelta = Number(process.env.ALERT_MIN_SCORE_DELTA || 2);
let lastScores = new Map();

function shouldAlert(asset) {
  const previousScore = lastScores.get(asset.ticker);
  lastScores.set(asset.ticker, asset.signal.score);

  if (previousScore === undefined) return true;
  return Math.abs(asset.signal.score - previousScore) >= minScoreDelta;
}

async function runCycle() {
  const report = await analyzeMarket();
  const importantAssets = report.assets.filter(shouldAlert);
  const message = importantAssets.length
    ? formatTelegramMessage({ ...report, assets: importantAssets })
    : formatTelegramMessage(report);

  await sendTelegramMessage(message);
  console.log(`[${new Date().toISOString()}] Alerta enviado para ${importantAssets.length || report.assets.length} ativos.`);
}

async function start() {
  console.log('Fiscal Crypto Pro iniciado. Pressione Ctrl+C para encerrar.');
  console.log(`Intervalo: ${intervalMs}ms | Delta mínimo de score: ${minScoreDelta}`);

  await runCycle();
  setInterval(() => {
    runCycle().catch((error) => {
      console.error(`[${new Date().toISOString()}] Falha no ciclo: ${error.message}`);
    });
  }, intervalMs);
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
