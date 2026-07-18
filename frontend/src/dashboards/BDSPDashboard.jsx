import { useState, useEffect } from 'react';
import { ArrowDownLeft, BarChart3, Network, PackageOpen, Plus, Search, ShoppingCart, Users, WalletCards } from 'lucide-react';
import { api, apiV1, money } from '../api';
import Page, { Loading, Empty } from '../components/Page';
import Metric from '../components/Metric';
import PanelHead from '../components/PanelHead';

export default function BDSPDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [buyForm, setBuyForm] = useState({ commodity: '', category: 'Crop', quantity_kg: '', unit_price: '' });
  const [buySubmitting, setBuySubmitting] = useState(false);

  const categoryConfig = {
    Crop:     { unit: 'kg',     placeholder: 'e.g. Maize' },
    Livestock:{ unit: 'heads',  placeholder: 'e.g. Goats' },
    Input:    { unit: 'bags',   placeholder: 'e.g. NPK Fertilizer' },
  };
  const cfg = categoryConfig[buyForm.category] || categoryConfig.Crop;

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
    } catch (err) { alert(err.message); }
    finally { setBuySubmitting(false); }
  }

  useEffect(() => {
    api('/bdsp/network').then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <Empty />;

  const metrics = data.metrics;
  const active = metrics?.post_summary?.filter((p) => p.status === 'Active').reduce((sum, p) => sum + p.count, 0) || 0;
  const gender = metrics?.gender_counts || {};
  const total = metrics?.member_count || 1;
  const members = (data.members || []).filter((m) =>
    `${m.full_name} ${m.user_id} ${m.primary_role} ${m.ward}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Page title="BDSP Network" subtitle="Your downline network overview — members, commissions, and KPIs."
      action={
        <button className="primary-button" onClick={() => setShowBuyForm(!showBuyForm)}>
          <Plus size={18} /> {showBuyForm ? 'Cancel' : 'Post buy request'}
        </button>
      }
    >
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
      <div className="metrics-grid">
        <Metric label="Network members" value={metrics?.member_count || 0} note="Verified mappings" icon={Users} />
        <Metric label="Active listings" value={active} note="Across member accounts" icon={PackageOpen} />
        <Metric label="Deal value" value={money(metrics?.commission_ledger.total_deal_value)} note={`${metrics?.commission_ledger.deal_count || 0} deals`} icon={WalletCards} />
        <Metric label="My commission" value={money(metrics?.commission_ledger.total_bdsp_commission)} note="30% ledger allocation" icon={BarChart3} />
      </div>

      <div className="two-column">
        <section className="panel">
          <PanelHead title="Gender distribution" note="IFC KPI target ≥ 50% women" />
          {Object.entries(gender).length === 0 ? <Empty /> : (
            <div className="distribution">
              {Object.entries(gender).map(([label, count], i) => (
                <div key={label}>
                  <div className="distribution-label"><span>{label}</span><strong>{count} members</strong></div>
                  <div className="bar"><i className={i ? 'secondary' : ''} style={{ width: `${(count / total) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <PanelHead title="Value allocation" note="Automated commission ledger" />
          <div className="allocation">
            <div><span>V4V revenue</span><strong>{money(metrics?.commission_ledger.total_v4v_revenue)}</strong><small>70% platform allocation</small></div>
            <div><span>BDSP commission</span><strong>{money(metrics?.commission_ledger.total_bdsp_commission)}</strong><small>30% network allocation</small></div>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <PanelHead title="Network members" />
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div className="search"><Search size={18} /><input placeholder="Search members" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <span className="result-count">{members.length} members</span>
        </div>
        {members.length === 0 ? <Empty /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Role</th><th>Gender</th><th>Ward</th><th>Production</th><th>Joined</th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td><strong>{m.full_name}</strong><span>{m.user_id}</span></td>
                    <td><span className="role-chip">{m.primary_role}</span></td>
                    <td>{m.gender}</td>
                    <td>{m.ward || 'Not set'}</td>
                    <td>{[...(m.crops || []), ...(m.livestock || []), ...(m.inputs_sold || [])].slice(0, 2).join(', ') || 'Not specified'}</td>
                    <td>{new Date(m.joined_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
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
