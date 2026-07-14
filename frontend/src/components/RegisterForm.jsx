import { useState } from 'react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { apiV1 } from '../api';

const ROLES = [
  { value: 'SHF', label: 'Smallholder Farmer (SHF)' },
  { value: 'AGGREGATOR', label: 'Aggregator' },
  { value: 'INPUT_VENDOR', label: 'Input Vendor' },
  { value: 'LOGISTICS', label: 'Logistics Partner' },
  { value: 'BDSP', label: 'Certified BDSP' },
  { value: 'KBS', label: 'KBS Staff' },
  { value: 'AGRA', label: 'AGRA Partner' },
  { value: 'INVESTOR', label: 'Investor' },
  // V4V_ADMIN omitted — admin accounts are provisioned internally only
];

const GENDERS = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'OTHER', label: 'Other' },
];

export default function RegisterForm({ onRegister, onBack }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    phone: '', full_name: '', actor_type: '',
    bank_name: '', account_number: '',
    gender: '', lga: 'Chikun', state: 'Kaduna',
    password: '', confirmPassword: '',
    ndpc_consent: false,
  });

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function toggleConsent() {
    setForm({ ...form, ndpc_consent: !form.ndpc_consent });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!form.ndpc_consent) {
      setError('You must consent to NDPC data privacy terms');
      return;
    }
    setLoading(true);
    try {
      const result = await apiV1('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          phone: form.phone,
          password: form.password,
          full_name: form.full_name,
          actor_type: form.actor_type,
          bank_name: form.bank_name,
          account_number: form.account_number,
          gender: form.gender,
          lga: form.lga,
          state: form.state,
          channel: 'WEB',
          ndpc_consent: true,
        }),
      });
      onRegister(result.token, result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-mark"><span>V4V</span></div>
        <div>
          <p className="eyebrow">Chikun Agricultural Network</p>
          <h1>Join the value network.</h1>
          <p className="login-intro">Register as a verified participant. All data handled in compliance with NDPC Act 2023.</p>
        </div>
        <div className="trust-row"><ShieldCheck size={20} /><span>NDPC-compliant data handling</span></div>
      </section>
      <section className="login-panel">
        <form onSubmit={handleSubmit} className="login-form register-form">
          <div>
            <p className="eyebrow">Registration</p>
            <h2>{step === 1 ? 'Personal details' : 'Account setup'}</h2>
            <p>Step {step} of 2</p>
          </div>

          {step === 1 && <>
            <label>Full name <input value={form.full_name} onChange={update('full_name')} placeholder="e.g. Fatima Abubakar" required /></label>
            <label>Phone number <input value={form.phone} onChange={update('phone')} placeholder="+2348100000000" required /></label>
            <label>Role in network
              <select value={form.actor_type} onChange={update('actor_type')} required>
                <option value="">Select your role...</option>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label>Gender
              <select value={form.gender} onChange={update('gender')} required>
                <option value="">Select...</option>
                {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </label>
            <label>LGA <input value={form.lga} onChange={update('lga')} required /></label>
            <label>State <input value={form.state} onChange={update('state')} required /></label>
            <button type="button" className="primary-button" onClick={() => setStep(2)}>Continue</button>
          </>}

          {step === 2 && <>
            <label>Bank name <input value={form.bank_name} onChange={update('bank_name')} placeholder="e.g. GTBank" required /></label>
            <label>Account number <input value={form.account_number} onChange={update('account_number')} placeholder="0012345678" required /></label>
            <label>Password <input type="password" value={form.password} onChange={update('password')} minLength={6} required /></label>
            <label>Confirm password <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} minLength={6} required /></label>

            <label className="consent-check">
              <input type="checkbox" checked={form.ndpc_consent} onChange={toggleConsent} />
              <span>I consent to the processing of my personal data in accordance with the Nigeria Data Protection Commission (NDPC) Act 2023.</span>
            </label>

            {error && <div className="error-banner">{error}</div>}

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setStep(1)}>Back</button>
              <button className="primary-button" disabled={loading}>
                {loading ? <LoaderCircle className="spin" size={18} /> : 'Create account'}
              </button>
            </div>
          </>}

          <button type="button" className="text-button" onClick={onBack}>Already have an account? Sign in</button>
        </form>
      </section>
    </main>
  );
}
