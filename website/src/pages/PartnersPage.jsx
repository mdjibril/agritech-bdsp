import { Section, SectionHeader } from '../components/UI';
import PartnerLogos from '../components/PartnerLogos';

export default function PartnersPage() {
  return (
    <Section>
      <SectionHeader title="Our Partners" subtitle="Collaborating with leading institutions to transform agricultural finance" />
      <PartnerLogos names={[
        'TRIPLE A Microfinance Bank',
        'Development Bank of Nigeria',
        'Kaduna Business School',
        'Nigerian Breweries',
        'AGRA',
      ]} />
      <div style={{ maxWidth: 600, margin: '48px auto 0', textAlign: 'center' }}>
        <h3 style={{ fontSize: 20, marginBottom: 12 }}>In Discussions With</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          {['IFAD', 'IFC', 'SMEDAN'].map(name => (
            <span key={name} style={{
              padding: '8px 20px', background: 'var(--off-white)',
              borderRadius: 20, fontSize: 14, fontWeight: 600, color: 'var(--green-deep)',
            }}>
              {name}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}
