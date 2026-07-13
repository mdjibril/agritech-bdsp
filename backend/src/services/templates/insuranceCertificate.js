const { createDocument, addHeader, addFooter, addFieldBlock, savePdf } = require('../pdfEngine');

function generateInsuranceCertificate(policy, holder) {
  const doc = createDocument();
  addHeader(doc, 'Digital Insurance Certificate');

  // Certificate header
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#173c2d').text('Certificate of Insurance', { align: 'center' });
  doc.moveDown(1.5);

  // Policy details
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text('Policy Information');
  doc.moveDown(0.3);
  addFieldBlock(doc, 'Policy ID', `POL_${String(policy.policy_id).padStart(3, '0')}`);
  addFieldBlock(doc, 'Provider', policy.provider);
  addFieldBlock(doc, 'Policy Type', policy.policy_type);
  addFieldBlock(doc, 'Status', policy.status);
  addFieldBlock(doc, 'Premium', `NGN ${Number(policy.premium || 0).toLocaleString()}`);
  addFieldBlock(doc, 'Sum Insured', `NGN ${Number(policy.sum_insured || 0).toLocaleString()}`);
  addFieldBlock(doc, 'Issue Date', policy.created_at ? new Date(policy.created_at).toLocaleDateString() : 'N/A');

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
  doc.moveDown(1);

  // Policy holder
  doc.fontSize(11).font('Helvetica-Bold').text('Policy Holder');
  doc.moveDown(0.3);
  addFieldBlock(doc, 'Name', holder?.full_name || 'N/A');
  addFieldBlock(doc, 'Phone', holder?.phone || 'N/A');
  addFieldBlock(doc, 'LGA', holder?.lga || 'N/A');
  addFieldBlock(doc, 'State', holder?.state || 'N/A');

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
  doc.moveDown(1);

  // Coverage details
  doc.fontSize(11).font('Helvetica-Bold').text('Coverage Details');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').text(
    `This certificate confirms that ${holder?.full_name || 'the policy holder'} is covered under a ` +
    `${policy.policy_type} insurance policy provided by ${policy.provider}. ` +
    `The sum insured is NGN ${Number(policy.sum_insured || 0).toLocaleString()} with an annual ` +
    `premium of NGN ${Number(policy.premium || 0).toLocaleString()}.`
  );

  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Oblique').fillColor('#666').text(
    'This certificate is electronically generated and is valid without a physical signature.',
    { align: 'center' }
  );

  addFooter(doc);

  const filename = `insurance-cert-POL_${String(policy.policy_id).padStart(3, '0')}.pdf`;
  return savePdf(doc, filename);
}

module.exports = { generateInsuranceCertificate };
