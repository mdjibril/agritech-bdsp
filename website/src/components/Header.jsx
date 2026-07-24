import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function Header() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/solutions', label: 'Solutions' },
    { to: '/pilots', label: 'Pilots' },
    { to: '/platform', label: 'Platform' },
    { to: '/investors', label: 'Investors' },
    { to: '/partners', label: 'Partners' },
    { to: '/contact', label: 'Contact' },
  ];

  const linkStyle = (to) => ({
    padding: '8px 12px', borderRadius: 6, fontSize: 14, fontWeight: 600,
    color: pathname === to ? 'var(--green-deep)' : 'var(--gray)',
    background: pathname === to ? 'var(--off-white)' : 'transparent',
    display: 'block',
  });

  return (
    <header style={{
      background: 'var(--white)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div className="container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 72, gap: 24,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 20, color: 'var(--green-deep)', fontFamily: 'var(--font)' }}>
          <img src="/assets/v4v-logo.png" alt="V4V Agritech" style={{ height: 40, width: 'auto' }} />
          V4V AGRITECH
        </Link>

        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={linkStyle(to)} onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>

        <a
          href="https://app.v4vagritech.com.ng"
          className="btn btn-primary btn-sm desktop-nav"
          style={{ whiteSpace: 'nowrap' }}
        >
          Login
        </a>

        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'none', background: 'none', border: 'none',
            fontSize: 28, color: 'var(--green-deep)', padding: 4, lineHeight: 1,
          }}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-nav" style={{
          display: 'none',
          background: 'var(--white)', borderTop: '1px solid var(--border)',
          padding: '12px 16px',
        }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={{ ...linkStyle(to), padding: '12px 16px' }} onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}
          <div style={{ padding: '12px 16px' }}>
            <a href="https://app.v4vagritech.com.ng" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              Login
            </a>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .mobile-nav { display: block !important; }
        }
      `}</style>
    </header>
  );
}
