import { useEffect, useState } from 'react';
import { Award, BookOpen, Bot, Download, FileText, GraduationCap, LoaderCircle, Users, X } from 'lucide-react';
import { apiV1, money } from '../api';
import Page, { Loading } from '../components/Page';
import Metric from '../components/Metric';
import StatusBadge from '../components/StatusBadge';

const STATUS_OPTIONS = ['all', 'COMPLETED', 'ENROLLED', 'FAILED'];
const GENDER_OPTIONS = ['all', 'MALE', 'FEMALE', 'OTHER'];

export default function KBSDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [trainingRecords, setTrainingRecords] = useState([]);
  const [actors, setActors] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [showReport, setShowReport] = useState(false);
  const [showImpactReport, setShowImpactReport] = useState(false);

  useEffect(() => {
    Promise.all([
      apiV1('/transactions').then((r) => r.transactions || []),
      apiV1('/training-records/courses').then((r) => r.courses || []),
      apiV1('/training-records').then((r) => r.records || []),
      apiV1('/actors').then((r) => r.actors || []).catch(() => []),
    ]).then(([txs, coursesData, records, actorsData]) => {
      setTransactions(txs);
      setCourses(coursesData);
      setTrainingRecords(records);
      setActors(actorsData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredRecords = trainingRecords.filter((r) =>
    (selectedCourse === 'all' || r.course_name === selectedCourse) &&
    (statusFilter === 'all' || r.status === statusFilter) &&
    (genderFilter === 'all' || r.gender === genderFilter)
  );

  function exportCSV() {
    const headers = ['Name', 'Phone', 'Role', 'Gender', 'Course', 'Provider', 'Status', 'LGA', 'State', 'Enrolled'];
    const rows = filteredRecords.map((r) => [
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

  if (loading) return <Loading />;

  // Original KPIs
  const shfs = actors.filter((a) => a.actor_type === 'SHF');
  const uniqueFarmers = shfs.length;
  const totalVolume = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
  const completedTxs = transactions.filter((t) => t.status === 'COMPLETED');
  const totalCertified = trainingRecords.filter((r) => r.status === 'COMPLETED').length;

  // Training stats
  const totalEnrolled = trainingRecords.length;
  const currentlyEnrolled = trainingRecords.filter((r) => r.status === 'ENROLLED').length;
  const uniqueParticipants = new Set(trainingRecords.map((r) => r.actor_id)).size;
  const certRate = totalEnrolled ? Math.round((totalCertified / totalEnrolled) * 100) : 0;

  return (
    <Page title="KBS Training Hub" subtitle="Digital certification, training records, and performance reports.">
      <div className="metrics-grid">
        <Metric label="Active participants" value={uniqueFarmers} note="Registered farmers" icon={Users} />
        <Metric label="Total volume" value={money(totalVolume)} note="All transactions" icon={BookOpen} />
        <Metric label="Completed" value={completedTxs.length} note={`${transactions.length ? Math.round((completedTxs.length / transactions.length) * 100) : 0}% rate`} icon={Award} />
        <Metric label="Certifications" value={totalCertified} note={`${certRate}% of ${totalEnrolled} enrolled`} icon={GraduationCap} />
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-head"><div><h2>Training programs</h2><p>Available KBS courses</p></div></div>
          <div className="kbs-courses">
            {courses.length > 0 ? courses.map((c) => (
              <div key={c.course_name} className="course-card">
                <div className="course-icon"><BookOpen size={20} /></div>
                <div>
                  <strong>{c.course_name}</strong>
                  <span>{c.provider} · {Number(c.total_enrolled)} enrolled · {Number(c.completed)} certified</span>
                </div>
                <button className="secondary-button sm">Enroll</button>
              </div>
            )) : (
              <p className="muted-text" style={{ padding: 16 }}>No training data yet. Enroll farmers to get started.</p>
            )}
          </div>
          <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
            <button className="primary-button" onClick={() => setShowImpactReport(true)} style={{ width: '100%', justifyContent: 'center' }}>
              <Bot size={18} /> Generate IFAD/AGRA Impact Report (AI)
            </button>
            <p className="muted-text" style={{ marginTop: 8 }}>₦500,000 per comprehensive report — Automated donor KPI reporting</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Performance snapshot</h2><p>Aggregate KPI summary</p></div></div>
          <div className="allocation" style={{ flexDirection: 'column', display: 'flex' }}>
            <div><span>Total transaction value</span><strong>{money(totalVolume)}</strong><small>{transactions.length} transactions</small></div>
            <div><span>Average deal size</span><strong>{money(transactions.length ? totalVolume / transactions.length : 0)}</strong><small>Per transaction</small></div>
            <div><span>Completion rate</span><strong>{transactions.length ? Math.round((completedTxs.length / transactions.length) * 100) : 0}%</strong><small>{completedTxs.length} of {transactions.length} completed</small></div>
          </div>
        </section>
      </div>

      <div className="metrics-grid" style={{ marginTop: 20 }}>
        <Metric label="Total enrollments" value={totalEnrolled} note="Across all courses" icon={BookOpen} />
        <Metric label="Active learners" value={currentlyEnrolled} note="Currently enrolled" icon={Users} />
        <Metric label="Certified" value={totalCertified} note={`${certRate}% certification rate`} icon={Award} />
        <Metric label="Unique participants" value={uniqueParticipants} note={`${courses.length} active courses`} icon={GraduationCap} />
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <div><h2>Training reports</h2><p>Generate reports by course, status, and demographics</p></div>
          <button className="secondary-button" onClick={() => setShowReport(!showReport)}>
            <FileText size={16} /> {showReport ? 'Hide report' : 'Generate report'}
          </button>
        </div>
        {showReport && (
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Course:</span>
                <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <option value="all">All courses</option>
                  {courses.map((c) => (
                    <option key={c.course_name} value={c.course_name}>{c.course_name}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Status:</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Gender:</span>
                <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g === 'all' ? 'All genders' : g.charAt(0) + g.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </label>
              <button className="primary-button" onClick={exportCSV}>
                <Download size={16} /> Export CSV
              </button>
            </div>
            <p className="muted-text" style={{ marginBottom: 12 }}>
              Showing {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
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
                  {filteredRecords.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20 }} className="muted-text">No records match the selected filters</td></tr>
                  ) : filteredRecords.map((r) => (
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

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <div><h2>Recent activity</h2><p>Latest transactions across the network</p></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Commodity</th><th>Value</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {transactions.slice(0, 10).map((t) => (
                <tr key={t.tx_id}>
                  <td><strong>{t.commodity}</strong></td>
                  <td>{money(t.total_amount)}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>{new Date(t.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* IFAD/AGRA Impact Report Modal */}
      {showImpactReport && (
        <div className="modal-overlay" onClick={() => setShowImpactReport(false)}>
          <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3>Generate IFAD/AGRA Impact Report</h3>
              <button className="icon-button" onClick={() => setShowImpactReport(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="muted-text" style={{ marginBottom: 12 }}>
                AI is compiling training records, gender metrics, and transaction data into a comprehensive donor report.
              </p>
              <div className="loading-bar">
                <div className="loading-bar-fill" />
              </div>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                <LoaderCircle className="spin" size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Compiling AI insights...
              </p>
              <div className="report-preview">
                <div className="report-preview-header">
                  <strong>IFAD/AGRA Impact Assessment Report</strong>
                  <span>Generated by V4V AI · Chikun LGA, Kaduna State</span>
                </div>
                <dl>
                  <dt>Total SHFs trained</dt><dd>{uniqueFarmers}</dd>
                  <dt>Women participants</dt><dd>{actors.filter((a) => a.actor_type === 'SHF' && a.gender === 'FEMALE').length} ({Math.round((actors.filter((a) => a.actor_type === 'SHF' && a.gender === 'FEMALE').length / Math.max(1, uniqueFarmers)) * 100)}%)</dd>
                  <dt>Courses delivered</dt><dd>{courses.length}</dd>
                  <dt>Certification rate</dt><dd>{certRate}%</dd>
                  <dt>Total transaction volume</dt><dd>{money(totalVolume)}</dd>
                  <dt>Completed transactions</dt><dd>{completedTxs.length}</dd>
                </dl>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="primary-button" disabled style={{ flex: 1, justifyContent: 'center' }}>
                  <Download size={16} /> Generate Report (₦500,000)
                </button>
                <button className="secondary-button" onClick={() => setShowImpactReport(false)} style={{ flex: 1, justifyContent: 'center' }}>
                  Close preview
                </button>
              </div>
              <p className="muted-text" style={{ textAlign: 'center', margin: '10px 0 0' }}>
                Auto-generated impact reports for IFAD/AGRA · B2B billing · Coming soon
              </p>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
