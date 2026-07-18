import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Download, FileText, RefreshCcw, Search, Server, Shield, Users, Wallet } from 'lucide-react';
import { apiV1, money } from '../api';
import Page, { Loading } from '../components/Page';
import Metric from '../components/Metric';
import StatusBadge from '../components/StatusBadge';

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

const STATUS_OPTIONS = ['all', 'COMPLETED', 'ENROLLED', 'FAILED'];
const GENDER_OPTIONS = ['all', 'MALE', 'FEMALE', 'OTHER'];

export default function V4VAdminDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [courses, setCourses] = useState([]);
  const [trainingRecords, setTrainingRecords] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [showTrainingReport, setShowTrainingReport] = useState(false);

  useEffect(() => {
    Promise.all([
      apiV1('/transactions').then((r) => r.transactions || []),
      apiV1('/actors').then((r) => r.actors || []).catch(() => []),
      apiV1('/training-records/courses').then((r) => r.courses || []).catch(() => []),
      apiV1('/training-records').then((r) => r.records || []).catch(() => []),
    ]).then(([txs, acts, coursesData, records]) => {
      setTransactions(txs);
      setActors(acts);
      setCourses(coursesData);
      setTrainingRecords(records);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const escrows = transactions.filter((t) => t.escrow_required);
  const activeEscrows = escrows.filter((t) => t.status === 'IN_ESCROW');
  const disputed = transactions.filter((t) => t.status === 'DISPUTED');
  const totalV4V = transactions.reduce((s, t) => s + Number(t.commission_v4v || 0), 0);
  const totalBdsp = transactions.reduce((s, t) => s + Number(t.commission_bdsp || 0), 0);

  const filtered = filter === 'all' ? transactions
    : filter === 'disputed' ? disputed
    : filter === 'active' ? transactions.filter((t) => t.status !== 'COMPLETED' && t.status !== 'DISPUTED')
    : transactions;

  const roleCounts = {};
  for (const a of actors) {
    roleCounts[a.actor_type] = (roleCounts[a.actor_type] || 0) + 1;
  }

  const bdsps = actors.filter((a) => a.actor_type === 'BDSP');
  const platformBdsp = bdsps.filter((a) => a.is_platform);
  const normalBdsps = bdsps.filter((a) => !a.is_platform);
  const shfCount = roleCounts['SHF'] || 0;
  const underPlatform = actors.filter((a) => a.actor_type === 'SHF' && a.bdsp_id === 1).length;

  const recentActivity = [...transactions]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 10);

  const filteredActors = roleFilter === 'all' ? actors : actors.filter((a) => a.actor_type === roleFilter);
  const uniqueRoles = [...new Set(actors.map((a) => a.actor_type))];

  const filteredTrainingRecords = trainingRecords.filter((r) =>
    (selectedCourse === 'all' || r.course_name === selectedCourse) &&
    (statusFilter === 'all' || r.status === statusFilter) &&
    (genderFilter === 'all' || r.gender === genderFilter)
  );

  function exportTrainingCSV() {
    const headers = ['Name', 'Phone', 'Role', 'Gender', 'Course', 'Provider', 'Status', 'LGA', 'State', 'Enrolled'];
    const rows = filteredTrainingRecords.map((r) => [
      r.full_name,
      r.phone,
      r.actor_type,
      r.gender || 'N/A',
      r.course_name,
      r.provider,
      r.status,
      r.lga,
      r.state,
      new Date(r.created_at).toLocaleDateString('en-NG'),
    ]);
    
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-report-${selectedCourse === 'all' ? 'all-courses' : selectedCourse.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page title="V4V Admin Console" subtitle="System control, escrow oversight, user registry, and health monitoring.">
      <div className="metrics-grid">
        <Metric label="Total transactions" value={transactions.length} note="System-wide" icon={Activity} />
        <Metric label="Active escrows" value={activeEscrows.length} note="Funds held" icon={Wallet} />
        <Metric label="Disputed" value={disputed.length} note="Needs attention" icon={AlertTriangle} />
        <Metric label="Registered users" value={actors.length} note="All roles" icon={Users} />
      </div>

      <div className="two-column" style={{ marginBottom: 20 }}>
        <section className="panel">
          <div className="panel-head"><div><h2>System health</h2><p>Platform status</p></div></div>
          <div className="health-list">
            {[
              { label: 'API Server', status: 'Operational', icon: Server },
              { label: 'Database', status: 'Connected', icon: Server },
              { label: 'Escrow Engine', status: 'Active', icon: Wallet },
              { label: 'Audit Logging', status: 'NDPC-compliant', icon: Shield },
              { label: 'Document Engine', status: 'Ready', icon: Activity },
            ].map((h) => (
              <div key={h.label} className="health-item">
                <h.icon size={18} />
                <span>{h.label}</span>
                <span className="status-badge success">{h.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Commission ledger</h2><p>Revenue & distribution</p></div></div>
          <div className="allocation" style={{ flexDirection: 'column', display: 'flex' }}>
            <div><span>V4V revenue</span><strong>{money(totalV4V)}</strong><small>70% platform fee share</small></div>
            <div><span>BDSP commissions</span><strong>{money(totalBdsp)}</strong><small>30% network share</small></div>
            <div><span>Total escrow held</span><strong>{money(activeEscrows.reduce((s, t) => s + Number(t.total_amount), 0))}</strong><small>{activeEscrows.length} active holds</small></div>
            <div><span>Mean deal value</span><strong>{money(transactions.length ? transactions.reduce((s, t) => s + Number(t.total_amount), 0) / transactions.length : 0)}</strong><small>Per transaction</small></div>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head"><div><h2>BDSP Network</h2><p>{bdsps.length} total BDSPs — {platformBdsp.length} Platform, {normalBdsps.length} Normal</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Actor ID</th><th>Name</th><th>Type</th><th>SHF under</th><th>Wallet</th><th>Joined</th></tr></thead>
            <tbody>
              {bdsps.map((b) => {
                const under = actors.filter((a) => a.actor_type === 'SHF' && a.bdsp_id === b.actor_id).length;
                return (
                  <tr key={b.actor_id}>
                    <td><strong>{b.actor_id}</strong></td>
                    <td>{b.full_name}</td>
                    <td><span className="role-chip">{b.is_platform ? 'Platform BDSP' : 'Certified BDSP'}</span></td>
                    <td>{under} farmers</td>
                    <td>{money(b.wallet_balance)}</td>
                    <td>{new Date(b.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head"><div><h2>User registry</h2><p>All registered actors — {actors.length} total ({underPlatform} under Platform BDSP)</p></div></div>
        {actors.length === 0 ? <p className="muted-text">No users found</p> : (
          <>
            <div className="filter-group" style={{ marginBottom: 16 }}>
              <button className={`filter-chip ${roleFilter === 'all' ? 'active' : ''}`} onClick={() => setRoleFilter('all')}>All ({actors.length})</button>
              {uniqueRoles.map((role) => (
                <button key={role} className={`filter-chip ${roleFilter === role ? 'active' : ''}`} onClick={() => setRoleFilter(role)}>{ROLE_LABELS[role] || role} ({roleCounts[role]})</button>
              ))}
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Actor ID</th><th>Name</th><th>Phone</th><th>Role</th><th>Gender</th><th>KYC</th><th>LGA</th><th>BDSP ID</th><th>Wallet</th><th>Joined</th></tr></thead>
                <tbody>
                  {filteredActors.map((a) => (
                    <tr key={a.actor_id}>
                      <td><strong>{a.actor_id}</strong></td>
                      <td>{a.full_name}</td>
                      <td>{a.phone}</td>
                      <td><span className="role-chip">{ROLE_LABELS[a.actor_type] || a.actor_type}</span></td>
                      <td>{a.gender}</td>
                      <td><StatusBadge status={a.kyc_status} /></td>
                      <td>{a.lga}</td>
                      <td>{a.bdsp_id ? `${a.bdsp_id}${bdsps.find((b) => b.actor_id === a.bdsp_id)?.is_platform ? ' (Platform)' : ''}` : '—'}</td>
                      <td>{money(a.wallet_balance)}</td>
                      <td>{new Date(a.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head"><div><h2>Training hub overview</h2><p>KBS training enrollment & certification</p></div></div>
        {courses.length === 0 ? <p className="muted-text" style={{ padding: 16 }}>No training data yet.</p> : (
          <div className="kbs-courses" style={{ padding: '0 20px 20px' }}>
            {courses.map((c) => (
              <div key={c.course_name} className="course-card">
                <div className="course-icon"><FileText size={20} /></div>
                <div>
                  <strong>{c.course_name}</strong>
                  <span>{c.provider} · {Number(c.total_enrolled)} enrolled · {Number(c.completed)} certified · ♂{Number(c.male)} ♀{Number(c.female)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head"><div><h2>Escrow ledger</h2><p>All transactions requiring escrow</p></div></div>
        <div className="filter-group" style={{ marginBottom: 16 }}>
          {['all', 'active', 'disputed'].map((f) => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Commodity</th><th>Amount</th><th>V4V Fee</th><th>BDSP Fee</th><th>Status</th><th>Escrow</th></tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.tx_id}>
                  <td><strong>#{t.tx_id}</strong></td>
                  <td>{t.commodity}</td>
                  <td>{money(t.total_amount)}</td>
                  <td>{money(t.commission_v4v)}</td>
                  <td>{money(t.commission_bdsp)}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>{t.escrow_required ? <span className="status-badge warning">Held</span> : <span className="muted-text">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div><h2>Training reports</h2><p>Generate reports by course, status, and demographics</p></div>
          <button className="secondary-button" onClick={() => setShowTrainingReport(!showTrainingReport)}>
            <FileText size={16} /> {showTrainingReport ? 'Hide report' : 'Generate report'}
          </button>
        </div>
        {showTrainingReport && (
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Course:</span>
                <select 
                  value={selectedCourse} 
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                >
                  <option value="all">All courses</option>
                  {courses.map((c) => (
                    <option key={c.course_name} value={c.course_name}>{c.course_name}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Status:</span>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Gender:</span>
                <select 
                  value={genderFilter} 
                  onChange={(e) => setGenderFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g === 'all' ? 'All genders' : g.charAt(0) + g.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </label>
              <button className="primary-button" onClick={exportTrainingCSV}>
                <Download size={16} /> Export CSV
              </button>
            </div>
            <p className="muted-text" style={{ marginBottom: 12 }}>
              Showing {filteredTrainingRecords.length} record{filteredTrainingRecords.length !== 1 ? 's' : ''}
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Gender</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>LGA</th>
                    <th>Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainingRecords.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20 }} className="muted-text">No records match the selected filters</td></tr>
                  ) : filteredTrainingRecords.map((r) => (
                    <tr key={r.record_id}>
                      <td><strong>{r.full_name}</strong></td>
                      <td>{r.phone}</td>
                      <td><span className="role-chip">{r.actor_type}</span></td>
                      <td>{r.gender || 'N/A'}</td>
                      <td>{r.course_name}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{r.lga}</td>
                      <td>{new Date(r.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><div><h2>Recent activity</h2><p>Latest updates across the platform</p></div></div>
        {recentActivity.length === 0 ? <p className="muted-text">No activity yet</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>Commodity</th><th>Amount</th><th>Buyer</th><th>Seller</th><th>Status</th></tr></thead>
              <tbody>
                {recentActivity.map((t) => (
                  <tr key={t.tx_id}>
                    <td>{new Date(t.updated_at || t.created_at).toLocaleString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td><strong>{t.commodity}</strong></td>
                    <td>{money(t.total_amount)}</td>
                    <td>{t.buyer_name || `#${t.buyer_id}`}</td>
                    <td>{t.seller_name || `#${t.seller_id}`}</td>
                    <td><StatusBadge status={t.status} /></td>
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
