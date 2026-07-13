const BASE_PREMIUM_RATES = {
  CROP: { NAIC: 0.025, AXA: 0.028 },
  LIVESTOCK: { NAIC: 0.035, AXA: 0.032 },
  EQUIPMENT: { NAIC: 0.020, AXA: 0.022 },
};

function mockNaicQuote(policyType, sumInsured) {
  const rate = BASE_PREMIUM_RATES[policyType]?.NAIC || 0.025;
  const premium = Math.round(sumInsured * rate);
  return {
    provider: 'NAIC',
    policy_type: policyType,
    sum_insured: sumInsured,
    premium,
    terms: 'Annual coverage, standard deductibles apply.',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'QUOTED',
  };
}

function mockAxaQuote(policyType, sumInsured) {
  const rate = BASE_PREMIUM_RATES[policyType]?.AXA || 0.028;
  const premium = Math.round(sumInsured * rate);
  return {
    provider: 'AXA',
    policy_type: policyType,
    sum_insured: sumInsured,
    premium,
    terms: 'Comprehensive coverage, 5% deductible on claims.',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'QUOTED',
  };
}

function mockInsuranceQuote(policyType, sumInsured, provider) {
  if (provider === 'AXA') return mockAxaQuote(policyType, sumInsured);
  return mockNaicQuote(policyType, sumInsured);
}

function mockBankLoanApproval(actorId, amount, creditScore) {
  const baseRate = 12.0;
  const approved = creditScore >= 50;
  const rateAdjustment = Math.max(0, (70 - (creditScore || 50)) * 0.15);
  return {
    approved,
    reference: `LOAN-${Date.now()}-${String(actorId).slice(-4)}`,
    amount: approved ? amount : 0,
    interest_rate: approved ? Number((baseRate + rateAdjustment).toFixed(2)) : 0,
    tenor_months: approved ? 12 : 0,
    monthly_repayment: approved
      ? Math.round(amount * (1 + (baseRate + rateAdjustment) / 100) / 12)
      : 0,
    message: approved
      ? 'Loan approved. Funds will be disbursed within 48 hours.'
      : 'Loan declined. Credit score below minimum threshold.',
  };
}

function mockBankPayout(accountNumber, amount, bankName) {
  const success = amount <= 5000000;
  return {
    success,
    reference: `PAYOUT-${Date.now()}-${String(accountNumber).slice(-4)}`,
    amount: success ? amount : 0,
    bank_name: bankName || 'GTBank',
    account_number: accountNumber,
    message: success
      ? `Payment of NGN ${amount.toLocaleString()} processed successfully.`
      : 'Amount exceeds daily payout limit of NGN 5,000,000.',
    settlement_date: success
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null,
  };
}

function mockInsuranceClaim(policyId, claimAmount, sumInsured) {
  const maxPayout = sumInsured * 0.9;
  const approved = claimAmount <= maxPayout && claimAmount > 0;
  return {
    policy_id: policyId,
    claim_amount: claimAmount,
    approved,
    payout: approved ? Math.min(claimAmount, maxPayout) : 0,
    reference: approved ? `CLM-${Date.now()}` : null,
    message: approved
      ? `Claim approved. Payout of NGN ${Math.min(claimAmount, maxPayout).toLocaleString()} will be processed within 5 business days.`
      : `Claim exceeds maximum payout of NGN ${maxPayout.toLocaleString()}.`,
    status: approved ? 'APPROVED' : 'REJECTED',
  };
}

module.exports = {
  mockInsuranceQuote,
  mockBankLoanApproval,
  mockBankPayout,
  mockInsuranceClaim,
};
