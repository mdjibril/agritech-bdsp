const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { mockInsuranceQuote, mockBankLoanApproval, mockBankPayout, mockInsuranceClaim } = require('../../services/partnerMock');

const router = express.Router();

// POST /api/v1/mocks/insurance/quote — Get mock insurance quote
router.post('/insurance/quote', requireAuth, (req, res) => {
  const { policy_type, sum_insured, provider } = req.body || {};
  if (!policy_type || !sum_insured) {
    return res.status(400).json({ error: 'policy_type and sum_insured are required' });
  }
  const validTypes = ['CROP', 'LIVESTOCK', 'EQUIPMENT'];
  if (!validTypes.includes(policy_type)) {
    return res.status(400).json({ error: `policy_type must be one of: ${validTypes.join(', ')}` });
  }
  const quote = mockInsuranceQuote(policy_type, Number(sum_insured), provider);
  res.json({ quote });
});

// POST /api/v1/mocks/bank/loan-approval — Mock bank loan approval
router.post('/bank/loan-approval', requireAuth, (req, res) => {
  const { actor_id, amount, credit_score } = req.body || {};
  if (!actor_id || !amount) {
    return res.status(400).json({ error: 'actor_id and amount are required' });
  }
  const result = mockBankLoanApproval(actor_id, Number(amount), Number(credit_score || 50));
  res.json({ ...result });
});

// POST /api/v1/mocks/bank/payout — Mock bank payout
router.post('/bank/payout', requireAuth, (req, res) => {
  const { account_number, amount, bank_name } = req.body || {};
  if (!account_number || !amount) {
    return res.status(400).json({ error: 'account_number and amount are required' });
  }
  const result = mockBankPayout(account_number, Number(amount), bank_name);
  res.json({ ...result });
});

// POST /api/v1/mocks/insurance/claim — Mock insurance claim
router.post('/insurance/claim', requireAuth, (req, res) => {
  const { policy_id, claim_amount, sum_insured } = req.body || {};
  if (!policy_id || !claim_amount) {
    return res.status(400).json({ error: 'policy_id and claim_amount are required' });
  }
  const result = mockInsuranceClaim(policy_id, Number(claim_amount), Number(sum_insured || 0));
  res.json({ ...result });
});

module.exports = router;
