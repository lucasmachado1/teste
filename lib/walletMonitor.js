const SATOSHIS = 100000000n;
const WEI = 1000000000000000000n;
const DROPS = 1000000n;
const LOVELACE = 1000000n;

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
    id: 'btc-public-sample',
    owner: 'Endereço BTC autorizado',
    chain: 'btc',
    address: '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
    lastActivity: 'Consultado on-chain',
    source: 'mempool.space REST API',
  },
  {
    id: 'eth-public-sample',
    owner: 'Endereço ETH autorizado',
    chain: 'eth',
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    lastActivity: 'Consultado on-chain',
    source: 'Ethereum JSON-RPC eth_getBalance',
  },
  {
    id: 'xrp-genesis-sample',
    owner: 'Endereço XRP autorizado',
    chain: 'xrp',
    address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    lastActivity: 'Consultado on-chain',
    source: 'XRPL account_info',
  },
  {
    id: 'ada-authorized-placeholder',
    owner: 'Endereço ADA autorizado',
    chain: 'ada',
    address: 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3l2t29ftx2',
    lastActivity: 'Aguardando provedor Cardano',
    source: 'Blockfrost API quando BLOCKFROST_PROJECT_ID estiver configurado',
  },
];

const divisors = {
  btc: SATOSHIS,
  eth: WEI,
  xrp: DROPS,
  ada: LOVELACE,
};

function parseJsonEnv(name, fallback) {
  if (!process.env[name]) return fallback;
  try {
    const parsed = JSON.parse(process.env[name]);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} em ${url}`);
  }

  return response.json();
}

function decimalFromBaseUnits(rawValue, decimals) {
  const raw = BigInt(rawValue || 0);
  const divisor = divisors[decimals.chain] || 1n;
  const whole = raw / divisor;
  const fraction = raw % divisor;
  const paddedFraction = fraction.toString().padStart(decimals.places, '0').replace(/0+$/, '');
  return paddedFraction ? `${whole}.${paddedFraction}` : whole.toString();
}

function toDisplayBalance(chain, rawValue) {
  return decimalFromBaseUnits(rawValue, { chain, places: SUPPORTED_CHAINS[chain].decimals });
}

function balanceAsNumber(chain, rawValue) {
  return Number(toDisplayBalance(chain, rawValue));
}

function readWatchlist() {
  return parseJsonEnv('WALLET_WATCHLIST_JSON', DEFAULT_WATCHLIST);
}

export function isValidWallet(chain, address) {
  const network = SUPPORTED_CHAINS[chain];
  return Boolean(network && network.validator.test(address));
}

async function scanBtc(wallet) {
  const data = await fetchJson(`https://mempool.space/api/address/${wallet.address}`);
  const confirmed = BigInt(data.chain_stats?.funded_txo_sum || 0) - BigInt(data.chain_stats?.spent_txo_sum || 0);
  const mempool = BigInt(data.mempool_stats?.funded_txo_sum || 0) - BigInt(data.mempool_stats?.spent_txo_sum || 0);
  const rawBalance = confirmed + mempool;

  return {
    rawBalance,
    confirmations: Number(data.chain_stats?.tx_count || 0),
    provider: 'mempool.space',
    providerStatus: 'online',
  };
}

async function scanEth(wallet) {
  const endpoint = process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com';
  const data = await fetchJson(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [wallet.address, 'latest'],
      id: wallet.id,
    }),
  });

  if (data.error) throw new Error(data.error.message || 'Erro no Ethereum JSON-RPC');

  return {
    rawBalance: BigInt(data.result || '0x0'),
    confirmations: 0,
    provider: endpoint,
    providerStatus: 'online',
  };
}

async function scanXrp(wallet) {
  const endpoint = process.env.XRPL_RPC_URL || 'https://s1.ripple.com:51234/';
  const data = await fetchJson(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      method: 'account_info',
      params: [{ account: wallet.address, ledger_index: 'validated' }],
    }),
  });

  const result = data.result || {};
  if (result.error === 'actNotFound') {
    return {
      rawBalance: 0n,
      confirmations: 0,
      provider: endpoint,
      providerStatus: 'online',
    };
  }
  if (result.error) throw new Error(result.error_message || result.error);

  return {
    rawBalance: BigInt(result.account_data?.Balance || 0),
    confirmations: Number(result.ledger_index || 0),
    provider: endpoint,
    providerStatus: 'online',
  };
}

