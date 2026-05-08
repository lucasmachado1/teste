const { analyzeMarket, formatTelegramMessage } = require('../lib/marketAnalysis');
const { sendTelegramMessage } = require('../lib/telegram');
const {
  evaluateReport,
  formatMonitorMessage,
  getBankrollBrl,
  getCheckIntervalMs
} = require('../lib/tradingMonitor');

const intervalMs = getCheckIntervalMs();
const bankrollBrl = getBankrollBrl();
const sendFullReportEveryCycles = Number(process.env.FULL_REPORT_EVERY_CYCLES || 12);
const positions = new Map();
let cycle = 0;

function shouldSendFullReport() {
  return cycle === 1 || (sendFullReportEveryCycles > 0 && cycle % sendFullReportEveryCycles === 0);
}

async function runCycle() {
  cycle += 1;
  const report = await analyzeMarket();
  const events = evaluateReport(report, positions, bankrollBrl);
  const monitorMessage = formatMonitorMessage(report, events, { bankrollBrl, checkIntervalMs: intervalMs });

  await sendTelegramMessage(monitorMessage);

  if (shouldSendFullReport()) {
    await sendTelegramMessage(formatTelegramMessage(report));
  }

  console.log([
    `[${new Date().toISOString()}] Check 5m enviado.`,
    `Ativos analisados: ${report.assets.length}.`,
    `Posições abertas: ${positions.size}.`,
    `Eventos: ${events.length}.`
  ].join(' '));
}

async function start() {
  console.log('Fiscal Crypto Pro iniciado. Pressione Ctrl+C para encerrar.');
  console.log(`Check/previsão: ${intervalMs}ms | Banca virtual por ativo: R$ ${bankrollBrl.toFixed(2)}`);

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
