import { useEffect, useMemo, useState } from 'react';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatMoney(value) {
  if (value === null || value === undefined) return '--';
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return currency.format(value);
}

function StatusPill({ value }) {
  const tone = value.includes('compra') ? 'buy' : value.includes('venda') ? 'sell' : 'neutral';
  return <span className={`pill ${tone}`}>{value}</span>;
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AssetCard({ asset }) {
  const changeClass = asset.change24h >= 0 ? 'positive' : 'negative';

  return (
    <article className="assetCard">
      <header className="assetHeader">
        <div>
          <span className="ticker">{asset.ticker}</span>
          <h2>{asset.name}</h2>
        </div>
        <StatusPill value={asset.signal.label} />
      </header>

      <div className="priceRow">
        <strong>{formatMoney(asset.price)}</strong>
        <span className={changeClass}>{asset.change24h}% 24h</span>
      </div>

      <div className="forecastBox">
        <span>Previsão estatística</span>
        <strong>{formatMoney(asset.forecast.projectedPrice)}</strong>
        <small>{asset.forecast.projectedChange}% · {asset.forecast.horizon}</small>
        <em>{asset.forecast.model}</em>
      </div>

      <div className="sourceLine">Fonte real: {asset.source}</div>

      <div className="metricsGrid">
        <Metric label="SMA20" value={formatMoney(asset.indicators.sma20)} />
        <Metric label="SMA50" value={formatMoney(asset.indicators.sma50)} />
        <Metric label="EMA12" value={formatMoney(asset.indicators.ema12)} />
        <Metric label="EMA26" value={formatMoney(asset.indicators.ema26)} />
        <Metric label="RSI14" value={asset.indicators.rsi14} />
        <Metric label="Volatilidade" value={`${asset.indicators.volatility20}%`} />
      </div>

      <div className="reasonList">
        {asset.signal.reasons.map((reason) => <p key={reason}>• {reason}</p>)}
      </div>
    </article>
  );
}

function ConfigCard({ telegramConfigured, onSend, sending }) {
  return (
    <section className="configCard">
      <div>
        <span className="eyebrow">Telegram</span>
        <h2>Alertas automáticos</h2>
        <p>Configure as variáveis de ambiente com o token do bot e o chat onde os relatórios devem chegar.</p>
      </div>

      <div className="envGrid">
        <code>TELEGRAM_BOT_TOKEN</code>
        <code>TELEGRAM_CHAT_ID</code>
        <code>ALERT_INTERVAL_MS=300000</code>
      </div>

      <div className="telegramStatus">
        <span className={telegramConfigured ? 'dot ok' : 'dot'} />
        {telegramConfigured ? 'Telegram configurado' : 'Aguardando token e chat id'}
      </div>

      <button className="primaryButton" onClick={onSend} disabled={!telegramConfigured || sending} type="button">
        {sending ? 'Enviando...' : 'Enviar análise agora'}
      </button>
    </section>
  );
}

export default function Home() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadMarket = async () => {
    setLoading(true);
    setMessage('');
    const response = await fetch('/api/market');
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || 'Erro ao consultar o mercado.');
      setLoading(false);
      return;
    }

    setReport(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMarket();
    const timer = setInterval(loadMarket, 60000);
    return () => clearInterval(timer);
  }, []);

  const sendTelegram = async () => {
    setSending(true);
    setMessage('');
    const response = await fetch('/api/telegram', { method: 'POST' });
    const data = await response.json();
    setMessage(response.ok ? 'Análise enviada ao Telegram.' : data.message);
    setSending(false);
  };

  const sortedAssets = useMemo(() => {
    if (!report) return [];
    return [...report.assets].sort((a, b) => b.signal.score - a.signal.score);
  }, [report]);

  return (
    <main className="appShell">
      <section className="hero">
        <div className="heroContent">
          <span className="eyebrow">Fiscal Crypto Pro</span>
          <h1>Bot profissional para fiscalizar BTC, ETH, XRP e ADA em tempo real.</h1>
          <p>Coleta preços reais em múltiplos provedores, calcula médias móveis, RSI, volatilidade e cria uma previsão objetiva baseada nos preços anteriores.</p>
          <div className="heroActions">
            <button className="primaryButton" onClick={loadMarket} disabled={loading} type="button">{loading ? 'Atualizando...' : 'Atualizar agora'}</button>
            {report && <span>Última leitura: {new Date(report.updatedAt).toLocaleTimeString('pt-BR')}</span>}
          </div>
        </div>
      </section>

      {message && <div className="notice">{message}</div>}

      {report && report.warnings && report.warnings.length > 0 && (
        <section className="warningCard">
          <strong>Status parcial dos provedores</strong>
          {report.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </section>
      )}

      {report && (
        <section className="summaryGrid">
          <Metric label="Status" value={report.status} />
          <Metric label="Fonte" value={report.source} />
          <Metric label="Viés do mercado" value={report.summary.bias} />
          <Metric label="Score médio" value={report.summary.averageScore} />
          <Metric label="Mais forte" value={report.summary.strongest} />
          <Metric label="Mais fraco" value={report.summary.weakest} />
        </section>
      )}

      {report && <ConfigCard telegramConfigured={report.telegramConfigured} onSend={sendTelegram} sending={sending} />}

      <section className="assetGrid">
        {loading && !report && <div className="loadingCard">Consultando mercado real...</div>}
        {!loading && report && sortedAssets.length === 0 && <div className="loadingCard">Nenhum provedor retornou dados reais agora. Tente novamente em instantes ou verifique a conectividade do servidor.</div>}
        {sortedAssets.map((asset) => <AssetCard asset={asset} key={asset.symbol} />)}
      </section>

      <section className="disclaimer">
        <strong>Aviso:</strong> a previsão é estatística e não representa recomendação financeira. Use gerenciamento de risco.
      </section>
    </main>
  );
}