async function scanAda(wallet) {
  if (!process.env.BLOCKFROST_PROJECT_ID) {
    return {
      rawBalance: 0n,
      confirmations: 0,
      provider: 'Blockfrost',
      providerStatus: 'requires_BLOCKFROST_PROJECT_ID',
    };
  }

  const endpoint = process.env.BLOCKFROST_API_URL || 'https://cardano-mainnet.blockfrost.io/api/v0';
  const data = await fetchJson(`${endpoint}/addresses/${wallet.address}`, {
    headers: { project_id: process.env.BLOCKFROST_PROJECT_ID },
  });
  const lovelace = data.amount?.find((asset) => asset.unit === 'lovelace')?.quantity || '0';

  return {
    rawBalance: BigInt(lovelace),
    confirmations: Number(data.tx_count || 0),
    provider: 'Blockfrost',
    providerStatus: 'online',
  };
}

async function scanWalletBalance(wallet) {
  if (!isValidWallet(wallet.chain, wallet.address)) {
    return {
      rawBalance: 0n,
      confirmations: 0,
      provider: 'validator',
      providerStatus: 'invalid_address',
      error: 'Formato de endereço inválido para a rede informada.',
    };
  }

  try {
    if (wallet.chain === 'btc') return await scanBtc(wallet);
    if (wallet.chain === 'eth') return await scanEth(wallet);
    if (wallet.chain === 'xrp') return await scanXrp(wallet);
    if (wallet.chain === 'ada') return await scanAda(wallet);
    throw new Error('Rede não suportada.');
  } catch (error) {
    return {
      rawBalance: 0n,
      confirmations: 0,
      provider: 'unavailable',
      providerStatus: 'error',
      error: error.message,
    };
  }
}

export async function scanWallets({ onlyFunded = false, watchlist = readWatchlist() } = {}) {
  const scannedAt = new Date().toISOString();
  const wallets = await Promise.all(watchlist.map(async (wallet) => {
    const chain = SUPPORTED_CHAINS[wallet.chain];
    const balanceResult = await scanWalletBalance(wallet);
    const funded = balanceResult.rawBalance > 0n;

    return {
      ...wallet,
      chainLabel: chain.label,
      asset: chain.asset,
      balance: balanceAsNumber(wallet.chain, balanceResult.rawBalance),
      displayBalance: toDisplayBalance(wallet.chain, balanceResult.rawBalance),
      rawBalance: balanceResult.rawBalance.toString(),
      funded,
      validAddress: isValidWallet(wallet.chain, wallet.address),
      confirmations: balanceResult.confirmations,
      provider: balanceResult.provider,
      providerStatus: balanceResult.providerStatus,
      error: balanceResult.error || '',
      explorerUrl: `${chain.explorer}${wallet.address}`,
      riskTag: funded ? 'Saldo encontrado' : 'Sem saldo',
      scannedAt,
    };
  }));

  const filteredWallets = onlyFunded ? wallets.filter((wallet) => wallet.funded) : wallets;
  const fundedCount = wallets.filter((wallet) => wallet.funded).length;
  const providerErrors = wallets.filter((wallet) => wallet.providerStatus !== 'online').length;

  return {
    scannedAt,
    refreshIntervalMs: 30000,
    totals: {
      scanned: wallets.length,
      funded: fundedCount,
      empty: wallets.length - fundedCount,
      networks: Object.keys(SUPPORTED_CHAINS).length,
      providerErrors,
    },
    wallets: filteredWallets,
    policy: {
      privateKeysExposed: false,
      randomPrivateKeyScanning: false,
      message: 'Este sistema consulta saldos reais apenas de endereços autorizados e nunca tenta descobrir, derivar, expor ou armazenar private keys.',
    },
  };
}
