import { useState } from 'react';
import { BarChart3, Download, FileText, GraduationCap, LoaderCircle, PackageOpen, TrendingUp, Users, DollarSign, Shield } from 'lucide-react';
import { apiV1, money } from './api';
import { displayUnit } from './utils';
import Page, { Loading, Empty } from './components/Page';
import StatusBadge from './components/StatusBadge';

const ROLE_LABELS = {
  SHF: 'Smallholder Farmer',
  AGGREGATOR: 'Aggregator',
  INPUT_VENDOR: 'Input Vendor',
  LOGISTICS: 'Logistics Partner',
  BDSP: 'Certified BDSP',
  KBS: 'KBS Staff',
  AGRA: 'AGRA Partner',
  INVESTOR: 'Investor',
  V4V_ADMIN: 'V4V Admin',
};

const REPORT_TYPES = {
  completed: { label: 'Completed Transactions', icon: FileText, roles: ['KBS', 'AGRA', 'V4V_ADMIN'] },
  farmers: { label: 'Farmer Participation', icon: Users, roles: ['KBS', 'V4V_ADMIN'] },
  financial: { label: 'Financial Summary', icon: DollarSign, roles: ['V4V_ADMIN'] },
};

function csv(data, fields) {
  const header = fields.map((f) => f.label).join(',');
  const rows = data.map((row) => fields.map((f) => {
    const val = f.get(row);
    return typeof val === 'string' && (val.includes(',') || val.includes('"')) ? `"${val}"` : val;
  }).join(','));
  return [header, ...rows].join('\n');
}

