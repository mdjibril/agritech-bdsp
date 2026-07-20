import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, CheckCircle2, Clover, DollarSign, GraduationCap, Layers, LoaderCircle, Plus, Sprout, Wallet } from 'lucide-react';
import { apiV1, money } from '../api';
import { displayUnit } from '../utils';
import Page, { Loading, Empty } from '../components/Page';
import Metric from '../components/Metric';

export default function SHFDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ commodity: '', category: 'Crop', quantity_kg: '', unit_price: '', buyer_id: '' });

  const categoryConfig = {
    Crop:     { unit: 'kg', placeholder: 'e.g. Maize' },
    Livestock:{ unit: 'kg', placeholder: 'e.g. Beef' },
    Input:    { unit: 'kg', placeholder: 'e.g. NPK Fertilizer' },
  };
  const cfg = categoryConfig[form.category] || categoryConfig.Crop;
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null);

  useEffect(() => {
    apiV1('/transactions').then((r) => setTransactions(r.transactions || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiV1('/training-records/courses')
      .then((r) => setCourses(r.courses || []))
      .catch(() => {})
      .finally(() => setCoursesLoading(false));
  }, []);

  async function handleEnroll(courseName) {
    setEnrolling(courseName);
    try {
      await apiV1('/training-records/enroll', {
        method: 'POST',
        body: JSON.stringify({ course_name: courseName }),
      });
      const r = await apiV1('/training-records/courses');
      setCourses(r.courses || []);
    } catch (err) { alert(err.message); }
    finally { setEnrolling(null); }
  }

  async function handlePostSell(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiV1('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          commodity: form.commodity,
          category: form.category,
          quantity_kg: Number(form.quantity_kg),
          unit_price: Number(form.unit_price),
          buyer_id: form.buyer_id || null,
          seller_id: user.actor_id,
        }),
      });
      setShowForm(false);
      setForm({ commodity: '', category: 'Crop', quantity_kg: '', unit_price: '', buyer_id: '' });
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
            <label>
              Category
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="Crop">Crop</option>
                <option value="Livestock">Livestock</option>
                <option value="Input">Input</option>
              </select>
            </label>
            <label>Commodity <input value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })} placeholder={cfg.placeholder} required /></label>
            <label>Quantity ({cfg.unit}) <input type="number" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} min={1} required /></label>
            <label>Unit price (₦/{cfg.unit}) <input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} min={1} required /></label>
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
              <thead><tr><th>Commodity</th><th>Qty</th><th>Unit price</th><th>Total</th><th>Logistics</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {sold.map((t) => (
                  <tr key={t.tx_id}>
                    <td><strong>{t.commodity}</strong></td>
                    <td>{Number(t.quantity_kg).toLocaleString()} {displayUnit(t.category)}</td>
                    <td>{money(t.unit_price)}</td>
                    <td><strong>{money(t.total_amount)}</strong></td>
                    <td><span className="muted-text">{t.logistics_name || '—'}</span></td>
                    <td><span className={`status-badge ${t.status === 'COMPLETED' ? 'success' : t.status === 'INITIATED' ? 'warning' : 'info'}`}>{t.status}</span></td>
                    <td>{new Date(t.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head"><div><h2><GraduationCap size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />KBS Training Hub</h2><p>Enroll in courses to build your farming and business skills</p></div></div>
        {coursesLoading ? (
          <div style={{ padding: 20, textAlign: 'center' }}><LoaderCircle className="spin" size={20} /></div>
        ) : courses.length === 0 ? (
          <p className="muted-text" style={{ padding: 20 }}>No courses available</p>
        ) : (
          <div className="kbs-courses" style={{ padding: '0 20px 20px' }}>
            {courses.map((c) => (
              <div key={c.course_name} className="course-card">
                <div className="course-icon"><BookOpen size={20} /></div>
                <div style={{ flex: 1 }}>
                  <strong>{c.course_name}</strong>
                  <span>{c.provider || 'KBS TRAINING HUB'} · {Number(c.total_enrolled)} enrolled</span>
                  {c.my_status ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: c.my_status === 'COMPLETED' ? 'var(--success)' : c.my_status === 'ENROLLED' ? 'var(--accent)' : 'var(--danger)' }}>
                      <CheckCircle2 size={14} /> {c.my_status.charAt(0) + c.my_status.slice(1).toLowerCase()}
                    </span>
                  ) : null}
                </div>
                {!c.my_status && (
                  <button
                    className="primary-button sm"
                    onClick={() => handleEnroll(c.course_name)}
                    disabled={enrolling === c.course_name}
                  >
                    {enrolling === c.course_name ? <LoaderCircle className="spin" size={14} /> : 'Enroll'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
