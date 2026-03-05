import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { isSupabaseReady } from '../lib/supabase';
import { memberSignUp, memberLogin, getUserData, setUser, addLoginLog, seedDefaults, isPasswordStrong } from '../lib/db';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [pwdStrength, setPwdStrength] = useState('');
  const [pwdHint, setPwdHint] = useState('');

  function handlePwdChange(val) {
    setPassword(val);
    if (!val) { setPwdStrength(''); setPwdHint(''); return; }
    const r = isPasswordStrong(val);
    setPwdHint(r.ok ? 'Strong password.' : r.msg);
    setPwdStrength(val.length >= 12 && r.ok ? 'strong' : val.length >= 8 && r.ok ? 'medium' : 'weak');
  }

  async function doUnifiedLogin(e) {
    e.preventDefault();
    if (!email || !password) { setMsg({ text: 'Enter email and password.', type: 'error' }); return; }
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      // 1. Check if it's the Admin Account
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Admin confirmed
        localStorage.setItem('user', data.user.email);
        localStorage.setItem('role', 'admin');
        localStorage.setItem('uid', 'admin');
        setMsg({ text: 'Admin Login successful!', type: 'success' });
        setTimeout(() => router.push('/admin/dashboard'), 500);
        return;
      }

      // If it hit the admin endpoint and explicitly got rejected for wrong credentials, stop here.
      if (res.status === 401) {
        if (data.error === 'Invalid admin credentials.') {
          throw new Error('Invalid login credentials.');
        }
        // If they attempt to log in with the admin email but get rejected (e.g. wrong password), don't fall through to member auth
        if (email.trim().toLowerCase() === 'admin@smartway.com' && data.error === 'Invalid admin credentials or Admin not found.') {
          throw new Error('Invalid admin credentials. Please ensure you are using the correct admin password.');
        }
      }

      // 2. Fallback to Member Login if not Admin
      if (!isSupabaseReady()) throw new Error('Database not configured.');
      const result = await memberLogin(email, password);
      const user = result.user;
      const userData = await getUserData(user.id);

      if (!userData) throw new Error('Account not found in system. Please sign up first.');
      if (userData.status === 'pending') {
        setMsg({ text: 'Your account is pending admin approval. Please wait.', type: 'warning' });
        setLoading(false);
        return;
      }
      if (userData.status === 'rejected') throw new Error('Your account has been rejected. Contact admin.');

      await addLoginLog(user.id, user.email, userData.role);
      localStorage.setItem('user', user.email);
      localStorage.setItem('role', userData.role);
      localStorage.setItem('uid', user.id);
      setMsg({ text: 'Login successful!', type: 'success' });
      setTimeout(() => router.push('/dashboard'), 500);

    } catch (err) {
      setMsg({ text: err.message || 'Login failed. Verify credentials.', type: 'error' });
    }
    setLoading(false);
  }

  async function doMemberSignup(e) {
    e.preventDefault();
    if (!isSupabaseReady()) { setMsg({ text: 'Database not configured.', type: 'error' }); return; }
    if (!email || !password) { setMsg({ text: 'Enter email and password.', type: 'error' }); return; }
    const strong = isPasswordStrong(password);
    if (!strong.ok) { setMsg({ text: strong.msg, type: 'error' }); return; }
    if (password !== confirmPwd) { setMsg({ text: 'Passwords do not match.', type: 'error' }); return; }
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const result = await memberSignUp(email, password);
      if (result.user) {
        // Register as pending member
        await setUser(result.user.id, result.user.email, 'member', 'pending');
        // Seed defaults if first data
        try { await seedDefaults(); } catch (e) { }
        setMsg({ text: 'Account created! Please wait for admin approval before logging in.', type: 'warning' });
      } else {
        setMsg({ text: 'Check your email for confirmation link, then wait for admin approval.', type: 'warning' });
      }
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  }

  return (
    <>
      <Head><title>Login | Booking System</title></Head>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
        {/* Background effects */}
        <div style={{ position: 'absolute', width: 500, height: 500, background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', top: -200, right: -200, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', bottom: -150, left: -150, pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
          {/* Logo area */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src="/output-onlinepngtools.png"
              alt="Company Logo"
              style={{ width: '220px', height: 'auto', marginBottom: '16px', cursor: 'pointer' }}
              onClick={() => router.push('/')}
            />
          </div>

          <div className="card">
            {/* Unified Tabs */}
            <div className="tabs">
              <button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setMsg({ text: '', type: '' }); }}>Login</button>
              <button className={`tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); setMsg({ text: '', type: '' }); }}>Sign Up</button>
            </div>

            {/* Unified Login Form */}
            {tab === 'login' && (
              <form onSubmit={doUnifiedLogin}>
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" style={{ width: '100%', marginBottom: 18 }} />
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', marginBottom: 18 }} />
                <button className="btn" disabled={loading} type="submit">
                  {loading ? 'Logging in...' : 'Sign In'}
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 16, textAlign: 'center' }}>
                  Awaiting member approval may restrict login.
                </p>
              </form>
            )}

            {/* Unified Member Sign Up */}
            {tab === 'signup' && (
              <form onSubmit={doMemberSignup}>
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="newmember@company.com" style={{ width: '100%', marginBottom: 18 }} />
                <label>Password (8+ chars, upper, lower, number, special)</label>
                <input type="password" value={password} onChange={e => handlePwdChange(e.target.value)} placeholder="••••••••" style={{ width: '100%', marginBottom: 8 }} />
                <div className={`password-strength ${pwdStrength}`}><span></span></div>
                {pwdHint && <p className="password-hint" style={{ color: pwdStrength === 'strong' || pwdStrength === 'medium' ? 'var(--emerald)' : 'var(--rose)' }}>{pwdHint}</p>}
                <label>Confirm Password</label>
                <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" style={{ width: '100%', marginBottom: 18 }} />
                <button className="btn" disabled={loading} type="submit">
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--amber)', marginTop: 16, textAlign: 'center' }}>
                  ⚠️ After signup, your account must be approved by admin before you can login.
                </p>
              </form>
            )}

            {msg.text && <p className={`msg ${msg.type}`}>{msg.text}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
