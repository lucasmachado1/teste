const SATOSHIS = 100000000;
const WEI = 1000000000000000000;
const DROPS = 1000000;
const LOVELACE = 1000000;

export const SUPPORTED_CHAINS = {
  btc: {
    label: 'Bitcoin',
    asset: 'BTC',
    unit: 'sats',
    decimals: 8,
    explorer: 'https://www.blockchain.com/explorer/addresses/btc/',
    validator: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/,
  },
  eth: {
    label: 'Ethereum',
    asset: 'ETH',
    unit: 'wei',
    decimals: 18,
    explorer: 'https://etherscan.io/address/',
    validator: /^0x[a-fA-F0-9]{40}$/,
  },
  xrp: {
    label: 'XRP Ledger',
    asset: 'XRP',
    unit: 'drops',
    decimals: 6,
    explorer: 'https://xrpscan.com/account/',
    validator: /^r[1-9A-HJ-NP-Za-km-z]{25,35}$/,
  },
  ada: {
    label: 'Cardano',
    asset: 'ADA',
    unit: 'lovelace',
    decimals: 6,
    explorer: 'https://cardanoscan.io/address/',
    validator: /^(addr1|Ae2|DdzFF)[a-zA-Z0-9]{35,120}$/,
  },
};

export const DEFAULT_WATCHLIST = [
  {
    id: 'btc-cold-treasury',
    owner: 'Tesouraria fria',
    chain: 'btc',
    address: 'bc1qw4uemw830ry2xem35e2t5m4rxnpezd6m3uf7xy',
    lastActivity: '2017-11-02',
    source: 'Importação autorizada',
    rawBalance: 126250000,
  },
  {
    id: 'eth-audit-vault',
    owner: 'Cofre auditado',
    chain: 'eth',
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    lastActivity: '2018-06-21',
    source: 'Lista interna KYC/controle',
    rawBalance: 3850000000000000000,
  },
  {
    id: 'xrp-legacy-ops',
    owner: 'Operações legadas',
    chain: 'xrp',
    address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    lastActivity: '2019-01-13',
    source: 'Carteira própria migrada',
    rawBalance: 25000000,
  },
  {
    id: 'ada-recovery-zero',
    owner: 'Recuperação Cardano',
    chain: 'ada',
    address: 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3l2t29ftx2',
    lastActivity: '2020-09-05',
    source: 'Varredura contábil autorizada',
    rawBalance: 0,
  },
  {
    id: 'btc-archive-zero',
    owner: 'Arquivo BTC sem saldo',
    chain: 'btc',
    address: '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
    lastActivity: '2013-04-07',
    source: 'Arquivo público monitorado',
    rawBalance: 0,
  },
];

const divisors = {
  btc: SATOSHIS,
  eth: WEI,
  xrp: DROPS,
  ada: LOVELACE,
};

function createJitter(seed) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function simulateConfirmations(rawBalance, tick, index) {
  if (rawBalance === 0) return 0;
  return Math.floor(24 + createJitter(tick + index) * 72);
}

export function isValidWallet(chain, address) {
  const network = SUPPORTED_CHAINS[chain];
  return Boolean(network && network.validator.test(address));
}

export function normalizeBalance(chain, rawBalance) {
  const divisor = divisors[chain] || 1;
  return Number((rawBalance / divisor).toFixed(SUPPORTED_CHAINS[chain]?.decimals || 8));
}

export function scanWallets({ onlyFunded = false, watchlist = DEFAULT_WATCHLIST } = {}) {
  const tick = Math.floor(Date.now() / 12000);
  const scannedAt = new Date().toISOString();

  const wallets = watchlist.map((wallet, index) => {
    const chain = SUPPORTED_CHAINS[wallet.chain];
    const balance = normalizeBalance(wallet.chain, wallet.rawBalance);
    const funded = wallet.rawBalance > 0;

    return {
      ...wallet,
      chainLabel: chain.label,
      asset: chain.asset,
      balance,
      rawBalance: String(wallet.rawBalance),
      funded,
      validAddress: isValidWallet(wallet.chain, wallet.address),
      confirmations: simulateConfirmations(wallet.rawBalance, tick, index),
      explorerUrl: `${chain.explorer}${wallet.address}`,
      riskTag: funded ? 'Saldo encontrado' : 'Sem saldo',
      scannedAt,
    };
  });

  const filteredWallets = onlyFunded ? wallets.filter((wallet) => wallet.funded) : wallets;
  const fundedCount = wallets.filter((wallet) => wallet.funded).length;

  return {
    scannedAt,
    refreshIntervalMs: 12000,
    totals: {
      scanned: wallets.length,
      funded: fundedCount,
      empty: wallets.length - fundedCount,
      networks: Object.keys(SUPPORTED_CHAINS).length,
    },
    wallets: filteredWallets,
    policy: {
      privateKeysExposed: false,
      message: 'Este sistema monitora apenas endereços autorizados e nunca tenta descobrir, derivar, expor ou armazenar private keys.',
    },
  };
}
