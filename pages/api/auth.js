import { store, createId, nowIso, toPublicUser } from '../../lib/store';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { mode, name = '', username = '', email = '', password = '' } = req.body || {};

  if (mode === 'register') {
    const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!name.trim() || !normalizedUsername || !email.trim() || password.length < 6) {
      return res.status(400).json({ message: 'Preencha nome, usuário, e-mail e senha com pelo menos 6 caracteres.' });
    }

    if (store.users.some((user) => user.username === normalizedUsername || user.email === email.trim().toLowerCase())) {
      return res.status(409).json({ message: 'Usuário ou e-mail já cadastrado.' });
    }

    const user = {
      id: createId('user'),
      name: name.trim(),
      username: normalizedUsername,
      email: email.trim().toLowerCase(),
      password,
      bio: '',
      avatarUrl: '',
      coverUrl: '',
      followers: [],
      following: [],
      blockedUsers: [],
      privacy: { privateProfile: false, mentions: 'todos', messages: 'seguindo' },
      createdAt: nowIso()
    };

    store.users.push(user);
    return res.status(201).json({ user: toPublicUser(user) });
  }

  const foundUser = store.users.find((user) => user.email === email.trim().toLowerCase() && user.password === password);

  if (!foundUser) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }

  return res.status(200).json({ user: toPublicUser(foundUser) });
}
