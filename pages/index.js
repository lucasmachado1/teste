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


function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return window.btoa(binary);
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesToPassword(bytes, length) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*_-+=?';
  return Array.from(bytes.slice(0, length), (byte) => alphabet[byte % alphabet.length]).join('');
}

function generateSecret({ format, length }) {
  if (typeof window === 'undefined' || !window.crypto?.getRandomValues) {
    return 'Web Crypto indisponível neste navegador';
  }

  const safeLength = Math.min(Math.max(Number(length) || 32, 16), 128);
  const bytes = new Uint8Array(format === 'password' ? safeLength : Math.ceil((safeLength * 3) / 4));
  window.crypto.getRandomValues(bytes);

  if (format === 'hex') return bytesToHex(bytes).slice(0, safeLength * 2);
  if (format === 'base64') return bytesToBase64(bytes).slice(0, safeLength);
  if (format === 'password') return bytesToPassword(bytes, safeLength);
  return bytesToBase64Url(bytes).slice(0, safeLength);
}

function SecretKeyGenerator() {
  const [format, setFormat] = useState('base64url');
  const [length, setLength] = useState(32);
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setSecret(generateSecret({ format, length }));
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!secret || !navigator.clipboard) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
  };

  useEffect(() => {
    handleGenerate();
  }, []);

  return (
    <section className="secretGenerator" aria-label="Mini gerador de secret keys">
      <div>
        <span className="badge">Mini gerador seguro</span>
        <h2>Secret keys para API, tokens e senhas operacionais.</h2>
        <p>
          Gera segredos locais com Web Crypto, sem enviar para servidor e sem armazenar histórico.
          Este módulo não cria private keys de carteira, não deriva endereços e não consulta saldos.
        </p>
      </div>

      <div className="generatorControls">
        <label>
          Formato
          <select value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="base64url">Base64 URL-safe</option>
            <option value="base64">Base64</option>
            <option value="hex">Hex</option>
            <option value="password">Senha forte</option>
          </select>
        </label>
        <label>
          Tamanho
          <input min="16" max="128" type="number" value={length} onChange={(event) => setLength(event.target.value)} />
        </label>
        <button type="button" onClick={handleGenerate}>Gerar secret key</button>
      </div>

      <div className="secretOutput">
        <span>Resultado local</span>
        <code>{secret}</code>
        <button type="button" onClick={handleCopy} disabled={!secret}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </section>
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
          <dd>{wallet.displayBalance || formatter.format(wallet.balance)} {wallet.asset}</dd>
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
        <div>
          <dt>Provedor real</dt>
          <dd>{wallet.providerStatus === 'online' ? wallet.provider : wallet.providerStatus}</dd>
        </div>
      </dl>

      <div className="addressBlock">
        <span>Endereço monitorado</span>
        <code>{wallet.address}</code>
      </div>

      {wallet.error && <p className="providerError">{wallet.error}</p>}

      <footer>
        <span className={wallet.validAddress && wallet.providerStatus === 'online' ? 'valid' : 'invalid'}>
          {wallet.validAddress ? `Provedor: ${wallet.providerStatus}` : 'Formato requer revisão'}
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
          <span>Atualização automática a cada 30 segundos · Última leitura: {lastUpdate}</span>
        </div>
      </section>

      <section className="securityNotice">
        <strong>Postura de segurança:</strong> este produto não varre carteiras aleatórias, não tenta quebrar criptografia,
        não lista private keys e não auxilia acesso a fundos de terceiros. A varredura agora consulta saldos reais somente por endereço autorizado. O fluxo correto é importar apenas endereços
        cuja monitoração foi autorizada pelo proprietário ou por obrigação de auditoria.
      </section>

      {error && <section className="errorBox">{error}</section>}

      <SecretKeyGenerator />

      <section className="metricsGrid" aria-label="Resumo da varredura">
        <Metric label="Carteiras varridas" value={data?.totals.scanned ?? '--'} />
        <Metric label="Com moedas" value={data?.totals.funded ?? '--'} tone="positive" />
        <Metric label="Sem saldo" value={data?.totals.empty ?? '--'} />
        <Metric label="Redes suportadas" value={data?.totals.networks ?? '--'} />
        <Metric label="Alertas de provedor" value={data?.totals.providerErrors ?? '--'} />
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
