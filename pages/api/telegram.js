import { analyzeMarket, formatTelegramMessage } from '../../lib/marketAnalysis';
import { sendTelegramMessage } from '../../lib/telegram';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const report = await analyzeMarket();
    const message = formatTelegramMessage(report);
    const telegram = await sendTelegramMessage(message);
    return res.status(200).json({ ok: true, telegram, report });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}
