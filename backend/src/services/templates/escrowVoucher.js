const { createDocument, addHeader, addFooter, addFieldBlock, savePdf } = require('../pdfEngine');

function generateEscrowVoucher(tx, escrow, seller, buyer, logistics) {
  const doc = createDocument();
  addHeader(doc, 'Escrow Account Confirmation Voucher');

  // Transaction details
  doc.fontSize(11).font('Helvetica-Bold').text('Transaction Details');
  doc.moveDown(0.3);
  addFieldBlock(doc, 'Transaction ID', `TXN_${String(tx.tx_id).padStart(3, '0')}`);
  addFieldBlock(doc, 'Commodity', tx.commodity);
  addFieldBlock(doc, 'Quantity', `${tx.quantity_kg} kg`);
  addFieldBlock(doc, 'Unit Price', `NGN ${Number(tx.unit_price).toLocaleString()}`);
  addFieldBlock(doc, 'Total Amount', `NGN ${Number(tx.total_amount).toLocaleString()}`);
  addFieldBlock(doc, 'Status', tx.status);

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
  doc.moveDown(1);

  // Escrow details
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
    doc.fontSize(10).font('Helvetica').text('No escrow record for this transaction.');
  }

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
  doc.moveDown(1);

  // Parties
  doc.fontSize(11).font('Helvetica-Bold').text('Parties');
  doc.moveDown(0.3);

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#173c2d').text('Seller:');
  doc.font('Helvetica').fillColor('#000');
  addFieldBlock(doc, '  Name', seller?.full_name || 'N/A');
  addFieldBlock(doc, '  Phone', seller?.phone || 'N/A');
  addFieldBlock(doc, '  Bank', seller?.bank_name || 'N/A');
  addFieldBlock(doc, '  Account', seller?.account_number || 'N/A');
  doc.moveDown(0.5);

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#173c2d').text('Buyer:');
  doc.font('Helvetica').fillColor('#000');
  addFieldBlock(doc, '  Name', buyer?.full_name || 'N/A');
  addFieldBlock(doc, '  Phone', buyer?.phone || 'N/A');
  doc.moveDown(0.5);

  if (logistics) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#173c2d').text('Logistics Partner:');
    doc.font('Helvetica').fillColor('#000');
    addFieldBlock(doc, '  Name', logistics.full_name);
    addFieldBlock(doc, '  Phone', logistics.phone);
  }

  // Commission breakdown
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
  doc.moveDown(1);
  doc.fontSize(11).font('Helvetica-Bold').text('Commission Breakdown');
  doc.moveDown(0.3);
  addFieldBlock(doc, 'Platform Fee (2%)', `NGN ${(Number(tx.total_amount) * 0.02).toLocaleString()}`);
  addFieldBlock(doc, '  V4V Revenue (70%)', `NGN ${Number(tx.commission_v4v || 0).toLocaleString()}`);
  addFieldBlock(doc, '  BDSP Commission (30%)', `NGN ${Number(tx.commission_bdsp || 0).toLocaleString()}`);

  // Dual-lock POD status
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
  doc.moveDown(1);
  doc.fontSize(11).font('Helvetica-Bold').text('Proof of Delivery (POD) Status');
  doc.moveDown(0.3);
  addFieldBlock(doc, 'Trucker POD', tx.trucker_pod_confirmed ? '✓ Confirmed' : '✗ Pending');
  addFieldBlock(doc, 'Buyer POD', tx.buyer_pod_confirmed ? '✓ Confirmed' : '✗ Pending');

  addFooter(doc);

  const filename = `escrow-voucher-TXN_${String(tx.tx_id).padStart(3, '0')}.pdf`;
  return savePdf(doc, filename);
}

module.exports = { generateEscrowVoucher };
