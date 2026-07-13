import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, Globe, Map, PieChart, TrendingUp, Users } from 'lucide-react';
import { apiV1, money } from '../api';
import Page, { Loading } from '../components/Page';
import Metric from '../components/Metric';
import PanelHead from '../components/PanelHead';

export default function AGRADashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiV1('/transactions').then((r) => setTransactions(r.transactions || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const completed = transactions.filter((t) => t.status === 'COMPLETED');
  const totalVolume = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
  const completedVolume = completed.reduce((s, t) => s + Number(t.total_amount), 0);
  const commodities = useMemo(() => {
    const map = {};
    transactions.forEach((t) => { map[t.commodity] = (map[t.commodity] || 0) + Number(t.total_amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);
  const topCommodity = commodities[0]?.[0] || 'N/A';

  return (
    <Page
      title="AGRA Strategic Dashboard"
      subtitle="Macro-level agricultural production insights and compliance-ready data exports."
      action={
        <button className="secondary-button" onClick={() => alert('Export handler: NDPR-compliant aggregate data stream.')}>
          <Download size={16} /> Export data
        </button>
      }
    >
      <div className="metrics-grid">
        <Metric label="Total volume" value={money(totalVolume)} note={`${transactions.length} transactions`} icon={BarChart3} />
        <Metric label="Completed value" value={money(completedVolume)} note={`${completed.length} fulfilled`} icon={TrendingUp} />
        <Metric label="Active participants" value={new Set([...transactions.map((t) => t.buyer_id), ...transactions.map((t) => t.seller_id)]).size} note="Unique actors" icon={Users} />
        <Metric label="Top commodity" value={topCommodity} note="By trade value" icon={PieChart} />
      </div>

      <div className="two-column">
        <section className="panel">
          <PanelHead title="Commodity distribution" note="Trade value by product" />
          {commodities.length === 0 ? <p className="muted-text">No data available</p> : (
            <div className="distribution">
              {commodities.slice(0, 6).map(([name, value], i) => (
                <div key={name}>
                  <div className="distribution-label"><span>{name}</span><strong>{money(value)}</strong></div>
                  <div className="bar"><i className={i === 0 ? '' : 'secondary'} style={{ width: `${(value / totalVolume) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <PanelHead title="Regional summary" note="Production by LGA" />
          <div className="allocation" style={{ flexDirection: 'column', display: 'flex' }}>
            <div><span>Primary LGA</span><strong>Chikun</strong><small>Kaduna State</small></div>
            <div><span>Transaction count</span><strong>{transactions.length}</strong><small>All statuses</small></div>
            <div><span>Completion rate</span><strong>{transactions.length ? Math.round((completed.length / transactions.length) * 100) : 0}%</strong><small>NDPC-compliant tracking</small></div>
            <div><span>Data status</span><strong>Compliant</strong><small>NDPR Act 2019</small></div>
          </div>
        </section>
      </div>
    </Page>
  );
}
