function createTimeoutSignal(timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function requestJson(url, options = {}) {
  const timeout = options.timeout || 6000;
  const headers = { 'User-Agent': 'FiscalCryptoPro/1.0', Accept: 'application/json', ...(options.headers || {}) };
  const timeoutSignal = createTimeoutSignal(timeout);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      signal: timeoutSignal.signal
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
    }

    return body ? JSON.parse(body) : {};
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Tempo limite de ${timeout}ms excedido ao consultar ${new URL(url).hostname}.`);
    }

    throw error;
  } finally {
    timeoutSignal.clear();
  }
}

module.exports = { requestJson };
