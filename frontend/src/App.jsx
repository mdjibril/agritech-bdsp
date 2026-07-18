import { useEffect, useMemo, useState } from 'react';
import {
  CircleUserRound, FileCheck, LogOut, LayoutDashboard, Menu,
  Network, Store, Truck, X,
  GraduationCap, BarChart3, Globe, TrendingUp,
  Shield, Users,
} from 'lucide-react';
import { api, apiV1, money } from './api';
import DealsView from './DealsView';
import BrandHeader from './components/BrandHeader';
import RegisterForm from './components/RegisterForm';
import BDSPDashboard from './dashboards/BDSPDashboard';
import SHFDashboard from './dashboards/SHFDashboard';
import AggregatorDashboard from './dashboards/AggregatorDashboard';
import InputVendorDashboard from './dashboards/InputVendorDashboard';
import LogisticsDashboard from './dashboards/LogisticsDashboard';
import KBSDashboard from './dashboards/KBSDashboard';
import AGRADashboard from './dashboards/AGRADashboard';
import InvestorDashboard from './dashboards/InvestorDashboard';
import V4VAdminDashboard from './dashboards/V4VAdminDashboard';
import ReportsView from './ReportsView';

const ROLE_NAV = {
  SHF: [
    { id: 'dashboard', label: 'My Farm', icon: LayoutDashboard },
    { id: 'deals', label: 'Deals', icon: FileCheck },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
  ],
  AGGREGATOR: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'deals', label: 'Deals', icon: FileCheck },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
  ],
  INPUT_VENDOR: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'deals', label: 'Deals', icon: FileCheck },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
  ],
  LOGISTICS: [
    { id: 'dashboard', label: 'Jobs', icon: Truck },
    { id: 'deals', label: 'Deals', icon: FileCheck },
  ],
  BDSP: [
    { id: 'dashboard', label: 'Network', icon: Network },
    { id: 'deals', label: 'Deals', icon: FileCheck },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
  ],
  KBS: [
    { id: 'dashboard', label: 'Training Hub', icon: GraduationCap },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ],
  AGRA: [
    { id: 'dashboard', label: 'Overview', icon: Globe },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ],
  INVESTOR: [
    { id: 'dashboard', label: 'Portfolio', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ],
  V4V_ADMIN: [
    { id: 'dashboard', label: 'Console', icon: Shield },
    { id: 'deals', label: 'All Deals', icon: FileCheck },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ],
};

const ROLE_DASHBOARD = {
  SHF: SHFDashboard,
  AGGREGATOR: AggregatorDashboard,
  INPUT_VENDOR: InputVendorDashboard,
  LOGISTICS: LogisticsDashboard,
  BDSP: BDSPDashboard,
  KBS: KBSDashboard,
  AGRA: AGRADashboard,
  INVESTOR: InvestorDashboard,
  V4V_ADMIN: V4VAdminDashboard,
};

function Login({ onLogin, onRegister }) {
  const [phone, setPhone] = useState('+2348100000001');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true);
    try { await onLogin(phone, password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <main className="login-shell">
      <section className="login-brand">
        <BrandHeader />
        <div>
          <p className="eyebrow">Chikun Agricultural Network</p>
          <h1>Trade coordination built for field operations.</h1>
          <p className="login-intro">Multi-role marketplace connecting farmers, aggregators, logistics, and financial services in one operational workspace.</p>
        </div>
        <div className="trust-row"><Shield size={20} /><span>NDPC-aware data handling · NITDA compliant</span></div>
      </section>
      <section className="login-panel">
        <form onSubmit={submit} className="login-form">
          <div>
            <p className="eyebrow">Secure access</p>
            <h2>Sign in to V4V</h2>
            <p>Your workspace adapts to your assigned network role.</p>
          </div>
          <label>Phone number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="username" required />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button className="primary-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <button type="button" className="text-button" onClick={onRegister}>Create new account</button>
          <p className="demo-note">
            Demo: BDSP (+2348100000001) · Aggregator (+2348100000011) · Logistics (+2348100000017) · Farmer SHF (+2348100000003)
          </p>
        </form>
      </section>
    </main>
  );
}

