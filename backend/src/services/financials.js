/**
 * Phase 7 Financial Commission Engine
 *
 * Buyer-side markup model:
 *   Total Buyer Invoice = Base Item Price + Insurance (2%) + Marketplace Fee (1%)
 *                         + Logistics Fee + Logistics Coordination (10% of logistics)
 *
 * Seller receives 100% of their base item price.
 * All fees are added on top (paid by buyer) and distributed on escrow release.
 */

/**
 * Calculate all Phase 7 financial breakdown components.
 *
 * @param {object} params
 * @param {number} params.itemPrice      - Base commodity price (seller gets 100% of this)
 * @param {number} params.logisticsFee   - Negotiated freight cost (trucker gets 100% of this)
 * @returns {object} Full financial breakdown
 */
function calculateFinancials({ itemPrice, logisticsFee = 0 }) {
  const base = Number(itemPrice);
  const freight = Number(logisticsFee);

  // --- Item price markups (calculated on base item price) ---
  const insurancePremium       = round(base * 0.02);   // 2% embedded insurance
  const marketplaceFee         = round(base * 0.01);   // 1% marketplace fee

  // --- Transport price markups (calculated on freight) ---
  const logisticsCoordinationFee = round(freight * 0.10); // 10% logistics coordination

  // --- Insurance pool split ---
  const insurancePool = insurancePremium;
  const insuranceProviderShare = round(insurancePool * 0.80); // 80% → NAIC/AXA
  const gatewayReserve         = round(insurancePool * 0.02); //  2% → payment processor
  const residualMargin         = insurancePool - insuranceProviderShare - gatewayReserve; // 18%

  const bdspInsuranceShare     = round(residualMargin * 0.40); // 40% of residual → BDSP
  const v4vInsuranceShare      = round(residualMargin * 0.40); // 40% of residual → V4V Admin
  const operationsReserve      = round(residualMargin * 0.20); // 20% of residual → operations

  // --- Total buyer invoice ---
  const totalBuyerInvoice = base + insurancePremium + marketplaceFee + freight + logisticsCoordinationFee;

  // --- Consolidated V4V Admin revenue ---
  const v4vAdminTotal = v4vInsuranceShare + marketplaceFee + logisticsCoordinationFee;

  return {
    // Inputs
    baseItemPrice: base,
    logisticsFee: freight,

    // Markups
    insurancePremium,
    marketplaceFee,
    logisticsCoordinationFee,

    // Insurance pool breakdown
    insuranceProviderShare,
    gatewayReserve,
    residualMargin,
    bdspInsuranceShare,
    v4vInsuranceShare,
    operationsReserve,

    // Totals
    totalBuyerInvoice,
    v4vAdminTotal,

    // Payout destinations (seller and trucker get 100% of their base)
    sellerPayout: base,
    logisticsPayout: freight,
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calculateFinancials };
