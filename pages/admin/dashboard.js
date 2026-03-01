import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  getVehicles, getPackages, getDrivers, getBookings,
  addVehicle, addPackage, addDriver, addBooking, updateBookingDriver,
  getPendingUsers, approveUser, rejectUser,
  updatePassword, isPasswordStrong, memberSignOut,
} from '../../lib/db';
import { isSupabaseReady } from '../../lib/supabase';
import VoucherTemplate from '../../components/VoucherTemplate';
import DriverVoucherTemplate from '../../components/DriverVoucherTemplate';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [role, setRole] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [packages, setPackages] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ text: '', color: '' });

  // Form states
  const [newVehicle, setNewVehicle] = useState('');
  const [newPackage, setNewPackage] = useState('');
  const [driver, setDriver] = useState({ name: '', contact: '', vehicleName: '', vehicleNumber: '', shirqaName: '', referByName: '', referralContact: '' });
  const [booking, setBooking] = useState({
    clientName: '', clientContact: '', pickupLocation: '', dropoffLocation: '', specialRequest: '', totalDuration: '',
    date: '', time: '', ampm: 'AM',
    vehicle: '', package: '', adults: '', children: '',
    luggageSuitcase: '', luggageHandCarry: '', luggageCarton: '', luggageStroller: '', luggageWheelchair: '',
    paymentSAR: '', advanceSAR: '', driverName: '', driverContact: '', driverVehicle: '', driverRegNo: '', commission: '',
  });
  const [saveMsg, setSaveMsg] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [lastSavedBooking, setLastSavedBooking] = useState(null);
  const pdfRef = useRef(null);
  const driverPdfRef = useRef(null);

  const downloadVoucher = async () => {
    if (!pdfRef.current) return;
    try {
      const { jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgW = canvas.width;
      const imgH = canvas.height;

      // Create PDF perfectly sized to the canvas pixels
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [imgW, imgH]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
      pdf.save(`SmartWay_Voucher_${lastSavedBooking?.date || 'Download'}.pdf`);

    } catch (err) {
      console.error("PDF Generation Error", err);
      alert("Failed to create the styled PDF.");
    }
  };

  const downloadDriverVoucher = async () => {
    if (!driverPdfRef.current) return;
    try {
      const { jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const canvas = await html2canvas(driverPdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgW = canvas.width;
      const imgH = canvas.height;

      // Create PDF perfectly sized to the canvas pixels
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [imgW, imgH]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
      pdf.save(`SmartWay_Driver_Voucher_${lastSavedBooking?.date || 'Download'}.pdf`);

    } catch (err) {
      console.error("PDF Generation Error", err);
      alert("Failed to create the driver styled PDF.");
    }
  };

  const loadData = useCallback(async () => {
    if (!isSupabaseReady()) return;
    try {
      const [v, p, b, dList] = await Promise.all([getVehicles(), getPackages(), getBookings(), getDrivers()]);
      setVehicles(v);
      setPackages(p);
      setBookings(b);
      setDriversList(dList);
      if (role === 'admin') {
        const pending = await getPendingUsers();
        setPendingUsers(pending);
      }
    } catch (e) { console.error('Load data:', e); }
  }, [role]);

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

  useEffect(() => {
    if (role) {
      loadData();
      // Poll every 10 seconds to keep the dashboard dynamically updated
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [role, loadData]);

  async function doLogout() {
    try { if (role === 'member' && isSupabaseReady()) await memberSignOut(); } catch (e) { }
    localStorage.clear();
    router.push('/');
  }

  async function doChangePassword() {
    const newPwd = document.getElementById('newPwd')?.value;
    const confirmPwd = document.getElementById('confirmPwd')?.value;
    if (!newPwd || !confirmPwd) { setPwdMsg({ text: 'Fill all fields.', color: '#ef4444' }); return; }
    const strong = isPasswordStrong(newPwd);
    if (!strong.ok) { setPwdMsg({ text: strong.msg, color: '#ef4444' }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ text: 'Passwords do not match.', color: '#ef4444' }); return; }
    try {
      await updatePassword(newPwd);
      setPwdMsg({ text: 'Password updated!', color: '#22c55e' });
      setTimeout(() => setShowChangePwd(false), 1500);
    } catch (e) { setPwdMsg({ text: e.message, color: '#ef4444' }); }
  }

  async function handleAddVehicle() {
    if (!newVehicle.trim()) return;
    const ok = await addVehicle(newVehicle.trim());
    if (ok) { setNewVehicle(''); await loadData(); alert('Vehicle added.'); }
    else alert('Already exists.');
  }

  async function handleAddPackage() {
    if (!newPackage.trim()) return;
    const ok = await addPackage(newPackage.trim());
    if (ok) { setNewPackage(''); await loadData(); alert('Package added.'); }
    else alert('Already exists.');
  }

  async function handleAddDriver() {
    if (!driver.name || !driver.contact || !driver.vehicleName || !driver.vehicleNumber) {
      alert('Fill standard driver fields (name, contact, vehicle).'); return;
    }
    try {
      await addDriver(driver);
      setDriver({ name: '', contact: '', vehicleName: '', vehicleNumber: '', shirqaName: '', referByName: '', referralContact: '' });
      await loadData();
      alert('Driver added.');
    } catch (e) {
      console.error(e);
      alert('Failed to add driver: ' + (e.message || String(e)));
    }
  }

  async function handleAddBooking() {
    const b = booking;
    if (!b.clientName || !b.clientContact || !b.date || !b.time || !b.vehicle || !b.package) {
      alert('Client Name, Contact, Date, Time, Vehicle, Package are required.'); return;
    }
    const pickupTime = b.time + ' ' + b.ampm;
    const bookingDataToSave = {
      clientName: b.clientName, clientContact: b.clientContact,
      pickupLocation: b.pickupLocation, dropoffLocation: b.dropoffLocation,
      specialRequest: b.specialRequest, totalDuration: b.totalDuration,
      date: b.date, pickupTime, vehicle: b.vehicle, package: b.package,
      adults: Number(b.adults) || 0, children: Number(b.children) || 0,
      luggageSuitcase: Number(b.luggageSuitcase) || 0, luggageHandCarry: Number(b.luggageHandCarry) || 0,
      luggageCarton: Number(b.luggageCarton) || 0, luggageStroller: Number(b.luggageStroller) || 0,
      luggageWheelchair: Number(b.luggageWheelchair) || 0,
      paymentSAR: Number(b.paymentSAR) || 0, advanceSAR: Number(b.advanceSAR) || 0,
      driverName: b.driverName, driverContact: b.driverContact,
      driverVehicle: b.driverVehicle, driverRegNo: b.driverRegNo,
      commissionSAR: Number(b.commission) || 0,
    };
    try {
      const insertedId = await addBooking(bookingDataToSave);
      const bookingWithId = { ...bookingDataToSave, id: insertedId };
      setLastSavedBooking(bookingWithId);
      setBooking({
        clientName: '', clientContact: '', pickupLocation: '', dropoffLocation: '', specialRequest: '', totalDuration: '',
        date: '', time: '', ampm: 'AM',
        vehicle: '', package: '', adults: '', children: '',
        luggageSuitcase: '', luggageHandCarry: '', luggageCarton: '', luggageStroller: '', luggageWheelchair: '',
        paymentSAR: '', advanceSAR: '', driverName: '', driverContact: '', driverVehicle: '', driverRegNo: '', commission: '',
      });
      await loadData();
      setSaveMsg(true);
      setTimeout(() => setSaveMsg(false), 4000);
    } catch (e) {
      console.error(e);
      alert('Failed to save booking: ' + (e.message || String(e)));
    }
  }

  async function handleAssignDriver() {
    if (!assignModal) return;
    try {
      await updateBookingDriver(assignModal.id, assignModal);
      setAssignModal(null);
      await loadData();
      alert('Driver assigned successfully!');
    } catch (e) {
      alert('Failed to assign driver: ' + e.message);
    }
  }

  async function handleApprove(uid) {
    if (!confirm('Approve this user?')) return;
    await approveUser(uid);
    alert('User approved.');
    await loadData();
  }

  async function handleReject(uid) {
    if (!confirm('Reject this user?')) return;
    await rejectUser(uid);
    alert('User rejected.');
    await loadData();
  }

  function exportToExcel() {
    const list = [...bookings].sort((a, b) => (a.date + (a.pickupTime || '')).localeCompare(b.date + (b.pickupTime || '')));
    const head = 'Client Name,Client Contact,Pickup Date,Pickup Time,Vehicle,Package,Adults,Children,Suitcase,Hand Carry,Carton,Stroller,Wheelchair,Payment (SAR),Driver Name,Driver Contact,Driver Vehicle,Reg No.,Commission (SAR)\n';
    const rows = list.map(b => [
      b.clientName || '', b.clientContact || '', b.date || '', b.pickupTime || '',
      b.vehicle || '', b.package || '', b.adults || 0, b.children || 0,
      b.luggageSuitcase || 0, b.luggageHandCarry || 0, b.luggageCarton || 0,
      b.luggageStroller || 0, b.luggageWheelchair || 0, b.paymentSAR || 0,
      b.driverName || '', b.driverContact || '', b.driverVehicle || '',
      b.driverRegNo || '', b.commissionSAR || 0,
    ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + head + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Bookings_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // Summary calculations
  const now = new Date();
  const getLocalISODate = (d) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);

  const currentMonth = getLocalISODate(now).slice(0, 7);

  const weekStart = new Date(now);
  const day = now.getDay() === 0 ? 7 : now.getDay(); // Treat Sunday (0) as day 7
  weekStart.setDate(now.getDate() - day + 1);
  const weekStartStr = getLocalISODate(weekStart);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = getLocalISODate(weekEnd);

  const weekBookings = bookings.filter(b => b.date && b.date >= weekStartStr && b.date <= weekEndStr);
  const monthBookings = bookings.filter(b => b.date && b.date.slice(0, 7) === currentMonth);

  const weekRev = weekBookings.reduce((s, b) => s + (Number(b.paymentSAR) || 0), 0);
  const monthRev = monthBookings.reduce((s, b) => s + (Number(b.paymentSAR) || 0), 0);
  const totalRev = bookings.reduce((s, b) => s + (Number(b.paymentSAR) || 0), 0);

  const sortedBookings = [...bookings].sort((a, b) => (a.date + (a.pickupTime || '')).localeCompare(b.date + (b.pickupTime || '')));

  if (!user) return null;

  return (
    <>
      <Head><title>Dashboard | Booking System</title></Head>

      <VoucherTemplate bookingData={lastSavedBooking} pdfRef={pdfRef} />
      <DriverVoucherTemplate driverData={lastSavedBooking} pdfRef={driverPdfRef} />

      {/* Header */}
      <header style={{
        background: 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15), rgba(236,72,153,0.15))',
        borderBottom: '1px solid rgba(168,85,247,0.3)',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 700, background: 'linear-gradient(90deg, var(--cyan), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SmartWay</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span className="badge">{role.toUpperCase()}</span>
          <span>{user}</span>
          <button className="btn-sm" onClick={loadData} style={{ background: 'rgba(255,255,255,0.1)' }}>🔄 Refresh</button>
          <button className="btn-sm" onClick={() => router.push('/admin/settings')} style={{ background: 'var(--purple)', color: '#fff' }}>⚙️ Profile Settings</button>
          <button className="btn-sm primary" onClick={doLogout}>Logout</button>
        </div>
      </header>

      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{
          fontSize: '2rem', marginBottom: 32, fontWeight: 700,
          background: 'linear-gradient(90deg, var(--cyan), var(--purple), var(--pink))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>🚀 Admin Dashboard</h1>

        {/* Admin Stats */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
            <div style={{
              padding: 28, borderRadius: 16, minWidth: 220, flex: 1,
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(20,20,40,0.95))',
              borderLeft: '4px solid var(--cyan)',
            }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cyan)', marginBottom: 12, opacity: 0.8 }}>📅 This Week</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{weekBookings.length}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: 6 }}>bookings</div>
              <div style={{ fontSize: '1rem', color: 'var(--cyan)', fontWeight: 700, marginTop: 4 }}>{weekRev} SAR</div>
            </div>
            <div style={{
              padding: 28, borderRadius: 16, minWidth: 220, flex: 1,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(20,20,40,0.95))',
              borderLeft: '4px solid var(--emerald)',
            }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--emerald)', marginBottom: 12, opacity: 0.8 }}>📊 This Month</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{monthBookings.length}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: 6 }}>bookings</div>
              <div style={{ fontSize: '1rem', color: 'var(--emerald)', fontWeight: 700, marginTop: 4 }}>{monthRev} SAR</div>
            </div>
            <div style={{
              padding: 28, borderRadius: 16, minWidth: 220, flex: 1,
              background: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(20,20,40,0.95))',
              borderLeft: '4px solid var(--pink)',
            }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pink)', marginBottom: 12, opacity: 0.8 }}>🌍 Total Bookings</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{bookings.length}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: 6 }}>bookings via database</div>
              <div style={{ fontSize: '1rem', color: 'var(--pink)', fontWeight: 700, marginTop: 4 }}>{totalRev} SAR</div>
            </div>
          </div>
        </section>

        {/* Change Password (member only) */}
        {showChangePwd && role === 'member' && (
          <section style={{ marginBottom: 36 }}>
            <div className="card" style={{ maxWidth: 400 }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>🔐 Change Password</h2>
              <label>New Password</label>
              <input type="password" id="newPwd" placeholder="••••••••" style={{ width: '100%', marginBottom: 12 }} />
              <label>Confirm</label>
              <input type="password" id="confirmPwd" placeholder="••••••••" style={{ width: '100%', marginBottom: 12 }} />
              <div className="row">
                <button className="btn-sm primary" onClick={doChangePassword}>Update</button>
                <button className="btn-sm" onClick={() => setShowChangePwd(false)}>Cancel</button>
              </div>
              {pwdMsg.text && <p style={{ fontSize: '0.85rem', marginTop: 12, color: pwdMsg.color }}>{pwdMsg.text}</p>}
            </div>
          </section>
        )}


        {/* Pending Approvals (admin only) */}
        {role === 'admin' && (
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              ⏳ Pending Approvals <span className="pending-count">{pendingUsers.length}</span>
            </h2>
            <div className="card" style={{ borderTop: '3px solid var(--amber)' }}>
              {pendingUsers.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 16 }}>No pending requests.</p>
              ) : (
                <table>
                  <thead><tr><th>Email</th><th>Requested</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pendingUsers.map(u => (
                      <tr key={u.uid}>
                        <td>{u.email}</td>
                        <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                        <td>
                          <button className="btn-sm success" onClick={() => handleApprove(u.uid)} style={{ marginRight: 8 }}>Approve</button>
                          <button className="btn-sm danger" onClick={() => handleReject(u.uid)}>Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
        {/* Admin Master (vehicles, packages, drivers) — admin only */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>⚙️ Add New (Vehicles, Packages, Drivers)</h2>
          <div className="card" style={{ borderTop: '3px solid var(--purple)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: 'rgba(0,0,0,0.2)', borderLeft: '4px solid var(--cyan)' }}>
                <span style={{ fontSize: '1.5rem' }}>🚗</span>
                <input value={newVehicle} onChange={e => setNewVehicle(e.target.value)} placeholder="New Vehicle" style={{ flex: 1 }} />
                <button className="btn-sm primary" onClick={handleAddVehicle}>Add</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: 'rgba(0,0,0,0.2)', borderLeft: '4px solid var(--pink)' }}>
                <span style={{ fontSize: '1.5rem' }}>📦</span>
                <input value={newPackage} onChange={e => setNewPackage(e.target.value)} placeholder="New Package" style={{ flex: 1 }} />
                <button className="btn-sm primary" onClick={handleAddPackage}>Add</button>
              </div>
            </div>
            <div style={{ padding: 20, borderRadius: 12, background: 'linear-gradient(135deg, rgba(16,185,129,0.1), transparent)', borderLeft: '4px solid var(--emerald)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 16 }}>👤 Add New Driver</p>
              <div className="row">
                <input value={driver.name} onChange={e => setDriver({ ...driver, name: e.target.value })} placeholder="Driver name" style={{ minWidth: 150 }} />
                <input value={driver.contact} onChange={e => setDriver({ ...driver, contact: e.target.value })} placeholder="Contact (+966...)" style={{ minWidth: 150 }} />
              </div>
              <div className="row">
                <input value={driver.vehicleName} onChange={e => setDriver({ ...driver, vehicleName: e.target.value })} placeholder="Vehicle name" style={{ minWidth: 150 }} />
                <input value={driver.vehicleNumber} onChange={e => setDriver({ ...driver, vehicleNumber: e.target.value })} placeholder="Vehicle number" style={{ minWidth: 150 }} />
              </div>
              <div className="row" style={{ marginTop: '12px' }}>
                <input value={driver.shirqaName} onChange={e => setDriver({ ...driver, shirqaName: e.target.value })} placeholder="Shirqa Name" style={{ minWidth: 150 }} />
                <input value={driver.referByName} onChange={e => setDriver({ ...driver, referByName: e.target.value })} placeholder="Referred By" style={{ minWidth: 150 }} />
                <input value={driver.referralContact} onChange={e => setDriver({ ...driver, referralContact: e.target.value })} placeholder="Referral Contact" style={{ minWidth: 150 }} />
              </div>
              <div className="row" style={{ marginTop: '16px' }}>
                <button className="btn-sm primary" onClick={handleAddDriver}>Add Driver</button>
              </div>
            </div>
          </div>
        </section>
        {/* End Admin Views */}


        {/* Bookings Table (admin only) */}
        <section style={{ marginBottom: 36, position: 'relative' }}>
          {assignModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
              <div className="card" style={{ width: '100%', maxWidth: 500, background: 'var(--bg)', borderTop: '3px solid var(--purple)' }}>
                <h3 style={{ marginBottom: 16 }}>🚕 Assign Driver</h3>
                <div className="row" style={{ marginBottom: 12 }}>
                  <select
                    value={assignModal.driverId || ''}
                    onChange={e => {
                      const sel = driversList.find(d => String(d.id) === e.target.value);
                      if (sel) {
                        setAssignModal({
                          ...assignModal,
                          driverId: sel.id,
                          driverName: sel.name,
                          driverContact: sel.contact,
                          driverVehicle: sel.vehicleName,
                          driverRegNo: sel.vehicleNumber,
                          shirqaName: sel.shirqaName || '',
                          referByName: sel.referByName || '',
                          referralContact: sel.referralContact || ''
                        });
                      } else {
                        setAssignModal({ ...assignModal, driverId: '', driverName: '', driverContact: '', driverVehicle: '', driverRegNo: '', shirqaName: '', referByName: '', referralContact: '' });
                      }
                    }}
                    style={{ flex: 1, padding: '10px' }}
                  >
                    <option value="">-- Select Existing Driver --</option>
                    {driversList.map(d => (
                      <option key={d.id} value={d.id}>{d.name} - {d.vehicleName} ({d.contact})</option>
                    ))}
                  </select>
                </div>
                <div className="row" style={{ marginBottom: 12 }}>
                  <input value={assignModal.driverName} onChange={e => setAssignModal({ ...assignModal, driverName: e.target.value })} placeholder="Driver Name" style={{ flex: 1 }} />
                  <input value={assignModal.driverContact} onChange={e => setAssignModal({ ...assignModal, driverContact: e.target.value })} placeholder="Driver Contact" style={{ flex: 1 }} />
                </div>
                <div className="row" style={{ marginBottom: 16 }}>
                  <input value={assignModal.driverVehicle} onChange={e => setAssignModal({ ...assignModal, driverVehicle: e.target.value })} placeholder="Driver Vehicle" style={{ flex: 1 }} />
                  <input value={assignModal.driverRegNo} onChange={e => setAssignModal({ ...assignModal, driverRegNo: e.target.value })} placeholder="Reg No." style={{ flex: 1 }} />
                </div>
                <h4 style={{ marginBottom: 12, fontSize: '0.9rem', color: 'var(--muted)' }}>📊 Commission (SAR)</h4>
                <div className="row" style={{ marginBottom: 20 }}>
                  <input type="number" value={assignModal.commissionSAR} onChange={e => setAssignModal({ ...assignModal, commissionSAR: e.target.value })} placeholder="Commission (SAR)" min="0" style={{ width: 160 }} />
                </div>
                <div className="row">
                  <button className="btn-sm primary" onClick={handleAssignDriver}>Save Assignment</button>
                  <button className="btn-sm" onClick={() => setAssignModal(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>📋 Upcoming Bookings</h2>
            <button className="btn-sm primary" onClick={exportToExcel}>📥 Export to Excel</button>
          </div>
          <div className="card" style={{ borderTop: '3px solid var(--emerald)', overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Client Name</th><th>Contact</th><th>Date</th><th>Time</th><th>Vehicle</th>
                  <th>Package</th><th>Passengers</th><th>Luggage</th><th>Payment</th>
                  <th>Driver</th><th>D.Contact</th><th>D.Vehicle</th><th>Reg No.</th><th>Commission</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBookings.map(b => (
                  <tr key={b.id}>
                    <td>{b.clientName || '-'}</td>
                    <td>{b.clientContact || '-'}</td>
                    <td>{b.date || '-'}</td>
                    <td>{b.pickupTime || '-'}</td>
                    <td>{b.vehicle || '-'}</td>
                    <td>{b.package || '-'}</td>
                    <td>{(b.adults || 0)} A, {(b.children || 0)} C</td>
                    <td>{(b.luggageSuitcase || 0)}S {(b.luggageHandCarry || 0)}H {(b.luggageCarton || 0)}C {(b.luggageStroller || 0)}St {(b.luggageWheelchair || 0)}W</td>
                    <td className="sar">{b.paymentSAR || 0} SAR</td>
                    <td>{b.driverName || '-'}</td>
                    <td>{b.driverContact || '-'}</td>
                    <td>{b.driverVehicle || '-'}</td>
                    <td>{b.driverRegNo || '-'}</td>
                    <td className="sar">{b.commissionSAR || 0} SAR</td>
                    <td>
                      <button className="btn-sm primary" style={{ marginBottom: '5px' }} onClick={() => setAssignModal({
                        id: b.id,
                        driverId: b.driverId || '',
                        driverName: b.driverName || '',
                        driverContact: b.driverContact || '',
                        driverVehicle: b.driverVehicle || '',
                        driverRegNo: b.driverRegNo || '',
                        shirqaName: b.shirqaName || '',
                        referByName: b.referByName || '',
                        referralContact: b.referralContact || '',
                        commissionSAR: b.commissionSAR || ''
                      })}>Assign Driver</button>
                      <br />
                      {b.driverName && (
                        <button className="btn-sm" style={{ background: 'var(--cyan)', color: '#000' }} onClick={() => {
                          setLastSavedBooking(b);
                          setTimeout(downloadDriverVoucher, 100);
                        }}> Driver PDF</button>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedBookings.length === 0 && <tr><td colSpan={15} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No bookings yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main >
    </>
  );
}
