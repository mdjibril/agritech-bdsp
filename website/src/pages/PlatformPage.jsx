import { Section, SectionHeader, Card, Button } from '../components/UI';

export default function PlatformPage() {
  const roles = [
    { title: 'Farmer', desc: 'Join a cooperative and access inputs + credit.' },
    { title: 'Cooperative Leader', desc: 'Manage your members and group loan.' },
    { title: 'Lender / Bank', desc: 'De-risk your agricultural portfolio with real-time data.' },
    { title: 'Input Supplier', desc: 'Get paid faster through escrow.' },
    { title: 'Offtaker', desc: 'Secure your supply chain with verified farmers.' },
    { title: 'Technical Partner', desc: 'DBN, KBS: Deliver training and monitor impact.' },
    { title: 'V4V BDSP', desc: 'V4V Field Agent: Onboard Co-operatives and deliver training.' },
    { title: 'BDSP Partner', desc: 'External BDS Provider: Use V4V tools to serve farmers.' },
    { title: 'Investor', desc: 'Track impact, risk, and co-investment opportunities.' },
    { title: 'Admin', desc: 'V4V Team: Manage platform, data, and operations.' },
  ];

  return (
    <Section>
      <SectionHeader
        title="Join the V4V Ecosystem"
        subtitle="V4V is more than a pilot. It's a platform. Select your role below to request access."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
        {roles.map((r, i) => (
          <Card key={i} title={r.title} description={r.desc} />
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <Button variant="primary" href="/contact">Request Platform Access</Button>
        <p style={{ marginTop: 12, fontSize: 14, color: 'var(--gray)' }}>
          Already have an account? <a href="https://agritech-bdsp-frontend.onrender.com" style={{ color: 'var(--green-deep)', fontWeight: 600 }}>Login Here</a>
        </p>
      </div>
    </Section>
  );
}