export default function ReportsView({ user }) {
  const [report, setReport] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState({ start: '', end: '' });

  const available = Object.entries(REPORT_TYPES)
    .filter(([, v]) => v.roles.includes(user.actor_type))
    .map(([k, v]) => ({ key: k, ...v }));

  async function generate(key) {
    setReport(key);
    setLoading(true);
    setData(null);
    try {
      const params = new URLSearchParams();
      if (dates.start) params.set('start_date', dates.start);
      if (dates.end) params.set('end_date', dates.end);
      const qs = params.toString();
      const url = key === 'completed' ? `/reports/completed-transactions${qs ? '?' + qs : ''}`
        : key === 'farmers' ? '/reports/farmer-participation'
        : `/reports/financial-summary${qs ? '?' + qs : ''}`;
      const result = await apiV1(url);
      setData(result);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv(filename, content) {
    const blob = new Blob([content], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Page title="Reports" subtitle="Performance reports and data exports">
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head"><div><h2>Available reports</h2></div></div>
        {(report === 'completed' || report === 'financial') && (
          <div className="filter-group" style={{ margin: '12px 0' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              From: <input type="date" value={dates.start} onChange={(e) => setDates((d) => ({ ...d, start: e.target.value }))} style={{ padding: '4px 8px', fontSize: 12 }} />
              To: <input type="date" value={dates.end} onChange={(e) => setDates((d) => ({ ...d, end: e.target.value }))} style={{ padding: '4px 8px', fontSize: 12 }} />
            </label>
          </div>
        )}
        <div className="report-list">
          {available.map((r) => (
            <div key={r.key} className="report-item">
              <r.icon size={20} />
              <div><strong>{r.label}</strong><span>{r.description || 'View report data'}</span></div>
              <button className="secondary-button sm" onClick={() => generate(r.key)} disabled={loading}>
                {loading && report === r.key ? <LoaderCircle className="spin" size={14} /> : <BarChart3 size={14} />}
                {' '}{loading && report === r.key ? 'Loading...' : 'Generate'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {data && report === 'completed' && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <div><h2>Completed Transactions</h2><p>{data.summary.total_count} deals completed</p></div>
            <button className="secondary-button sm" onClick={() => downloadCsv('completed-transactions.csv', csv(data.transactions, [
              { label: 'ID', get: (r) => r.tx_id },
              { label: 'Commodity', get: (r) => r.commodity },
              { label: 'Quantity', get: (r) => r.quantity_kg },
              { label: 'Total Amount', get: (r) => r.total_amount },
              { label: 'Buyer', get: (r) => r.buyer_name },
              { label: 'Seller', get: (r) => r.seller_name },
              { label: 'Logistics', get: (r) => r.logistics_name || '' },
              { label: 'V4V Fee', get: (r) => r.commission_v4v },
              { label: 'BDSP Fee', get: (r) => r.commission_bdsp },
              { label: 'Completed', get: (r) => new Date(r.updated_at).toLocaleDateString('en-NG') },
            ]))}><Download size={14} /> Export CSV</button>
          </div>
          <div className="metrics-grid" style={{ marginBottom: 16 }}>
            <div className="metric"><div className="metric-icon"><PackageOpen size={20} /></div><div><span>Total volume</span><strong>{data.summary.total_volume.toLocaleString()} kg</strong></div></div>
            <div className="metric"><div className="metric-icon"><TrendingUp size={20} /></div><div><span>Total value</span><strong>{money(data.summary.total_value)}</strong></div></div>
            <div className="metric"><div className="metric-icon"><Shield size={20} /></div><div><span>V4V revenue</span><strong>{money(data.summary.total_v4v)}</strong></div></div>
            <div className="metric"><div className="metric-icon"><Users size={20} /></div><div><span>BDSP commissions</span><strong>{money(data.summary.total_bdsp)}</strong></div></div>
          </div>
          {data.transactions.length === 0 ? <Empty /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Commodity</th><th>Qty</th><th>Amount</th><th>Buyer</th><th>Seller</th><th>Logistics</th><th>V4V</th><th>BDSP</th><th>Date</th></tr></thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.tx_id}>
                      <td><strong>#{t.tx_id}</strong></td>
                      <td>{t.commodity}</td>
                      <td>{Number(t.quantity_kg).toLocaleString()} {displayUnit(t.category)}</td>
                      <td>{money(t.total_amount)}</td>
                      <td>{t.buyer_name}</td>
                      <td>{t.seller_name}</td>
                      <td>{t.logistics_name || '—'}</td>
                      <td>{money(t.commission_v4v)}</td>
                      <td>{money(t.commission_bdsp)}</td>
                      <td>{new Date(t.updated_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {data && report === 'farmers' && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <div><h2>Farmer Participation</h2><p>{data.summary.total_shfs} registered SHFs</p></div>
            <button className="secondary-button sm" onClick={() => downloadCsv('farmer-participation.csv', csv(data.farmers, [
              { label: 'ID', get: (r) => r.actor_id },
              { label: 'Name', get: (r) => r.full_name },
              { label: 'Phone', get: (r) => r.phone },
              { label: 'Gender', get: (r) => r.gender },
              { label: 'LGA', get: (r) => r.lga },
              { label: 'State', get: (r) => r.state },
              { label: 'Completed Sale', get: (r) => r.has_completed_sale ? 'Yes' : 'No' },
              { label: 'Repeat Seller', get: (r) => r.is_repeat_seller ? 'Yes' : 'No' },
              { label: 'Registered', get: (r) => new Date(r.registered_at).toLocaleDateString('en-NG') },
            ]))}><Download size={14} /> Export CSV</button>
          </div>
          <div className="metrics-grid" style={{ marginBottom: 16 }}>
            <div className="metric"><div className="metric-icon"><Users size={20} /></div><div><span>Total SHFs</span><strong>{data.summary.total_shfs}</strong></div></div>
            <div className="metric"><div className="metric-icon"><GraduationCap size={20} /></div><div><span>Active sellers</span><strong>{data.summary.active_sellers}</strong><small>Completed ≥1 sale</small></div></div>
            <div className="metric"><div className="metric-icon"><TrendingUp size={20} /></div><div><span>Repeat sellers</span><strong>{data.summary.repeat_sellers}</strong><small>Completed &gt;1 sale</small></div></div>
          </div>
          {data.farmers.length === 0 ? <Empty /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Gender</th><th>LGA</th><th>Active</th><th>Repeat</th><th>Registered</th></tr></thead>
                <tbody>
                  {data.farmers.map((f) => (
                    <tr key={f.actor_id}>
                      <td><strong>{f.actor_id}</strong></td>
                      <td>{f.full_name}</td>
                      <td>{f.phone}</td>
                      <td>{f.gender}</td>
                      <td>{f.lga}</td>
                      <td>{f.has_completed_sale ? <span className="status-badge success">Yes</span> : <span className="status-badge muted">No</span>}</td>
                      <td>{f.is_repeat_seller ? <span className="status-badge info">Yes</span> : <span className="status-badge muted">No</span>}</td>
                      <td>{new Date(f.registered_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {data && report === 'financial' && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <div><h2>Financial Summary</h2><p>Revenue and escrow overview</p></div>
            <button className="secondary-button sm" onClick={() => downloadCsv('financial-summary.csv', csv(data.by_status, [
              { label: 'Status', get: (r) => r.status },
              { label: 'Count', get: (r) => r.count },
              { label: 'Total Value', get: (r) => r.total_value },
              { label: 'V4V Revenue', get: (r) => r.total_v4v },
              { label: 'BDSP Commission', get: (r) => r.total_bdsp },
            ]))}><Download size={14} /> Export CSV</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, marginBottom: 16 }}>
            <section>
              <h3 style={{ marginBottom: 8, font: '700 15px Georgia,serif' }}>By Status</h3>
              {data.by_status.length === 0 ? <Empty /> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Status</th><th>Count</th><th>Value</th><th>V4V</th><th>BDSP</th></tr></thead>
                    <tbody>
                      {data.by_status.map((s) => (
                        <tr key={s.status}>
                          <td><StatusBadge status={s.status} /></td>
                          <td>{s.count}</td>
                          <td>{money(s.total_value)}</td>
                          <td>{money(s.total_v4v)}</td>
                          <td>{money(s.total_bdsp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section>
              <h3 style={{ marginBottom: 8, font: '700 15px Georgia,serif' }}>Escrow Status</h3>
              {data.escrow.length === 0 ? <Empty /> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Status</th><th>Count</th><th>Total Held</th></tr></thead>
                    <tbody>
                      {data.escrow.map((e) => (
                        <tr key={e.status}>
                          <td><StatusBadge status={e.status} /></td>
                          <td>{e.count}</td>
                          <td>{money(e.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </Page>
  );
}
