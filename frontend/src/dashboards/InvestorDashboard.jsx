import { useEffect, useState } from 'react';
import { BarChart3, DollarSign, Landmark, LineChart, TrendingUp, Users, Wallet } from 'lucide-react';
import { apiV1, money } from '../api';
import Page, { Loading, Empty } from '../components/Page';
import Metric from '../components/Metric';
import PanelHead from '../components/PanelHead';

export default function InvestorDashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiV1('/transactions').then((r) => setTransactions(r.transactions || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const totalVolume = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
  const escrowCount = transactions.filter((t) => t.escrow_required).length;
  const completedVolume = transactions.filter((t) => t.status === 'COMPLETED').reduce((s, t) => s + Number(t.total_amount), 0);
  const allParticipants = new Set([...transactions.map((t) => t.buyer_id), ...transactions.map((t) => t.seller_id)]).size;

  return (
    <Page title="Investor Dashboard" subtitle="Capital distribution, portfolio performance, and credit facility tracking.">
      <div className="metrics-grid">
        <Metric label="Network volume" value={money(totalVolume)} note="Total trade value" icon={LineChart} />
        <Metric label="Portfolio value" value={money(completedVolume)} note="Completed deals" icon={DollarSign} />
        <Metric label="Escrow-protected" value={escrowCount} note="Active guarantees" icon={Wallet} />
        <Metric label="Market reach" value={allParticipants} note="Unique participants" icon={Users} />
      </div>

      <div className="two-column">
        <section className="panel">
          <PanelHead title="Credit facility opportunities" note="Open investment positions" />
          <div className="opportunity-list">
            {[
              { name: 'Smallholder Input Financing', target: 'SHF', size: 2500000, rate: '9.5%', term: '6 months' },
              { name: 'Aggregator Working Capital', target: 'AGGREGATOR', size: 5000000, rate: '8.0%', term: '12 months' },
              { name: 'Logistics Fleet Expansion', target: 'LOGISTICS', size: 8000000, rate: '10.0%', term: '18 months' },
            ].map((opp) => (
              <div key={opp.name} className="opportunity-item">
                <div className="opportunity-icon"><Landmark size={20} /></div>
                <div className="opportunity-body">
                  <strong>{opp.name}</strong>
                  <span>Target: {opp.target} · {opp.rate} APR · {opp.term}</span>
                  <strong className="opportunity-size">{money(opp.size)}</strong>
                </div>
                <button className="secondary-button sm">Inquire</button>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <PanelHead title="Portfolio snapshot" note="Loan portfolio distribution" />
          <div className="allocation" style={{ flexDirection: 'column', display: 'flex' }}>
            <div><span>Total disbursed</span><strong>{money(totalVolume * 0.3)}</strong><small>Estimated credit exposure</small></div>
            <div><span>Avg. deal size</span><strong>{money(transactions.length ? totalVolume / transactions.length : 0)}</strong><small>Per transaction</small></div>
            <div><span>Yield indicator</span><strong>{transactions.length ? `${Math.round((completedVolume / totalVolume) * 100)}%` : '0%'}</strong><small>Fulfillment rate</small></div>
            <div><span>Market activity</span><strong>{new Set(transactions.map((t) => t.commodity)).size}</strong><small>Commodities traded</small></div>
          </div>
        </section>
      </div>
    </Page>
  );
}
