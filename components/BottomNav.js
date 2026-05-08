import IconButton from './IconButton';

const items = [
  ['feed', '⌂', 'Início'],
  ['explore', '⌕', 'Explorar'],
  ['create', '＋', 'Criar'],
  ['communities', '◌', 'Comunidades'],
  ['profile', '☺', 'Perfil']
];

export default function BottomNav({ current, onNavigate }) {
  return (
    <nav className="bottomNav" aria-label="Navegação principal mobile">
      {items.map(([id, icon, label]) => (
        <IconButton key={id} icon={icon} label={label} active={current === id} onClick={() => onNavigate(id)} />
      ))}
    </nav>
  );
}
