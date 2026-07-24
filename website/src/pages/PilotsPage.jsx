import { Section, SectionHeader, StatCard, Button } from '../components/UI';

export default function PilotsPage() {
  return (
    <Section>
      <SectionHeader title="Chikun Climate-Smart Sorghum & Maize Pilot" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 48 }}>
        <StatCard value="200" label="Smallholder Farmers" />
        <StatCard value="10" label="Co-operatives" />
        <StatCard value="₦55M" label="TRIPLE A MFB Facility" />
        <StatCard value="₦25M" label="Inputs via Escrow" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, marginBottom: 48 }}>
        <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', padding: 32 }}>
          <h3 style={{ fontSize: 20, marginBottom: 16 }}>Pilot Details</h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15, color: 'var(--gray)' }}>
            <li><strong>Location:</strong> Chikun LGA, Kaduna State</li>
            <li><strong>Farmers:</strong> 200 Smallholders across 10 Co-operatives</li>
            <li><strong>Crops:</strong> Sorghum and Maize</li>
            <li><strong>Product:</strong> INPUTS FOR HARVESTS</li>
            <li><strong>Value Chain:</strong> Input → Production → Harvest → Offtake to Nigerian Breweries</li>
          </ul>
        </div>

        <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', padding: 32 }}>
          <h3 style={{ fontSize: 20, marginBottom: 16 }}>The Model</h3>
          <ol style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 20, fontSize: 15, color: 'var(--gray)' }}>
            <li><strong>Finance:</strong> ₦55M from TRIPLE A Microfinance Bank.</li>
            <li><strong>Inputs:</strong> ₦25M Escrow for input procurement based on AI Credit Score.</li>
            <li><strong>Training:</strong> Financial literacy + Climate-Smart practices by DBN & KBS.</li>
            <li><strong>Technology:</strong> V4V AI Platform for monitoring, compliance, and reporting.</li>
            <li><strong>Market:</strong> Guaranteed offtake through NB and other aggregators.</li>
          </ol>
        </div>
      </div>

      <div style={{ background: '#1B5E20', color: '#FFFFFF', borderRadius: 'var(--radius-lg)', padding: 40, marginBottom: 40 }}>
        <h3 style={{ fontSize: 22, marginBottom: 24 }}>Impact Targets</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          <div><div style={{ fontSize: 36, fontWeight: 800 }}>0%</div><div style={{ opacity: 0.8, marginTop: 4 }}>Loan Default through escrow and automatic repayment</div></div>
          <div><div style={{ fontSize: 36, fontWeight: 800 }}>40%</div><div style={{ opacity: 0.8, marginTop: 4 }}>Increase in farmer yield</div></div>
          <div><div style={{ fontSize: 36, fontWeight: 800 }}>10</div><div style={{ opacity: 0.8, marginTop: 4 }}>Co-operatives formally registered and bankable</div></div>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontStyle: 'italic', color: 'var(--gray)', marginBottom: 32 }}>
        This pilot is the blueprint for scaling INPUTS FOR HARVESTS to 200,000 farmers.
      </p>

      <div style={{ textAlign: 'center', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button variant="primary">Request Partnership Brief</Button>
        <Button variant="outline-dark" href="/assets/board-summary.pdf">Download Board Summary PDF</Button>
      </div>
    </Section>
  );
}
