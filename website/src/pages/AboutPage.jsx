import { Section, SectionHeader, Card } from '../components/UI';

export default function AboutPage() {
  return (
    <>
      <Section>
        <SectionHeader title="Building the Financial Rails for African Agriculture" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 48 }}>
          <Card icon="🌍" title="Our Vision" description="A Climate-Smart Nigeria where every Smallholder Farmer is profitable, bankable and food secure." />
          <Card icon="🎯" title="Our Mission" description="De-risk agriculture and unlock markets for SHFs by combining AI-Driven Climate Smart Data, Access to Finance, and guaranteed Offtake through cooperative structures." />
        </div>

        <div style={{ maxWidth: 780, margin: '0 auto 64px', fontSize: 17, lineHeight: 1.8, color: 'var(--gray)' }}>
          <p style={{ marginBottom: 20 }}>
            V4V Agritech Solutions Ltd was founded to solve one problem: Banks don't lend to Smallholder Farmers because they can't see the risk. We change that.
          </p>
          <p style={{ marginBottom: 20 }}>
            Using AI Credit Scoring, real-time data, and cooperative structures, V4V creates a "credit passport" for every farmer. This allows banks like TRIPLE A and development institutions like DBN to lend with confidence through our INPUTS FOR HARVESTS product.
          </p>
          <p>
            Our goal is to unlock ₦100 Billion in agricultural lending and lift 200,000 farmers out of poverty by 2030.
          </p>
        </div>

        <SectionHeader title="Our Values" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 64 }}>
          {[
            { title: 'Farmer-First', desc: 'Every product must increase farmer income.' },
            { title: 'Data Integrity', desc: 'What we measure, we can finance.' },
            { title: 'Partnership', desc: 'We win when banks, government, and farmers win.' },
          ].map(v => <Card key={v.title} {...v} />)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', padding: 40 }}>
          <img
            src="/assets/founder.png"
            alt="Makama Phillip Shehu"
            style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', flex: 'none' }}
          />
          <div style={{ flex: 1, minWidth: 260 }}>
            <h3 style={{ fontSize: 24, marginBottom: 12 }}>Makama Phillip Shehu</h3>
            <p style={{ color: 'var(--gray)', fontSize: 15, lineHeight: 1.7 }}>
              Phillip is an Agribusiness and Development Finance Professional committed to de-risking agriculture for Smallholder Farmers. He leads V4V Agritech to build the financial and data infrastructure that makes every SHF profitable, bankable, and food secure.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
