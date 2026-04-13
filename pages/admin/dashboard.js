import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  getVehicles, getPackages, getDrivers, getBookings,
  addVehicle, addPackage, addDriver, addBooking, updateBookingDriver,
  getPendingUsers, getAllUsers, approveUser, rejectUser,
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
  const [allUsers, setAllUsers] = useState([]);
  const [driverBalances, setDriverBalances] = useState([]);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ text: '', color: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [activePanel, setActivePanel] = useState('bookings');
  const [bookingViewTab, setBookingViewTab] = useState('pending');
  const [pendingDateFilter, setPendingDateFilter] = useState('all');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [selectedBookingDriver, setSelectedBookingDriver] = useState('all');
  const [driverSearchQuery, setDriverSearchQuery] = useState('');

  const upcomingRef = useRef(null);
  const pastRef = useRef(null);
  const settlementRef = useRef(null);

  const scrollTable = (ref, dir) => {
    if (ref && ref.current) {
      ref.current.scrollBy({ left: dir === 'left' ? -350 : 350, behavior: 'smooth' });
    }
  };

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
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: 960,
        onclone: (clonedDoc, clonedEl) => {
          clonedEl.style.position = 'static';
          clonedEl.style.top = 'auto';
          clonedEl.style.left = 'auto';
          clonedEl.style.width = '900px';
          clonedEl.style.opacity = '1';
          clonedEl.style.zIndex = '1';
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const imgW = canvas.width;
      const imgH = canvas.height;
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [imgW, imgH] });
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH, undefined, 'FAST');
      pdf.save(`SmartWay_Voucher_${lastSavedBooking?.date || 'Download'}.pdf`);

    } catch (err) {
      console.error("PDF Generation Error", err);
      alert("Failed to create the styled PDF. Error: " + err.message);
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
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: 960,
        onclone: (clonedDoc, clonedEl) => {
          clonedEl.style.position = 'static';
          clonedEl.style.top = 'auto';
          clonedEl.style.left = 'auto';
          clonedEl.style.width = '900px';
          clonedEl.style.opacity = '1';
          clonedEl.style.zIndex = '1';
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const imgW = canvas.width;
      const imgH = canvas.height;
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [imgW, imgH] });
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH, undefined, 'FAST');
      pdf.save(`SmartWay_Driver_Voucher_${lastSavedBooking?.date || 'Download'}.pdf`);

    } catch (err) {
      console.error("PDF Generation Error", err);
      alert("Failed to create the driver styled PDF. Error: " + err.message);
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
        const users = await getAllUsers();
        setAllUsers(users);
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

  async function handleMarkPaidAndComplete(id, commissionReceived) {
    if (!confirm('Mark commission as received and move this booking to completed?')) return;
    try {
      if (commissionReceived !== 'Yes') {
        await toggleCommissionStatus(id, 'Yes');
      }
      await updateBookingStatus(id, 'completed');
      await loadData();
    } catch (e) {
      alert('Failed to complete booking with payment: ' + e.message);
    }
  }

  async function handleApprove(uid) {
    if (!confirm('Grant access to this user?')) return;
    await approveUser(uid);
    alert('Access granted.');
    await loadData();
  }

  async function handleReject(uid) {
    if (!confirm('Terminate access for this user?')) return;
    await rejectUser(uid);
    alert('Access terminated.');
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
  const todayStr = getLocalISODate(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = getLocalISODate(tomorrow);

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

  const isPastBooking = (b) => b.status === 'completed' || b.status === 'cancelled';

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

  const passesDriverSearch = (d) => {
    if (!driverSearchQuery) return true;
    const q = driverSearchQuery.toLowerCase();
    const searchable = [
      d.name,
      d.contact,
      d.vehicleName,
      d.vehicleNumber,
      d.shirqaName,
      d.referByName,
      d.referralContact
    ].map(s => (s || '').toLowerCase()).join(' ');
    return searchable.includes(q);
  };

  const bookingDriverOptions = Array.from(new Set([
    ...driversList.map(d => (d.name || '').trim()),
    ...bookings.map(b => (b.driverName || '').trim())
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const selectedDriverAllRecords = bookings.filter(b => (
    selectedBookingDriver === 'all' || (b.driverName || '').trim() === selectedBookingDriver
  ));
  const selectedDriverPendingRides = selectedDriverAllRecords.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length;
  const selectedDriverCompletedRides = selectedDriverAllRecords.filter(b => b.status === 'completed').length;
  const selectedDriverCancelledRides = selectedDriverAllRecords.filter(b => b.status === 'cancelled').length;
  const selectedDriverPendingCommission = selectedDriverAllRecords.reduce((sum, b) => {
    if (b.commissionReceived === 'Yes') return sum;
    return sum + (Number(b.commissionSAR) || 0);
  }, 0);

  const bookingRecords = sortedBookings
    .filter(passesSearch)
    .filter(b => selectedBookingDriver === 'all' || (b.driverName || '').trim() === selectedBookingDriver);
  const upcomingBookings = bookingRecords.filter(b => !isPastBooking(b));
  const confirmedBookings = bookingRecords.filter(b => b.status === 'completed');
  const cancelledBookings = bookingRecords.filter(b => b.status === 'cancelled');
  const todayPendingCount = upcomingBookings.filter(b => b.date === todayStr).length;
  const tomorrowPendingCount = upcomingBookings.filter(b => b.date === tomorrowStr).length;
  const weekPendingCount = upcomingBookings.filter(b => b.date && b.date >= weekStartStr && b.date <= weekEndStr).length;
  const hasInvalidCustomRange = !!(customFromDate && customToDate && customFromDate > customToDate);
  const isWithinCustomRange = (dateStr) => {
    if (!dateStr) return false;
    if (customFromDate && dateStr < customFromDate) return false;
    if (customToDate && dateStr > customToDate) return false;
    return true;
  };
  const customPendingCount = hasInvalidCustomRange
    ? upcomingBookings.length
    : upcomingBookings.filter(b => isWithinCustomRange(b.date)).length;
  const dateFilteredUpcomingBookings = upcomingBookings.filter(b => {
    if (pendingDateFilter === 'today') return b.date === todayStr;
    if (pendingDateFilter === 'tomorrow') return b.date === tomorrowStr;
    if (pendingDateFilter === 'week') return b.date && b.date >= weekStartStr && b.date <= weekEndStr;
    if (pendingDateFilter === 'custom') return hasInvalidCustomRange ? true : isWithinCustomRange(b.date);
    return true;
  });
  const pastBookings = bookingViewTab === 'confirmed'
    ? confirmedBookings
    : bookingViewTab === 'cancelled'
      ? cancelledBookings
      : [...confirmedBookings, ...cancelledBookings];
  const filteredDriversList = driversList.filter(passesDriverSearch);

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

        <section style={{ marginBottom: 24 }}>
          <div className="card" style={{ borderTop: '3px solid var(--cyan)', padding: 12 }}>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-sm" style={{ background: activePanel === 'bookings' ? 'var(--cyan)' : 'rgba(255,255,255,0.08)', color: activePanel === 'bookings' ? '#000' : '#fff' }} onClick={() => setActivePanel('bookings')}>Passengers / Bookings</button>
              <button className="btn-sm" style={{ background: activePanel === 'drivers' ? 'var(--emerald)' : 'rgba(255,255,255,0.08)', color: activePanel === 'drivers' ? '#000' : '#fff' }} onClick={() => setActivePanel('drivers')}>Drivers</button>
              <button className="btn-sm" style={{ background: activePanel === 'new' ? 'var(--purple)' : 'rgba(255,255,255,0.08)', color: '#fff' }} onClick={() => setActivePanel('new')}>Add Data / New Booking</button>
              <button className="btn-sm" style={{ background: activePanel === 'users' ? 'var(--amber)' : 'rgba(255,255,255,0.08)', color: activePanel === 'users' ? '#000' : '#fff' }} onClick={() => setActivePanel('users')}>Users</button>
              <button className="btn-sm" style={{ background: activePanel === 'overview' ? 'var(--pink)' : 'rgba(255,255,255,0.08)', color: '#fff' }} onClick={() => setActivePanel('overview')}>Overview</button>
            </div>
          </div>
        </section>

        {/* Admin Stats */}
        {activePanel === 'overview' && (
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
        )}

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


        {/* User Management (admin only) */}
        {role === 'admin' && activePanel === 'users' && (
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              👥 User Management <span className="pending-count" style={{ background: 'var(--cyan)' }}>{allUsers.length}</span>
            </h2>
            <div className="card" style={{ borderTop: '3px solid var(--amber)', overflowX: 'auto' }}>
              {allUsers.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 16 }}>No users found.</p>
              ) : (
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.uid}>
                        <td style={{ fontWeight: 600, color: 'var(--cyan)', textTransform: 'capitalize' }}>{u.email.split('@')[0]}</td>
                        <td>{u.email}</td>
                        <td>
                          <span style={{
                            padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                            background: u.status === 'approved' ? 'rgba(16,185,129,0.15)' : u.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                            color: u.status === 'approved' ? 'var(--emerald)' : u.status === 'pending' ? 'var(--amber)' : '#f87171'
                          }}>
                            {u.status}
                          </span>
                        </td>
                        <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                        <td>
                          {u.status !== 'approved' && (
                            <button className="btn-sm success" onClick={() => handleApprove(u.uid)} style={{ marginRight: 8 }}>Grant Access</button>
                          )}
                          {u.status !== 'rejected' && (
                            <button className="btn-sm danger" onClick={() => handleReject(u.uid)}>Terminate</button>
                          )}
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
        {activePanel === 'new' && (
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
        )}

        {/* Manage Drivers */}
        {activePanel === 'drivers' && (
        <section style={{ marginBottom: 36, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>🚚 Manage Drivers</h2>
            <input
              type="text"
              placeholder="🔍 Search driver, contact, vehicle..."
              value={driverSearchQuery}
              onChange={e => setDriverSearchQuery(e.target.value)}
              style={{ minWidth: 280, borderRadius: 8, padding: '8px 16px' }}
            />
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
                {filteredDriversList.map(d => (
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
                {filteredDriversList.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No drivers found.</td></tr>}
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
        )}

        {/* New Booking Interface for Admin */}
        {activePanel === 'new' && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 14 }}>✨ New Booking</h2>
          <div className="card" style={{ borderTop: '3px solid var(--cyan)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12 }}>👤 Passenger Details</p>
            <div className="row">
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passenger Name</label>
                <input value={booking.clientName} onChange={e => setBooking({ ...booking, clientName: e.target.value })} placeholder="Enter name" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passenger Contact</label>
                <input value={booking.clientContact} onChange={e => setBooking({ ...booking, clientContact: e.target.value })} placeholder="Enter contact" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nationality (Country)</label>
                <input value={booking.nationality} onChange={e => setBooking({ ...booking, nationality: e.target.value })} placeholder="e.g. Pakistan" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📍 Pickup Location</label>
                <input value={booking.pickupLocation} onChange={e => setBooking({ ...booking, pickupLocation: e.target.value })} placeholder="e.g. Makkah Hotel" style={{ width: '100%' }} />
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Refer By (Name)</label>
                <input value={booking.bookingReferBy} onChange={e => setBooking({ ...booking, bookingReferBy: e.target.value })} placeholder="Referrer name" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Referral Contact</label>
                <input value={booking.bookingReferralContact} onChange={e => setBooking({ ...booking, bookingReferralContact: e.target.value })} placeholder="Referrer contact" style={{ width: '100%' }} />
              </div>
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
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Type</label>
                <input list="adminVehicleList" placeholder="-- Select Vehicle --" value={booking.vehicle} onChange={e => setBooking({ ...booking, vehicle: e.target.value })} style={{ width: '100%' }} />
                <datalist id="adminVehicleList">
                  {vehicles.map(v => <option key={v} value={v} />)}
                </datalist>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Package / Route (tap to select)</label>
                {/* Dropdown to select packages */}
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const current = (booking.package || '').split(', ').filter(Boolean);
                    if (!current.includes(val)) {
                      setBooking({ ...booking, package: [...current, val].join(', ') });
                    }
                  }}
                  style={{ width: '100%', marginBottom: 8, padding: '10px 12px', borderRadius: 8, fontSize: '0.85rem' }}
                >
                  <option value="">-- Dropdown to Select Packages --</option>
                  {packages.map(p => {
                    const selected = (booking.package || '').split(', ').filter(Boolean).includes(p);
                    return (
                      <option key={p} value={p} disabled={selected}>
                        {p} {selected ? '(Selected)' : ''}
                      </option>
                    );
                  })}
                </select>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" placeholder="Type custom route & press +" value={booking._customPkg || ''} onChange={(e) => setBooking({ ...booking, _customPkg: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter' && (booking._customPkg || '').trim()) { e.preventDefault(); const val = booking._customPkg.trim(); const current = (booking.package || '').split(', ').filter(Boolean); if (!current.includes(val)) current.push(val); setBooking({ ...booking, package: current.join(', '), _customPkg: '' }); } }} style={{ flex: 1, padding: '10px 12px', fontSize: '0.85rem', borderRadius: 8 }} />
                  <button type="button" onClick={() => { const val = (booking._customPkg || '').trim(); if (!val) return; const current = (booking.package || '').split(', ').filter(Boolean); if (!current.includes(val)) current.push(val); setBooking({ ...booking, package: current.join(', '), _customPkg: '' }); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--cyan)', color: '#000', fontWeight: 700, fontSize: '1rem', minWidth: 44, minHeight: 40 }}>+</button>
                </div>
                {/* Selected Packages - Slide Down Panel with numbered list and cross buttons */}
                {booking.package && (
                  <div style={{
                    marginTop: 10, padding: '12px 14px',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))',
                    borderRadius: 12, border: '1px solid rgba(16,185,129,0.25)',
                    animation: 'slideDownPkg 0.3s ease-out',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--emerald)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      📦 Selected Packages ({(booking.package || '').split(', ').filter(Boolean).length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(booking.package || '').split(', ').filter(Boolean).map((pkg, idx) => (
                        <div key={pkg + idx} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', borderRadius: 8,
                          background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
                          animation: 'slideInPkg 0.25s ease-out',
                          animationDelay: `${idx * 0.05}s`,
                          animationFillMode: 'both',
                        }}>
                          <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>
                            <span style={{ color: 'var(--cyan)', fontWeight: 700, marginRight: 6 }}>P{idx + 1}.</span>
                            {pkg}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const current = (booking.package || '').split(', ').filter(Boolean);
                              const updated = current.filter(x => x !== pkg);
                              setBooking({ ...booking, package: updated.join(', ') });
                            }}
                            style={{
                              background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                              color: '#f87171', borderRadius: '50%', width: 26, height: 26,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                              transition: 'all 0.15s ease', lineHeight: 1, padding: 0, flexShrink: 0,
                            }}
                            onMouseEnter={e => { e.target.style.background = 'rgba(239,68,68,0.5)'; e.target.style.color = '#fff'; }}
                            onMouseLeave={e => { e.target.style.background = 'rgba(239,68,68,0.2)'; e.target.style.color = '#f87171'; }}
                            title={`Remove ${pkg}`}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <style jsx>{`
                  @keyframes slideDownPkg {
                    from { opacity: 0; transform: translateY(-10px); max-height: 0; }
                    to { opacity: 1; transform: translateY(0); max-height: 500px; }
                  }
                  @keyframes slideInPkg {
                    from { opacity: 0; transform: translateX(-15px); }
                    to { opacity: 1; transform: translateX(0); }
                  }
                `}</style>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📍 Drop-off Location</label>
                <input list="adminDropoffList" placeholder="-- Select/Type Location --" value={booking.dropoffLocation} onChange={e => setBooking({ ...booking, dropoffLocation: e.target.value })} style={{ width: '100%' }} />
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
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <div style={{ minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pick Up Date</label>
                <input type="date" value={booking.date} onChange={e => setBooking({ ...booking, date: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div style={{ minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time (HH:MM)</label>
                <input type="text" placeholder="e.g. 08:30" value={booking.time} onChange={e => setBooking({ ...booking, time: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div style={{ width: 90 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AM/PM</label>
                <select value={booking.ampm} onChange={e => setBooking({ ...booking, ampm: e.target.value })} style={{ width: '100%' }}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Special Request</label>
                <input value={booking.specialRequest} onChange={e => setBooking({ ...booking, specialRequest: e.target.value })} placeholder="Any special request" style={{ width: '100%' }} />
              </div>
              <div style={{ minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Duration</label>
                <input value={booking.totalDuration} onChange={e => setBooking({ ...booking, totalDuration: e.target.value })} placeholder="e.g. 2 Days" style={{ width: '100%' }} />
              </div>
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
        )}
        {/* End Admin Views */}


        {/* Bookings Table (admin only) */}
        {activePanel === 'bookings' && (
        <section style={{ marginBottom: 36, position: 'relative' }}>
          <div className="card" style={{ borderTop: '3px solid var(--cyan)', marginBottom: 14 }}>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-sm" style={{ background: bookingViewTab === 'pending' ? 'var(--cyan)' : 'rgba(255,255,255,0.08)', color: bookingViewTab === 'pending' ? '#000' : '#fff' }} onClick={() => setBookingViewTab('pending')}>Pending ({upcomingBookings.length})</button>
              <button className="btn-sm" style={{ background: bookingViewTab === 'confirmed' ? 'var(--emerald)' : 'rgba(255,255,255,0.08)', color: bookingViewTab === 'confirmed' ? '#000' : '#fff' }} onClick={() => setBookingViewTab('confirmed')}>Confirmed ({confirmedBookings.length})</button>
              <button className="btn-sm" style={{ background: bookingViewTab === 'cancelled' ? 'var(--danger)' : 'rgba(255,255,255,0.08)', color: '#fff' }} onClick={() => setBookingViewTab('cancelled')}>Cancelled ({cancelledBookings.length})</button>
              <button className="btn-sm" style={{ background: bookingViewTab === 'all' ? 'var(--purple)' : 'rgba(255,255,255,0.08)', color: '#fff' }} onClick={() => setBookingViewTab('all')}>All</button>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <select value={selectedBookingDriver} onChange={e => setSelectedBookingDriver(e.target.value)} style={{ minWidth: 260 }}>
                <option value="all">All Drivers</option>
                {bookingDriverOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {selectedBookingDriver !== 'all' && (
                <button className="btn-sm" style={{ background: 'rgba(255,255,255,0.08)' }} onClick={() => setSelectedBookingDriver('all')}>
                  Clear Driver Filter
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Rides</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedDriverPendingRides}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--emerald)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Completed Rides</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedDriverCompletedRides}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}>
                <div style={{ fontSize: '0.75rem', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cancelled Rides</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedDriverCancelledRides}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Commission</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedDriverPendingCommission} SAR</div>
              </div>
            </div>
          </div>

          {(bookingViewTab === 'pending' || bookingViewTab === 'all') && (
            <div className="card" style={{ borderTop: '3px solid var(--emerald)', marginBottom: 14 }}>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <button className="btn-sm" style={{ background: pendingDateFilter === 'all' ? 'var(--emerald)' : 'rgba(255,255,255,0.08)', color: pendingDateFilter === 'all' ? '#000' : '#fff' }} onClick={() => setPendingDateFilter('all')}>All Dates ({upcomingBookings.length})</button>
                <button className="btn-sm" style={{ background: pendingDateFilter === 'today' ? 'var(--cyan)' : 'rgba(255,255,255,0.08)', color: pendingDateFilter === 'today' ? '#000' : '#fff' }} onClick={() => setPendingDateFilter('today')}>Today ({todayPendingCount})</button>
                <button className="btn-sm" style={{ background: pendingDateFilter === 'tomorrow' ? 'var(--amber)' : 'rgba(255,255,255,0.08)', color: pendingDateFilter === 'tomorrow' ? '#000' : '#fff' }} onClick={() => setPendingDateFilter('tomorrow')}>Tomorrow ({tomorrowPendingCount})</button>
                <button className="btn-sm" style={{ background: pendingDateFilter === 'week' ? 'var(--purple)' : 'rgba(255,255,255,0.08)', color: '#fff' }} onClick={() => setPendingDateFilter('week')}>This Week ({weekPendingCount})</button>
                <button className="btn-sm" style={{ background: pendingDateFilter === 'custom' ? 'var(--pink)' : 'rgba(255,255,255,0.08)', color: '#fff' }} onClick={() => setPendingDateFilter('custom')}>Custom Range ({customPendingCount})</button>
              </div>
              <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <input type="date" value={customFromDate} onChange={e => setCustomFromDate(e.target.value)} style={{ minWidth: 170 }} />
                <input type="date" value={customToDate} onChange={e => setCustomToDate(e.target.value)} style={{ minWidth: 170 }} />
                <button className="btn-sm" style={{ background: 'rgba(255,255,255,0.08)' }} onClick={() => { setCustomFromDate(''); setCustomToDate(''); setPendingDateFilter('all'); }}>Reset Dates</button>
              </div>
              {hasInvalidCustomRange && (
                <p style={{ marginTop: 10, marginBottom: 0, fontSize: '0.85rem', color: '#fda4af' }}>
                  Invalid range: From Date cannot be after To Date. Showing all pending bookings until range is corrected.
                </p>
              )}
            </div>
          )}

          {(bookingViewTab === 'pending' || bookingViewTab === 'all') && (
          <>
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
                  <input value={editModal.specialRequest} onChange={e => setEditModal({ ...editModal, specialRequest: e.target.value })} placeholder="Special Request" style={{ flex: 1 }} />
                </div>
                <div style={{ flex: 1, marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Package / Route (tap to select)</label>
                  {/* Dropdown to select packages */}
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const current = (editModal.package || '').split(', ').filter(Boolean);
                      if (!current.includes(val)) {
                        setEditModal({ ...editModal, package: [...current, val].join(', ') });
                      }
                    }}
                    style={{ width: '100%', marginBottom: 8, padding: '10px 12px', borderRadius: 8, fontSize: '0.85rem' }}
                  >
                    <option value="">-- Dropdown to Select Packages --</option>
                    {packages.map(p => {
                      const selected = (editModal.package || '').split(', ').filter(Boolean).includes(p);
                      return (
                        <option key={p} value={p} disabled={selected}>
                          {p} {selected ? '(Selected)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" placeholder="Type custom route & press +" value={editModal._customPkg || ''} onChange={(e) => setEditModal({ ...editModal, _customPkg: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter' && (editModal._customPkg || '').trim()) { e.preventDefault(); const val = editModal._customPkg.trim(); const current = (editModal.package || '').split(', ').filter(Boolean); if (!current.includes(val)) current.push(val); setEditModal({ ...editModal, package: current.join(', '), _customPkg: '' }); } }} style={{ flex: 1, padding: '10px 12px', fontSize: '0.85rem', borderRadius: 8 }} />
                    <button type="button" onClick={() => { const val = (editModal._customPkg || '').trim(); if (!val) return; const current = (editModal.package || '').split(', ').filter(Boolean); if (!current.includes(val)) current.push(val); setEditModal({ ...editModal, package: current.join(', '), _customPkg: '' }); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--cyan)', color: '#000', fontWeight: 700, fontSize: '1rem', minWidth: 44, minHeight: 40 }}>+</button>
                  </div>
                  {/* Selected Packages - Slide Down Panel */}
                  {editModal.package && (
                    <div style={{
                      marginTop: 10, padding: '12px 14px',
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))',
                      borderRadius: 12, border: '1px solid rgba(16,185,129,0.25)',
                      animation: 'slideDownPkg 0.3s ease-out',
                    }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--emerald)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        📦 Selected Packages ({(editModal.package || '').split(', ').filter(Boolean).length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(editModal.package || '').split(', ').filter(Boolean).map((pkg, idx) => (
                          <div key={pkg + idx} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 8,
                            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
                            animation: 'slideInPkg 0.25s ease-out', animationDelay: `${idx * 0.05}s`, animationFillMode: 'both',
                          }}>
                            <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>
                              <span style={{ color: 'var(--cyan)', fontWeight: 700, marginRight: 6 }}>P{idx + 1}.</span>{pkg}
                            </span>
                            <button
                              type="button"
                              onClick={() => { const current = (editModal.package || '').split(', ').filter(Boolean); const updated = current.filter(x => x !== pkg); setEditModal({ ...editModal, package: updated.join(', ') }); }}
                              style={{
                                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                                color: '#f87171', borderRadius: '50%', width: 26, height: 26,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                                transition: 'all 0.15s ease', lineHeight: 1, padding: 0, flexShrink: 0,
                              }}
                              onMouseEnter={e => { e.target.style.background = 'rgba(239,68,68,0.5)'; e.target.style.color = '#fff'; }}
                              onMouseLeave={e => { e.target.style.background = 'rgba(239,68,68,0.2)'; e.target.style.color = '#f87171'; }}
                              title={`Remove ${pkg}`}
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
          <div style={{ position: 'relative' }}>
            <button onClick={() => scrollTable(upcomingRef, 'left')} style={{ position: 'absolute', left: -15, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)', color: '#fff', border: '2px solid var(--cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>❮</button>
            <button onClick={() => scrollTable(upcomingRef, 'right')} style={{ position: 'absolute', right: -15, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)', color: '#fff', border: '2px solid var(--cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>❯</button>
            <div className="card" ref={upcomingRef} style={{ borderTop: '3px solid var(--emerald)', overflowX: 'auto', margin: 0 }}>
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
                  {dateFilteredUpcomingBookings.map(b => (
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
                            setTimeout(downloadDriverVoucher, 500);
                          }}> PDF</button>
                        )}
                        <br />
                        <button className="btn-sm success" style={{ marginBottom: '5px', marginTop: '5px', width: '100%' }} onClick={() => handleCompleteBooking(b.id)}>✓ Confirm Ride</button>
                        <br />
                        <button className="btn-sm" style={{ background: 'var(--emerald)', color: '#000', marginBottom: '5px', width: '100%' }} onClick={() => handleMarkPaidAndComplete(b.id, b.commissionReceived)}>💰 Payment Received + Complete</button>
                        <br />
                        <button className="btn-sm" style={{ background: 'var(--amber)', color: '#000', marginBottom: '5px', width: '48%', marginRight: '4%' }} onClick={() => setEditModal(b)}>Edit</button>
                        <button className="btn-sm danger" style={{ marginBottom: '5px', width: '48%' }} onClick={() => handleCancelBooking(b.id)}>Cancel</button>
                      </td>
                    </tr>
                  ))}
                  {dateFilteredUpcomingBookings.length === 0 && <tr><td colSpan={16} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No bookings for selected date filter.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </section>
        )}

        {/* Past Bookings Table (admin only) */}
        {activePanel === 'bookings' && bookingViewTab !== 'pending' && (
        <section style={{ marginBottom: 36, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>
              {bookingViewTab === 'confirmed' ? '✅ Confirmed Bookings' : bookingViewTab === 'cancelled' ? '❌ Cancelled Bookings' : '📜 Confirmed & Cancelled Bookings'}
            </h2>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => scrollTable(pastRef, 'left')} style={{ position: 'absolute', left: -15, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)', color: '#fff', border: '2px solid var(--pink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>❮</button>
            <button onClick={() => scrollTable(pastRef, 'right')} style={{ position: 'absolute', right: -15, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)', color: '#fff', border: '2px solid var(--pink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>❯</button>
            <div className="card" ref={pastRef} style={{ borderTop: '3px solid var(--pink)', overflowX: 'auto', margin: 0 }}>
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
                          {b.status === 'completed' ? 'CONFIRMED' : 'CANCELLED'}
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
                  {pastBookings.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>{bookingViewTab === 'confirmed' ? 'No confirmed bookings.' : bookingViewTab === 'cancelled' ? 'No cancelled bookings.' : 'No confirmed/cancelled bookings.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

        {/* Driver Settlements */}
        {activePanel === 'drivers' && (
        <section style={{ marginBottom: 36, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>💰 Driver Settlements & Balances</h2>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => scrollTable(settlementRef, 'left')} style={{ position: 'absolute', left: -15, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)', color: '#fff', border: '2px solid var(--purple)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>❮</button>
            <button onClick={() => scrollTable(settlementRef, 'right')} style={{ position: 'absolute', right: -15, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)', color: '#fff', border: '2px solid var(--purple)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>❯</button>
            <div className="card" ref={settlementRef} style={{ borderTop: '3px solid var(--purple)', overflowX: 'auto', margin: 0 }}>
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
          </div>
        </section>
        )}

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
