import { Section, SectionHeader, Card, StatCard, Button } from '../components/UI';
import PartnerLogos from '../components/PartnerLogos';

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, var(--green-deep) 0%, #0D3B12 100%)',
        color: 'var(--white)', padding: '100px 0 80px', textAlign: 'center',
      }}>
        <div className="container" style={{ maxWidth: 780, margin: '0 auto' }}>
          <p style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
            Climate-Smart. Data-Driven. Farmer-First.
          </p>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', marginBottom: 20 }}>
            V4V AGRITECH SOLUTIONS LTD
          </h1>
          <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: 36 }}>
            We provide AI-powered risk monitoring and financial infrastructure to de-risk lending to smallholder farmers in Nigeria.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="gold" href="/solutions">Our Products</Button>
            <Button variant="outline" href="https://agritech-bdsp-frontend.onrender.com">Login to Platform</Button>
          </div>
        </div>
      </section>

      {/* Problem */}
      <Section light>
        <SectionHeader
          title="The Problem"
          subtitle="80% of Nigerian farmers cannot access affordable credit. Banks see risk. Farmers see opportunity. V4V bridges the gap with data."
        />
      </Section>

      {/* Vision & Mission */}
      <Section>
        <SectionHeader title="Our North Star" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          <Card
            icon="🌍"
            title="Our Vision"
            description="A Climate-Smart Nigeria where every Smallholder Farmer is profitable, bankable and food secure."
          />
          <Card
            icon="🎯"
            title="Our Mission"
            description="To de-risk agriculture and unlock markets for SHFs by combining AI-Driven Climate Smart Data, Access to Finance, and guaranteed Offtake through cooperative structures."
          />
        </div>
      </Section>

      {/* Solutions Summary */}
      <Section light>
        <SectionHeader title="Our Solutions" subtitle="End-to-end infrastructure for agricultural finance" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { icon: '🌾', title: 'Inputs for Harvests', desc: 'Farmers receive inputs based on AI Credit Score. Repayment at harvest through guaranteed offtake.' },
            { icon: '🤖', title: 'Climate-Smart AI Monitoring', desc: 'Satellite + weather + soil data to predict yield and flag risk early.' },
            { icon: '🔒', title: 'Escrow & Payment Infrastructure', desc: 'Funds released to input suppliers, not cash. Every naira tracked.' },
            { icon: '👥', title: 'Cooperative Management', desc: 'Onboard, train, and manage 10+ Co-operatives for group liability and accountability.' },
            { icon: '📦', title: 'Market Offtake Linkage', desc: 'Connect harvest to guaranteed buyers like Nigerian Breweries.' },
          ].map(item => <Card key={item.title} {...item} />)}
        </div>
      </Section>

      {/* Platform Features */}
      <Section>
        <SectionHeader title="The V4V Marketplace & Data Platform" subtitle="A digital platform connecting Farmers, Coops, Banks, Input Suppliers, Offtakers, BDSPs and Investors in one ecosystem." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {[
            'AI Credit Scoring: Every farmer gets a V4V Credit Passport (300-850)',
            'Digital Onboarding: Farmers and Co-operatives register in minutes',
            'Loan & Input Tracking: Real-time disbursement and repayment monitoring',
            'Escrow Management: Payments go directly to input suppliers',
            'AI Risk Dashboard: Climate, yield, and compliance monitoring',
            'Market Linkage: Offtakers place orders directly on the platform',
            'BDSP Network: Manage V4V and external BDSPs for training at scale',
            'M&E Reporting: Automated reports for DBN, KBS, IFAD, IFC',
            'Investor Dashboard: Real-time impact, financial, and ESG reporting',
          ].map((feature, i) => (
            <div key={i} style={{ padding: 16, background: 'var(--off-white)', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600 }}>
              ✓ {feature}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Button href="https://agritech-bdsp-frontend.onrender.com">Login to V4V Platform</Button>
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--gray)' }}>Demo access available for partners</p>
        </div>
      </Section>

      {/* Pilot */}
      <Section dark>
        <SectionHeader title="Chikun 200-Farmer Pilot" subtitle="Proving that AI + escrow + offtake = 0% default lending to Smallholders." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 36 }}>
          <StatCard value="200" label="Smallholder Farmers" />
          <StatCard value="10" label="Co-operatives" />
          <StatCard value="₦55M" label="Facility with TRIPLE A MFB" />
          <StatCard value="₦25M" label="Inputs Disbursed via Escrow" />
        </div>
        <div style={{ textAlign: 'center', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="gold" href="/pilots">Learn More</Button>
          <Button variant="outline" href="/assets/board-summary.pdf">Download Board Summary PDF</Button>
        </div>
      </Section>

      {/* Investors */}
      <Section>
        <SectionHeader title="For Investors" subtitle="De-risk Smallholder lending using AI, Data, and Partnerships." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
          {[
            { title: 'Proven Product', desc: 'INPUTS FOR HARVESTS pilot with TRIPLE A MFB + DBN + KBS.' },
            { title: 'Scalable', desc: 'AI Credit Score + BDSP network scales to 200,000 farmers.' },
            { title: 'Impact', desc: '40% yield increase, 0% default target, poverty reduction.' },
            { title: 'Data', desc: 'Full transparency on loan performance and farmer outcomes.' },
          ].map(item => <Card key={item.title} {...item} />)}
        </div>
        <div style={{ textAlign: 'center' }}>
          <Button variant="outline-dark" href="/investors">Request Investor Brief</Button>
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--gray)' }}>Pitch Deck and Data Room available</p>
        </div>
      </Section>

      {/* Partners */}
      <Section light>
        <SectionHeader title="Our Partners" subtitle="Trusted by leading institutions" />
        <PartnerLogos names={[
          'TRIPLE A Microfinance Bank',
          'Development Bank of Nigeria',
          'Kaduna Business School',
          'Nigerian Breweries',
        ]} />
        <p style={{ textAlign: 'center', color: 'var(--gray)', fontSize: 14 }}>
          In discussions with: IFAD, IFC, AGRA, SMEDAN
        </p>
      </Section>

      {/* Footer CTA */}
      <Section dark>
        <SectionHeader title="Ready to de-risk agriculture with us?" />
        <div style={{ textAlign: 'center' }}>
          <Button variant="gold" href="/contact">Contact Us</Button>
        </div>
      </Section>
    </>
  );
}
