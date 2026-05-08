export default function IconButton({ icon, label, active, onClick }) {
  return (
    <button className={`iconButton ${active ? 'isActive' : ''}`} onClick={onClick} type="button" aria-label={label}>
      <span>{icon}</span>
      <small>{label}</small>
    </button>
  );
}
