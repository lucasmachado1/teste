import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 });

function Metric({ label, value, tone }) {
  return (
    <article className={`metric ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function WalletCard({ wallet }) {
  return (
    <article className={`walletCard ${wallet.funded ? 'funded' : 'empty'}`}>
      <header>
        <div>
          <span className="chain">{wallet.chainLabel}</span>
          <h3>{wallet.owner}</h3>
        </div>
        <strong className="status">{wallet.riskTag}</strong>
      </header>

      <dl className="walletFacts">
        <div>
          <dt>Saldo</dt>
          <dd>{formatter.format(wallet.balance)} {wallet.asset}</dd>
        </div>
        <div>
          <dt>Confirmações recentes</dt>
          <dd>{wallet.confirmations}</dd>
        </div>
        <div>
          <dt>Última atividade conhecida</dt>
          <dd>{wallet.lastActivity}</dd>
        </div>
        <div>
          <dt>Origem</dt>
          <dd>{wallet.source}</dd>
        </div>
      </dl>

      <div className="addressBlock">
        <span>Endereço monitorado</span>
        <code>{wallet.address}</code>
      </div>

      <footer>
        <span className={wallet.validAddress ? 'valid' : 'invalid'}>
          {wallet.validAddress ? 'Formato validado' : 'Formato requer revisão'}
        </span>
        <a href={wallet.explorerUrl} target="_blank" rel="noreferrer">Abrir explorer</a>
      </footer>
    </article>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [fundedOnly, setFundedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWallets = async (signal) => {
    setError('');
    const response = await fetch(`/api/wallets?funded=${fundedOnly}`, { signal });
    if (!response.ok) throw new Error('Falha ao consultar carteiras monitoradas.');
    const payload = await response.json();
    setData(payload);
    setLoading(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadWallets(controller.signal).catch((err) => {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setLoading(false);
      }
    });

    const timer = setInterval(() => {
      loadWallets(controller.signal).catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    }, data?.refreshIntervalMs || 12000);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [fundedOnly]);

  const lastUpdate = useMemo(() => {
    if (!data?.scannedAt) return '--';
    return new Date(data.scannedAt).toLocaleString('pt-BR');
  }, [data]);

  return (
    <main className="shell">
      <Head>
        <title>Guardian Chain Watch</title>
        <meta name="description" content="Monitoramento seguro de carteiras BTC, ETH, XRP e ADA autorizadas." />
      </Head>

      <section className="hero">
        <div className="badge">Monitoramento blockchain defensivo</div>
        <h1>Carteiras BTC, ETH, XRP e ADA sob observação em tempo quase real.</h1>
        <p>
          Painel profissional para acompanhar endereços informados e autorizados, priorizando
          saldos encontrados, auditoria e rastreabilidade sem manipular chaves privadas.
        </p>
        <div className="actions">
          <button type="button" onClick={() => setFundedOnly((value) => !value)}>
            {fundedOnly ? 'Mostrar todas as carteiras' : 'Filtrar carteiras com moedas'}
          </button>
          <span>Atualização automática a cada 12 segundos · Última leitura: {lastUpdate}</span>
        </div>
      </section>

      <section className="securityNotice">
        <strong>Postura de segurança:</strong> este produto não varre carteiras aleatórias, não tenta quebrar criptografia,
        não lista private keys e não auxilia acesso a fundos de terceiros. O fluxo correto é importar apenas endereços
        cuja monitoração foi autorizada pelo proprietário ou por obrigação de auditoria.
      </section>

      {error && <section className="errorBox">{error}</section>}

      <section className="metricsGrid" aria-label="Resumo da varredura">
        <Metric label="Carteiras varridas" value={data?.totals.scanned ?? '--'} />
        <Metric label="Com moedas" value={data?.totals.funded ?? '--'} tone="positive" />
        <Metric label="Sem saldo" value={data?.totals.empty ?? '--'} />
        <Metric label="Redes suportadas" value={data?.totals.networks ?? '--'} />
      </section>

      {loading ? (
        <section className="loading">Sincronizando leituras de blockchain...</section>
      ) : (
        <section className="walletGrid">
          {data.wallets.map((wallet) => <WalletCard wallet={wallet} key={wallet.id} />)}
        </section>
      )}
    </main>
  );
}
