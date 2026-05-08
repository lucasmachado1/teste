export default function SideMenu({ open, onClose, theme, onToggleTheme }) {
  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sideMenu ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="menuHandle" />
        <h2>Orbitext</h2>
        <p>Rede mobile para textos, imagens, hashtags e comunidades reais.</p>
        <button className="menuItem" type="button">🔔 Notificações</button>
        <button className="menuItem" type="button">🛡️ Privacidade</button>
        <button className="menuItem" type="button">🚫 Usuários bloqueados</button>
        <button className="menuItem" onClick={onToggleTheme} type="button">{theme === 'dark' ? '☀️ Tema claro' : '🌙 Tema escuro'}</button>
        <button className="primaryButton" onClick={onClose} type="button">Fechar menu</button>
      </aside>
    </>
  );
}
