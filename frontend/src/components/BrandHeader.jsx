export default function BrandHeader() {
  return (
    <div className="brand-header">
      <div className="brand-header-inner">
        <div className="brand-partner kbs">
          <div className="partner-logo">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <rect width="34" height="34" rx="6" fill="#1a3c34"/>
              <text x="17" y="22" textAnchor="middle" fill="#f0c040" fontSize="18" fontWeight="800" fontFamily="Georgia,serif">K</text>
            </svg>
          </div>
          <div className="partner-text">
            <strong>KBS</strong>
            <span>Training Hub</span>
          </div>
        </div>
        <div className="brand-divider" />
        <div className="brand-partner agra">
          <div className="partner-logo">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <rect width="34" height="34" rx="6" fill="#0d5e3a"/>
              <text x="17" y="23" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800" fontFamily="Arial,sans-serif">AG</text>
            </svg>
          </div>
          <div className="partner-text">
            <strong>AGRA</strong>
            <span>Partner Network</span>
          </div>
        </div>
      </div>
    </div>
  );
}
