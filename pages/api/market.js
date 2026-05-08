import { analyzeMarket } from '../../lib/marketAnalysis';
import { hasTelegramConfig } from '../../lib/telegram';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const report = await analyzeMarket();
    return res.status(200).json({ ...report, telegramConfigured: hasTelegramConfig() });
  } catch (error) {
    return res.status(502).json({ message: 'Não foi possível consultar o mercado em tempo real.', detail: error.message });
  }
}
