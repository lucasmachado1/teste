import { useMemo, useState } from 'react';
import EmptyState from './EmptyState';
import PostCard from './PostCard';

const suggestions = ['mobilefirst', 'imagem', 'texto', 'comunidade', 'criadores'];

export default function CreatePost({ user, communities, onPublished }) {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewFile, setPreviewFile] = useState('');
  const [visibility, setVisibility] = useState('publico');
  const [communityId, setCommunityId] = useState('');
  const [status, setStatus] = useState('');

  const previewPost = useMemo(() => ({
    id: 'preview',
    authorName: user ? user.name : 'Você',
    authorUsername: user ? user.username : 'seu_usuario',
    authorAvatar: user ? user.avatarUrl : '',
    text,
    imageUrl: previewFile || imageUrl,
    likes: [],
    comments: [],
    shares: 0,
    saves: [],
    createdAt: new Date().toISOString()
  }), [text, imageUrl, previewFile, user]);

  const handleFile = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreviewFile(reader.result);
    reader.readAsDataURL(file);
  };

  const publish = async () => {
    if (!user) {
      setStatus('Faça login ou cadastro antes de publicar.');
      return;
    }

    setStatus('Publicando...');
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorId: user && user.id, text, imageUrl: previewFile || imageUrl, visibility, communityId })
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.message || 'Não foi possível publicar.');
      return;
    }

    setText('');
    setImageUrl('');
    setPreviewFile('');
    setCommunityId('');
    setStatus('Publicado com sucesso.');
    onPublished(data.post);
  };

  return (
    <section className="screen createScreen">
      <div className="sectionTitle">
        <span>Novo post</span>
        <h1>Crie algo memorável</h1>
      </div>
      <label className="fieldLabel">Texto</label>
      <textarea className="composerInput" value={text} onChange={(event) => setText(event.target.value)} placeholder="Compartilhe uma ideia, história ou pergunta... Use #hashtags." />

      <div className="uploadCard">
        <label>
          <input accept="image/*" onChange={handleFile} type="file" />
          <span>Enviar imagem com preview</span>
        </label>
        <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="ou cole a URL da imagem" />
      </div>

      <div className="chipRow">
        {suggestions.map((tag) => (
          <button key={tag} onClick={() => setText((current) => `${current}${current ? ' ' : ''}#${tag}`)} type="button">#{tag}</button>
        ))}
      </div>

      <div className="segmented three">
        {['publico', 'seguidores', 'comunidade'].map((item) => (
          <button className={visibility === item ? 'selected' : ''} key={item} onClick={() => setVisibility(item)} type="button">{item}</button>
        ))}
      </div>

      {visibility === 'comunidade' && (
        <select className="selectField" value={communityId} onChange={(event) => setCommunityId(event.target.value)}>
          <option value="">Escolha uma comunidade</option>
          {communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
        </select>
      )}

      <h2 className="miniTitle">Preview</h2>
      {text || imageUrl || previewFile ? <PostCard post={previewPost} onAction={() => {}} onOpenHashtag={() => {}} /> : <EmptyState title="Preview vazio" description="Digite um texto ou adicione uma imagem para visualizar antes de publicar." />}
      {status && <p className="statusText">{status}</p>}
      <div className="publishDock"><button className="primaryButton" onClick={publish} type="button">Publicar agora</button></div>
    </section>
  );
}
