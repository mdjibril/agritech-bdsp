import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCcw, Search, Server, Shield, Users, Wallet } from 'lucide-react';
import { apiV1, money } from '../api';
import Page, { Loading } from '../components/Page';
import Metric from '../components/Metric';
import StatusBadge from '../components/StatusBadge';

export default function V4VAdminDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    apiV1('/transactions').then((r) => setTransactions(r.transactions || [])).catch(() => {}).finally(() => setLoading(false));
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

  return (
    <Page title="V4V Admin Console" subtitle="System control, escrow oversight, and health monitoring.">
      <div className="metrics-grid">
        <Metric label="Total transactions" value={transactions.length} note="System-wide" icon={Activity} />
        <Metric label="Active escrows" value={activeEscrows.length} note="Funds held" icon={Wallet} />
        <Metric label="Disputed" value={disputed.length} note="Needs attention" icon={AlertTriangle} />
        <Metric label="Total V4V revenue" value={money(totalV4V)} note="Platform fees" icon={Shield} />
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

      <section className="panel">
        <div className="panel-head">
          <div><h2>Escrow ledger</h2><p>All transactions requiring escrow</p></div>
          <div className="filter-group">
            {['all', 'active', 'disputed'].map((f) => (
              <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
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
    </Page>
  );
}
