import { store, getTrendRanking, toPublicUser } from '../../../lib/store';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const query = (req.query.q || '').toString().toLowerCase().trim();
  const trends = getTrendRanking();

  if (!query) {
    return res.status(200).json({ users: [], posts: [], hashtags: trends, communities: [] });
  }

  return res.status(200).json({
    users: store.users.filter((user) => `${user.name} ${user.username}`.toLowerCase().includes(query)).map(toPublicUser),
    posts: store.posts.filter((post) => `${post.text} ${post.hashtags.join(' ')}`.toLowerCase().includes(query)),
    hashtags: trends.filter((trend) => trend.tag.includes(query.replace('#', ''))),
    communities: store.communities.filter((community) => `${community.name} ${community.description}`.toLowerCase().includes(query))
  });
}
