import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--dark)', color: 'var(--white)', padding: '64px 0 32px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 12 }}>V4V Agritech</h3>
            <p style={{ color: 'var(--gray-light)', fontSize: 14, lineHeight: 1.7 }}>
              Climate-Smart. Data-Driven. Farmer-First.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: 14, marginBottom: 12, color: 'var(--gold)' }}>Quick Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
              {['About', 'Solutions', 'Pilots', 'Platform', 'Investors', 'Contact'].map(l => (
                <Link key={l} to={`/${l.toLowerCase()}`} style={{ color: 'var(--gray-light)' }}>{l}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 14, marginBottom: 12, color: 'var(--gold)' }}>Contact</h4>
            <div style={{ fontSize: 14, color: 'var(--gray-light)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span>RSQ 049, Pipeline Close, Kamazou</span>
              <span>Kaduna State, Nigeria</span>
              <span>+234 810 252 9947</span>
              <span>phillip.makama@v4vagritech.com</span>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 14, marginBottom: 12, color: 'var(--gold)' }}>Platform</h4>
            <a href="https://agritech-bdsp-frontend.onrender.com" className="btn btn-gold btn-sm">
              Login to Platform
            </a>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--gray-light)' }}>
          &copy; {new Date().getFullYear()} V4V Agritech Solutions Ltd — RC: 9673943. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
