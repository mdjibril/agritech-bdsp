import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCcw, Search, Server, Shield, Users, Wallet } from 'lucide-react';
import { apiV1, money } from '../api';
import Page, { Loading } from '../components/Page';
import Metric from '../components/Metric';
import StatusBadge from '../components/StatusBadge';

const ROLE_LABELS = {
  SHF: 'Smallholder Farmer',
  AGGREGATOR: 'Aggregator',
  INPUT_VENDOR: 'Input Vendor',
  LOGISTICS: 'Logistics Partner',
  BDSP: 'Certified BDSP',
  KBS: 'KBS Staff',
  AGRA: 'AGRA Partner',
  INVESTOR: 'Investor',
  V4V_ADMIN: 'V4V Admin',
};

export default function V4VAdminDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      apiV1('/transactions').then((r) => r.transactions || []),
      apiV1('/actors').then((r) => r.actors || []).catch(() => []),
    ]).then(([txs, acts]) => {
      setTransactions(txs);
      setActors(acts);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const escrows = transactions.filter((t) => t.escrow_required);
  const activeEscrows = escrows.filter((t) => t.status === 'IN_ESCROW');
  const disputed = transactions.filter((t) => t.status === 'DISPUTED');
  const totalV4V = transactions.reduce((s, t) => s + Number(t.commission_v4v || 0), 0);
  const totalBdsp = transactions.reduce((s, t) => s + Number(t.commission_bdsp || 0), 0);

  const filtered = filter === 'all' ? transactions
    : filter === 'disputed' ? disputed
    : filter === 'active' ? transactions.filter((t) => t.status !== 'COMPLETED' && t.status !== 'DISPUTED')
    : transactions;

  const roleCounts = {};
  for (const a of actors) {
    roleCounts[a.actor_type] = (roleCounts[a.actor_type] || 0) + 1;
  }

  const recentActivity = [...transactions]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 10);

  const filteredActors = roleFilter === 'all' ? actors : actors.filter((a) => a.actor_type === roleFilter);
  const uniqueRoles = [...new Set(actors.map((a) => a.actor_type))];

  return (
    <Page title="V4V Admin Console" subtitle="System control, escrow oversight, user registry, and health monitoring.">
      <div className="metrics-grid">
        <Metric label="Total transactions" value={transactions.length} note="System-wide" icon={Activity} />
        <Metric label="Active escrows" value={activeEscrows.length} note="Funds held" icon={Wallet} />
        <Metric label="Disputed" value={disputed.length} note="Needs attention" icon={AlertTriangle} />
        <Metric label="Registered users" value={actors.length} note="All roles" icon={Users} />
      </div>

      <div className="two-column" style={{ marginBottom: 20 }}>
        <section className="panel">
          <div className="panel-head"><div><h2>System health</h2><p>Platform status</p></div></div>
          <div className="health-list">
            {[
              { label: 'API Server', status: 'Operational', icon: Server },
              { label: 'Database', status: 'Connected', icon: Server },
              { label: 'Escrow Engine', status: 'Active', icon: Wallet },
              { label: 'Audit Logging', status: 'NDPC-compliant', icon: Shield },
              { label: 'Document Engine', status: 'Ready', icon: Activity },
            ].map((h) => (
              <div key={h.label} className="health-item">
                <h.icon size={18} />
                <span>{h.label}</span>
                <span className="status-badge success">{h.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Commission ledger</h2><p>Revenue & distribution</p></div></div>
          <div className="allocation" style={{ flexDirection: 'column', display: 'flex' }}>
            <div><span>V4V revenue</span><strong>{money(totalV4V)}</strong><small>70% platform fee share</small></div>
            <div><span>BDSP commissions</span><strong>{money(totalBdsp)}</strong><small>30% network share</small></div>
            <div><span>Total escrow held</span><strong>{money(activeEscrows.reduce((s, t) => s + Number(t.total_amount), 0))}</strong><small>{activeEscrows.length} active holds</small></div>
            <div><span>Mean deal value</span><strong>{money(transactions.length ? transactions.reduce((s, t) => s + Number(t.total_amount), 0) / transactions.length : 0)}</strong><small>Per transaction</small></div>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head"><div><h2>User registry</h2><p>All registered actors — {actors.length} total</p></div></div>
        {actors.length === 0 ? <p className="muted-text">No users found</p> : (
          <>
            <div className="filter-group" style={{ marginBottom: 16 }}>
              <button className={`filter-chip ${roleFilter === 'all' ? 'active' : ''}`} onClick={() => setRoleFilter('all')}>All ({actors.length})</button>
              {uniqueRoles.map((role) => (
                <button key={role} className={`filter-chip ${roleFilter === role ? 'active' : ''}`} onClick={() => setRoleFilter(role)}>{ROLE_LABELS[role] || role} ({roleCounts[role]})</button>
              ))}
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Actor ID</th><th>Name</th><th>Phone</th><th>Role</th><th>Gender</th><th>KYC</th><th>LGA</th><th>BDSP ID</th><th>Wallet</th><th>Joined</th></tr></thead>
                <tbody>
                  {filteredActors.map((a) => (
                    <tr key={a.actor_id}>
                      <td><strong>{a.actor_id}</strong></td>
                      <td>{a.full_name}</td>
                      <td>{a.phone}</td>
                      <td><span className="role-chip">{ROLE_LABELS[a.actor_type] || a.actor_type}</span></td>
                      <td>{a.gender}</td>
                      <td><StatusBadge status={a.kyc_status} /></td>
                      <td>{a.lga}</td>
                      <td>{a.bdsp_id || '—'}</td>
                      <td>{money(a.wallet_balance)}</td>
                      <td>{new Date(a.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head"><div><h2>Escrow ledger</h2><p>All transactions requiring escrow</p></div></div>
        <div className="filter-group" style={{ marginBottom: 16 }}>
          {['all', 'active', 'disputed'].map((f) => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Commodity</th><th>Amount</th><th>V4V Fee</th><th>BDSP Fee</th><th>Status</th><th>Escrow</th></tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.tx_id}>
                  <td><strong>#{t.tx_id}</strong></td>
                  <td>{t.commodity}</td>
                  <td>{money(t.total_amount)}</td>
                  <td>{money(t.commission_v4v)}</td>
                  <td>{money(t.commission_bdsp)}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>{t.escrow_required ? <span className="status-badge warning">Held</span> : <span className="muted-text">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><div><h2>Recent activity</h2><p>Latest updates across the platform</p></div></div>
        {recentActivity.length === 0 ? <p className="muted-text">No activity yet</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>Commodity</th><th>Amount</th><th>Buyer</th><th>Seller</th><th>Status</th></tr></thead>
              <tbody>
                {recentActivity.map((t) => (
                  <tr key={t.tx_id}>
                    <td>{new Date(t.updated_at || t.created_at).toLocaleString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td><strong>{t.commodity}</strong></td>
                    <td>{money(t.total_amount)}</td>
                    <td>{t.buyer_name || `#${t.buyer_id}`}</td>
                    <td>{t.seller_name || `#${t.seller_id}`}</td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Page>
  );
}
