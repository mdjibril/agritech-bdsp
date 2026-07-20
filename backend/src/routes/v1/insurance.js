const express = require('express');
const { query, transaction } = require('../../db');
const { requireAuth } = require('../../middleware/auth');
const { badRequest, forbidden } = require('../../httpError');
const { mockInsuranceQuote } = require('../../services/partnerMock');

const router = express.Router();

// POST /api/v1/insurance/purchase
// Actor purchases an insurance policy. Deducts premium from wallet.
// Splits: 12% → V4V Platform Admin (actor_id=25), 88% → provider (simulated)
router.post('/purchase', requireAuth, async (req, res, next) => {
  try {
    const { policy_type, sum_insured, provider } = req.body;
    if (!policy_type || !sum_insured) {
      return next(badRequest('policy_type and sum_insured are required'));
    }

    const validTypes = ['CROP', 'LIVESTOCK', 'EQUIPMENT'];
    if (!validTypes.includes(policy_type)) {
      return next(badRequest(`policy_type must be one of: ${validTypes.join(', ')}`));
    }

    const quote = mockInsuranceQuote(policy_type, Number(sum_insured), provider || 'NAIC');
    const premium = quote.premium;
    const v4vShare = Math.round(premium * 0.12);
    const providerShare = premium - v4vShare;

    // Check if buyer has enough wallet balance
    const wallet = await query(
      'SELECT wallet_balance FROM actors WHERE actor_id = $1',
      [req.user.actor_id]
    );
    if (Number(wallet.rows[0]?.wallet_balance || 0) < premium) {
      return next(badRequest(`Insufficient wallet balance. Premium: ₦${premium.toLocaleString()}`));
    }

    const result = await transaction(async (client) => {
      // Deduct premium from buyer
      await client.query(
        'UPDATE actors SET wallet_balance = wallet_balance - $1 WHERE actor_id = $2',
        [premium, req.user.actor_id]
      );

      // 12% to V4V Platform Admin
      await client.query(
        'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = 25',
        [v4vShare]
      );

      // Create policy record (provider gets 88% via mock bank payout)
      const policy = await client.query(
        `INSERT INTO insurance_policies (actor_id, provider, policy_type, premium, sum_insured, status, commission_v4v)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)
         RETURNING *`,
        [req.user.actor_id, quote.provider, policy_type, premium, sum_insured, v4vShare]
      );

      return { policy: policy.rows[0], v4vShare, providerShare };
    });

    res.locals.auditAction = `Insurance policy ${result.policy.policy_id} purchased: ${policy_type} by actor ${req.user.actor_id} for ₦${premium} (V4V: ₦${v4vShare}, Provider: ₦${providerShare})`;

    res.status(201).json({
      policy: result.policy,
      premium,
      v4v_share: v4vShare,
      provider_share: providerShare,
      provider: quote.provider,
      message: `Insurance policy active. ${quote.provider} will process your coverage.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
