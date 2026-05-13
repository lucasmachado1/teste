import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const SYMBOLS = [
  { id: 'tiger', icon: '🐯', label: 'Tigre dourado' },
  { id: 'gold', icon: '🪙', label: 'Moeda imperial' },
  { id: 'ingot', icon: '🏆', label: 'Tesouro' },
  { id: 'fire', icon: '🔥', label: 'Bônus quente' },
  { id: 'gem', icon: '💎', label: 'Joia rara' },
  { id: 'leaf', icon: '🍀', label: 'Sorte' },
];

const DEFAULT_CONFIG = {
  winChance: 32,
  jackpotChance: 4,
  bet: 10,
  tripleMultiplier: 8,
  pairMultiplier: 2,
  jackpotMultiplier: 25,
};

const clamp = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max);

function randomIndex(max) {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function pickSymbol(excludedIds = []) {
  const availableSymbols = SYMBOLS.filter((symbol) => !excludedIds.includes(symbol.id));
  return availableSymbols[randomIndex(availableSymbols.length)];
}

function shuffleReels(reels) {
  return reels
    .map((symbol) => ({ symbol, order: randomIndex(1000) }))
    .sort((first, second) => first.order - second.order)
    .map(({ symbol }) => symbol);
}

function calculateSpin(config) {
  const safeConfig = {
    ...config,
    winChance: clamp(config.winChance, 0, 95),
    jackpotChance: clamp(config.jackpotChance, 0, 25),
    bet: clamp(config.bet, 1, 1000),
    tripleMultiplier: clamp(config.tripleMultiplier, 1, 100),
    pairMultiplier: clamp(config.pairMultiplier, 1, 25),
    jackpotMultiplier: clamp(config.jackpotMultiplier, 1, 250),
  };
  const roll = randomIndex(10000) / 100;
  const jackpotLimit = Math.min(safeConfig.jackpotChance, safeConfig.winChance);

  if (roll < jackpotLimit) {
    const reels = [SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]];
    return {
      reels,
      outcome: 'jackpot',
      prize: safeConfig.bet * safeConfig.jackpotMultiplier,
      message: 'Jackpot do Tigre! Trinca máxima ativada.',
    };
  }

  if (roll < safeConfig.winChance) {
    const mainSymbol = pickSymbol(['tiger']);
    const thirdSymbol = randomIndex(100) < 45 ? mainSymbol : pickSymbol([mainSymbol.id]);
    const reels = shuffleReels([mainSymbol, mainSymbol, thirdSymbol]);
    const isTriple = reels.every((symbol) => symbol.id === mainSymbol.id);

    return {
      reels,
      outcome: isTriple ? 'triple' : 'pair',
      prize: safeConfig.bet * (isTriple ? safeConfig.tripleMultiplier : safeConfig.pairMultiplier),
      message: isTriple ? 'Trinca premiada!' : 'Dupla premiada!',
    };
  }

  const first = pickSymbol();
  const second = pickSymbol([first.id]);
  const third = pickSymbol([first.id, second.id]);

  return {
    reels: shuffleReels([first, second, third]),
    outcome: 'miss',
    prize: 0,
    message: 'Quase! Ajuste o painel ou tente outra rodada demo.',
  };
}

