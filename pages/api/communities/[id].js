import { store, createId, nowIso } from '../../../lib/store';

export default function handler(req, res) {
  const community = store.communities.find((item) => item.id === req.query.id);

  if (!community) {
    return res.status(404).json({ message: 'Comunidade não encontrada.' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      community,
      feed: store.posts.filter((post) => post.communityId === community.id)
    });
  }

  if (req.method === 'PATCH') {
    const { action, userId, title, text } = req.body || {};

    if (action === 'membership') {
      community.members = community.members.includes(userId)
        ? community.members.filter((id) => id !== userId)
        : [...community.members, userId];
    }

    if (action === 'topic' && title && text) {
      community.topics.unshift({ id: createId('topic'), title: title.trim(), text: text.trim(), userId, replies: [], createdAt: nowIso() });
    }

    return res.status(200).json({ community });
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ message: 'Método não permitido' });
}
