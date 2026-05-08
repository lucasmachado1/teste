import { store, sortPosts, getTrendRanking } from '../../lib/store';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { filter = 'recentes', userId } = req.query;
  const visiblePosts = filter === 'seguindo' && userId
    ? store.posts.filter((post) => {
        const owner = store.users.find((user) => user.id === post.authorId);
        return owner && owner.followers.includes(userId);
      })
    : store.posts;

  return res.status(200).json({
    posts: sortPosts(visiblePosts, filter),
    trends: getTrendRanking(),
    filters: ['recentes', 'populares', 'seguindo']
  });
}
