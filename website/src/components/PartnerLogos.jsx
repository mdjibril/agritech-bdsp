const logoMap = {
  'TRIPLE A Microfinance Bank': 'triple-aaa-logo.png',
  'Development Bank of Nigeria': 'dbn-logo.jpeg',
  'Kaduna Business School': 'kbs-logo.png',
  'Nigerian Breweries': 'Nigerian-Breweries-logo.jpg',
  'AGRA': 'agra-logo.png',
};

export default function PartnerLogos({ names }) {
  if (names.length === 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, flexWrap: 'wrap', padding: '32px 0' }}>
      {names.map((name) => (
        <div
          key={name}
          style={{
            height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 24px', background: 'var(--off-white)',
            borderRadius: 'var(--radius)',
          }}
        >
          <img
            src={`/assets/${logoMap[name]}`}
            alt={name}
            style={{ maxHeight: 56, maxWidth: 180, width: 'auto', height: 'auto', objectFit: 'contain' }}
          />
        </div>
      ))}
    </div>
  );
}
