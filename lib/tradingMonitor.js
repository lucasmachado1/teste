const DEFAULT_BANKROLL_BRL = Number(process.env.BANKROLL_PER_ASSET_BRL || 100);
const DEFAULT_CHECK_INTERVAL_MS = Number(process.env.CHECK_INTERVAL_MS || process.env.ALERT_INTERVAL_MS || 300000);
const EXIT_REASONS = {
  TAKE_PROFIT: 'TAKE_PROFIT',
  STOP_LOSS: 'STOP_LOSS',
  NO_HIT: 'NO_HIT'
};

const round = (value, digits = 4) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : null);
const percent = (current, previous) => previous ? ((current - previous) / previous) * 100 : 0;

function getBankrollBrl() {
  return Number.isFinite(DEFAULT_BANKROLL_BRL) && DEFAULT_BANKROLL_BRL > 0 ? DEFAULT_BANKROLL_BRL : 100;
}

function getCheckIntervalMs() {
  return Number.isFinite(DEFAULT_CHECK_INTERVAL_MS) && DEFAULT_CHECK_INTERVAL_MS > 0 ? DEFAULT_CHECK_INTERVAL_MS : 300000;
}

function formatBrl(value) {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calculatePnlPercent(direction, currentPrice, entry) {
  const raw = percent(currentPrice, entry);
  return direction === 'SHORT' ? raw * -1 : raw;
}

function buildPosition(asset, bankrollBrl = getBankrollBrl()) {
  if (!asset.riskPlan || asset.riskPlan.direction === 'NEUTRO') return null;

  const entry = Number(asset.riskPlan.entry || asset.price);
  if (!Number.isFinite(entry) || entry <= 0) return null;

  const direction = asset.riskPlan.direction;
  const units = bankrollBrl / entry;

  return {
    ticker: asset.ticker,
    direction,
    entry,
    stopLoss: Number(asset.riskPlan.stopLoss),
    takeProfits: asset.riskPlan.takeProfits.map((target) => ({
      ...target,
      price: Number(target.price),
      hit: false,
      hitAt: null
    })),
    openedAt: asset.updatedAt,
    lastCheckedAt: asset.updatedAt,
    lastPrice: Number(asset.price),
    bankrollBrl,
    units,
    status: 'OPEN'
  };
}

function shouldHitTakeProfit(direction, currentPrice, targetPrice) {
  return direction === 'LONG' ? currentPrice >= targetPrice : currentPrice <= targetPrice;
}

function shouldHitStopLoss(direction, currentPrice, stopLoss) {
  return direction === 'LONG' ? currentPrice <= stopLoss : currentPrice >= stopLoss;
}

function evaluatePosition(position, asset) {
  const currentPrice = Number(asset.price);
  if (!Number.isFinite(currentPrice)) {
    return { type: EXIT_REASONS.NO_HIT, position, asset, currentPrice: null };
  }

  const checkedAt = asset.updatedAt || new Date().toISOString();
  position.lastCheckedAt = checkedAt;
  position.lastPrice = currentPrice;

  const newlyHitTargets = position.takeProfits.filter((target) => (
    !target.hit && shouldHitTakeProfit(position.direction, currentPrice, target.price)
  ));

  newlyHitTargets.forEach((target) => {
    target.hit = true;
    target.hitAt = checkedAt;
  });

  if (newlyHitTargets.length) {
    const lastTarget = newlyHitTargets[newlyHitTargets.length - 1];
    const pnlPercent = calculatePnlPercent(position.direction, lastTarget.price, position.entry);
    const pnlBrl = position.bankrollBrl * (pnlPercent / 100);

    if (position.takeProfits.every((target) => target.hit)) position.status = 'COMPLETED';

    return {
      type: EXIT_REASONS.TAKE_PROFIT,
      position,
      asset,
      currentPrice,
      targets: newlyHitTargets,
      pnlPercent: round(pnlPercent, 2),
      pnlBrl: round(pnlBrl, 2)
    };
  }

  if (Number.isFinite(position.stopLoss) && shouldHitStopLoss(position.direction, currentPrice, position.stopLoss)) {
    const pnlPercent = calculatePnlPercent(position.direction, position.stopLoss, position.entry);
    const pnlBrl = position.bankrollBrl * (pnlPercent / 100);
    position.status = 'STOPPED';

    return {
      type: EXIT_REASONS.STOP_LOSS,
      position,
      asset,
      currentPrice,
      pnlPercent: round(pnlPercent, 2),
      pnlBrl: round(pnlBrl, 2)
    };
  }

  const pnlPercent = calculatePnlPercent(position.direction, currentPrice, position.entry);
  const pnlBrl = position.bankrollBrl * (pnlPercent / 100);

  return {
    type: EXIT_REASONS.NO_HIT,
    position,
    asset,
    currentPrice,
    pnlPercent: round(pnlPercent, 2),
    pnlBrl: round(pnlBrl, 2)
  };
}

function ensurePositions(report, positions, bankrollBrl = getBankrollBrl()) {
  report.assets.forEach((asset) => {
    const current = positions.get(asset.ticker);
    const hasOpenPosition = current && current.status === 'OPEN';
    if (hasOpenPosition) return;

    const position = buildPosition(asset, bankrollBrl);
    if (position) positions.set(asset.ticker, position);
  });
}

function evaluateReport(report, positions, bankrollBrl = getBankrollBrl()) {
  ensurePositions(report, positions, bankrollBrl);

  return report.assets
    .map((asset) => {
      const position = positions.get(asset.ticker);
      if (!position || position.status !== 'OPEN') return null;
      const event = evaluatePosition(position, asset);
      if (event.type === EXIT_REASONS.STOP_LOSS || position.status === 'COMPLETED') positions.delete(asset.ticker);
      return event;
    })
    .filter(Boolean);
}

function formatMonitorMessage(report, events, options = {}) {
  const bankrollBrl = options.bankrollBrl || getBankrollBrl();
  const checkIntervalMs = options.checkIntervalMs || getCheckIntervalMs();
  const lines = [
    '⏱️ *Check automático 5m - Fiscal Crypto Pro*',
    `Atualização: ${new Date(report.updatedAt).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC`,
    `Banca virtual por ativo: *${formatBrl(bankrollBrl)}*`,
    `Próximo check/previsão: ${Math.round(checkIntervalMs / 60000)} min`,
    ''
  ];

  if (!events.length) {
    lines.push('⚠️ Nenhum ativo com posição direcional aberta neste ciclo.');
    lines.push('O bot aguardará novo setup LONG/SHORT real para monitorar TP/SL.');
    return lines.join('\n');
  }

  events.forEach((event) => {
    const { asset, position } = event;
    const forecast = asset.forecast ? `$${asset.forecast.projectedPrice} (${asset.forecast.projectedChange}%)` : 'indisponível';
    lines.push(`*${asset.ticker}* ${position.direction} | preço $${asset.price}`);
    lines.push(`Entrada $${position.entry} | SL $${position.stopLoss} | Banca ${formatBrl(position.bankrollBrl)}`);
    lines.push(`Previsão 5m: ${forecast}`);

    if (event.type === EXIT_REASONS.TAKE_PROFIT) {
      const labels = event.targets.map((target) => `${target.label} $${target.price}`).join(', ');
      lines.push(`✅ *TAKE PROFIT BATIDO*: ${labels}`);
      lines.push(`Resultado estimado: ${formatBrl(event.pnlBrl)} (${event.pnlPercent}%)`);
    } else if (event.type === EXIT_REASONS.STOP_LOSS) {
      lines.push(`🛑 *STOP LOSS BATIDO*: $${position.stopLoss}`);
      lines.push(`Resultado estimado: ${formatBrl(event.pnlBrl)} (${event.pnlPercent}%)`);
    } else {
      const pendingTargets = position.takeProfits.filter((target) => !target.hit).map((target) => `${target.label} $${target.price}`).join(' | ');
      lines.push('⏳ Ainda não bateu take profit nem stop loss neste check.');
      lines.push(`Resultado parcial: ${formatBrl(event.pnlBrl)} (${event.pnlPercent}%)`);
      lines.push(`Alvos pendentes: ${pendingTargets || 'todos já foram tocados'}`);
    }

    lines.push('');
  });

  lines.push('_Controle estatístico automatizado; não é recomendação financeira._');
  return lines.join('\n');
}

module.exports = {
  EXIT_REASONS,
  buildPosition,
  evaluatePosition,
  evaluateReport,
  formatMonitorMessage,
  getBankrollBrl,
  getCheckIntervalMs
};
