const express = require('express');
const { query } = require('../../db');
const { requireAuth } = require('../../middleware/auth');
const { generateEscrowVoucher } = require('../../services/templates/escrowVoucher');
const { generateInsuranceCertificate } = require('../../services/templates/insuranceCertificate');
const { notFound, forbidden } = require('../../httpError');

const router = express.Router();

// POST /api/v1/documents/escrow-voucher/:txId — Generate escrow voucher
router.post('/escrow-voucher/:txId', requireAuth, async (req, res, next) => {
  try {
    const txResult = await query(
      `SELECT t.*, seller.actor_id AS s_id, seller.full_name AS s_name, seller.phone AS s_phone,
              seller.bank_name AS s_bank, seller.account_number AS s_account,
              buyer.actor_id AS b_id, buyer.full_name AS b_name, buyer.phone AS b_phone,
              log.actor_id AS l_id, log.full_name AS l_name, log.phone AS l_phone
       FROM transactions t
       JOIN actors seller ON seller.actor_id = t.seller_id
       JOIN actors buyer ON buyer.actor_id = t.buyer_id
       LEFT JOIN actors log ON log.actor_id = t.logistics_id
       WHERE t.tx_id = $1`,
      [Number(req.params.txId)]
    );
    if (!txResult.rows.length) return next(notFound('Transaction not found'));

    const tx = txResult.rows[0];
    const seller = { full_name: tx.s_name, phone: tx.s_phone, bank_name: tx.s_bank, account_number: tx.s_account };
    const buyer = { full_name: tx.b_name, phone: tx.b_phone };
    const logistics = tx.l_id ? { full_name: tx.l_name, phone: tx.l_phone } : null;

    const escrowResult = await query('SELECT * FROM escrow WHERE tx_id = $1', [tx.tx_id]);
    const escrow = escrowResult.rows[0] || null;

    const filePath = await generateEscrowVoucher(tx, escrow, seller, buyer, logistics);
    res.locals.auditAction = `Generated escrow voucher for transaction ${tx.tx_id}`;
    res.json({ path: filePath, message: 'Escrow voucher generated' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/documents/escrow-voucher/:txId/download — Download escrow voucher
router.get('/escrow-voucher/:txId/download', requireAuth, async (req, res, next) => {
  try {
    const txResult = await query(
      `SELECT t.*, seller.full_name AS s_name, seller.phone AS s_phone,
              seller.bank_name AS s_bank, seller.account_number AS s_account,
              buyer.full_name AS b_name, buyer.phone AS b_phone,
              log.full_name AS l_name, log.phone AS l_phone
       FROM transactions t
       JOIN actors seller ON seller.actor_id = t.seller_id
       JOIN actors buyer ON buyer.actor_id = t.buyer_id
       LEFT JOIN actors log ON log.actor_id = t.logistics_id
       WHERE t.tx_id = $1`,
      [Number(req.params.txId)]
    );
    if (!txResult.rows.length) return next(notFound('Transaction not found'));
    const tx = txResult.rows[0];

    // Reuse same data shaping as POST but pipe directly to response
    const seller = { full_name: tx.s_name, phone: tx.s_phone, bank_name: tx.s_bank, account_number: tx.s_account };
    const buyer = { full_name: tx.b_name, phone: tx.b_phone };
    const logistics = tx.l_name ? { full_name: tx.l_name, phone: tx.l_phone } : null;
    const escrowResult = await query('SELECT * FROM escrow WHERE tx_id = $1', [tx.tx_id]);
    const escrow = escrowResult.rows[0] || null;

    const { createDocument, addHeader, addFooter, addFieldBlock, streamPdf } = require('../../services/pdfEngine');
    const doc = createDocument();
    addHeader(doc, 'Escrow Account Confirmation Voucher');

    doc.fontSize(11).font('Helvetica-Bold').text('Transaction Details');
    doc.moveDown(0.3);
    addFieldBlock(doc, 'Transaction ID', `TXN_${String(tx.tx_id).padStart(3, '0')}`);
    addFieldBlock(doc, 'Commodity', tx.commodity);
    addFieldBlock(doc, 'Quantity', `${tx.quantity_kg} kg`);
    addFieldBlock(doc, 'Total Amount', `NGN ${Number(tx.total_amount).toLocaleString()}`);
    addFieldBlock(doc, 'Status', tx.status);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text('Escrow Details');
    doc.moveDown(0.3);
    if (escrow) {
      addFieldBlock(doc, 'Escrow ID', escrow.escrow_id);
      addFieldBlock(doc, 'Amount Held', `NGN ${Number(escrow.amount).toLocaleString()}`);
      addFieldBlock(doc, 'Status', escrow.status);
      addFieldBlock(doc, 'Funded At', escrow.funded_at ? new Date(escrow.funded_at).toLocaleString() : 'N/A');
      if (escrow.released_at) {
        addFieldBlock(doc, 'Released At', new Date(escrow.released_at).toLocaleString());
      }
    } else {
      doc.text('No escrow record for this transaction.');
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text('Parties');
    doc.moveDown(0.3);
    addFieldBlock(doc, 'Seller', `${seller.full_name} (${seller.phone})`);
    addFieldBlock(doc, 'Buyer', `${buyer.full_name} (${buyer.phone})`);
    if (logistics) addFieldBlock(doc, 'Logistics', `${logistics.full_name} (${logistics.phone})`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text('Commission Breakdown');
    doc.moveDown(0.3);
    addFieldBlock(doc, 'V4V Revenue (70%)', `NGN ${Number(tx.commission_v4v || 0).toLocaleString()}`);
    addFieldBlock(doc, 'BDSP Commission (30%)', `NGN ${Number(tx.commission_bdsp || 0).toLocaleString()}`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text('POD Status');
    doc.moveDown(0.3);
    addFieldBlock(doc, 'Trucker POD', tx.trucker_pod_confirmed ? '✓ Confirmed' : '✗ Pending');
    addFieldBlock(doc, 'Buyer POD', tx.buyer_pod_confirmed ? '✓ Confirmed' : '✗ Pending');

    addFooter(doc);
    streamPdf(doc, res, `escrow-voucher-TXN_${String(tx.tx_id).padStart(3, '0')}.pdf`);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/documents/insurance-cert/:policyId — Generate insurance certificate
router.post('/insurance-cert/:policyId', requireAuth, async (req, res, next) => {
  try {
    const policyResult = await query(
      `SELECT p.*, a.full_name, a.phone, a.lga, a.state
       FROM insurance_policies p
       JOIN actors a ON a.actor_id = p.actor_id
       WHERE p.policy_id = $1`,
      [Number(req.params.policyId)]
    );
    if (!policyResult.rows.length) return next(notFound('Insurance policy not found'));

    const row = policyResult.rows[0];
    const policy = { policy_id: row.policy_id, provider: row.provider, policy_type: row.policy_type, premium: row.premium, sum_insured: row.sum_insured, status: row.status, created_at: row.created_at };
    const holder = { full_name: row.full_name, phone: row.phone, lga: row.lga, state: row.state };

    const filePath = await generateInsuranceCertificate(policy, holder);
    res.locals.auditAction = `Generated insurance certificate for policy ${policy.policy_id}`;
    res.json({ path: filePath, message: 'Insurance certificate generated' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/documents/insurance-cert/:policyId/download — Download certificate
router.get('/insurance-cert/:policyId/download', requireAuth, async (req, res, next) => {
  try {
    const policyResult = await query(
      `SELECT p.*, a.full_name, a.phone, a.lga, a.state
       FROM insurance_policies p JOIN actors a ON a.actor_id = p.actor_id
       WHERE p.policy_id = $1`,
      [Number(req.params.policyId)]
    );
    if (!policyResult.rows.length) return next(notFound('Insurance policy not found'));

    const r = policyResult.rows[0];
    const holder = { full_name: r.full_name, phone: r.phone, lga: r.lga, state: r.state };

    const { createDocument, addHeader, addFooter, addFieldBlock, streamPdf } = require('../../services/pdfEngine');
    const doc = createDocument();
    addHeader(doc, 'Digital Insurance Certificate');

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#173c2d').text('Certificate of Insurance', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text('Policy Information');
    doc.moveDown(0.3);
    addFieldBlock(doc, 'Policy ID', `POL_${String(r.policy_id).padStart(3, '0')}`);
    addFieldBlock(doc, 'Provider', r.provider);
    addFieldBlock(doc, 'Type', r.policy_type);
    addFieldBlock(doc, 'Status', r.status);
    addFieldBlock(doc, 'Premium', `NGN ${Number(r.premium || 0).toLocaleString()}`);
    addFieldBlock(doc, 'Sum Insured', `NGN ${Number(r.sum_insured || 0).toLocaleString()}`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text('Policy Holder');
    doc.moveDown(0.3);
    addFieldBlock(doc, 'Name', holder.full_name);
    addFieldBlock(doc, 'Phone', holder.phone);
    addFieldBlock(doc, 'LGA', holder.lga);

    addFooter(doc);
    streamPdf(doc, res, `insurance-cert-POL_${String(r.policy_id).padStart(3, '0')}.pdf`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
