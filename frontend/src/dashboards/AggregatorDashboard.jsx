import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, BarChart3, Package, Plus, Search, ShoppingCart, Truck, Users, Wallet } from 'lucide-react';
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
    Crop:     { unit: 'kg', placeholder: 'e.g. Maize' },
    Livestock:{ unit: 'kg', placeholder: 'e.g. Beef' },
    Input:    { unit: 'kg', placeholder: 'e.g. NPK Fertilizer' },
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

      <div className="two-column" style={{ marginTop: 20 }}>
        <section className="trend-card">
          <div className="risk-header">
            <BarChart3 size={20} />
            <div>
              <strong>Market Trend Forecast (AI)</strong>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Predictive price intelligence for Kaduna markets
              </span>
            </div>
          </div>
          <div className="trend-chart-mock">
            {[30, 55, 42, 68, 48, 75, 60, 90, 72, 85, 65, 95].map((h, i) => (
              <div key={i} className={`trend-bar${i % 3 === 0 ? ' alt' : ''}`} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="trend-labels">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
            <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 12, fontSize: 12 }}>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--green-2)', borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />Maize</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--lime)', borderRadius: 2, verticalAlign: 'middle', marginRight: 6, opacity: .7 }} />Soybean</span>
          </div>
          <button className="primary-button" disabled style={{ width: '100%', justifyContent: 'center' }}>
            Subscribe — ₦1,000/month for 48hr early alerts
          </button>
          <p className="muted-text" style={{ textAlign: 'center', margin: '8px 0 0' }}>Coming soon</p>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Procurement insights</h2><p>Key supplier metrics</p></div></div>
          <div className="allocation" style={{ flexDirection: 'column', display: 'flex' }}>
            <div><span>Avg. unit price</span><strong>{money(bought.length ? totalSpent / bought.reduce((s, t) => s + Number(t.quantity_kg), 0) : 0)}/kg</strong><small>Across all commodities</small></div>
            <div><span>Total volume</span><strong>{bought.reduce((s, t) => s + Number(t.quantity_kg), 0).toLocaleString()} kg</strong><small>Lifetime procurement</small></div>
            <div><span>Top supplier</span><strong>#{bought.length ? [...bought.reduce((m, t) => (m.set(t.seller_id, (m.get(t.seller_id) || 0) + 1), m), new Map()).entries()].sort((a, b) => b[1] - a[1])[0][0] : '—'}</strong><small>Most frequent seller</small></div>
          </div>
        </section>
      </div>
    </Page>
  );
}
