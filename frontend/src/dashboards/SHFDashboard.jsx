import { useEffect, useState } from 'react';
import { ArrowUpRight, Clover, DollarSign, Layers, PackageOpen, Plus, Sprout, Wallet } from 'lucide-react';
import { api, apiV1, money } from '../api';
import Page, { Loading, Empty } from '../components/Page';
import Metric from '../components/Metric';

export default function SHFDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ commodity: '', quantity_kg: '', unit_price: '', buyer_id: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiV1('/transactions').then((r) => setTransactions(r.transactions || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handlePostSell(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiV1('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          commodity: form.commodity,
          quantity_kg: Number(form.quantity_kg),
          unit_price: Number(form.unit_price),
          buyer_id: form.buyer_id || null,
          seller_id: user.actor_id,
        }),
      });
      setShowForm(false);
      setForm({ commodity: '', quantity_kg: '', unit_price: '', buyer_id: '' });
      const r = await apiV1('/transactions');
      setTransactions(r.transactions || []);
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  }

  const sold = transactions.filter((t) => t.seller_id === user.actor_id);
  const pending = sold.filter((t) => t.status === 'INITIATED' || t.status === 'IN_ESCROW');
  const completed = sold.filter((t) => t.status === 'COMPLETED');
  const totalEarned = completed.reduce((s, t) => s + Number(t.total_amount), 0);

  if (loading) return <Loading />;

  return (
    <Page
      title="My Farm Dashboard"
      subtitle="Post harvests, track offers, and monitor payouts."
      action={
        <button className="primary-button" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'Post harvest'}
        </button>
      }
    >
      <div className="metrics-grid">
        <Metric label="Active listings" value={pending.length} note="Awaiting sale" icon={Sprout} />
        <Metric label="Completed sales" value={completed.length} note="Paid out" icon={DollarSign} />
        <Metric label="Total earned" value={money(totalEarned)} note="Lifetime revenue" icon={Wallet} />
        <Metric label="Crops" value={new Set(sold.map((t) => t.commodity)).size} note="Unique varieties" icon={Layers} />
      </div>

      {showForm && (
        <form onSubmit={handlePostSell} className="inline-form">
          <h3><Clover size={18} /> Post a harvest for sale</h3>
          <div className="form-grid">
            <label>Commodity <input value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })} placeholder="e.g. Maize" required /></label>
            <label>Quantity (kg) <input type="number" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} min={1} required /></label>
            <label>Unit price (₦/kg) <input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} min={1} required /></label>
            <label>Buyer (optional) <input value={form.buyer_id} onChange={(e) => setForm({ ...form, buyer_id: e.target.value })} placeholder="Aggregator actor ID" /></label>
          </div>
          <button className="primary-button" disabled={submitting}>
            {submitting ? 'Posting...' : <><ArrowUpRight size={18} /> List for sale</>}
          </button>
        </form>
      )}

      <div className="panel">
        <div className="panel-head"><div><h2>My transaction history</h2></div></div>
        {sold.length === 0 ? <Empty /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Commodity</th><th>Qty (kg)</th><th>Unit price</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {sold.map((t) => (
                  <tr key={t.tx_id}>
                    <td><strong>{t.commodity}</strong></td>
                    <td>{t.quantity_kg}</td>
                    <td>{money(t.unit_price)}</td>
                    <td>{money(t.total_amount)}</td>
                    <td><span className={`status-badge ${t.status === 'COMPLETED' ? 'success' : t.status === 'INITIATED' ? 'warning' : 'info'}`}>{t.status}</span></td>
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
