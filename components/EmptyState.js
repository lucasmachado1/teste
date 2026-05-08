export default function EmptyState({ title, description, action }) {
  return (
    <section className="emptyState">
      <div className="emptyOrb">✦</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </section>
  );
}
