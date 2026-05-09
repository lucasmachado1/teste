import { scanWallets } from '../../lib/walletMonitor';

export default function handler(request, response) {
  const onlyFunded = request.query.funded === 'true';
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.status(200).json(scanWallets({ onlyFunded }));
}
