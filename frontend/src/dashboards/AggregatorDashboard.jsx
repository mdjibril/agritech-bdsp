import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, Package, Search, ShoppingCart, Truck, Users, Wallet } from 'lucide-react';
import { apiV1, money } from '../api';
import Page, { Loading, Empty } from '../components/Page';
import Metric from '../components/Metric';
import StatusBadge from '../components/StatusBadge';

export default function AggregatorDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiV1('/transactions').then((r) => setTransactions(r.transactions || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const bought = useMemo(() => transactions.filter((t) => t.buyer_id === user.actor_id), [transactions, user]);
  const active = bought.filter((t) => t.status !== 'COMPLETED' && t.status !== 'DISPUTED');
  const totalSpent = bought.reduce((s, t) => s + Number(t.total_amount), 0);
  const filtered = useMemo(() => bought.filter((t) => t.commodity?.toLowerCase().includes(search.toLowerCase())), [bought, search]);

  if (loading) return <Loading />;

  return (
    <Page title="Aggregator Dashboard" subtitle="Source, purchase, and coordinate logistics.">
      <div className="metrics-grid">
        <Metric label="Active purchases" value={active.length} note="In progress" icon={ShoppingCart} />
        <Metric label="Completed" value={bought.length - active.length} note="Delivered" icon={Package} />
        <Metric label="Total spent" value={money(totalSpent)} note="Lifetime procurement" icon={Wallet} />
        <Metric label="Suppliers" value={new Set(bought.map((t) => t.seller_id)).size} note="Unique farmers" icon={Users} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div><h2>Purchase ledger</h2></div>
          <div className="search"><Search size={18} /><input placeholder="Search commodities" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
        {filtered.length === 0 ? <Empty /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Commodity</th><th>Qty</th><th>Total</th><th>Seller</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.tx_id}>
                    <td><strong>{t.commodity}</strong></td>
                    <td>{t.quantity_kg} kg</td>
                    <td>{money(t.total_amount)}</td>
                    <td>{t.seller_name || `#${t.seller_id}`}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>{new Date(t.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  );
}
