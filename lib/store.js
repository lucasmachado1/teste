const globalStore = global.__MOBILE_SOCIAL_STORE__ || {
  users: [],
  posts: [],
  communities: [],
  notifications: [],
  sessions: []
};

global.__MOBILE_SOCIAL_STORE__ = globalStore;

const toPublicUser = (user) => {
  if (!user) return null;
  const { password, ...publicUser } = user;
  return publicUser;
};

const normalizeTag = (tag) => tag.toLowerCase().replace(/^#/, '').trim();

const extractHashtags = (text = '') => {
  const matches = text.match(/#[A-Za-z0-9_À-ÿ]+/g) || [];
  return [...new Set(matches.map(normalizeTag).filter(Boolean))];
};

const nowIso = () => new Date().toISOString();

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const sortPosts = (posts, filter = 'recentes') => {
  const list = [...posts];

  if (filter === 'populares') {
    return list.sort((a, b) => {
      const scoreA = a.likes.length + a.comments.length + a.shares + a.saves.length;
      const scoreB = b.likes.length + b.comments.length + b.shares + b.saves.length;
      return scoreB - scoreA || new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getTrendRanking = () => {
  const trendMap = new Map();

  globalStore.posts.forEach((post) => {
    const engagement = post.likes.length + post.comments.length + post.shares + post.saves.length;
    post.hashtags.forEach((tag) => {
      const current = trendMap.get(tag) || { tag, posts: 0, engagement: 0 };
      current.posts += 1;
      current.engagement += engagement;
      trendMap.set(tag, current);
    });
  });

  return [...trendMap.values()].sort((a, b) => b.engagement - a.engagement || b.posts - a.posts || a.tag.localeCompare(b.tag));
};

module.exports = {
  store: globalStore,
  toPublicUser,
  extractHashtags,
  createId,
  nowIso,
  sortPosts,
  getTrendRanking
};
