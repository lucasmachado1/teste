import { useEffect, useMemo, useState } from 'react';
import AuthPanel from '../components/AuthPanel';
import BottomNav from '../components/BottomNav';
import CreatePost from '../components/CreatePost';
import EmptyState from '../components/EmptyState';
import PostCard from '../components/PostCard';
import SideMenu from '../components/SideMenu';

function FeedScreen({ posts, trends, filter, setFilter, onAction, onOpenHashtag, loading }) {
  return (
    <section className="screen">
      <div className="heroCard">
        <span>100% mobile</span>
        <h1>Textos, imagens e comunidades em uma experiência de app nativo.</h1>
        <p>Sem dados fake: o feed nasce vazio e ganha vida com publicações reais criadas pelo backend do projeto.</p>
      </div>
      <div className="segmented three stickyFilter">
        {['recentes', 'populares', 'seguindo'].map((item) => <button className={filter === item ? 'selected' : ''} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}
      </div>
      {trends.length > 0 && <TrendRail trends={trends} onOpenHashtag={onOpenHashtag} />}
      {loading ? <EmptyState title="Carregando feed" description="Buscando publicações no backend." /> : posts.length === 0 ? <EmptyState title="Nenhuma publicação ainda" description="Crie a primeira publicação com texto, imagem, visibilidade e hashtags reais." /> : posts.map((post) => <PostCard key={post.id} post={post} onAction={onAction} onOpenHashtag={onOpenHashtag} />)}
    </section>
  );
}

function TrendRail({ trends, onOpenHashtag }) {
  return (
    <section className="trendRail">
      <div className="railHeader"><strong>Trends do momento</strong><span>por engajamento</span></div>
      <div className="chipRow scrollX">
        {trends.slice(0, 8).map((trend, index) => <button key={trend.tag} onClick={() => onOpenHashtag(trend.tag)} type="button">#{trend.tag} <small>#{index + 1}</small></button>)}
      </div>
    </section>
  );
}

function ExploreScreen({ query, setQuery, searchResults, onOpenHashtag }) {
  const hasResults = searchResults.users.length || searchResults.posts.length || searchResults.hashtags.length || searchResults.communities.length;
  return (
    <section className="screen">
      <div className="sectionTitle"><span>Explorar</span><h1>Busca inteligente</h1></div>
      <input className="searchBox" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque usuários, posts, #hashtags e comunidades" />
      {!hasResults ? <EmptyState title="Nada para mostrar" description="Pesquise conteúdos reais cadastrados nesta instância." /> : (
        <div className="resultStack">
          {searchResults.hashtags.map((trend) => <button className="resultCard" key={trend.tag} onClick={() => onOpenHashtag(trend.tag)} type="button"># {trend.tag}<span>{trend.posts} posts · {trend.engagement} engajamentos</span></button>)}
          {searchResults.users.map((user) => <article className="resultCard" key={user.id}>{user.name}<span>@{user.username}</span></article>)}
          {searchResults.communities.map((community) => <article className="resultCard" key={community.id}>{community.name}<span>{community.members.length} membros</span></article>)}
          {searchResults.posts.map((post) => <article className="resultCard" key={post.id}>{post.text || 'Post com imagem'}<span>@{post.authorUsername}</span></article>)}
        </div>
      )}
    </section>
  );
}

function CommunitiesScreen({ communities, user, onRefresh }) {
  const [form, setForm] = useState({ name: '', imageUrl: '', description: '', rules: '' });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const createCommunity = async () => {
    const response = await fetch('/api/communities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ownerId: user && user.id })
    });
    if (response.ok) {
      setForm({ name: '', imageUrl: '', description: '', rules: '' });
      onRefresh();
    }
  };
  const membership = async (id) => {
    await fetch(`/api/communities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'membership', userId: user && user.id }) });
    onRefresh();
  };

  return (
    <section className="screen">
      <div className="sectionTitle"><span>Orkut vibes</span><h1>Comunidades mobile</h1></div>
      <div className="communityCreator">
        <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Nome da comunidade" />
        <input value={form.imageUrl} onChange={(event) => update('imageUrl', event.target.value)} placeholder="URL da imagem" />
        <textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Descrição" />
        <textarea value={form.rules} onChange={(event) => update('rules', event.target.value)} placeholder="Regras, uma por linha" />
        <button className="primaryButton" onClick={createCommunity} type="button">Criar comunidade</button>
      </div>
      <h2 className="miniTitle">Populares</h2>
      {communities.length === 0 ? <EmptyState title="Sem comunidades" description="Crie uma comunidade real para iniciar tópicos, membros e moderação." /> : communities.map((community) => (
        <article className="communityCard" key={community.id}>
          <div className="communityImage">{community.imageUrl ? <img src={community.imageUrl} alt="" /> : '◌'}</div>
          <div><strong>{community.name}</strong><p>{community.description}</p><span>{community.members.length} membros · {community.admins.length} admins · {community.moderators.length} mods</span></div>
          <button className="ghostButton" onClick={() => membership(community.id)} type="button">{community.members.includes(user && user.id) ? 'Sair' : 'Entrar'}</button>
        </article>
      ))}
    </section>
  );
}

function ProfileScreen({ user, setUser, posts }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user || { name: '', bio: '', avatarUrl: '', coverUrl: '' });

  useEffect(() => setDraft(user || { name: '', bio: '', avatarUrl: '', coverUrl: '' }), [user]);

  if (!user) {
    return <section className="screen"><div className="sectionTitle"><span>Perfil</span><h1>Entre para liberar seu perfil</h1></div><AuthPanel onAuth={setUser} /></section>;
  }

  const save = async () => {
    const response = await fetch(`/api/profile?userId=${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    const data = await response.json();
    setUser(data.user);
    setEditing(false);
  };

  return (
    <section className="screen">
      <div className="profileHero">
        <div className="cover">{user.coverUrl && <img src={user.coverUrl} alt="" />}</div>
        <div className="profileAvatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.charAt(0)}</div>
        <h1>{user.name}</h1><span>@{user.username}</span><p>{user.bio || 'Bio ainda não preenchida.'}</p>
        <div className="profileStats"><strong>{user.followers.length}</strong><span>seguidores</span><strong>{user.following.length}</strong><span>seguindo</span></div>
        <button className="primaryButton" onClick={() => setEditing(!editing)} type="button">Editar perfil</button>
      </div>
      {editing && <div className="editPanel"><input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nome" /><input value={draft.avatarUrl || ''} onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })} placeholder="Foto de perfil" /><input value={draft.coverUrl || ''} onChange={(e) => setDraft({ ...draft, coverUrl: e.target.value })} placeholder="Capa" /><textarea value={draft.bio || ''} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="Bio" /><button className="primaryButton" onClick={save} type="button">Salvar</button></div>}
      <h2 className="miniTitle">Posts do usuário</h2>
      {posts.filter((post) => post.authorId === user.id).length === 0 ? <EmptyState title="Sem posts próprios" description="Suas publicações aparecerão aqui." /> : posts.filter((post) => post.authorId === user.id).map((post) => <PostCard key={post.id} post={post} onAction={() => {}} onOpenHashtag={() => {}} />)}
      <h2 className="miniTitle">Posts salvos</h2>
      {posts.filter((post) => post.saves.includes(user.id)).length === 0 && <EmptyState title="Nada salvo" description="Salve posts para consultar depois." />}
    </section>
  );
}

function HashtagScreen({ tag, posts, trends, onBack, onAction }) {
  const related = posts.filter((post) => post.hashtags.includes(tag));
  return <section className="screen"><button className="ghostButton" onClick={onBack} type="button">← Voltar</button><div className="sectionTitle"><span>Hashtag</span><h1>#{tag}</h1></div><TrendRail trends={trends} onOpenHashtag={() => {}} />{related.length ? related.map((post) => <PostCard key={post.id} post={post} onAction={onAction} onOpenHashtag={() => {}} />) : <EmptyState title="Sem posts relacionados" description="Publique usando esta hashtag para aparecer aqui." />}</section>;
}

export default function Home() {
  const [current, setCurrent] = useState('feed');
  const [filter, setFilter] = useState('recentes');
  const [posts, setPosts] = useState([]);
  const [trends, setTrends] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], posts: [], hashtags: [], communities: [] });
  const [hashtag, setHashtag] = useState('');

  const loadFeed = async () => {
    setLoading(true);
    const response = await fetch(`/api/feed?filter=${filter}${user ? `&userId=${user.id}` : ''}`);
    const data = await response.json();
    setPosts(data.posts || []);
    setTrends(data.trends || []);
    setLoading(false);
  };

  const loadCommunities = async () => {
    const response = await fetch('/api/communities');
    const data = await response.json();
    setCommunities(data.communities || []);
  };

  useEffect(() => { loadFeed(); }, [filter, user && user.id]);
  useEffect(() => { loadCommunities(); }, []);
  useEffect(() => {
    const run = async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      setSearchResults(await response.json());
    };
    run();
  }, [query, posts.length]);

  const onAction = async (postId, action) => {
    await fetch(`/api/posts/${postId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, userId: user ? user.id : 'anonymous', comment: action === 'comment' ? 'Comentário rápido mobile' : '' }) });
    loadFeed();
  };

  const view = useMemo(() => {
    if (hashtag) return <HashtagScreen tag={hashtag} posts={posts} trends={trends} onBack={() => setHashtag('')} onAction={onAction} />;
    if (current === 'explore') return <ExploreScreen query={query} setQuery={setQuery} searchResults={searchResults} onOpenHashtag={setHashtag} />;
    if (current === 'create') return <CreatePost user={user} communities={communities} onPublished={() => { loadFeed(); setCurrent('feed'); }} />;
    if (current === 'communities') return <CommunitiesScreen communities={communities} user={user} onRefresh={loadCommunities} />;
    if (current === 'profile') return <ProfileScreen user={user} setUser={setUser} posts={posts} />;
    return <FeedScreen posts={posts} trends={trends} filter={filter} setFilter={setFilter} onAction={onAction} onOpenHashtag={setHashtag} loading={loading} />;
  }, [current, posts, trends, filter, loading, communities, user, query, searchResults, hashtag]);

  return (
    <main className={`appShell ${theme}`}>
      <div className="phoneFrame">
        <header className="topBar"><button className="menuButton" onClick={() => setMenuOpen(true)} type="button">☰</button><strong>Orbitext</strong><button className="notifButton" type="button">🔔</button></header>
        <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
        <div className="contentArea">{view}</div>
        <BottomNav current={current} onNavigate={(target) => { setHashtag(''); setCurrent(target); }} />
      </div>
    </main>
  );
}
