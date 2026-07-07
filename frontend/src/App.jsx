import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, ChevronDown, CircleUserRound,
  FileCheck, LayoutDashboard, LoaderCircle, LogOut, Menu, Network, PackageOpen,
  Search, ShieldCheck, Store, Users, WalletCards, X,
} from 'lucide-react';
import { api, money } from './api';
import DealsView from './DealsView';

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, bdsp: true },
  { id: 'network', label: 'Network', icon: Network, bdsp: true },
  { id: 'deals', label: 'Deals', icon: FileCheck },
  { id: 'marketplace', label: 'Marketplace', icon: Store },
];

function Login({ onLogin, onBrowse }) {
  const [phone, setPhone] = useState('+2348100000001');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true);
    try { await onLogin(phone, password); } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return <main className="login-shell">
    <section className="login-brand">
      <div className="brand-mark"><span>V4V</span></div>
      <div>
        <p className="eyebrow">Chikun Agricultural Network</p>
        <h1>Trade coordination built for field operations.</h1>
        <p className="login-intro">Manage producer networks, consolidate supply, and monitor value distribution from one operational workspace.</p>
      </div>
      <div className="trust-row"><ShieldCheck size={20} /><span>NDPC-aware data handling</span></div>
    </section>
    <section className="login-panel">
      <form onSubmit={submit} className="login-form">
        <div><p className="eyebrow">Secure access</p><h2>Sign in to V4V</h2><p>Your workspace is configured from your assigned database role.</p></div>
        <label>Phone number<input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error && <div className="error-banner">{error}</div>}
        <button className="primary-button" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : 'Sign in'}</button>
        <button type="button" className="text-button" onClick={onBrowse}>Browse public marketplace</button>
        <p className="demo-note">Demo BDSP: +2348100000001 / password123</p>
        <p className="demo-note">Demo Buyer: +2348100000004 · Logistics: +2348100000005 · Seller: +2348100000003</p>
      </form>
    </section>
  </main>;
}

function Shell({ user, page, setPage, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const links = navigation.filter((item) => !item.bdsp || user?.is_bdsp);
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-head"><div className="brand-mark small"><span>V4V</span></div><button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button></div>
      <nav>{links.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setOpen(false); }}><Icon size={19} />{label}</button>)}</nav>
      <div className="sidebar-foot">
        {user ? <><div className="user-mini"><CircleUserRound /><div><strong>{user.full_name}</strong><span>{user.is_bdsp ? 'Certified BDSP' : user.primary_role}</span></div></div><button className="logout" onClick={onLogout}><LogOut size={18} />Sign out</button></> : <button className="primary-button" onClick={onLogout}>Sign in</button>}
      </div>
    </aside>
    <main className="workspace">
      <header className="topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button><div><strong>V4V Agritech</strong><span>Chikun LGA operations</span></div><div className="status-chip"><i /> Live data</div></header>
      {children}
    </main>
  </div>;
}

