const https = require('https');

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: options.method || 'GET', headers: options.headers || {} }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}: ${body.slice(0, 180)}`));
          return;
        }

        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(new Error(`Resposta JSON inválida: ${error.message}`));
        }
      });
    });

    request.on('error', reject);
    request.setTimeout(options.timeout || 12000, () => {
      request.destroy(new Error('Tempo limite excedido ao consultar serviço externo.'));
    });

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });
}

module.exports = { requestJson };