function StatCard({ label, value, tone }) {
  return (
    <article className={`statCard ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ControlField({ label, suffix, value, min, max, onChange }) {
  return (
    <label className="controlField">
      <span>{label}</span>
      <div>
        <input
          min={min}
          max={max}
          type="number"
          value={value}
          onChange={(event) => onChange(clamp(event.target.value, min, max))}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}

export default function Home() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [credits, setCredits] = useState(500);
  const [reels, setReels] = useState([SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]]);
  const [message, setMessage] = useState('Configure as chances no painel e rode a experiência demo.');
  const [history, setHistory] = useState([]);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const savedConfig = window.localStorage.getItem('tigerDemoConfig');
    if (savedConfig) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
  }, []);

  useEffect(() => {
    window.localStorage.setItem('tigerDemoConfig', JSON.stringify(config));
  }, [config]);

  const stats = useMemo(() => {
    const totalSpins = history.length;
    const wins = history.filter((item) => item.prize > 0).length;
    const paid = history.reduce((sum, item) => sum + item.prize, 0);
    const wagered = history.reduce((sum, item) => sum + item.bet, 0);
    const rtp = wagered ? Math.round((paid / wagered) * 100) : 0;

    return { totalSpins, wins, paid, wagered, rtp };
  }, [history]);

  const updateConfig = (field, value) => {
    setConfig((currentConfig) => ({ ...currentConfig, [field]: value }));
  };

  const spin = () => {
    if (spinning || credits < config.bet) {
      setMessage('Créditos fictícios insuficientes para esta aposta demo.');
      return;
    }

    setSpinning(true);
    setMessage('Roletas girando...');
    setCredits((currentCredits) => currentCredits - config.bet);

    const animation = setInterval(() => {
      setReels([pickSymbol(), pickSymbol(), pickSymbol()]);
    }, 90);

    setTimeout(() => {
      clearInterval(animation);
      const result = calculateSpin(config);
      setReels(result.reels);
      setCredits((currentCredits) => currentCredits + result.prize);
      setHistory((currentHistory) => [
        {
          ...result,
          bet: config.bet,
          createdAt: new Date().toLocaleTimeString('pt-BR'),
        },
        ...currentHistory,
      ].slice(0, 8));
      setMessage(result.message);
      setSpinning(false);
    }, 850);
  };

  const resetDemo = () => {
    setCredits(500);
    setHistory([]);
    setReels([SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]]);
    setMessage('Demonstração reiniciada. Nenhum valor real é movimentado.');
  };

  return (
    <main className="shell">
      <Head>
        <title>Selva da Sorte Demo</title>
        <meta
          name="description"
          content="Jogo demo estilo roleta com painel de controle de probabilidades para sites de entretenimento sem dinheiro real."
        />
      </Head>

      <section className="hero gameHero">
        <div>
          <span className="badge">Slot demo configurável</span>
          <h1>Selva da Sorte: experiência estilo tigrinho para incorporar ao seu site.</h1>
          <p>
            Uma versão autoral, responsiva e visualmente pronta para demonstrações. O painel permite ajustar
            chances, multiplicadores e aposta fictícia, mantendo tudo transparente e sem dinheiro real.
          </p>
        </div>
        <aside className="disclaimerBox">
          <strong>Uso responsável</strong>
          <span>Protótipo de entretenimento. Não processa pagamentos, saques, depósitos ou apostas reais.</span>
        </aside>
      </section>

      <section className="dashboardGrid">
        <article className="gameMachine" aria-label="Máquina Selva da Sorte">
          <div className="machineTop">
            <span>Fortune Jungle</span>
            <strong>{credits} créditos</strong>
          </div>

          <div className={`reels ${spinning ? 'spinning' : ''}`}>
            {reels.map((symbol, index) => (
              <div className="reel" key={`${symbol.id}-${index}`} aria-label={symbol.label}>
                <span>{symbol.icon}</span>
              </div>
            ))}
          </div>

          <div className="resultPanel">
            <strong>{message}</strong>
            <span>Aposta demo: {config.bet} · Chance configurada: {config.winChance}%</span>
          </div>

          <div className="machineActions">
            <button type="button" onClick={spin} disabled={spinning}>
              {spinning ? 'Girando...' : 'Girar demo'}
            </button>
            <button className="secondaryButton" type="button" onClick={resetDemo}>
              Reiniciar créditos
            </button>
          </div>
        </article>

        <aside className="controlPanel" aria-label="Painel de controle do jogo">
          <span className="badge">Painel de controle</span>
          <h2>Configure probabilidades e prêmios</h2>
          <p>
            Estes controles alteram o comportamento local do protótipo para testes A/B, demonstrações comerciais
            e calibração de UX. Para uso público, valide regras, idade mínima e legislação aplicável.
          </p>

          <div className="controlsGrid">
            <ControlField label="Chance de ganhar" suffix="%" value={config.winChance} min={0} max={95} onChange={(value) => updateConfig('winChance', value)} />
            <ControlField label="Chance de jackpot" suffix="%" value={config.jackpotChance} min={0} max={25} onChange={(value) => updateConfig('jackpotChance', value)} />
            <ControlField label="Aposta fictícia" suffix="cr" value={config.bet} min={1} max={1000} onChange={(value) => updateConfig('bet', value)} />
            <ControlField label="Multiplicador dupla" suffix="x" value={config.pairMultiplier} min={1} max={25} onChange={(value) => updateConfig('pairMultiplier', value)} />
            <ControlField label="Multiplicador trinca" suffix="x" value={config.tripleMultiplier} min={1} max={100} onChange={(value) => updateConfig('tripleMultiplier', value)} />
            <ControlField label="Multiplicador jackpot" suffix="x" value={config.jackpotMultiplier} min={1} max={250} onChange={(value) => updateConfig('jackpotMultiplier', value)} />
          </div>
        </aside>
      </section>

      <section className="statsGrid" aria-label="Estatísticas da demonstração">
        <StatCard label="Rodadas" value={stats.totalSpins} />
        <StatCard label="Vitórias" value={stats.wins} tone="positive" />
        <StatCard label="Créditos apostados" value={stats.wagered} />
        <StatCard label="Créditos pagos" value={stats.paid} tone="gold" />
        <StatCard label="RTP observado" value={`${stats.rtp}%`} />
      </section>

      <section className="historyPanel">
        <div>
          <span className="badge">Histórico recente</span>
          <h2>Últimas rodadas simuladas</h2>
        </div>
        {history.length === 0 ? (
          <p>Nenhuma rodada ainda. Clique em “Girar demo” para iniciar.</p>
        ) : (
          <div className="historyList">
            {history.map((item, index) => (
              <article className="historyItem" key={`${item.createdAt}-${index}`}>
                <span>{item.createdAt}</span>
                <strong>{item.reels.map((symbol) => symbol.icon).join(' ')}</strong>
                <small>{item.outcome} · aposta {item.bet} · prêmio {item.prize}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