function RoleShell({ user, page, setPage, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const links = ROLE_NAV[user?.actor_type] || ROLE_NAV.SHF;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <div className="brand-mark small"><span>V4V</span></div>
          <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
        </div>
        <nav>
          {links.map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setOpen(false); }}>
              <Icon size={19} />{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-mini">
            <CircleUserRound />
            <div>
              <strong>{user.full_name}</strong>
              <span>{ROLE_LABELS[user.actor_type] || user.actor_type}</span>
            </div>
          </div>
          <button className="logout" onClick={onLogout}><LogOut size={18} />Sign out</button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <BrandHeader />
          <div className="status-chip"><i /> Live · {user.lga || 'Chikun'}</div>
        </header>
        {children}
      </main>
    </div>
  );
}

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

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('v4v_user');
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  });
  const [showRegister, setShowRegister] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [error, setError] = useState('');

  const DashboardComponent = useMemo(() => user ? ROLE_DASHBOARD[user.actor_type] || ROLE_DASHBOARD.BDSP : null, [user]);

  // Normalize user object to support both V1 (actor_id/actor_type) and shim (user_id/primary_role) APIs
  function normalizeUser(u) {
    return {
      ...u,
      actor_id: u.actor_id || u.user_id,
      user_id: u.user_id || u.actor_id,
      actor_type: u.actor_type || u.primary_role,
      primary_role: u.primary_role || u.actor_type,
      is_bdsp: u.is_bdsp !== undefined ? u.is_bdsp : (u.actor_type === 'BDSP'),
    };
  }

  async function login(phone, password) {
    const result = await apiV1('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    localStorage.setItem('v4v_token', result.token);
    if (!result.user) throw new Error('Login response missing user data');
    const u = normalizeUser(result.user);
    localStorage.setItem('v4v_user', JSON.stringify(u));
    setUser(u);
    setShowRegister(false);
    setPage('dashboard');
  }

  function handleRegister(token, u) {
    localStorage.setItem('v4v_token', token);
    const mapped = normalizeUser(u);
    localStorage.setItem('v4v_user', JSON.stringify(mapped));
    setUser(mapped);
    setShowRegister(false);
    setPage('dashboard');
  }

  function logout() {
    localStorage.removeItem('v4v_token');
    localStorage.removeItem('v4v_user');
    setUser(null);
    setDeals([]);
  }

  async function loadDeals() {
    setDealsLoading(true);
    try {
      const result = await api('/deals/my');
      setDeals(result.deals || []);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setDealsLoading(false); }
  }

  useEffect(() => {
    if (!user) return;
    loadDeals();
  }, [user]);

  useEffect(() => {
    if (!user || page !== 'deals') return;
    loadDeals();
  }, [user, page]);

  if (!user && !showRegister) {
    return <Login onLogin={login} onRegister={() => setShowRegister(true)} />;
  }

  if (showRegister) {
    return <RegisterForm onRegister={handleRegister} onBack={() => setShowRegister(false)} />;
  }

  return (
    <RoleShell user={user} page={page} setPage={setPage} onLogout={logout}>
      {error && <div className="global-error">{error}</div>}

      {page === 'dashboard' && DashboardComponent && <DashboardComponent user={user} />}

      {page === 'deals' && (
        <DealsView deals={deals} user={user} loading={dealsLoading} onRefresh={loadDeals} />
      )}

      {page === 'marketplace' && <MarketplaceView user={user} />}

      {page === 'reports' && (user.actor_type === 'KBS' || user.actor_type === 'V4V_ADMIN') && (
        <ReportsView user={user} />
      )}
    </RoleShell>
  );
}

function Spinner() { return <svg className="spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>; }

function SearchSvg() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>; }

function ChevronSvg() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>; }

function ArrowUpSvg() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>; }

function ArrowDownSvg() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h10v10"/><path d="M17 7 7 17"/></svg>; }

function PackageSvg() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6h12"/><path d="M3 12h18"/><path d="M9 18h6"/></svg>; }

