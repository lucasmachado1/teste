import { scanWallets } from '../../lib/walletMonitor';

export default async function handler(request, response) {
  const onlyFunded = request.query.funded === 'true';
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    response.status(200).json(await scanWallets({ onlyFunded }));
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
