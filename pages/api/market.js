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
    return res.status(500).json({
      message: 'Falha inesperada ao montar a análise de mercado.',
      detail: error.message,
      telegramConfigured: hasTelegramConfig(),
      assets: [],
      warnings: [error.message],
      status: 'unavailable'
    });
  }
}
