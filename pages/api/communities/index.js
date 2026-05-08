import { store, createId, nowIso } from '../../../lib/store';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const communities = [...store.communities].sort((a, b) => b.members.length - a.members.length || new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json({ communities });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { ownerId, name = '', imageUrl = '', description = '', rules = '' } = req.body || {};

  if (!name.trim() || !description.trim()) {
    return res.status(400).json({ message: 'Informe nome e descrição da comunidade.' });
  }

  if (!ownerId || !store.users.some((user) => user.id === ownerId)) {
    return res.status(401).json({ message: 'Faça login para criar comunidades.' });
  }

  const community = {
    id: createId('community'),
    ownerId,
    name: name.trim(),
    imageUrl: imageUrl.trim(),
    description: description.trim(),
    rules: rules.split('\n').map((rule) => rule.trim()).filter(Boolean),
    members: [ownerId],
    admins: [ownerId],
    moderators: [],
    topics: [],
    createdAt: nowIso()
  };

  store.communities.unshift(community);
  return res.status(201).json({ community });
}
