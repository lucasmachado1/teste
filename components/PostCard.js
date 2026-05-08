const formatCount = (count) => (count > 99 ? '99+' : count);

export default function PostCard({ post, onAction, onOpenHashtag }) {
  const renderText = () => {
    if (!post.text) return null;
    return post.text.split(/(#[A-Za-z0-9_À-ÿ]+)/g).map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <button className="inlineHashtag" key={`${part}-${index}`} onClick={() => onOpenHashtag(part.slice(1))} type="button">
            {part}
          </button>
        );
      }
      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };

  return (
    <article className="postCard">
      <header className="postHeader">
        <div className="avatar">{post.authorAvatar ? <img src={post.authorAvatar} alt="" /> : post.authorName.charAt(0)}</div>
        <div>
          <strong>{post.authorName}</strong>
          <span>@{post.authorUsername} · {new Date(post.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>
        <button className="ghostButton compact" onClick={() => onAction(post.id, 'report')} type="button">Denunciar</button>
      </header>
      {post.text && <p className="postText">{renderText()}</p>}
      {post.imageUrl && <img className="postImage" src={post.imageUrl} alt="Imagem da publicação" />}
      <footer className="postActions">
        <button onClick={() => onAction(post.id, 'like')} type="button">♥ {formatCount(post.likes.length)}</button>
        <button onClick={() => onAction(post.id, 'comment')} type="button">💬 {formatCount(post.comments.length)}</button>
        <button onClick={() => onAction(post.id, 'share')} type="button">↗ {formatCount(post.shares)}</button>
        <button onClick={() => onAction(post.id, 'save')} type="button">🔖 {formatCount(post.saves.length)}</button>
      </footer>
    </article>
  );
}