function Metric({ label, value, note, icon: Icon }) {
  return <article className="metric"><div className="metric-icon"><Icon size={20} /></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

function Overview({ data, loading }) {
  if (loading) return <Loading />;
  const metrics = data?.metrics;
  const active = metrics?.post_summary?.filter((p) => p.status === 'Active').reduce((sum, p) => sum + p.count, 0) || 0;
  const gender = metrics?.gender_counts || {};
  const total = metrics?.member_count || 1;
  return <Page title="Network overview" subtitle="Current operating position across your assigned producer network.">
    <div className="metrics-grid">
      <Metric label="Network members" value={metrics?.member_count || 0} note="Verified mappings" icon={Users} />
      <Metric label="Active listings" value={active} note="Across member accounts" icon={PackageOpen} />
      <Metric label="Deal value" value={money(metrics?.commission_ledger.total_deal_value)} note={`${metrics?.commission_ledger.deal_count || 0} consolidated deal`} icon={WalletCards} />
      <Metric label="BDSP commission" value={money(metrics?.commission_ledger.total_bdsp_commission)} note="30% ledger allocation" icon={BarChart3} />
    </div>
    <div className="two-column">
      <section className="panel"><PanelHead title="Member distribution" note="Gender KPI reporting" /><div className="distribution">
        {Object.entries(gender).map(([label, count], index) => <div key={label}><div className="distribution-label"><span>{label}</span><strong>{count} members</strong></div><div className="bar"><i className={index ? 'secondary' : ''} style={{ width: `${(count / total) * 100}%` }} /></div></div>)}
      </div></section>
      <section className="panel"><PanelHead title="Value allocation" note="Automated commission ledger" /><div className="allocation"><div><span>V4V revenue</span><strong>{money(metrics?.commission_ledger.total_v4v_revenue)}</strong><small>70% platform allocation</small></div><div><span>BDSP commission</span><strong>{money(metrics?.commission_ledger.total_bdsp_commission)}</strong><small>30% network allocation</small></div></div></section>
    </div>
  </Page>;
}

function NetworkView({ data, loading }) {
  const [query, setQuery] = useState('');
  const members = (data?.members || []).filter((m) => `${m.full_name} ${m.user_id} ${m.primary_role} ${m.ward}`.toLowerCase().includes(query.toLowerCase()));
  return <Page title="Network management" subtitle="Review mapped members, operating roles, and location coverage.">
    <div className="toolbar"><div className="search"><Search size={18} /><input placeholder="Search members" value={query} onChange={(e) => setQuery(e.target.value)} /></div><span className="result-count">{members.length} members</span></div>
    {loading ? <Loading /> : <div className="table-wrap"><table><thead><tr><th>Member</th><th>Role</th><th>Gender</th><th>Ward</th><th>Production profile</th><th>Joined</th></tr></thead><tbody>{members.map((member) => <tr key={member.user_id}><td><strong>{member.full_name}</strong><span>{member.user_id}</span></td><td><span className="role-chip">{member.primary_role}</span></td><td>{member.gender}</td><td>{member.ward || 'Not set'}</td><td>{[...(member.crops || []), ...(member.livestock || []), ...(member.inputs_sold || [])].slice(0, 2).join(', ') || 'Not specified'}</td><td>{new Date(member.joined_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>)}</tbody></table></div>}
  </Page>;
}

function Marketplace({ posts, loading, onRefresh }) {
  const [type, setType] = useState('All');
  const [category, setCategory] = useState('All');
  const [lga, setLga] = useState('All LGAs');
  const [search, setSearch] = useState('');
  const lgaOptions = useMemo(() => ['All LGAs', ...new Set(posts.map((post) => post.lga).filter(Boolean))], [posts]);
  const filtered = useMemo(() => posts.filter((post) => (type === 'All' || post.post_type === type) && (category === 'All' || post.category === category) && (lga === 'All LGAs' || post.lga === lga) && `${post.item_name} ${post.posted_by} ${post.lga}`.toLowerCase().includes(search.toLowerCase())), [posts, type, category, lga, search]);
  return <Page title="Marketplace" subtitle="Live BUY and SELL listings from verified Chikun network participants." action={<button className="secondary-button" onClick={onRefresh}>Refresh listings</button>}>
    <div className="market-filters"><div className="search"><Search size={18} /><input placeholder="Search item or participant" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={type} onChange={setType} options={['All', 'SELL', 'BUY']} /><Select value={category} onChange={setCategory} options={['All', 'Crop', 'Livestock', 'Input']} /><Select value={lga} onChange={setLga} options={lgaOptions} /></div>
    {loading ? <Loading /> : filtered.length ? <div className="listing-grid">{filtered.map((post) => <article className="listing" key={post.post_id}><div className="listing-top"><span className={`type-chip ${post.post_type.toLowerCase()}`}>{post.post_type === 'SELL' ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}{post.post_type}</span><span>{post.status}</span></div><div><p>{post.category}</p><h3>{post.item_name}</h3><strong className="price">{money(post.price_per_unit)} <small>/ {post.unit.replace(/s$/, '')}</small></strong></div><dl><div><dt>Quantity</dt><dd>{Number(post.quantity)} {post.unit}</dd></div><div><dt>Interest</dt><dd>{post.interested_count} responses</dd></div></dl><footer><div><strong>{post.posted_by}</strong><span>{post.poster_role} · {post.lga}</span></div><span>{post.post_id}</span></footer></article>)}</div> : <Empty />}
  </Page>;
}

function Select({ value, onChange, options }) { return <label className="select-control"><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={17} /></label>; }
function Page({ title, subtitle, action, children }) { return <div className="page"><div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>{children}</div>; }
function PanelHead({ title, note }) { return <div className="panel-head"><div><h2>{title}</h2><p>{note}</p></div></div>; }
function Loading() { return <div className="state"><LoaderCircle className="spin" /><span>Loading current data</span></div>; }
function Empty() { return <div className="state"><PackageOpen /><span>No listings match these filters</span></div>; }

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('v4v_user') || 'null'));
  const [guest, setGuest] = useState(false); const [page, setPage] = useState(user?.is_bdsp ? 'overview' : 'marketplace');
  const [network, setNetwork] = useState(null); const [posts, setPosts] = useState([]); const [deals, setDeals] = useState([]); const [networkLoading, setNetworkLoading] = useState(false); const [postsLoading, setPostsLoading] = useState(false); const [dealsLoading, setDealsLoading] = useState(false); const [error, setError] = useState('');
  async function login(phone, password) { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }); localStorage.setItem('v4v_token', result.token); localStorage.setItem('v4v_user', JSON.stringify(result.user)); setUser(result.user); setGuest(false); setPage(result.user.is_bdsp ? 'overview' : 'marketplace'); }
  function logout() { localStorage.removeItem('v4v_token'); localStorage.removeItem('v4v_user'); setUser(null); setGuest(false); setNetwork(null); setDeals([]); }
  async function loadPosts() { setPostsLoading(true); try { const result = await api('/posts?status=Active'); setPosts(result.posts); setError(''); } catch (err) { setError(err.message); } finally { setPostsLoading(false); } }
  async function loadDeals() { setDealsLoading(true); try { const result = await api('/deals/my'); setDeals(result.deals); setError(''); } catch (err) { setError(err.message); } finally { setDealsLoading(false); } }
  useEffect(() => { if (user || guest) loadPosts(); }, [user, guest]);
  useEffect(() => { if (!user?.is_bdsp || !['overview', 'network'].includes(page)) return; setNetworkLoading(true); api('/bdsp/network').then(setNetwork).catch((err) => setError(err.message)).finally(() => setNetworkLoading(false)); }, [user, page]);
  useEffect(() => { if (!user || page !== 'deals') return; loadDeals(); }, [user, page]);
  if (!user && !guest) return <Login onLogin={login} onBrowse={() => { setGuest(true); setPage('marketplace'); }} />;
  return <Shell user={user} page={page} setPage={setPage} onLogout={logout}>{error && <div className="global-error">{error}</div>}{page === 'overview' && <Overview data={network} loading={networkLoading} />}{page === 'network' && <NetworkView data={network} loading={networkLoading} />}{page === 'deals' && <DealsView deals={deals} user={user} loading={dealsLoading} onRefresh={loadDeals} />}{page === 'marketplace' && <Marketplace posts={posts} loading={postsLoading} onRefresh={loadPosts} />}</Shell>;
}