function MarketplaceView({ user }) {
  const [sellListings, setSellListings] = useState([]);
  const [buyRequests, setBuyRequests] = useState([]);
  const [recentDeals, setRecentDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('sell');
  const [category, setCategory] = useState('All');
  const [lga, setLga] = useState('All LGAs');
  const [search, setSearch] = useState('');
  const [claiming, setClaiming] = useState(null);
  const [offering, setOffering] = useState(null);

  const fetchMarketplace = () => {
    setLoading(true);
    apiV1('/transactions/marketplace')
      .then((r) => {
        setSellListings(r.sell || []);
        setBuyRequests(r.buy || []);
        setRecentDeals(r.recent || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMarketplace(); }, []);

  async function handleClaim(txId) {
    setClaiming(txId);
    try {
      await apiV1(`/transactions/${txId}/claim`, { method: 'PUT' });
      setSellListings((prev) => prev.filter((l) => l.tx_id !== txId));
    } catch (err) { alert(err.message); }
    finally { setClaiming(null); }
  }

  async function handleOffer(txId) {
    setOffering(txId);
    try {
      await apiV1(`/transactions/${txId}/offer`, { method: 'PUT' });
      setBuyRequests((prev) => prev.filter((l) => l.tx_id !== txId));
    } catch (err) { alert(err.message); }
    finally { setOffering(null); }
  }

  const currentList = tab === 'sell' ? sellListings : tab === 'buy' ? buyRequests : [];
  const lgaOptions = useMemo(() => ['All LGAs', ...new Set(currentList.map((l) => l.seller_state || l.buyer_state).filter(Boolean))], [currentList]);
  const filtered = useMemo(() => currentList.filter((l) => {
    const state = l.seller_state || l.buyer_state || '';
    return (category === 'All' || l.category === category) &&
      (lga === 'All LGAs' || state === lga) &&
      `${l.commodity} ${l.buyer_name || l.seller_name || ''} ${state}`.toLowerCase().includes(search.toLowerCase());
  }), [currentList, category, lga, search]);

  const buyerRoles = ['BDSP', 'AGGREGATOR', 'INPUT_VENDOR'];
  const isSHF = user?.actor_type === 'SHF';

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Marketplace</h1><p>Open listings, buy requests, and recent activity.</p></div>
        <button className="secondary-button" onClick={fetchMarketplace}>Refresh</button>
      </div>

      <div className="tab-bar" style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {['sell', 'buy', 'recent'].map((t) => (
          <button key={t} className={`tab-button ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'sell' ? `Sell listings (${sellListings.length})` : t === 'buy' ? `Buy requests (${buyRequests.length})` : `Recent deals (${recentDeals.length})`}
          </button>
        ))}
      </div>

      {tab !== 'recent' && (
        <div className="market-filters">
          <div className="search"><SearchSvg />
            <input placeholder={`Search ${tab === 'sell' ? 'commodity or seller' : 'commodity or buyer'}`} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <label className="select-control">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {['All', 'Crop', 'Livestock', 'Input'].map((o) => <option key={o}>{o}</option>)}
            </select>
            <ChevronSvg />
          </label>
          <label className="select-control">
            <select value={lga} onChange={(e) => setLga(e.target.value)}>
              {lgaOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
            <ChevronSvg />
          </label>
        </div>
      )}

      {loading ? (
        <div className="state"><Spinner /><span>Loading listings</span></div>
      ) : tab === 'recent' ? (
        recentDeals.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Commodity</th><th>Qty</th><th>Value</th><th>Seller</th><th>Buyer</th><th>Date</th></tr></thead>
              <tbody>
                {recentDeals.map((d) => (
                  <tr key={d.tx_id}>
                    <td><strong>{d.commodity}</strong></td>
                    <td>{Number(d.quantity_kg)} kg</td>
                    <td>{money(d.total_amount)}</td>
                    <td>{d.seller_name}</td>
                    <td>{d.buyer_name}</td>
                    <td>{new Date(d.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="state"><PackageSvg /><span>No completed deals yet</span></div>
        )
      ) : filtered.length ? (
        <div className="listing-grid">
          {filtered.map((listing) => (
            <article className="listing" key={listing.tx_id}>
              <div className="listing-top">
                <span className={`type-chip ${tab === 'sell' ? 'sell' : 'buy'}`}>
                  {tab === 'sell' ? <><ArrowUpSvg />SELL</> : <><ArrowDownSvg />BUY</>}
                </span>
                <span>{listing.category}</span>
              </div>
              <div>
                <h3>{listing.commodity}</h3>
                <strong className="price">{money(listing.unit_price)} <small>/ kg</small></strong>
                <p style={{ marginTop: 4 }}>{Number(listing.quantity_kg).toLocaleString()} kg {tab === 'sell' ? 'available' : 'wanted'}</p>
              </div>
              <dl>
                <div><dt>Total value</dt><dd>{money(listing.total_amount)}</dd></div>
                <div><dt>Escrow</dt><dd>{listing.escrow_required ? 'Required' : 'Not required'}</dd></div>
              </dl>
              <footer>
                {tab === 'sell' ? (
                  <>
                    <div><strong>{listing.seller_name}</strong><span>SHF · {listing.seller_state || '--'}</span></div>
                    {buyerRoles.includes(user?.actor_type) && (
                      <button className="primary-button sm" onClick={() => handleClaim(listing.tx_id)} disabled={claiming === listing.tx_id}>
                        {claiming === listing.tx_id ? 'Claiming...' : 'Claim'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div><strong>{listing.buyer_name}</strong><span>{listing.buyer_role || 'Buyer'} · {listing.buyer_state || '--'}</span></div>
                    {isSHF && (
                      <button className="primary-button sm" onClick={() => handleOffer(listing.tx_id)} disabled={offering === listing.tx_id}>
                        {offering === listing.tx_id ? 'Offering...' : 'Fulfill'}
                      </button>
                    )}
                  </>
                )}
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="state"><PackageSvg /><span>No {tab === 'sell' ? 'sell listings' : 'buy requests'} match these filters</span></div>
      )}
    </div>
  );
}
