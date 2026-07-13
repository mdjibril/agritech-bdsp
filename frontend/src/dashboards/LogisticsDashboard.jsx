import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Map, PackageOpen, Search, Truck } from 'lucide-react';
import { apiV1, money } from '../api';
import Page, { Loading, Empty } from '../components/Page';
import Metric from '../components/Metric';
import StatusBadge from '../components/StatusBadge';

export default function LogisticsDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiV1('/transactions').then((r) => setTransactions(r.transactions || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const jobs = useMemo(() => transactions.filter((t) => t.logistics_id === user.actor_id), [transactions, user]);
  const openJobs = jobs.filter((t) => t.status === 'IN_ESCROW' || t.status === 'DISPATCHED');
  const completedJobs = jobs.filter((t) => t.status === 'COMPLETED');
  const filtered = useMemo(() => jobs.filter((t) =>
    t.commodity?.toLowerCase().includes(search.toLowerCase()) ||
    t.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.seller_name?.toLowerCase().includes(search.toLowerCase())
  ), [jobs, search]);

  async function handleConfirm(txId) {
    try {
      await apiV1(`/transactions/${txId}/confirm-pod`, {
        method: 'POST',
        body: JSON.stringify({ role: 'trucker' }),
      });
      const r = await apiV1('/transactions');
      setTransactions(r.transactions || []);
    } catch (err) { alert(err.message); }
  }

  if (loading) return <Loading />;

  return (
    <Page title="Logistics Dashboard" subtitle="Freight jobs, routing, and delivery confirmations.">
      <div className="metrics-grid">
        <Metric label="Open jobs" value={openJobs.length} note="Awaiting action" icon={PackageOpen} />
        <Metric label="Delivered" value={completedJobs.length} note="Confirmed" icon={CheckCircle2} />
        <Metric label="Active routes" value={openJobs.length} note="In transit" icon={Map} />
        <Metric label="Total jobs" value={jobs.length} note="All time" icon={Truck} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div><h2>Freight jobs</h2></div>
          <div className="search"><Search size={18} /><input placeholder="Search jobs" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
        {filtered.length === 0 ? <Empty /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Commodity</th><th>From → To</th><th>Value</th><th>POD Status</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {filtered.map((t) => {
                  const podDone = t.trucker_pod_confirmed;
                  return (
                    <tr key={t.tx_id}>
                      <td><strong>{t.commodity}</strong></td>
                      <td><span className="route-pair">{t.seller_name || `#${t.seller_id}`} → {t.buyer_name || `#${t.buyer_id}`}</span></td>
                      <td>{money(t.total_amount)}</td>
                      <td>{podDone ? <span className="status-badge success">Confirmed</span> : <span className="status-badge warning">Pending</span>}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>
                        {!podDone && t.status !== 'COMPLETED' && t.status !== 'DISPUTED' ? (
                          <button className="primary-button sm" onClick={() => handleConfirm(t.tx_id)}>
                            <ClipboardCheck size={15} /> Confirm POD
                          </button>
                        ) : <span className="muted-text">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  );
}
