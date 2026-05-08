import { store, toPublicUser } from '../../lib/store';

export default function handler(req, res) {
  const { username, userId } = req.query;
  const user = username
    ? store.users.find((item) => item.username === username)
    : store.users.find((item) => item.id === userId);

  if (!user) {
    return res.status(200).json({ user: null, posts: [], savedPosts: [] });
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      user: toPublicUser(user),
      posts: store.posts.filter((post) => post.authorId === user.id),
      savedPosts: store.posts.filter((post) => post.saves.includes(user.id))
    });
  }

  if (req.method === 'PATCH') {
    const { name, bio, avatarUrl, coverUrl, privacy } = req.body || {};
    if (name !== undefined) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl.trim();
    if (coverUrl !== undefined) user.coverUrl = coverUrl.trim();
    if (privacy) user.privacy = { ...user.privacy, ...privacy };
    return res.status(200).json({ user: toPublicUser(user) });
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).json({ message: 'Método não permitido' });
}
