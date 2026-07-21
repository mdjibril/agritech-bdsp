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
  const [bdspFilter, setBdspFilter] = useState('all');
  const [userPage, setUserPage] = useState(0);
  const PER_PAGE = 20;
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

  useEffect(() => { setUserPage(0); }, [roleFilter, bdspFilter]);

  if (loading) return <Loading />;

  const escrows = transactions.filter((t) => t.escrow_required);
  const activeEscrows = escrows.filter((t) => t.status === 'IN_ESCROW');
  const disputed = transactions.filter((t) => t.status === 'DISPUTED');
  const totalV4V = transactions.reduce((s, t) => s + Number(t.commission_v4v || 0), 0);
  const totalBdsp = transactions.reduce((s, t) => s + Number(t.commission_bdsp || 0), 0);
  const totalMarketplace = transactions.reduce((s, t) => s + Number(t.marketplace_fee || 0), 0);
  const totalLogisticsCoord = transactions.reduce((s, t) => s + Number(t.logistics_coordination_fee || 0), 0);
  const totalInsurancePool = transactions.reduce((s, t) => s + Number(t.insurance_premium || 0), 0);
  const totalGateway = transactions.reduce((s, t) => s + Number(t.gateway_reserve || 0), 0);
  const totalOperations = transactions.reduce((s, t) => s + Number(t.operations_reserve || 0), 0);
  const totalInsuranceProvider = transactions.reduce((s, t) => s + Number(t.insurance_provider_share || 0), 0);

  const filtered = filter === 'all' ? transactions
    : filter === 'disputed' ? disputed
    : filter === 'active' ? transactions.filter((t) => t.status !== 'COMPLETED' && t.status !== 'DISPUTED')
    : filter === 'completed' ? transactions.filter((t) => t.status === 'COMPLETED')
    : transactions;

  const roleCounts = {};
  for (const a of actors) {
    roleCounts[a.actor_type] = (roleCounts[a.actor_type] || 0) + 1;
  }

  const bdsps = actors.filter((a) => a.actor_type === 'BDSP');
  const shfCount = roleCounts['SHF'] || 0;
  const underPlatform = actors.filter((a) => a.actor_type === 'SHF' && a.bdsp_id === 25).length;

  const recentActivity = [...transactions]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 5);

  let filteredActors;
  if (bdspFilter !== 'all') {
    filteredActors = actors.filter((a) => String(a.bdsp_id) === bdspFilter);
  } else if (roleFilter === 'all') {
    filteredActors = actors;
  } else {
    filteredActors = actors.filter((a) => a.actor_type === roleFilter);
  }
  const uniqueRoles = [...new Set(actors.map((a) => a.actor_type))];
  const totalPages = Math.ceil(filteredActors.length / PER_PAGE);
  const paginatedActors = filteredActors.slice(userPage * PER_PAGE, (userPage + 1) * PER_PAGE);

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
          <div className="panel-head"><div><h2>Phase 7 Commission Ledger</h2><p>Revenue & distribution breakdown</p></div></div>
          <div className="allocation" style={{ flexDirection: 'column', display: 'flex' }}>
            <div><span>Marketplace Fee (1%)</span><strong>{money(totalMarketplace)}</strong><small>Buyer-side markup</small></div>
            <div><span>Logistics Coord. (10% of freight)</span><strong>{money(totalLogisticsCoord)}</strong><small>Coordination margin</small></div>
            <div><span>Insurance Pool Total (2%)</span><strong>{money(totalInsurancePool)}</strong><small>{transactions.filter(t => Number(t.insurance_premium) > 0).length} insured txs</small></div>
            <div style={{ paddingLeft: 20, borderLeft: '3px solid var(--accent)', margin: '4px 0' }}>
              <div><span>→ Insurance Provider (80%)</span><strong>{money(totalInsuranceProvider)}</strong><small>NAIC/AXA</small></div>
              <div><span>→ Gateway Reserve (2%)</span><strong>{money(totalGateway)}</strong><small>Processor costs</small></div>
              <div><span>→ BDSP Share (40% of 18%)</span><strong>{money(totalBdsp)}</strong><small>Network commission</small></div>
              <div><span>→ Operations Reserve (20% of 18%)</span><strong>{money(totalOperations)}</strong><small>Infrastructure</small></div>
            </div>
            <div><span>Consolidated V4V Revenue</span><strong>{money(totalV4V)}</strong><small>Mkt fee + logistics coord + V4V insurance share</small></div>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head"><div><h2>BDSP Network</h2><p>{bdsps.length} certified BDSPs</p></div></div>
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
                    <td><span className="role-chip">Certified BDSP</span></td>
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
        <div className="panel-head"><div><h2>User registry</h2><p>All registered actors — {actors.length} total ({underPlatform} under V4V Admin BDSP)</p></div></div>
        {actors.length === 0 ? <p className="muted-text">No users found</p> : (
          <>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Filter by role:</span>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <option value="all">All ({actors.length})</option>
                  {uniqueRoles.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role] || role} ({roleCounts[role]})</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>BDSP ID:</span>
                <select value={bdspFilter} onChange={(e) => setBdspFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <option value="all">All BDSPs</option>
                  {bdsps.map((b) => (
                    <option key={b.actor_id} value={b.actor_id}>{b.full_name} (#{b.actor_id})</option>
                  ))}
                </select>
              </label>
              <span className="muted-text" style={{ marginLeft: 'auto' }}>
                Showing {paginatedActors.length} of {filteredActors.length} users
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Actor ID</th><th>Name</th><th>Phone</th><th>Role</th><th>Gender</th><th>KYC</th><th>LGA</th><th>BDSP ID</th><th>Wallet</th><th>Joined</th></tr></thead>
                <tbody>
                  {paginatedActors.map((a) => (
                    <tr key={a.actor_id}>
                      <td><strong>{a.actor_id}</strong></td>
                      <td>{a.full_name}</td>
                      <td>{a.phone}</td>
                      <td><span className="role-chip">{ROLE_LABELS[a.actor_type] || a.actor_type}</span></td>
                      <td>{a.gender}</td>
                      <td><StatusBadge status={a.kyc_status} /></td>
                      <td>{a.lga}</td>
                      <td>{a.bdsp_id ? `${a.bdsp_id}` : '—'}</td>
                      <td>{money(a.wallet_balance)}</td>
                      <td>{new Date(a.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                <button className="secondary-button sm" disabled={userPage === 0} onClick={() => setUserPage((p) => p - 1)}>← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} className={`filter-chip ${userPage === i ? 'active' : ''}`} onClick={() => setUserPage(i)}>{i + 1}</button>
                ))}
                <button className="secondary-button sm" disabled={userPage >= totalPages - 1} onClick={() => setUserPage((p) => p + 1)}>Next →</button>
              </div>
            )}
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
          {['all', 'active', 'completed', 'disputed'].map((f) => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Commodity</th><th>Base</th><th>Insurance</th><th>Mkt Fee</th><th>Log. Coord</th><th>Total Invoice</th><th>V4V Rev</th><th>BDSP</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.tx_id}>
                  <td><strong>#{t.tx_id}</strong></td>
                  <td>{t.commodity}</td>
                  <td>{money(t.total_amount)}</td>
                  <td>{money(t.insurance_premium)}</td>
                  <td>{money(t.marketplace_fee)}</td>
                  <td>{money(t.logistics_coordination_fee)}</td>
                  <td><strong>{money(Number(t.total_amount) + Number(t.logistics_fee || 0) + Number(t.insurance_premium || 0) + Number(t.marketplace_fee || 0) + Number(t.logistics_coordination_fee || 0))}</strong></td>
                  <td>{money(t.commission_v4v)}</td>
                  <td>{money(t.commission_bdsp)}</td>
                  <td><StatusBadge status={t.status} /></td>
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
