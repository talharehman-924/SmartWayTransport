import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminSettings() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [role, setRole] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('user');
    const r = localStorage.getItem('role');
    if (!u || r !== 'admin') {
      router.push('/');
      return;
    }
    setUser(u);
    setRole(r);
  }, [router]);

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMsg({ text: 'All fields required.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ text: 'New password and Confirm password do not match.', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      const res = await fetch('/api/admin-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user, currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to update password.');

      setMsg({ text: data.message || 'Password updated successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  }

  function doLogout() {
    localStorage.clear();
    router.push('/');
  }

  if (!user) return null;

  return (
    <>
      <Head><title>Profile Settings | Admin</title></Head>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15), rgba(236,72,153,0.15))',
        borderBottom: '1px solid rgba(168,85,247,0.3)',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, background: 'linear-gradient(90deg, var(--cyan), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer' }} onClick={() => router.push('/admin/dashboard')}>SmartWay Dashboard</span>
          <span style={{ color: 'var(--muted)' }}>/</span>
          <span style={{ color: 'var(--purple)', fontWeight: 600 }}>Profile Settings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="badge">ADMIN</span>
          <span>{user}</span>
          <button className="btn-sm" onClick={() => router.push('/admin/dashboard')} style={{ background: 'rgba(255,255,255,0.1)' }}>🔙 Back to Dashboard</button>
          <button className="btn-sm danger" onClick={doLogout}>Logout</button>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 24, fontWeight: 700 }}>⚙️ Account Settings</h1>

        <div className="card" style={{ borderTop: '3px solid var(--purple)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Change Admin Password</h2>

          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: 'var(--muted)' }}>Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', maxWidth: 400 }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: 'var(--muted)' }}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', maxWidth: 400 }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: 'var(--muted)' }}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', maxWidth: 400 }} />
            </div>

            <button type="submit" className="btn-sm primary" disabled={loading} style={{ padding: '10px 24px' }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            {msg.text && (
              <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: msg.type === 'success' ? 'var(--emerald)' : 'var(--rose)' }}>
                {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
              </div>
            )}
          </form>
        </div>
      </main>
    </>
  );
}
