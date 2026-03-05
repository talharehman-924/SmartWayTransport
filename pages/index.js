import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { isSupabaseReady } from '../lib/supabase';
import { memberSignUp, memberLogin, getUserData, setUser, addLoginLog, seedDefaults, isPasswordStrong } from '../lib/db';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, ShieldAlert, Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
        {/* Theme toggle - top right */}
        <button className="theme-toggle" onClick={toggleTheme} style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Background effects */}
        <div style={{ position: 'absolute', width: 500, height: 500, background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', top: -200, right: -200, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', bottom: -150, left: -150, pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
          {/* Logo area */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img
              src="/output-onlinepngtools.png"
              alt="SmartWay Transport"
              style={{ width: '220px', height: 'auto', marginBottom: '16px', cursor: 'pointer' }}
              onClick={() => router.push('/')}
            />
          </div>

          <div className="card animate-enter" style={{ padding: '36px 32px', borderTop: '4px solid var(--purple)' }}>
            {/* Unified Tabs */}
            <div className="tabs" style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '14px', marginBottom: '32px' }}>
              <button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setMsg({ text: '', type: '' }); }} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><LogIn size={18} /> Sign In</button>
              <button className={`tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); setMsg({ text: '', type: '' }); }} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><UserPlus size={18} /> Register</button>
            </div>

            {/* Unified Login Form */}
            {tab === 'login' && (
              <form onSubmit={doUnifiedLogin}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={16} color="var(--cyan)" /> Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" style={{ width: '100%', marginBottom: 20, padding: '14px 16px' }} />

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={16} color="var(--pink)" /> Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', marginBottom: 28, padding: '14px 16px' }} />

                <button className="btn primary animate-enter" disabled={loading} type="submit" style={{ width: '100%', padding: '14px 0', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  {loading ? 'Authenticating...' : <><LogIn size={20} /> Sign In to Dashboard</>}
                </button>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 20, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <AlertCircle size={14} /> New accounts require admin approval
                </p>
              </form>
            )}

            {/* Unified Member Sign Up */}
            {tab === 'signup' && (
              <form onSubmit={doMemberSignup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={16} color="var(--cyan)" /> Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" style={{ width: '100%', marginBottom: 20, padding: '14px 16px' }} />

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={16} color="var(--pink)" /> Password <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(8+ chars, upper, lower, num, spec)</span></label>
                <input type="password" value={password} onChange={e => handlePwdChange(e.target.value)} placeholder="••••••••" style={{ width: '100%', marginBottom: 10, padding: '14px 16px' }} />
                <div className={`password-strength ${pwdStrength}`}><span></span></div>
                {pwdHint && <p className="password-hint animate-enter" style={{ color: pwdStrength === 'strong' || pwdStrength === 'medium' ? 'var(--emerald)' : 'var(--danger)', marginBottom: 20 }}>{pwdHint}</p>}

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={16} color="var(--pink)" /> Confirm Password</label>
                <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" style={{ width: '100%', marginBottom: 28, padding: '14px 16px' }} />

                <button className="btn primary animate-enter" disabled={loading} type="submit" style={{ width: '100%', padding: '14px 0', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  {loading ? 'Creating...' : <><UserPlus size={20} /> Create Account</>}
                </button>
                <p style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: 20, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <ShieldAlert size={14} /> Account requires admin approval after signup.
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
