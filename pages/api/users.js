import { store, toPublicUser } from '../../lib/store';

export default function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { action, userId, targetId } = req.body || {};
  const user = store.users.find((item) => item.id === userId);
  const target = store.users.find((item) => item.id === targetId);

  if (!user || !target) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  if (action === 'follow') {
    const alreadyFollowing = user.following.includes(target.id);
    user.following = alreadyFollowing ? user.following.filter((id) => id !== target.id) : [...user.following, target.id];
    target.followers = alreadyFollowing ? target.followers.filter((id) => id !== user.id) : [...target.followers, user.id];
  }

  if (action === 'block') {
    user.blockedUsers = user.blockedUsers.includes(target.id)
      ? user.blockedUsers.filter((id) => id !== target.id)
      : [...user.blockedUsers, target.id];
  }

  return res.status(200).json({ user: toPublicUser(user), target: toPublicUser(target) });
}
