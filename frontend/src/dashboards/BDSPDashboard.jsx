import { useEffect, useState } from 'react';
import { BarChart3, Network, PackageOpen, Search, Users, WalletCards } from 'lucide-react';
import { api, money } from '../api';
import Page, { Loading, Empty } from '../components/Page';
import Metric from '../components/Metric';
import PanelHead from '../components/PanelHead';

export default function BDSPDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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
    <Page title="BDSP Network" subtitle="Your downline network overview — members, commissions, and KPIs.">
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
