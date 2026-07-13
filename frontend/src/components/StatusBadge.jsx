const STYLES = {
  VERIFIED: 'success',
  ACTIVE: 'success',
  COMPLETED: 'success',
  RELEASED_TO_SELLER: 'success',
  HELD: 'warning',
  PENDING: 'warning',
  INITIATED: 'warning',
  IN_ESCROW: 'warning',
  ENROLLED: 'info',
  DISPATCHED: 'info',
  CANCELLED: 'danger',
  REFUNDED_TO_BUYER: 'danger',
  REJECTED: 'danger',
  FAILED: 'danger',
  DISPUTED: 'danger',
  DEFAULTED: 'danger',
  CLAIMED: 'warning',
  EXPIRED: 'muted',
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || 'muted';
  return <span className={`status-badge ${cls}`}>{status?.replace(/_/g, ' ')}</span>;
}
