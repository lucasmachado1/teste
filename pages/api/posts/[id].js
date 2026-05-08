import { store, createId, nowIso } from '../../../lib/store';

export default function handler(req, res) {
  const post = store.posts.find((item) => item.id === req.query.id);

  if (!post) {
    return res.status(404).json({ message: 'Post não encontrado' });
  }

  if (req.method === 'PATCH') {
    const { action, userId = 'anonymous', comment } = req.body || {};

    if (action === 'like') {
      post.likes = post.likes.includes(userId) ? post.likes.filter((id) => id !== userId) : [...post.likes, userId];
    }

    if (action === 'save') {
      post.saves = post.saves.includes(userId) ? post.saves.filter((id) => id !== userId) : [...post.saves, userId];
    }

    if (action === 'share') {
      post.shares += 1;
    }

    if (action === 'comment' && comment && comment.trim()) {
      post.comments.push({ id: createId('comment'), userId, text: comment.trim(), createdAt: nowIso() });
    }

    if (action === 'report') {
      post.reports.push({ id: createId('report'), userId, createdAt: nowIso() });
    }

    return res.status(200).json({ post });
  }

  res.setHeader('Allow', ['PATCH']);
  return res.status(405).json({ message: 'Método não permitido' });
}
