import { store, createId, extractHashtags, nowIso } from '../../../lib/store';

const cleanText = (value = '') => value.toString().trim();

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ posts: store.posts });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { authorId, text, imageUrl, visibility = 'publico', communityId } = req.body || {};
  const body = cleanText(text);
  const image = cleanText(imageUrl);

  if (!body && !image) {
    return res.status(400).json({ message: 'Publique um texto, uma imagem ou os dois.' });
  }

  const author = store.users.find((user) => user.id === authorId);

  if (!author) {
    return res.status(401).json({ message: 'Faça login para publicar.' });
  }

  const post = {
    id: createId('post'),
    authorId: author.id,
    authorName: author.name,
    authorUsername: author.username,
    authorAvatar: author.avatarUrl,
    text: body,
    imageUrl: image,
    visibility,
    communityId: communityId || null,
    hashtags: extractHashtags(body),
    likes: [],
    comments: [],
    shares: 0,
    saves: [],
    reports: [],
    createdAt: nowIso()
  };

  store.posts.unshift(post);

  return res.status(201).json({ post });
}
