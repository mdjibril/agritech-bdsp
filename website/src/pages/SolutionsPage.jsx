import { Section, SectionHeader, Card, Button } from '../components/UI';

export default function SolutionsPage() {
  return (
    <Section>
      <SectionHeader title="Our Products" subtitle="End-to-end infrastructure for agricultural finance" />

      {/* Inputs for Harvests */}
      <div style={{
        background: 'var(--off-white)', borderRadius: 'var(--radius-lg)',
        padding: 40, marginBottom: 32,
      }}>
        <h3 style={{ fontSize: 28, marginBottom: 8 }}>🌾 Inputs for Harvests</h3>
        <p style={{ color: 'var(--gray)', fontSize: 18, marginBottom: 32 }}>
          Give farmers inputs today. Repay with harvest tomorrow.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            { step: '1', title: 'AI Credit Score', desc: 'Assesses farmer capacity and capability.' },
            { step: '2', title: 'Input Delivery', desc: 'Inputs delivered via escrow to verified Suppliers.' },
            { step: '3', title: 'Farm Monitoring', desc: 'V4V + BDSPs monitor farm through season.' },
            { step: '4', title: 'Automatic Repayment', desc: 'Harvest bought by Offtaker. Loan repaid automatically.' },
          ].map(item => (
            <div key={item.step} style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'var(--green-deep)',
                color: 'var(--white)', display: 'grid', placeItems: 'center',
                margin: '0 auto 12px', fontWeight: 800, fontSize: 20,
              }}>
                {item.step}
              </div>
              <strong style={{ display: 'block', marginBottom: 6 }}>{item.title}</strong>
              <span style={{ fontSize: 14, color: 'var(--gray)' }}>{item.desc}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20, fontSize: 14, color: 'var(--gray)' }}>
          <strong>Who it's for:</strong> Smallholder Farmers in Co-operatives.
        </p>
      </div>

      {/* AI Credit Score */}
      <div style={{
        background: 'var(--green-deep)', color: 'var(--white)',
        borderRadius: 'var(--radius-lg)', padding: 40, marginBottom: 32,
      }}>
        <h3 style={{ fontSize: 28, marginBottom: 8 }}>🤖 V4V AI Credit Score</h3>
        <p style={{ fontSize: 18, marginBottom: 32, opacity: 0.85 }}>
          The "Credit Passport" for every farmer.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            { title: 'Satellite Data', desc: 'Farm size, health, and soil quality.' },
            { title: 'Training & Coop', desc: 'Participation in training and cooperative activities.' },
            { title: 'Climate & Yield', desc: 'Risk modeling based on weather and crop type.' },
            { title: 'Repayment History', desc: 'Track record across seasons.' },
          ].map(item => (
            <div key={item.title} style={{ padding: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius)' }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>{item.title}</strong>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{item.desc}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20, fontSize: 14, opacity: 0.8 }}>
          <strong>Result:</strong> Banks can lend, Farmers get bigger limits each season.
        </p>
      </div>

      {/* Platform */}
      <div style={{ textAlign: 'center', padding: 40 }}>
        <h3 style={{ fontSize: 28, marginBottom: 12 }}>The V4V Platform</h3>
        <p style={{ color: 'var(--gray)', fontSize: 16, maxWidth: 600, margin: '0 auto 24px' }}>
          The operating system for agricultural finance — connecting all stakeholders in one ecosystem.
        </p>
        <Button href="https://agritech-bdsp-frontend.onrender.com">Login to Platform</Button>
      </div>
    </Section>
  );
}
