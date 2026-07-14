import { useMemo, useState } from 'react';
import {
  CheckCircle2, Circle, Clock, LoaderCircle, PackageOpen, XCircle,
} from 'lucide-react';
import { api, money } from './api';

function Page({ title, subtitle, children }) {
  return <div className="page"><div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</div>;
}

function Loading() {
  return <div className="state"><LoaderCircle className="spin" /><span>Loading deals</span></div>;
}

function Empty() {
  return <div className="state"><PackageOpen /><span>No deals found for your account</span></div>;
}

function ConfirmDot({ label, confirmed }) {
  return <div className={`confirm-dot ${confirmed ? 'done' : ''}`}>
    {confirmed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
    <span>{label}</span>
  </div>;
}

const STATUS_STYLES = {
  'Funds-Held-Placeholder': { label: 'Funds Held', cls: 'held' },
  Released: { label: 'Released', cls: 'released' },
  Cancelled: { label: 'Cancelled', cls: 'cancelled' },
};

export default function DealsView({ deals, user, loading, onRefresh }) {
  const [expanded, setExpanded] = useState(null);

  async function handleAction(endpoint) {
    try {
      await api(endpoint, { method: 'PATCH' });
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <Loading />;
  if (!deals.length) return <Empty />;

  return <Page title="Deals" subtitle="Track escrow status and confirm delivery across your active deals.">
    <div className="deals-list">
      {deals.map((deal) => {
        const isExpanded = expanded === deal.deal_id;
        const status = STATUS_STYLES[deal.escrow_status] || { label: deal.escrow_status, cls: '' };
        const buyerDone = !!deal.buyer_confirmed_at;
        const logDone = !!deal.logistics_confirmed_at;
        const sellerDone = !!deal.seller_confirmed_at;
        const allDone = buyerDone && logDone && sellerDone;

        const showDeposit = user?.is_bdsp && deal.bdsp_user_id === user.user_id
          && deal.escrow_status !== 'Funds-Held-Placeholder' && deal.escrow_status !== 'Released';
        const showCancel = user?.is_bdsp && deal.bdsp_user_id === user.user_id
          && deal.escrow_status === 'Funds-Held-Placeholder';
        const showBuyerConfirm = user?.user_id === deal.buyer_user_id
          && deal.escrow_status === 'Funds-Held-Placeholder' && !buyerDone;
        const showLogConfirm = user?.user_id === deal.logistics_user_id
          && deal.escrow_status === 'Funds-Held-Placeholder' && !logDone;
        const showSellerConfirm = deal.seller_user_ids?.includes(user?.user_id)
          && deal.escrow_status === 'Funds-Held-Placeholder' && !sellerDone;

        return <article key={deal.deal_id} className={`deal-card ${(deal.escrow_status || '').toLowerCase()}`}>
          <div className="deal-header" onClick={() => setExpanded(isExpanded ? null : deal.deal_id)}>
            <div className="deal-id-row">
              <strong>{deal.deal_id}</strong>
              <span className={`status-badge ${status.cls}`}>{status.label}</span>
            </div>
            <div className="deal-summary">
              <span>{deal.item_name} · {deal.category}</span>
              <strong className="deal-value">{money(deal.deal_value)}</strong>
            </div>
          </div>

          {isExpanded && <div className="deal-body">
            <div className="confirmation-track">
              <ConfirmDot label="Buyer" confirmed={buyerDone} />
              <span className="track-line" />
              <ConfirmDot label="Logistics" confirmed={logDone} />
              <span className="track-line" />
              <ConfirmDot label="Seller" confirmed={sellerDone} />
            </div>

            {allDone && <div className="release-banner">
              <CheckCircle2 size={18} /> Deal released — funds dispersed, hub completed, posts closed.
            </div>}

            {deal.escrow_status === 'Cancelled' && <div className="cancel-banner">
              <XCircle size={18} /> This deal has been cancelled.
            </div>}

            {!allDone && deal.escrow_status !== 'Cancelled' && <div className="deal-actions">
              {showDeposit && <button className="primary-button" onClick={() => handleAction(`/deals/${deal.deal_id}/deposit`)}><Clock size={16} />Deposit Funds</button>}
              {showBuyerConfirm && <button className="primary-button" onClick={() => handleAction(`/deals/${deal.deal_id}/confirm/buyer`)}>Confirm Receipt</button>}
              {showLogConfirm && <button className="primary-button" onClick={() => handleAction(`/deals/${deal.deal_id}/confirm/logistics`)}>Confirm Delivery</button>}
              {showSellerConfirm && <button className="primary-button" onClick={() => handleAction(`/deals/${deal.deal_id}/confirm/seller`)}>Confirm Dispatch</button>}
              {showCancel && <button className="secondary-button danger" onClick={() => handleAction(`/deals/${deal.deal_id}/cancel`)}><XCircle size={16} />Cancel Deal</button>}
            </div>}

            <details className="deal-details">
              <summary>Deal details</summary>
              <dl>
                <dt>Hub</dt><dd>{deal.hub_id} — {deal.item_name}</dd>
                <dt>BDSP</dt><dd>{deal.bdsp_user_id}</dd>
                <dt>Buyer</dt><dd>{deal.buyer_user_id} {buyerDone && '✓'}</dd>
                <dt>Sellers</dt><dd>{(deal.seller_user_ids || []).join(', ')} {sellerDone && '✓'}</dd>
                <dt>Logistics</dt><dd>{deal.logistics_user_id || 'Not assigned'} {logDone && '✓'}</dd>
                <dt>V4V Revenue</dt><dd>{money(deal.v4v_revenue)}</dd>
                <dt>BDSP Commission</dt><dd>{money(deal.bdsp_commission)}</dd>
              </dl>
            </details>
          </div>}
        </article>;
      })}
    </div>
  </Page>;
}
