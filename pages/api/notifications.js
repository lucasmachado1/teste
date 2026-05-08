import { store } from '../../lib/store';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { userId } = req.query;
  return res.status(200).json({ notifications: store.notifications.filter((item) => item.userId === userId) });
}
