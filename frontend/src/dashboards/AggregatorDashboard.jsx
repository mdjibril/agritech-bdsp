import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, Package, Plus, Search, ShoppingCart, Truck, Users, Wallet } from 'lucide-react';
import { apiV1, money } from '../api';
import { displayUnit } from '../utils';
import Page, { Loading, Empty } from '../components/Page';
import Metric from '../components/Metric';
import StatusBadge from '../components/StatusBadge';

export default function AggregatorDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [buyForm, setBuyForm] = useState({ commodity: '', category: 'Crop', quantity_kg: '', unit_price: '' });
  const [buySubmitting, setBuySubmitting] = useState(false);

  const categoryConfig = {
    Crop:     { unit: 'kg',     placeholder: 'e.g. Maize' },
    Livestock:{ unit: 'heads',  placeholder: 'e.g. Goats' },
    Input:    { unit: 'bags',   placeholder: 'e.g. NPK Fertilizer' },
  };
  const cfg = categoryConfig[buyForm.category] || categoryConfig.Crop;

  const fetchTransactions = () => {
    apiV1('/transactions').then((r) => setTransactions(r.transactions || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTransactions(); }, []);

  async function handlePostBuy(e) {
    e.preventDefault();
    setBuySubmitting(true);
    try {
      await apiV1('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          commodity: buyForm.commodity,
          category: buyForm.category,
          quantity_kg: Number(buyForm.quantity_kg),
          unit_price: Number(buyForm.unit_price),
          buyer_id: user.actor_id,
        }),
      });
      setShowBuyForm(false);
      setBuyForm({ commodity: '', category: 'Crop', quantity_kg: '', unit_price: '' });
      fetchTransactions();
    } catch (err) { alert(err.message); }
    finally { setBuySubmitting(false); }
  }

  const bought = useMemo(() => transactions.filter((t) => t.buyer_id === user.actor_id), [transactions, user]);
  const active = bought.filter((t) => t.status !== 'COMPLETED' && t.status !== 'DISPUTED');
  const totalSpent = bought.reduce((s, t) => s + Number(t.total_amount), 0);
  const filtered = useMemo(() => bought.filter((t) => t.commodity?.toLowerCase().includes(search.toLowerCase())), [bought, search]);

  if (loading) return <Loading />;

  return (
    <Page title="Aggregator Dashboard" subtitle="Source, purchase, and coordinate logistics."
      action={
        <button className="primary-button" onClick={() => setShowBuyForm(!showBuyForm)}>
          <Plus size={18} /> {showBuyForm ? 'Cancel' : 'Post buy request'}
        </button>
      }
    >
      <div className="metrics-grid">
        <Metric label="Active purchases" value={active.length} note="In progress" icon={ShoppingCart} />
        <Metric label="Completed" value={bought.length - active.length} note="Delivered" icon={Package} />
        <Metric label="Total spent" value={money(totalSpent)} note="Lifetime procurement" icon={Wallet} />
        <Metric label="Suppliers" value={new Set(bought.map((t) => t.seller_id)).size} note="Unique farmers" icon={Users} />
      </div>

      {showBuyForm && (
        <form onSubmit={handlePostBuy} className="inline-form">
          <h3><ShoppingCart size={18} /> Post a buy request</h3>
          <div className="form-grid">
            <label>
              Category
              <select value={buyForm.category} onChange={(e) => setBuyForm({ ...buyForm, category: e.target.value })}>
                <option value="Crop">Crop</option>
                <option value="Livestock">Livestock</option>
                <option value="Input">Input</option>
              </select>
            </label>
            <label>Commodity <input value={buyForm.commodity} onChange={(e) => setBuyForm({ ...buyForm, commodity: e.target.value })} placeholder={cfg.placeholder} required /></label>
            <label>Quantity ({cfg.unit}) <input type="number" value={buyForm.quantity_kg} onChange={(e) => setBuyForm({ ...buyForm, quantity_kg: e.target.value })} min={1} required /></label>
            <label>Offered price (₦/{cfg.unit}) <input type="number" value={buyForm.unit_price} onChange={(e) => setBuyForm({ ...buyForm, unit_price: e.target.value })} min={1} required /></label>
          </div>
          <button className="primary-button" disabled={buySubmitting}>
            {buySubmitting ? 'Posting...' : <><ArrowDownLeft size={18} /> Post buy request</>}
          </button>
        </form>
      )}

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
                    <td>{Number(t.quantity_kg).toLocaleString()} {displayUnit(t.category)}</td>
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
