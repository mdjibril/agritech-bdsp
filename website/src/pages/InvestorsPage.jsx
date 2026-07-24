import { Section, SectionHeader, Card, Button } from '../components/UI';

export default function InvestorsPage() {
  return (
    <Section>
      <SectionHeader
        title="Partner With Us to Scale"
        subtitle="V4V is building the infrastructure to unlock ₦100B for African farmers."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, marginBottom: 48 }}>
        <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', padding: 32 }}>
          <h3 style={{ fontSize: 22, marginBottom: 16 }}>Investment Opportunity</h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 15, color: 'var(--gray)' }}>
            <li>Seed/Series A for INPUTS FOR HARVESTS platform scale.</li>
            <li>Co-investment in pilot facilities with TRIPLE A MFB.</li>
            <li>Impact-first capital with measurable returns.</li>
          </ul>
        </div>

        <div style={{ background: 'var(--green-deep)', color: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: 32 }}>
          <h3 style={{ fontSize: 22, marginBottom: 16 }}>What You Get</h3>
          <ol style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 20, fontSize: 15 }}>
            <li>Access to Investor Dashboard with real-time portfolio data.</li>
            <li>Quarterly Impact + Financial Reports.</li>
            <li>Co-branding on national scale pilots.</li>
          </ol>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 40 }}>
        {[
          { title: 'Proven Product', desc: 'INPUTS FOR HARVESTS pilot with TRIPLE A MFB + DBN + KBS.' },
          { title: 'Scalable', desc: 'AI Credit Score + BDSP network scales to 200,000 farmers.' },
          { title: 'Impact', desc: '40% yield increase, 0% default target, poverty reduction.' },
          { title: 'Data', desc: 'Full transparency on loan performance and farmer outcomes.' },
        ].map(item => <Card key={item.title} {...item} />)}
      </div>

      <div style={{ textAlign: 'center', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button variant="primary">Download Pitch Deck</Button>
        <Button variant="outline-dark" href="/contact">Book Investor Call</Button>
      </div>
    </Section>
  );
}
