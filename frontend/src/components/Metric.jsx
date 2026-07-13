export default function Metric({ label, value, note, icon: Icon, trend }) {
  return (
    <article className="metric">
      <div className="metric-icon"><Icon size={20} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {trend && <small className={`trend ${trend > 0 ? 'up' : 'down'}`}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%</small>}
        <small>{note}</small>
      </div>
    </article>
  );
}
