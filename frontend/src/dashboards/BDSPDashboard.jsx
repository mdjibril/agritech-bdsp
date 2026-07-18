import { useState, useEffect } from 'react';
import { ArrowDownLeft, BarChart3, Network, PackageOpen, Plus, Search, ShoppingCart, UserPlus, Users, WalletCards } from 'lucide-react';
import { api, apiV1, money } from '../api';
import Page, { Loading, Empty } from '../components/Page';
import Metric from '../components/Metric';
import PanelHead from '../components/PanelHead';

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export default function BDSPDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [buyForm, setBuyForm] = useState({ commodity: '', category: 'Crop', quantity_kg: '', unit_price: '' });
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ full_name: '', phone: '', password: '', gender: 'MALE', area: '' });
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState('');

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

  async function handleEnroll(e) {
    e.preventDefault();
    setEnrollSubmitting(true);
    setEnrollMessage('');
    try {
      const r = await apiV1('/auth/enroll-farmer', {
        method: 'POST',
        body: JSON.stringify({
          full_name: enrollForm.full_name,
          phone: enrollForm.phone,
          password: enrollForm.password,
          gender: enrollForm.gender,
          bank_name: 'Not provided',
          account_number: '0000000000',
          lga: enrollForm.area || 'Chikun',
          state: 'Kaduna',
        }),
      });
      setEnrollMessage(`Farmer enrolled: ${r.farmer.full_name} (ID: ${r.farmer.actor_id})`);
      setEnrollForm({ full_name: '', phone: '', password: '', gender: 'MALE', area: '' });
      setShowEnrollForm(false);
      // Refresh network data
      api('/bdsp/network').then(setData).catch(() => {});
    } catch (err) { setEnrollMessage(`Error: ${err.message}`); }
    finally { setEnrollSubmitting(false); }
  }

  useEffect(() => {
    api('/bdsp/network').then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <Empty />;

  const metrics = data.metrics;
  const active = metrics?.active_listings || 0;
  const gender = metrics?.gender_counts || {};
  const total = metrics?.member_count || 1;
  const members = (data.members || []).filter((m) =>
    `${m.full_name} ${m.user_id} ${m.primary_role} ${m.ward} ${(m.commodities || []).join(' ')}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Page title="BDSP Network" subtitle={`${user.is_platform ? 'Platform BDSP — all self-enrolled farmers land here' : 'Your downline network — members, commissions, and KPIs.'}`}
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          {!user.is_platform && (
            <button className="secondary-button" onClick={() => setShowEnrollForm(!showEnrollForm)}>
              <UserPlus size={18} /> {showEnrollForm ? 'Cancel' : 'Enroll farmer'}
            </button>
          )}
          <button className="primary-button" onClick={() => setShowBuyForm(!showBuyForm)}>
            <Plus size={18} /> {showBuyForm ? 'Cancel' : 'Post buy request'}
          </button>
        </div>
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
      {showEnrollForm && (
        <form onSubmit={handleEnroll} className="inline-form">
          <h3><UserPlus size={18} /> Enroll a farmer under your network</h3>
          <div className="form-grid">
            <label>Full name <input value={enrollForm.full_name} onChange={(e) => setEnrollForm({ ...enrollForm, full_name: e.target.value })} placeholder="e.g. Chukwuma Okeke" required /></label>
            <label>Phone <input value={enrollForm.phone} onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })} placeholder="+234..." required /></label>
            <label>Password <input type="password" value={enrollForm.password} onChange={(e) => setEnrollForm({ ...enrollForm, password: e.target.value })} placeholder="Set a password" required /></label>
            <label>Gender
              <select value={enrollForm.gender} onChange={(e) => setEnrollForm({ ...enrollForm, gender: e.target.value })}>
                {GENDERS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
            <label>Area/LGA (optional) <input value={enrollForm.area} onChange={(e) => setEnrollForm({ ...enrollForm, area: e.target.value })} placeholder="e.g. Chikun" /></label>
          </div>
          {enrollMessage && (
            <div className={enrollMessage.startsWith('Error') ? 'error-banner' : 'release-banner'} style={{ marginBottom: 12 }}>
              {enrollMessage}
            </div>
          )}
          <button className="primary-button" disabled={enrollSubmitting}>
            {enrollSubmitting ? 'Enrolling...' : <><UserPlus size={18} /> Enroll farmer</>}
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
                    <td><strong>{m.full_name}</strong><span>ID: {m.user_id}</span></td>
                    <td><span className="role-chip">{m.primary_role}</span></td>
                    <td>{m.gender}</td>
                    <td>{m.ward || 'Not set'}</td>
                    <td>{(m.commodities || []).slice(0, 3).join(', ') || 'No activity yet'}</td>
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
