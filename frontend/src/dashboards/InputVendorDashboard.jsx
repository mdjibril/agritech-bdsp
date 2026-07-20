import { useEffect, useState } from 'react';
import { Bell, ClipboardList, Package, PackageOpen, Plus, Search, Sprout, Wallet } from 'lucide-react';
import { apiV1, money } from '../api';
import { displayUnit } from '../utils';
import Page, { Loading, Empty } from '../components/Page';
import Metric from '../components/Metric';
import StatusBadge from '../components/StatusBadge';

export default function InputVendorDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ commodity: '', category: 'Input', quantity_kg: '', unit_price: '', buyer_id: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiV1('/transactions').then((r) => setTransactions(r.transactions || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handlePost(e) {
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
  const orders = sold.filter((t) => t.status === 'INITIATED' || t.status === 'IN_ESCROW');
  const revenue = sold.filter((t) => t.status === 'COMPLETED').reduce((s, t) => s + Number(t.total_amount) - Number(t.commission_v4v || 0) - Number(t.commission_bdsp || 0), 0);

  if (loading) return <Loading />;

  return (
    <Page
      title="Input Vendor Portal"
      subtitle="Manage inventory, receive orders, and track sales."
      action={
        <button className="primary-button" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'Add listing'}
        </button>
      }
    >
      <div className="metrics-grid">
        <Metric label="Active orders" value={orders.length} note="Pending fulfillment" icon={Bell} />
        <Metric label="Listings" value={sold.length} note="Total posted" icon={PackageOpen} />
        <Metric label="Revenue" value={money(revenue)} note="Completed sales" icon={Wallet} />
        <Metric label="Inventory" value={new Set(sold.map((t) => t.commodity)).size} note="Products" icon={Sprout} />
      </div>

      {showForm && (
        <form onSubmit={handlePost} className="inline-form">
          <h3><Package size={18} /> List input product</h3>
          <div className="form-grid">
            <label>Product name <input value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })} placeholder="e.g. NPK Fertilizer" required /></label>
            <label>Quantity (kg) <input type="number" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} min={1} required /></label>
            <label>Unit price (₦/kg) <input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} min={1} required /></label>
            <label>Buyer (optional) <input value={form.buyer_id} onChange={(e) => setForm({ ...form, buyer_id: e.target.value })} placeholder="Buyer actor ID" /></label>
          </div>
          <button className="primary-button" disabled={submitting}>{submitting ? 'Posting...' : 'List product'}</button>
        </form>
      )}

      <div className="panel">
        <div className="panel-head"><div><h2>Transaction history</h2></div></div>
        {sold.length === 0 ? <Empty /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Qty</th><th>Total</th><th>Buyer</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {sold.map((t) => (
                  <tr key={t.tx_id}>
                    <td><strong>{t.commodity}</strong></td>
                    <td>{Number(t.quantity_kg).toLocaleString()} {displayUnit(t.category)}</td>
                    <td>{money(t.total_amount)}</td>
                    <td>{t.buyer_name || `#${t.buyer_id}`}</td>
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
