const express = require('express');
const { query, transaction } = require('../../db');
const { requireFields, assertOneOf, VALID_CATEGORIES } = require('../../validation');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { badRequest, forbidden, notFound } = require('../../httpError');

const router = express.Router();

// Shared transaction SELECT with actor names
const TX_SELECT = `
  SELECT t.tx_id, t.buyer_id, t.seller_id, t.logistics_id,
         t.commodity, t.quantity_kg, t.unit_price, t.total_amount,
         t.status, t.trucker_pod_confirmed, t.buyer_pod_confirmed,
         t.escrow_required, t.commission_v4v, t.commission_bdsp,
         t.category, t.logistics_fee,
         t.created_at, t.updated_at,
         buyer.full_name AS buyer_name,
         seller.full_name AS seller_name,
         logistics.full_name AS logistics_name
  FROM transactions t
  LEFT JOIN actors buyer ON buyer.actor_id = t.buyer_id
  LEFT JOIN actors seller ON seller.actor_id = t.seller_id
  LEFT JOIN actors logistics ON logistics.actor_id = t.logistics_id`;

// POST /api/v1/transactions
// Supports:
//   - SELL listing: seller_id + commodity (no buyer_id) → status LISTED
//   - BUY request:  buyer_id  + commodity (no seller_id) → status BUY_REQUEST
//   - Direct deal:  seller_id + buyer_id                  → status INITIATED/IN_ESCROW
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const hasBuyer = !!req.body.buyer_id;
    const hasSeller = !!req.body.seller_id;

    if (!hasBuyer && !hasSeller) {
      return next(badRequest('At least one of buyer_id or seller_id is required'));
    }
    if (!req.body.commodity) return next(badRequest('Field "commodity" is required'));
    if (!req.body.quantity_kg) return next(badRequest('Field "quantity_kg" is required'));
    if (!req.body.unit_price) return next(badRequest('Field "unit_price" is required'));

    if (req.body.category) {
      assertOneOf(req.body.category, VALID_CATEGORIES, 'category');
    }

    // Auth check
    if (hasBuyer && hasSeller) {
      if (req.user.actor_type !== 'BDSP' &&
          Number(req.user.actor_id) !== Number(req.body.buyer_id) &&
          Number(req.user.actor_id) !== Number(req.body.seller_id)) {
        return next(forbidden('Only BDSP or a party to the transaction can create it'));
      }
    } else if (hasSeller && !hasBuyer) {
      if (Number(req.user.actor_id) !== Number(req.body.seller_id)) {
        return next(forbidden('Only the seller can create a sell listing'));
      }
    } else if (hasBuyer && !hasSeller) {
      if (!['BDSP', 'AGGREGATOR', 'INPUT_VENDOR'].includes(req.user.actor_type)) {
        return next(forbidden('Only BDSP, Aggregator, or Input Vendor can create buy requests'));
      }
      if (Number(req.user.actor_id) !== Number(req.body.buyer_id)) {
        return next(forbidden('You can only create buy requests for yourself'));
      }
    }

    const result = await transaction(async (client) => {
      let logisticsId = null;
      if (hasBuyer && hasSeller) {
        // Direct deal: auto-assign logistics
        logisticsId = req.body.logistics_id ? Number(req.body.logistics_id) : null;
        if (!logisticsId) {
          const log = await client.query(
            "SELECT actor_id FROM actors WHERE actor_type = 'LOGISTICS' ORDER BY RANDOM() LIMIT 1"
          );
          if (log.rows.length) logisticsId = log.rows[0].actor_id;
        }
      }

      const buyId = hasBuyer ? Number(req.body.buyer_id) : null;
      const sellId = hasSeller ? Number(req.body.seller_id) : null;

      const logisticsFee = Number(req.body.logistics_fee || 0);

      const tx = await client.query(
        `INSERT INTO transactions (buyer_id, seller_id, logistics_id, commodity, category, quantity_kg, unit_price, logistics_fee)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [buyId, sellId, logisticsId, req.body.commodity, req.body.category || 'Crop', req.body.quantity_kg, req.body.unit_price, logisticsFee]
      );
      const txn = tx.rows[0];

      // SELL listing: no buyer
      if (hasSeller && !hasBuyer) {
        await client.query("UPDATE transactions SET status = 'LISTED' WHERE tx_id = $1", [txn.tx_id]);
        txn.status = 'LISTED';
        return txn;
      }

      // BUY request: no seller
      if (hasBuyer && !hasSeller) {
        await client.query("UPDATE transactions SET status = 'BUY_REQUEST' WHERE tx_id = $1", [txn.tx_id]);
        txn.status = 'BUY_REQUEST';
        return txn;
      }

      // Direct deal: escrow if needed (holds crop value + logistics fee)
      if (txn.escrow_required) {
        const escrowAmount = Number(txn.total_amount) + logisticsFee;
        await client.query(
          "INSERT INTO escrow (tx_id, amount, funded_by, status) VALUES ($1, $2, $3, 'HELD')",
          [txn.tx_id, escrowAmount, txn.buyer_id]
        );
        await client.query("UPDATE transactions SET status = 'IN_ESCROW' WHERE tx_id = $1", [txn.tx_id]);
        txn.status = 'IN_ESCROW';
      }

      return txn;
    });

    res.locals.auditAction = `Created transaction ${result.tx_id}: ${result.quantity_kg}kg ${result.commodity}`;
    res.status(201).json({ transaction: result });
  } catch (err) {
    if (err.code === '23503') return next(badRequest('Referenced actor does not exist'));
    next(err);
  }
});

// GET /api/v1/transactions
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (req.query.status === 'LISTED' || req.query.status === 'BUY_REQUEST') {
      const result = await query(
        `${TX_SELECT} WHERE t.status = $1 ORDER BY t.created_at DESC LIMIT 100`,
        [req.query.status]
      );
      return res.json({ transactions: result.rows });
    }

    const result = await query(
      `${TX_SELECT} WHERE $1 IN (t.seller_id, t.logistics_id) OR t.buyer_id = $1 OR $2
       ORDER BY t.created_at DESC LIMIT 100`,
      [req.user.actor_id, ['V4V_ADMIN', 'KBS', 'AGRA'].includes(req.user.actor_type)]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/transactions/marketplace
router.get('/marketplace', requireAuth, async (req, res, next) => {
  try {
    const [sell, buy, recent] = await Promise.all([
      query(`${TX_SELECT} WHERE t.status = 'LISTED' ORDER BY t.created_at DESC LIMIT 100`),
      query(`${TX_SELECT} WHERE t.status = 'BUY_REQUEST' ORDER BY t.created_at DESC LIMIT 100`),
      query(`${TX_SELECT} WHERE t.status = 'COMPLETED' ORDER BY t.created_at DESC LIMIT 5`),
    ]);
    res.json({ sell: sell.rows, buy: buy.rows, recent: recent.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/transactions/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `${TX_SELECT} WHERE t.tx_id = $1`,
      [Number(req.params.id)]
    );
    if (!result.rows.length) return next(notFound('Transaction not found'));
    const tx = result.rows[0];
    if (req.user.actor_id !== tx.buyer_id && req.user.actor_id !== tx.seller_id &&
        req.user.actor_id !== tx.logistics_id && req.user.actor_type !== 'V4V_ADMIN') {
      return next(forbidden('Not a participant in this transaction'));
    }
    res.json({ transaction: tx });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/transactions/:id/claim
// Buyer claims a LISTED transaction — sets buyer_id, moves to INITIATED, assigns logistics, creates escrow if needed
router.put('/:id/claim', requireAuth, async (req, res, next) => {
  try {
    const buyerRole = req.user.actor_type;
    if (!['BDSP', 'AGGREGATOR', 'INPUT_VENDOR'].includes(buyerRole)) {
      return next(forbidden('Only BDSP, Aggregator, or Input Vendor can claim listings'));
    }

    const txResult = await query('SELECT * FROM transactions WHERE tx_id = $1', [Number(req.params.id)]);
    if (!txResult.rows.length) return next(notFound('Transaction not found'));
    const tx = txResult.rows[0];

    if (tx.status !== 'LISTED') {
      return next(badRequest('Only LISTED transactions can be claimed'));
    }

    const result = await transaction(async (client) => {
      let logisticsId = null;
      const log = await client.query(
        "SELECT actor_id FROM actors WHERE actor_type = 'LOGISTICS' ORDER BY RANDOM() LIMIT 1"
      );
      if (log.rows.length) logisticsId = log.rows[0].actor_id;

      await client.query(
        'UPDATE transactions SET buyer_id = $1, logistics_id = $2, status = $3 WHERE tx_id = $4',
        [req.user.actor_id, logisticsId, tx.escrow_required ? 'IN_ESCROW' : 'INITIATED', tx.tx_id]
      );

      if (tx.escrow_required) {
        const escrowAmount = Number(tx.total_amount) + Number(tx.logistics_fee || 0);
        await client.query(
          "INSERT INTO escrow (tx_id, amount, funded_by, status) VALUES ($1, $2, $3, 'HELD')",
          [tx.tx_id, escrowAmount, req.user.actor_id]
        );
      }

      const updated = await client.query(
        `${TX_SELECT} WHERE t.tx_id = $1`, [tx.tx_id]
      );
      return updated.rows[0];
    });

    res.locals.auditAction = `Buyer ${req.user.actor_id} claimed transaction ${tx.tx_id}`;
    res.json({ transaction: result, message: 'Listing claimed successfully' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/transactions/:id/offer
// Farmer offers to fulfill a BUY_REQUEST — sets seller_id, moves to INITIATED, assigns logistics, creates escrow if needed
router.put('/:id/offer', requireAuth, async (req, res, next) => {
  try {
    if (req.user.actor_type !== 'SHF') {
      return next(forbidden('Only farmers (SHF) can fulfill buy requests'));
    }

    const txResult = await query('SELECT * FROM transactions WHERE tx_id = $1', [Number(req.params.id)]);
    if (!txResult.rows.length) return next(notFound('Transaction not found'));
    const tx = txResult.rows[0];

    if (tx.status !== 'BUY_REQUEST') {
      return next(badRequest('Only BUY_REQUEST transactions can be fulfilled'));
    }

    const result = await transaction(async (client) => {
      let logisticsId = null;
      const log = await client.query(
        "SELECT actor_id FROM actors WHERE actor_type = 'LOGISTICS' ORDER BY RANDOM() LIMIT 1"
      );
      if (log.rows.length) logisticsId = log.rows[0].actor_id;

      await client.query(
        'UPDATE transactions SET seller_id = $1, logistics_id = $2, status = $3 WHERE tx_id = $4',
        [req.user.actor_id, logisticsId, tx.escrow_required ? 'IN_ESCROW' : 'INITIATED', tx.tx_id]
      );

      if (tx.escrow_required) {
        const escrowAmount = Number(tx.total_amount) + Number(tx.logistics_fee || 0);
        await client.query(
          "INSERT INTO escrow (tx_id, amount, funded_by, status) VALUES ($1, $2, $3, 'HELD')",
          [tx.tx_id, escrowAmount, tx.buyer_id]
        );
      }

      const updated = await client.query(`${TX_SELECT} WHERE t.tx_id = $1`, [tx.tx_id]);
      return updated.rows[0];
    });

    res.locals.auditAction = `Farmer ${req.user.actor_id} fulfilled buy request ${tx.tx_id}`;
    res.json({ transaction: result, message: 'Buy request fulfilled successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/transactions/:id/confirm-pod
// Dual-lock POD: body { role: 'trucker' | 'buyer' }
router.post('/:id/confirm-pod', requireAuth, async (req, res, next) => {
  try {
    requireFields(req.body, 'role');
    if (!['trucker', 'buyer'].includes(req.body.role)) {
      return next(badRequest('Role must be "trucker" or "buyer"'));
    }

    const txResult = await query('SELECT * FROM transactions WHERE tx_id = $1', [Number(req.params.id)]);
    if (!txResult.rows.length) return next(notFound('Transaction not found'));
    const tx = txResult.rows[0];

    // Authorize: trucker must match logistics_id, buyer must match buyer_id
    if (req.body.role === 'trucker') {
      if (!tx.logistics_id || req.user.actor_id !== tx.logistics_id) {
        return next(forbidden('Only the assigned logistics partner can confirm trucker POD'));
      }
      await query('UPDATE transactions SET trucker_pod_confirmed = TRUE, status = \'DISPATCHED\' WHERE tx_id = $1', [tx.tx_id]);
      res.locals.auditAction = `Trucker confirmed POD for transaction ${tx.tx_id}`;
    } else {
      if (req.user.actor_id !== tx.buyer_id) {
        return next(forbidden('Only the buyer can confirm buyer POD'));
      }
      await query('UPDATE transactions SET buyer_pod_confirmed = TRUE WHERE tx_id = $1', [tx.tx_id]);
      res.locals.auditAction = `Buyer confirmed POD for transaction ${tx.tx_id}`;
    }

    // Check if both confirmed — atomic release with commission distribution
    const updated = (await query('SELECT * FROM transactions WHERE tx_id = $1', [tx.tx_id])).rows[0];
    if (updated.trucker_pod_confirmed && updated.buyer_pod_confirmed) {
      await transaction(async (client) => {
        const escrowResult = await client.query(
          "UPDATE escrow SET status = 'RELEASED_TO_SELLER', released_at = NOW() WHERE tx_id = $1 AND status = 'HELD' RETURNING amount",
          [tx.tx_id]
        );
        await client.query(
          "UPDATE transactions SET status = 'COMPLETED' WHERE tx_id = $1",
          [tx.tx_id]
        );
        if (escrowResult.rows.length) {
          const escrowAmount = Number(escrowResult.rows[0].amount);
          const v4vComm = Number(updated.commission_v4v || 0);
          const bdspComm = Number(updated.commission_bdsp || 0);
          const logisticsFee = Number(updated.logistics_fee || 0);

          // Seller payout: escrow - commissions - logistics
          const sellerPayout = escrowAmount - v4vComm - bdspComm - logisticsFee;
          if (sellerPayout > 0) {
            await client.query(
              'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = $2',
              [sellerPayout, updated.seller_id]
            );
          }

          // V4V Platform BDSP (actor_id=1): gets commission_v4v
          if (v4vComm > 0) {
            await client.query(
              'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = 1',
              [v4vComm]
            );
          }

          // Seller's BDSP: gets commission_bdsp
          if (bdspComm > 0) {
            const seller = await client.query('SELECT bdsp_id FROM actors WHERE actor_id = $1', [updated.seller_id]);
            const bdspId = seller.rows[0]?.bdsp_id;
            if (bdspId) {
              await client.query(
                'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = $2',
                [bdspComm, bdspId]
              );
            }
          }

          // Logistics partner: 100% of logistics_fee
          if (logisticsFee > 0 && updated.logistics_id) {
            await client.query(
              'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = $2',
              [logisticsFee, updated.logistics_id]
            );
          }
        }
      });
      res.locals.auditAction = `Escrow released for transaction ${tx.tx_id} (seller: ${(Number(updated.total_amount || 0) - Number(updated.commission_v4v || 0) - Number(updated.commission_bdsp || 0)).toFixed(0)}, platform: ${updated.commission_v4v}, bdsp: ${updated.commission_bdsp}, logistics: ${updated.logistics_fee || 0})`;
    }

    const final = (await query(`${TX_SELECT} WHERE t.tx_id = $1`, [tx.tx_id])).rows[0];
    res.json({ transaction: final, message: 'POD confirmed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
