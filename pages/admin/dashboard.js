import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  getVehicles, getPackages, getDrivers, getBookings,
  addVehicle, addPackage, addDriver, addBooking, updateBookingDriver,
  getPendingUsers, approveUser, rejectUser,
  updatePassword, isPasswordStrong, memberSignOut,
  updateBooking, updateBookingStatus, deleteBooking, toggleCommissionStatus,
  getDriverBalances, recordDriverPayment, updateDriver, deleteDriver,
  getDriverPaymentHistory
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
  const [driverBalances, setDriverBalances] = useState([]);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ text: '', color: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [newVehicle, setNewVehicle] = useState('');
  const [newPackage, setNewPackage] = useState('');
  const [driver, setDriver] = useState({ name: '', contact: '', vehicleName: '', vehicleNumber: '', shirqaName: '', referByName: '', referralContact: '' });
  const [booking, setBooking] = useState({
    clientName: '', clientContact: '', nationality: '', pickupLocation: '', dropoffLocation: '', specialRequest: '', totalDuration: '',
    date: '', time: '', ampm: 'AM',
    vehicle: '', package: '', adults: '', children: '',
    luggageSuitcase: '', luggageHandCarry: '', luggageCarton: '', luggageStroller: '', luggageWheelchair: '',
    paymentSAR: '', advanceSAR: '', driverName: '', driverContact: '', driverVehicle: '', driverRegNo: '', commission: '',
    paymentMode: 'Cash', commissionReceived: 'No', bookingReferBy: '', bookingReferralContact: '',
  });
  const [saveMsg, setSaveMsg] = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editDriverModal, setEditDriverModal] = useState(null);
  const [paymentHistoryModal, setPaymentHistoryModal] = useState(null); // stores array of payments or null
  const [selectedDriverForHistory, setSelectedDriverForHistory] = useState('');
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

      // Compress to JPEG to drastically reduce file size instead of pure raw PNG
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const imgW = canvas.width;
      const imgH = canvas.height;

      // Create PDF perfectly sized to the canvas pixels
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [imgW, imgH]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH, undefined, 'FAST');
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

      // Compress to JPEG to drastically reduce file size instead of pure raw PNG
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const imgW = canvas.width;
      const imgH = canvas.height;

      // Create PDF perfectly sized to the canvas pixels
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [imgW, imgH]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH, undefined, 'FAST');
      pdf.save(`SmartWay_Driver_Voucher_${lastSavedBooking?.date || 'Download'}.pdf`);

    } catch (err) {
      console.error("PDF Generation Error", err);
      alert("Failed to create the driver styled PDF.");
    }
  };

  const loadData = useCallback(async () => {
    if (!isSupabaseReady()) return;
    try {
      const [v, p, b, dList, bal] = await Promise.all([
        getVehicles(), getPackages(), getBookings(), getDrivers(), getDriverBalances()
      ]);
      setVehicles(v);
      setPackages(p);
      setBookings(b);
      setDriversList(dList);
      setDriverBalances(bal);
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
    const missing = [];
    if (!b.clientName) missing.push("Passenger Name");
    if (!b.clientContact) missing.push("Passenger Contact");
    if (!b.date) missing.push("Date");
    if (!b.time) missing.push("Time");
    if (!b.vehicle) missing.push("Vehicle Type");
    if (!b.package) missing.push("Package / Route");

    if (missing.length > 0) {
      alert('Please fill in the missing fields: \n- ' + missing.join('\n- '));
      return;
    }
    const pickupTime = b.time + ' ' + b.ampm;
    const bookingDataToSave = {
      clientName: b.clientName, clientContact: b.clientContact, nationality: b.nationality || '',
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
      paymentMode: b.paymentMode || 'Cash', commissionReceived: b.commissionReceived || 'No',
      bookingReferBy: b.bookingReferBy || '', bookingReferralContact: b.bookingReferralContact || '',
      status: 'pending', addedBy: user,
    };
    try {
      const insertedId = await addBooking(bookingDataToSave);
      const bookingWithId = { ...bookingDataToSave, id: insertedId };
      setLastSavedBooking(bookingWithId);
      setBooking({
        clientName: '', clientContact: '', nationality: '', pickupLocation: '', dropoffLocation: '', specialRequest: '', totalDuration: '',
        date: '', time: '', ampm: 'AM',
        vehicle: '', package: '', adults: '', children: '',
        luggageSuitcase: '', luggageHandCarry: '', luggageCarton: '', luggageStroller: '', luggageWheelchair: '',
        paymentSAR: '', advanceSAR: '', driverName: '', driverContact: '', driverVehicle: '', driverRegNo: '', commission: '',
        paymentMode: 'Cash', commissionReceived: 'No', bookingReferBy: '', bookingReferralContact: '',
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

  async function handleEditBooking() {
    if (!editModal) return;
    try {
      await updateBooking(editModal.id, editModal);
      setEditModal(null);
      await loadData();
      alert('Booking updated successfully!');
    } catch (e) {
      alert('Failed to update booking: ' + e.message);
    }
  }

  async function handleUpdateDriver() {
    if (!editDriverModal) return;
    try {
      await updateDriver(editDriverModal.id, editDriverModal);
      setEditDriverModal(null);
      await loadData();
      alert('Driver updated successfully!');
    } catch (e) {
      alert('Failed to update driver: ' + e.message);
    }
  }

  async function handleDeleteDriver(id) {
    if (!confirm("Are you sure you want to delete this driver? Ensure they are not assigned to active bookings.")) return;
    try {
      await deleteDriver(id);
      await loadData();
      alert('Driver deleted.');
    } catch (e) {
      alert('Failed to delete driver: ' + e.message);
    }
  }

  async function handleDeleteBooking(id) {
    if (!confirm("Are you sure you want to delete this booking entirely?")) return;
    try {
      await deleteBooking(id);
      await loadData();
      alert('Booking deleted.');
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    }
  }

  async function handleCancelBooking(id) {
    if (!confirm("Are you sure you want to cancel this booking? It will be moved to the completed/records list.")) return;
    try {
      await updateBookingStatus(id, 'cancelled');
      await loadData();
    } catch (e) {
      alert('Failed to cancel: ' + e.message);
    }
  }

  async function handleCompleteBooking(id) {
    if (!confirm("Mark this booking as Completed? It will be hidden from the Upcoming Bookings list.")) return;
    try {
      await updateBookingStatus(id, 'completed');
      await loadData();
    } catch (e) {
      alert('You must first create a "status" column in the Supabase bookings table! Ask for instructions if needed. Error: ' + e.message);
    }
  }

  async function handleToggleCommission(id, currentStatus) {
    const newStatus = currentStatus === 'Yes' ? 'No' : 'Yes';
    try {
      await toggleCommissionStatus(id, newStatus);
      await loadData();
    } catch (e) {
      alert('Failed to toggle commission: ' + e.message);
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
  // Using Sunday as the start of the week for Middle East standard.
  weekStart.setDate(now.getDate() - now.getDay());
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

  const isPastBooking = (b) => {
    if (b.status === 'completed' || b.status === 'cancelled') return true;
    if (b.driverName && b.date) {
      // The pickupTime comes in like "10:30 AM" or "16:55 PM"
      let dtStr = b.date;
      if (b.pickupTime) {
        let pTime = String(b.pickupTime).trim();
        // Basic cleaning in case it contains redundant PM logic like "16:55 PM"
        const match = pTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (match) {
          let [_, h, m, ampm] = match;
          let hi = parseInt(h);
          if (ampm) {
            ampm = ampm.toUpperCase();
            if (ampm === 'PM' && hi < 12) hi += 12;
            if (ampm === 'AM' && hi === 12) hi = 0;
          }
          dtStr += `T${String(hi).padStart(2, '0')}:${m}:00`;
        } else {
          dtStr += 'T23:59:59';
        }
      } else {
        dtStr += 'T23:59:59';
      }
      const dt = new Date(dtStr);
      if (dt < now) return true;
    }
    return false;
  };

  const passesSearch = (b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const searchable = [
      b.clientName, b.clientContact,
      b.driverName, b.driverContact,
      b.bookingReferBy, b.bookingReferralContact
    ].map(s => (s || '').toLowerCase()).join(' ');
    return searchable.includes(q);
  };

  const upcomingBookings = sortedBookings.filter(b => !isPastBooking(b) && passesSearch(b));
  const pastBookings = sortedBookings.filter(b => isPastBooking(b) && passesSearch(b));

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
        <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <img src="/output-onlinepngtools.png" alt="SmartWay Logo" style={{ height: '32px', cursor: 'pointer' }} onClick={() => router.push('/')} />
        </div>
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

        {/* Manage Drivers */}
        <section style={{ marginBottom: 36, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>🚚 Manage Drivers</h2>
          </div>
          <div className="card" style={{ borderTop: '3px solid var(--purple)', overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Contact</th>
                  <th>Vehicle Name</th>
                  <th>Vehicle Number</th>
                  <th>Shirqa Name</th>
                  <th>Refer By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {driversList.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 'bold' }}>{d.name}</td>
                    <td>{d.contact || '-'}</td>
                    <td>{d.vehicleName || '-'}</td>
                    <td>{d.vehicleNumber || '-'}</td>
                    <td>{d.shirqaName || '-'}</td>
                    <td>{d.referByName ? `${d.referByName} (${d.referralContact || ''})` : '-'}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-sm" style={{ background: 'var(--amber)', color: '#000' }} onClick={() => setEditDriverModal(d)}>Edit</button>
                      <button className="btn-sm danger" onClick={() => handleDeleteDriver(d.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {driversList.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No drivers found.</td></tr>}
              </tbody>
            </table>
          </div>

          {editDriverModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
            }}>
              <div className="card" style={{ width: '100%', maxWidth: 700, background: 'var(--bg)', borderTop: '3px solid var(--amber)' }}>
                <h3 style={{ marginBottom: 16 }}>✏️ Edit Driver</h3>
                <div className="row" style={{ marginBottom: 12 }}>
                  <input value={editDriverModal.name} onChange={e => setEditDriverModal({ ...editDriverModal, name: e.target.value })} placeholder="Driver name" style={{ flex: 1 }} />
                  <input value={editDriverModal.contact} onChange={e => setEditDriverModal({ ...editDriverModal, contact: e.target.value })} placeholder="Contact" style={{ flex: 1 }} />
                </div>
                <div className="row" style={{ marginBottom: 12 }}>
                  <input value={editDriverModal.vehicleName} onChange={e => setEditDriverModal({ ...editDriverModal, vehicleName: e.target.value })} placeholder="Vehicle name" style={{ flex: 1 }} />
                  <input value={editDriverModal.vehicleNumber} onChange={e => setEditDriverModal({ ...editDriverModal, vehicleNumber: e.target.value })} placeholder="Vehicle number" style={{ flex: 1 }} />
                </div>
                <div className="row" style={{ marginBottom: 20 }}>
                  <input value={editDriverModal.shirqaName} onChange={e => setEditDriverModal({ ...editDriverModal, shirqaName: e.target.value })} placeholder="Shirqa Name" style={{ flex: 1 }} />
                  <input value={editDriverModal.referByName} onChange={e => setEditDriverModal({ ...editDriverModal, referByName: e.target.value })} placeholder="Referred By" style={{ flex: 1 }} />
                  <input value={editDriverModal.referralContact} onChange={e => setEditDriverModal({ ...editDriverModal, referralContact: e.target.value })} placeholder="Referral Contact" style={{ flex: 1 }} />
                </div>
                <div className="row" style={{ justifyContent: 'flex-end', gap: 12 }}>
                  <button className="btn-sm" onClick={() => setEditDriverModal(null)}>Cancel</button>
                  <button className="btn-sm primary" onClick={handleUpdateDriver}>Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* New Booking Interface for Admin */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>✨ New Booking</h2>
          <div className="card" style={{ borderTop: '3px solid var(--cyan)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12 }}>👤 Passenger Details</p>
            <div className="row">
              <input value={booking.clientName} onChange={e => setBooking({ ...booking, clientName: e.target.value })} placeholder="Passenger Name" style={{ minWidth: 140 }} />
              <input value={booking.clientContact} onChange={e => setBooking({ ...booking, clientContact: e.target.value })} placeholder="Passenger Contact" style={{ minWidth: 140 }} />
              <input value={booking.nationality} onChange={e => setBooking({ ...booking, nationality: e.target.value })} placeholder="Nationality (Country)" style={{ minWidth: 140 }} />
              <input value={booking.pickupLocation} onChange={e => setBooking({ ...booking, pickupLocation: e.target.value })} placeholder="Passenger Location (Pickup)" style={{ minWidth: 200, flex: 1 }} />
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <input value={booking.bookingReferBy} onChange={e => setBooking({ ...booking, bookingReferBy: e.target.value })} placeholder="Refer By (Name)" style={{ minWidth: 140 }} />
              <input value={booking.bookingReferralContact} onChange={e => setBooking({ ...booking, bookingReferralContact: e.target.value })} placeholder="Referral Contact" style={{ minWidth: 140 }} />
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12, marginTop: 20 }}>👥 Passengers & Luggage</p>
            <div className="row">
              <input type="number" value={booking.adults} onChange={e => setBooking({ ...booking, adults: e.target.value })} placeholder="Adults" min="0" style={{ width: 100 }} />
              <input type="number" value={booking.children} onChange={e => setBooking({ ...booking, children: e.target.value })} placeholder="Children" min="0" style={{ width: 100 }} />
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
              {[['luggageSuitcase', 'Suitcase'], ['luggageHandCarry', 'Hand Carry'], ['luggageCarton', 'Carton'], ['luggageStroller', 'Stroller'], ['luggageWheelchair', 'Wheelchair']].map(([key, label]) => (
                <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  <input type="number" value={booking[key]} onChange={e => setBooking({ ...booking, [key]: e.target.value })} placeholder="0" min="0" style={{ width: 56, textAlign: 'center', padding: '8px 10px' }} />
                  {label}
                </label>
              ))}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12, marginTop: 20 }}>🚗 Vehicle & Routes Section</p>
            <div className="row">
              <input list="adminVehicleList" placeholder="-- Vehicle Type --" value={booking.vehicle} onChange={e => setBooking({ ...booking, vehicle: e.target.value })} style={{ minWidth: 160, flex: 1 }} />
              <datalist id="adminVehicleList">
                {vehicles.map(v => <option key={v} value={v} />)}
              </datalist>

              <input list="adminPackageList" placeholder="-- Package / Route --" value={booking.package} onChange={e => setBooking({ ...booking, package: e.target.value })} style={{ minWidth: 160, flex: 1 }} />
              <datalist id="adminPackageList">
                {packages.map(p => <option key={p} value={p} />)}
              </datalist>

              <input list="adminDropoffList" placeholder="-- Drop-off Location --" value={booking.dropoffLocation} onChange={e => setBooking({ ...booking, dropoffLocation: e.target.value })} style={{ minWidth: 160, flex: 1 }} />
              <datalist id="adminDropoffList">
                <option value="Kiswa Factory, Mecca Museum, Sulah Hudabia" />
                <option value="Jeddah Airport Terminal 1" />
                <option value="Jeddah Airport Terminal Hajj" />
                <option value="Jeddah Airport Terminal North" />
                <option value="Makkah Hotel" />
                <option value="Madinah Hotel" />
                <option value="Other" />
              </datalist>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <input type="date" value={booking.date} onChange={e => setBooking({ ...booking, date: e.target.value })} style={{ minWidth: 140 }} />
              <input type="text" placeholder="HH:MM" value={booking.time} onChange={e => setBooking({ ...booking, time: e.target.value })} style={{ minWidth: 140 }} />
              <select value={booking.ampm} onChange={e => setBooking({ ...booking, ampm: e.target.value })} style={{ width: 90 }}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <input value={booking.specialRequest} onChange={e => setBooking({ ...booking, specialRequest: e.target.value })} placeholder="Special Request" style={{ minWidth: 200, flex: 1 }} />
              <input value={booking.totalDuration} onChange={e => setBooking({ ...booking, totalDuration: e.target.value })} placeholder="Total Duration (e.g. 2 Days)" style={{ minWidth: 160 }} />
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12, marginTop: 20 }}>💵 Financials (SAR)</p>
            <div className="row">
              <input type="number" value={booking.advanceSAR} onChange={e => setBooking({ ...booking, advanceSAR: e.target.value })} placeholder="Advance (SAR)" min="0" style={{ width: 160 }} />
              <input type="number" value={booking.paymentSAR} onChange={e => setBooking({ ...booking, paymentSAR: e.target.value })} placeholder="Total (SAR)" min="0" style={{ width: 160 }} />
              <select value={booking.paymentMode} onChange={e => setBooking({ ...booking, paymentMode: e.target.value })} style={{ width: 160 }}>
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
              </select>
            </div>

            <div className="row" style={{ marginTop: 28, gap: 16 }}>
              <button className="btn-sm primary" style={{ padding: '14px 36px', fontSize: '1rem', fontWeight: 600 }} onClick={handleAddBooking}>💾 Save Booking</button>
              {lastSavedBooking && (
                <>
                  <button className="btn-sm" style={{ padding: '14px 20px', fontSize: '0.9rem', fontWeight: 600, background: 'var(--purple)', color: '#fff', border: 'none' }} onClick={downloadVoucher}>📄 Passenger PDF</button>
                  <button className="btn-sm" style={{ padding: '14px 20px', fontSize: '0.9rem', fontWeight: 600, background: 'var(--pink)', color: '#fff', border: 'none' }} onClick={downloadDriverVoucher}>🚕 Driver PDF</button>
                </>
              )}
            </div>
            {saveMsg && (
              <p style={{ fontSize: '0.9rem', color: 'var(--emerald)', marginTop: 16, padding: '10px 16px', background: 'rgba(16,185,129,0.15)', borderRadius: 10, borderLeft: '4px solid var(--emerald)' }}>
                ✅ Booking saved successfully!
              </p>
            )}
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

          {editModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
            }}>
              <div className="card" style={{ width: '100%', maxWidth: 700, background: 'var(--bg)', borderTop: '3px solid var(--amber)' }}>
                <h3 style={{ marginBottom: 16 }}>✏️ Edit Booking</h3>
                <div className="row" style={{ marginBottom: 12 }}>
                  <input value={editModal.clientName} onChange={e => setEditModal({ ...editModal, clientName: e.target.value })} placeholder="Passenger Name" style={{ flex: 1 }} />
                  <input value={editModal.clientContact} onChange={e => setEditModal({ ...editModal, clientContact: e.target.value })} placeholder="Contact" style={{ flex: 1 }} />
                  <input value={editModal.pickupLocation} onChange={e => setEditModal({ ...editModal, pickupLocation: e.target.value })} placeholder="Pickup Location" style={{ flex: 1 }} />
                </div>
                <div className="row" style={{ marginBottom: 12 }}>
                  <input value={editModal.bookingReferBy} onChange={e => setEditModal({ ...editModal, bookingReferBy: e.target.value })} placeholder="Refer By (Name)" style={{ flex: 1 }} />
                  <input value={editModal.bookingReferralContact} onChange={e => setEditModal({ ...editModal, bookingReferralContact: e.target.value })} placeholder="Referral Contact" style={{ flex: 1 }} />
                </div>
                <div className="row" style={{ marginBottom: 12 }}>
                  <input type="date" value={editModal.date} onChange={e => setEditModal({ ...editModal, date: e.target.value })} style={{ flex: 1 }} />
                  <input value={editModal.pickupTime} onChange={e => setEditModal({ ...editModal, pickupTime: e.target.value })} placeholder="Time (e.g., 08:30 AM)" style={{ flex: 1 }} />
                  <select value={editModal.dropoffLocation} onChange={e => setEditModal({ ...editModal, dropoffLocation: e.target.value })} style={{ flex: 1 }}>
                    <option value="">-- Drop-off Location --</option>
                    <option value="Kiswa Factory, Mecca Museum, Sulah Hudabia">Kiswa Factory, Mecca Museum, Sulah Hudabia</option>
                    <option value="Jeddah Airport Terminal 1">Jeddah Airport Terminal 1</option>
                    <option value="Jeddah Airport Terminal Hajj">Jeddah Airport Terminal Hajj</option>
                    <option value="Jeddah Airport Terminal North">Jeddah Airport Terminal North</option>
                    <option value="Makkah Hotel">Makkah Hotel</option>
                    <option value="Madinah Hotel">Madinah Hotel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="row" style={{ marginBottom: 12 }}>
                  <select value={editModal.vehicle} onChange={e => setEditModal({ ...editModal, vehicle: e.target.value })} style={{ flex: 1 }}>
                    <option value="">-- Vehicle Type --</option>
                    {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={editModal.package} onChange={e => setEditModal({ ...editModal, package: e.target.value })} style={{ flex: 1 }}>
                    <option value="">-- Package / Route --</option>
                    {packages.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input value={editModal.specialRequest} onChange={e => setEditModal({ ...editModal, specialRequest: e.target.value })} placeholder="Special Request" style={{ flex: 1 }} />
                </div>
                <div className="row" style={{ marginBottom: 12 }}>
                  <input type="number" value={editModal.adults} onChange={e => setEditModal({ ...editModal, adults: e.target.value })} placeholder="Adults" style={{ width: 80 }} />
                  <input type="number" value={editModal.children} onChange={e => setEditModal({ ...editModal, children: e.target.value })} placeholder="Children" style={{ width: 80 }} />
                  <input type="number" value={editModal.luggageSuitcase} onChange={e => setEditModal({ ...editModal, luggageSuitcase: e.target.value })} placeholder="Suitcases" style={{ width: 90 }} />
                  <input type="number" value={editModal.luggageHandCarry} onChange={e => setEditModal({ ...editModal, luggageHandCarry: e.target.value })} placeholder="HandCarrys" style={{ width: 90 }} />
                </div>
                <div className="row" style={{ marginBottom: 20 }}>
                  <input type="number" value={editModal.advanceSAR} onChange={e => setEditModal({ ...editModal, advanceSAR: e.target.value })} placeholder="Advance (SAR)" style={{ width: 140 }} />
                  <input type="number" value={editModal.paymentSAR} onChange={e => setEditModal({ ...editModal, paymentSAR: e.target.value })} placeholder="Total (SAR)" style={{ width: 140 }} />
                  <select value={editModal.paymentMode} onChange={e => setEditModal({ ...editModal, paymentMode: e.target.value })} style={{ width: 140 }}>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                  </select>
                  <select value={editModal.commissionReceived} onChange={e => setEditModal({ ...editModal, commissionReceived: e.target.value })} style={{ width: 180 }}>
                    <option value="No">Commission: Pending</option>
                    <option value="Yes">Commission: Received</option>
                  </select>
                  <input type="number" value={editModal.commissionSAR} onChange={e => setEditModal({ ...editModal, commissionSAR: e.target.value })} placeholder="Commission (SAR)" style={{ width: 160 }} />
                </div>
                <div className="row">
                  <button className="btn-sm primary" onClick={handleEditBooking}>Save Changes</button>
                  <button className="btn-sm" onClick={() => setEditModal(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>📋 Upcoming Bookings</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                type="text"
                placeholder="🔍 Search clients or drivers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ minWidth: 260, borderRadius: 8, padding: '8px 16px' }}
              />
              <button className="btn-sm primary" onClick={exportToExcel}>📥 Export to Excel</button>
            </div>
          </div>
          <div className="card" style={{ borderTop: '3px solid var(--emerald)', overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Added By</th><th>Client Name</th><th>Contact</th><th>Date</th><th>Time</th><th>Vehicle</th>
                  <th>Package</th><th>Passengers</th><th>Luggage</th><th>Payment</th>
                  <th>Driver</th><th>D.Contact</th><th>D.Vehicle</th><th>Reg No.</th><th>Commission</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingBookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--cyan)', textTransform: 'capitalize', fontWeight: 'bold' }}>{(b.addedBy || 'Admin').split('@')[0]}</td>
                    <td>{b.clientName || '-'}<br /><span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{b.bookingReferBy ? `Ref: ${b.bookingReferBy}` : ''}</span></td>
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
                    <td style={{ minWidth: 160 }}>
                      <button className="btn-sm primary" style={{ marginBottom: '5px', width: '100%' }} onClick={() => setAssignModal({
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
                      })}>{b.driverName ? 'Update Driver' : 'Assign Driver'}</button>
                      <br />
                      {b.driverName && (
                        <button className="btn-sm" style={{ background: 'var(--cyan)', color: '#000' }} onClick={() => {
                          setLastSavedBooking(b);
                          setTimeout(downloadDriverVoucher, 100);
                        }}> PDF</button>
                      )}
                      <br />
                      <button className="btn-sm success" style={{ marginBottom: '5px', marginTop: '5px', width: '100%' }} onClick={() => handleCompleteBooking(b.id)}>✓ Confirm Pick</button>
                      <br />
                      <button className="btn-sm" style={{ background: 'var(--amber)', color: '#000', marginBottom: '5px', width: '48%', marginRight: '4%' }} onClick={() => setEditModal(b)}>Edit</button>
                      <button className="btn-sm danger" style={{ marginBottom: '5px', width: '48%' }} onClick={() => handleCancelBooking(b.id)}>Cancel</button>
                    </td>
                  </tr>
                ))}
                {upcomingBookings.length === 0 && <tr><td colSpan={16} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No upcoming bookings.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Past Bookings Table (admin only) */}
        <section style={{ marginBottom: 36, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>📜 Past & Completed Bookings</h2>
          </div>
          <div className="card" style={{ borderTop: '3px solid var(--pink)', overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Status</th><th>Added By</th><th>Client Name</th><th>Date</th><th>Item Details</th>
                  <th>Payment</th><th>Driver / Commission</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastBookings.map(b => (
                  <tr key={b.id} style={{ opacity: b.status === 'cancelled' ? 0.6 : 1 }}>
                    <td>
                      <span className="badge" style={{ background: b.status === 'completed' ? 'var(--emerald)' : 'var(--danger)' }}>
                        {b.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--cyan)', textTransform: 'capitalize', fontWeight: 'bold' }}>{(b.addedBy || 'Admin').split('@')[0]}</td>
                    <td>{b.clientName || '-'}<br /><span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{b.clientContact}</span><br /><span style={{ fontSize: '0.8rem', color: 'var(--amber)' }}>{b.bookingReferBy ? `Ref: ${b.bookingReferBy}` : ''}</span></td>
                    <td>{b.date || '-'}<br /><span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{b.pickupTime}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>
                      🚗 {b.vehicle} | 📦 {b.package}<br />
                      {b.paymentMode === 'Online' ? '💳 Online' : '💵 Cash'}
                    </td>
                    <td className="sar">
                      Adv: {b.advanceSAR || 0}<br />
                      Total: {b.paymentSAR || 0}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {b.driverName || 'No Driver'}<br />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: b.commissionReceived === 'Yes' ? 'var(--emerald)' : 'var(--amber)', cursor: 'pointer', marginTop: 4 }}>
                        <input type="checkbox" checked={b.commissionReceived === 'Yes'} onChange={() => handleToggleCommission(b.id, b.commissionReceived)} />
                        Comm: {b.commissionSAR || 0} ({b.commissionReceived === 'Yes' ? 'Received' : 'Pending'})
                      </label>
                    </td>
                    <td style={{ minWidth: 100 }}>
                      <button className="btn-sm" style={{ background: 'var(--amber)', color: '#000', marginBottom: '5px', width: '100%' }} onClick={() => setEditModal(b)}>Edit</button>
                    </td>
                  </tr>
                ))}
                {pastBookings.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No past bookings.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Driver Settlements */}
        <section style={{ marginBottom: 36, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>💰 Driver Settlements & Balances</h2>
          </div>
          <div className="card" style={{ borderTop: '3px solid var(--purple)', overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Total Commission</th>
                  <th>Total Paid</th>
                  <th>Remaining (Net Owed)</th>
                  <th>Record Payment</th>
                </tr>
              </thead>
              <tbody>
                {driverBalances.map((bal, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 'bold' }}>{bal.driverName}</td>
                    <td style={{ color: 'var(--amber)' }}>{bal.totalCommission}</td>
                    <td style={{ color: 'var(--emerald)' }}>{bal.totalPaid}</td>
                    <td style={{ color: bal.netOwed > 0 ? '#ff4d4d' : 'var(--emerald)', fontWeight: 'bold' }}>
                      {bal.netOwed > 0 ? `${bal.netOwed} SAR (Driver Owes)` : bal.netOwed < 0 ? `${Math.abs(bal.netOwed)} SAR (Advance/Company Owes)` : '0 SAR'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="number" id={`payInput_amt_${idx}`} placeholder="SAR" style={{ width: 80, padding: 6 }} min="1" />
                        <select id={`payInput_mode_${idx}`} style={{ width: 90, padding: 6 }}>
                          <option value="Cash">Cash</option>
                          <option value="Online">Online</option>
                        </select>
                        <input type="text" id={`payInput_comment_${idx}`} placeholder="Add comment..." style={{ width: 140, padding: 6 }} />
                        <button className="btn-sm primary" onClick={async () => {
                          const amt = Number(document.getElementById(`payInput_amt_${idx}`).value);
                          const mode = document.getElementById(`payInput_mode_${idx}`).value;
                          const comment = document.getElementById(`payInput_comment_${idx}`).value;

                          if (!amt || amt <= 0) { alert('Enter a valid amount.'); return; }
                          if (!window.confirm(`Record ${amt} SAR payment by ${mode} from ${bal.driverName}?`)) return;

                          try {
                            await recordDriverPayment(bal.driverName, amt, mode, user, comment);
                            document.getElementById(`payInput_amt_${idx}`).value = '';
                            document.getElementById(`payInput_comment_${idx}`).value = '';
                            loadData();
                            alert('Payment recorded successfully!');
                          } catch (err) {
                            alert(err.message);
                          }
                        }}>
                          Record
                        </button>
                        <button className="btn-sm" style={{ background: 'var(--cyan)', color: '#000' }} onClick={async () => {
                          try {
                            const history = await getDriverPaymentHistory(bal.driverName);
                            setSelectedDriverForHistory(bal.driverName);
                            setPaymentHistoryModal(history);
                          } catch (err) { alert('Failed to load history: ' + err.message); }
                        }}>
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {driverBalances.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No pending driver settlements.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Payment History Modal */}
        {paymentHistoryModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
          }}>
            <div className="card" style={{ width: '100%', maxWidth: 700, background: 'var(--bg)', borderTop: '3px solid var(--cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>📜 Payment History - {selectedDriverForHistory}</h3>
                <button className="btn-sm" onClick={() => setPaymentHistoryModal(null)}>Close</button>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
                <table style={{ minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Amount (SAR)</th>
                      <th>Mode</th>
                      <th>Comment</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistoryModal.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontSize: '0.85rem' }}>{new Date(p.created_at).toLocaleString()}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--emerald)' }}>{p.amount}</td>
                        <td>{p.payment_method}</td>
                        <td style={{ maxWidth: 200, wordWrap: 'break-word', whiteSpace: 'normal', fontSize: '0.9rem' }}>{p.comments || '-'}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{p.recorded_by}</td>
                      </tr>
                    ))}
                    {paymentHistoryModal.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No payment history recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main >
    </>
  );
}
