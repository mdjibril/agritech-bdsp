export function Button({ children, variant = 'primary', size, href, className = '', ...props }) {
  const Tag = href ? 'a' : 'button';
  const classes = [
    'btn',
    variant === 'primary' ? 'btn-primary' :
    variant === 'gold' ? 'btn-gold' :
    variant === 'outline' ? 'btn-outline' :
    variant === 'outline-dark' ? 'btn-outline-dark' : '',
    size === 'sm' ? 'btn-sm' : '',
    className,
  ].filter(Boolean).join(' ');

  return <Tag className={classes} href={href} {...props}>{children}</Tag>;
}

export function Section({ children, dark, light, className = '' }) {
  const classes = [
    'section',
    dark ? 'section-dark' : '',
    light ? 'section-light' : '',
    className,
  ].filter(Boolean).join(' ');
  return <section className={classes}><div className="container">{children}</div></section>;
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

export function Card({ icon, title, description, children }) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 'var(--radius-lg)',
      padding: 32, boxShadow: 'var(--shadow)',
      display: 'flex', flexDirection: 'column', gap: 16,
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
    >
      {icon && <div style={{ width: 48, height: 48, background: 'var(--off-white)', borderRadius: 'var(--radius)', display: 'grid', placeItems: 'center', color: 'var(--green-deep)', fontSize: 24 }}>{icon}</div>}
      {title && <h3 style={{ fontSize: 20 }}>{title}</h3>}
      {description && <p style={{ color: 'var(--gray)', fontSize: 15, lineHeight: 1.7, flex: 1 }}>{description}</p>}
      {children}
    </div>
  );
}

export function StatCard({ value, label }) {
  return (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: 'var(--green-deep)', marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 14, color: 'var(--gray)', fontWeight: 600 }}>{label}</div>
    </div>
  );
}
