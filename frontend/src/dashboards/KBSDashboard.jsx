import { useEffect, useState } from 'react';
import { Award, BookOpen, FileText, GraduationCap, Users } from 'lucide-react';
import { apiV1, money } from '../api';
import Page, { Loading } from '../components/Page';
import Metric from '../components/Metric';
import StatusBadge from '../components/StatusBadge';

export default function KBSDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // KBS sees aggregate transaction data for reporting
    apiV1('/transactions').then((r) => setTransactions(r.transactions || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const totalVolume = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
  const completed = transactions.filter((t) => t.status === 'COMPLETED');
  const uniqueFarmers = new Set(transactions.map((t) => t.seller_id)).size;

  return (
    <Page title="KBS Training Hub" subtitle="Digital certification, training records, and performance reports.">
      <div className="metrics-grid">
        <Metric label="Active participants" value={uniqueFarmers} note="Network-wide" icon={Users} />
        <Metric label="Total volume" value={money(totalVolume)} note="All transactions" icon={BookOpen} />
        <Metric label="Completed deals" value={completed.length} note="Fulfilled" icon={Award} />
        <Metric label="Certifications" value={0} note="Pending issuance" icon={GraduationCap} />
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-head"><div><h2>Training programs</h2><p>Available KBS courses</p></div></div>
          <div className="kbs-courses">
            {[
              { name: 'Financial Literacy', provider: 'KBS', type: 'Finance' },
              { name: 'Climate-Smart Farming', provider: 'KBS', type: 'Agriculture' },
              { name: 'Digital Marketplace Operations', provider: 'KBS', type: 'Technology' },
              { name: 'Post-Harvest Management', provider: 'KBS', type: 'Agriculture' },
            ].map((c) => (
              <div key={c.name} className="course-card">
                <div className="course-icon"><BookOpen size={20} /></div>
                <div>
                  <strong>{c.name}</strong>
                  <span>{c.provider} · {c.type}</span>
                </div>
                <button className="secondary-button sm">Enroll</button>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Performance snapshot</h2><p>Aggregate KPI summary</p></div></div>
          <div className="allocation" style={{ flexDirection: 'column', display: 'flex' }}>
            <div><span>Total transaction value</span><strong>{money(totalVolume)}</strong><small>{transactions.length} transactions</small></div>
            <div><span>Average deal size</span><strong>{money(transactions.length ? totalVolume / transactions.length : 0)}</strong><small>Per transaction</small></div>
            <div><span>Completion rate</span><strong>{transactions.length ? Math.round((completed.length / transactions.length) * 100) : 0}%</strong><small>{completed.length} of {transactions.length} completed</small></div>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <div><h2>Recent activity</h2><p>Latest transactions across the network</p></div>
          <button className="secondary-button"><FileText size={16} /> Generate report</button>
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
    </Page>
  );
}
