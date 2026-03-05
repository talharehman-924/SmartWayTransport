import { supabase } from './supabase';
import { syncToGoogleSheet } from './googleSheets';

// ─── Password Strength ───
export function isPasswordStrong(p) {
  if (!p || p.length < 8) return { ok: false, msg: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(p)) return { ok: false, msg: 'At least 1 uppercase letter required.' };
  if (!/[a-z]/.test(p)) return { ok: false, msg: 'At least 1 lowercase letter required.' };
  if (!/[0-9]/.test(p)) return { ok: false, msg: 'At least 1 number required.' };
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\];'\\\/`~]/.test(p)) return { ok: false, msg: 'At least 1 special character required.' };
  return { ok: true };
}

// ─── Members Auth (Supabase Auth) ───
export async function memberSignUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function memberLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function memberSignOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ─── Users Table ───
export async function getUserData(uid) {
  const { data, error } = await supabase.from('users').select('*').eq('id', uid).single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}

export async function setUser(uid, email, role, status) {
  const { error } = await supabase.from('users').upsert({
    id: uid,
    email,
    role,
    status: status || 'pending',
    created_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
}

export async function getPendingUsers() {
  const { data, error } = await supabase.from('users').select('*').eq('status', 'pending');
  if (error) throw error;
  return (data || []).map(u => ({ uid: u.id, email: u.email, role: u.role, status: u.status, createdAt: u.created_at }));
}

export async function approveUser(uid) {
  const { error } = await supabase.from('users').update({ status: 'approved' }).eq('id', uid);
  if (error) throw error;
}

export async function rejectUser(uid) {
  const { error } = await supabase.from('users').update({ status: 'rejected' }).eq('id', uid);
  if (error) throw error;
}

// ─── Login Logs ───
export async function addLoginLog(uid, email, role) {
  await supabase.from('login_logs').insert({ uid, email, role, timestamp: new Date().toISOString() });
}

// ─── Config (vehicles, packages) ───
async function getConfigItems(key) {
  const { data, error } = await supabase.from('config').select('items').eq('key', key).single();
  if (error && error.code === 'PGRST116') return [];
  if (error) throw error;
  return data?.items || [];
}
async function setConfigItems(key, items) {
  const { error } = await supabase.from('config').upsert({ key, items }, { onConflict: 'key' });
  if (error) throw error;
}

export const getVehicles = () => getConfigItems('vehicles');
export const getPackages = () => getConfigItems('packages');
export const setVehicles = (items) => setConfigItems('vehicles', items);
export const setPackages = (items) => setConfigItems('packages', items);

export async function addVehicle(name) {
  const v = await getVehicles();
  if (v.includes(name)) return false;
  v.push(name);
  await setVehicles(v);
  return true;
}

export async function addPackage(name) {
  const p = await getPackages();
  if (p.includes(name)) return false;
  p.push(name);
  await setPackages(p);
  return true;
}

// ─── Drivers ───
export async function getDrivers() {
  const { data, error } = await supabase.from('drivers').select('*').order('name');
  if (error) throw error;
  return (data || []).map(d => ({
    id: d.id, name: d.name, contact: d.contact, vehicleName: d.vehicle_name, vehicleNumber: d.vehicle_number,
    shirqaName: d.shirqa_name, referByName: d.refer_by_name, referralContact: d.referral_contact
  }));
}

export async function addDriver(d) {
  const { data, error } = await supabase.from('drivers').insert({
    name: d.name, contact: d.contact, vehicle_name: d.vehicleName, vehicle_number: d.vehicleNumber,
    shirqa_name: d.shirqaName || '', refer_by_name: d.referByName || '', referral_contact: d.referralContact || ''
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function updateDriver(id, d) {
  const { error } = await supabase.from('drivers').update({
    name: d.name, contact: d.contact, vehicle_name: d.vehicleName, vehicle_number: d.vehicleNumber,
    shirqa_name: d.shirqaName || '', refer_by_name: d.referByName || '', referral_contact: d.referralContact || ''
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteDriver(id) {
  const { error } = await supabase.from('drivers').delete().eq('id', id);
  if (error) throw error;
}

// ─── Bookings ───
export async function getBookings() {
  const { data, error } = await supabase.from('bookings').select('*').order('date', { ascending: true });
  if (error) throw error;
  return (data || []).map(b => ({
    id: b.id, clientName: b.client_name, clientContact: b.client_contact, nationality: b.nationality || '',
    pickupLocation: b.pickup_location, dropoffLocation: b.dropoff_location,
    date: b.date, pickupTime: b.pickup_time, vehicle: b.vehicle, package: b.package,
    adults: b.adults, children: b.children, specialRequest: b.special_request,
    luggageSuitcase: b.luggage_suitcase, luggageHandCarry: b.luggage_hand_carry,
    luggageCarton: b.luggage_carton, luggageStroller: b.luggage_stroller, luggageWheelchair: b.luggage_wheelchair,
    paymentSAR: b.payment_sar, advanceSAR: b.advance_sar, totalDuration: b.total_duration,
    driverId: b.driver_id, driverName: b.driver_name, driverContact: b.driver_contact,
    driverVehicle: b.driver_vehicle, driverRegNo: b.driver_reg_no,
    shirqaName: b.shirqa_name, referByName: b.refer_by_name, referralContact: b.referral_contact,
    commissionSAR: b.commission_sar, status: b.status || 'pending', addedBy: b.added_by || '',
    bookingReferBy: b.booking_refer_by || '', bookingReferralContact: b.booking_referral_contact || '',
    paymentMode: b.payment_mode || 'Cash', commissionReceived: b.commission_received || 'No',
    createdAt: b.created_at,
  }));
}

export async function addBooking(b) {
  const payload = {
    client_name: b.clientName || '', client_contact: b.clientContact || '',
    pickup_location: b.pickupLocation || '', dropoff_location: b.dropoffLocation || '',
    date: b.date, pickup_time: b.pickupTime, vehicle: b.vehicle, package: b.package,
    adults: Number(b.adults) || 0, children: Number(b.children) || 0,
    special_request: b.specialRequest || '',
    luggage_suitcase: Number(b.luggageSuitcase) || 0, luggage_hand_carry: Number(b.luggageHandCarry) || 0,
    luggage_carton: Number(b.luggageCarton) || 0, luggage_stroller: Number(b.luggageStroller) || 0,
    luggage_wheelchair: Number(b.luggageWheelchair) || 0,
    payment_sar: Number(b.paymentSAR) || 0, advance_sar: Number(b.advanceSAR) || 0,
    total_duration: b.totalDuration || '',
    driver_name: b.driverName || '', driver_contact: b.driverContact || '',
    driver_vehicle: b.driverVehicle || '', driver_reg_no: b.driverRegNo || '',
    shirqa_name: b.shirqaName || '', refer_by_name: b.referByName || '', referral_contact: b.referralContact || '',
    commission_sar: Number(b.commissionSAR) || 0,
    booking_refer_by: b.bookingReferBy || '', booking_referral_contact: b.bookingReferralContact || '',
    created_at: new Date().toISOString(),
  };

  // Only include if value is present, to prevent errors if column hasn't been created yet but they added empty strings. Wait, even if not sent, if it's not present it's safe.
  if (b.status) payload.status = b.status;
  if (b.addedBy) payload.added_by = b.addedBy;
  if (b.paymentMode) payload.payment_mode = b.paymentMode;
  if (b.commissionReceived) payload.commission_received = b.commissionReceived;
  if (b.nationality !== undefined) payload.nationality = b.nationality || '';

  const { data, error } = await supabase.from('bookings').insert(payload).select('id').single();
  if (error) throw error;

  // Sync background to Google Sheets
  try {
    syncToGoogleSheet({ ...payload, id: data.id });
  } catch (err) { console.error(err); }

  // If the error is regarding missing columns, they will be prompted.
  return data.id;
}

export async function updateBooking(id, b) {
  const payload = {
    client_name: b.clientName || '', client_contact: b.clientContact || '',
    pickup_location: b.pickupLocation || '', dropoff_location: b.dropoffLocation || '',
    date: b.date, pickup_time: b.pickupTime, vehicle: b.vehicle, package: b.package,
    adults: Number(b.adults) || 0, children: Number(b.children) || 0,
    special_request: b.specialRequest || '',
    luggage_suitcase: Number(b.luggageSuitcase) || 0, luggage_hand_carry: Number(b.luggageHandCarry) || 0,
    luggage_carton: Number(b.luggageCarton) || 0, luggage_stroller: Number(b.luggageStroller) || 0,
    luggage_wheelchair: Number(b.luggageWheelchair) || 0,
    payment_sar: Number(b.paymentSAR) || 0, advance_sar: Number(b.advanceSAR) || 0,
    total_duration: b.totalDuration || '',
    driver_name: b.driverName || '', driver_contact: b.driverContact || '',
    driver_vehicle: b.driverVehicle || '', driver_reg_no: b.driverRegNo || '',
    shirqa_name: b.shirqaName || '', refer_by_name: b.referByName || '', referral_contact: b.referralContact || '',
    commission_sar: Number(b.commissionSAR) || 0,
    booking_refer_by: b.bookingReferBy || '', booking_referral_contact: b.bookingReferralContact || '',
  };

  if (b.status) payload.status = b.status;
  if (b.paymentMode) payload.payment_mode = b.paymentMode;
  if (b.commissionReceived) payload.commission_received = b.commissionReceived;
  if (b.nationality !== undefined) payload.nationality = b.nationality || '';

  const { error } = await supabase.from('bookings').update(payload).eq('id', id);
  if (error) throw error;

  // Sync background to Google Sheets
  try {
    syncToGoogleSheet({ ...payload, id });
  } catch (err) { console.error(err); }
}

export async function deleteBooking(id) {
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw error;
}

export async function updateBookingStatus(id, status) {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function toggleCommissionStatus(id, commission_received) {
  const { error } = await supabase.from('bookings').update({ commission_received }).eq('id', id);
  if (error) throw error;
}

export async function getDriverBalances() {
  // Get all bookings with commission > 0 (both Pending and Received for lifetime total)
  const { data: allBookings, error: bErr } = await supabase
    .from('bookings')
    .select('driver_name, commission_sar')
    .gt('commission_sar', 0);
  if (bErr) throw bErr;

  // Get all driver payments
  const { data: payments, error: pErr } = await supabase
    .from('driver_payments')
    .select('driver_name, amount');
  if (pErr) throw pErr;

  const balances = {};

  // Sum lifetime commissions
  (allBookings || []).forEach(b => {
    if (!b.driver_name) return;
    if (!balances[b.driver_name]) balances[b.driver_name] = { totalCommission: 0, totalPaid: 0, netOwed: 0 };
    balances[b.driver_name].totalCommission += Number(b.commission_sar) || 0;
  });

  // Sum payments
  (payments || []).forEach(p => {
    if (!p.driver_name) return;
    if (!balances[p.driver_name]) balances[p.driver_name] = { totalCommission: 0, totalPaid: 0, netOwed: 0 };
    balances[p.driver_name].totalPaid += Number(p.amount) || 0;
  });

  // Calculate net owed (Remaining)
  Object.keys(balances).forEach(driver => {
    balances[driver].netOwed = balances[driver].totalCommission - balances[driver].totalPaid;
  });

  // Convert to array and filter out drivers with no financial history
  return Object.keys(balances).map(driverName => ({
    driverName,
    ...balances[driverName]
  })).filter(b => b.totalCommission > 0 || b.totalPaid > 0);
}

export async function getDriverPaymentHistory(driverName) {
  const { data, error } = await supabase
    .from('driver_payments')
    .select('*')
    .eq('driver_name', driverName)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function recordDriverPayment(driverName, amount, method, adminEmail, comments) {
  if (amount <= 0) throw new Error("Payment must be greater than zero");

  // 1. Record the receipt
  const { error: paymentError } = await supabase.from('driver_payments').insert({
    driver_name: driverName,
    amount,
    payment_method: method || 'Cash',
    recorded_by: adminEmail || 'Sys',
    comments: comments || ''
  });
  if (paymentError) throw paymentError;

  // 2. Clear out older Pending Bookings automatically (FIFO - First In, First Out)
  let remainingPayment = amount;
  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select('id, commission_sar')
    .eq('driver_name', driverName)
    .eq('commission_received', 'No')
    .order('date', { ascending: true }); // Oldest first

  for (const booking of (pendingBookings || [])) {
    if (remainingPayment >= booking.commission_sar && booking.commission_sar > 0) {
      // Fully mark this booking's commission as Received
      await supabase.from('bookings').update({ commission_received: 'Yes' }).eq('id', booking.id);
      remainingPayment -= booking.commission_sar;
    } else if (remainingPayment > 0) {
      // Partial payments remain tracked by driver_payments vs total pending
      // We do not set 'Yes' because they theoretically haven't paid off this full booking yet
      break;
    } else {
      break;
    }
  }
}

export async function updateBookingDriver(id, b) {
  const { data, error } = await supabase.from('bookings').update({
    driver_name: b.driverName || '',
    driver_contact: b.driverContact || '',
    driver_vehicle: b.driverVehicle || '',
    driver_reg_no: b.driverRegNo || '',
    shirqa_name: b.shirqaName || '',
    refer_by_name: b.referByName || '',
    referral_contact: b.referralContact || '',
    commission_sar: Number(b.commissionSAR) || 0,
  }).eq('id', id).select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Update blocked by database permissions (Row Level Security). Please add an RLS policy in Supabase to allow UPDATE actions on the "bookings" table.');
  }

  // Sync background to Google Sheets
  try {
    syncToGoogleSheet({ ...b, id });
  } catch (err) { console.error(err); }
}

// ─── Seed Defaults ───
export async function seedDefaults() {
  const v = await getVehicles();
  const defaultVehicles = ['Camry', 'Sonata', 'Sedan', 'Hyundai Staria', 'Hiace', 'Hyundai Starex', 'SUV', 'Coaster', 'BUS', 'Stargazer', 'Veloz'];

  // Always update vehicles to include defaults and exclude GMC
  let updatedVehicles = [...new Set([...v, ...defaultVehicles])].filter(name => name !== 'GMC');
  if (v.join(',') !== updatedVehicles.join(',')) {
    await setVehicles(updatedVehicles);
  }

  const p = await getPackages();
  const defaultPackages = [
    'Makkah to Madinah', 'Makkah Ziyarat', 'Madinah Ziyarat', 'Airport Transfer', 'City Tour',
    'Madina to Makah', 'Jeddah Airport T1 to Makkah Hotel', 'Jeddah Airport TN to Makkah Hotel',
    'Jeddah Airport TH to Makkah Hotel', 'Jeddah Airport T1 to Madinah Hotel', 'Jeddah Airport N to Madinah Hotel',
    'Jeddah Airport H to Madinah Hotel', 'Majid e Ayesha (Miqat)', 'Masjid e Jurana (Miqat)',
    'Taif Ziyarat', 'Badar Ziyarat', 'Makkah To Madinah Via Badar'
  ];

  let updatedPackages = [...new Set([...p, ...defaultPackages])];
  if (p.join(',') !== updatedPackages.join(',')) {
    await setPackages(updatedPackages);
  }

  const d = await getDrivers();
  if (d.length === 0) {
    await addDriver({ name: 'Ahmed Khan', contact: '+966 50 123 4567', vehicleName: 'Camry', vehicleNumber: 'ABC 1234' });
    await addDriver({ name: 'Mohammad Ali', contact: '+966 55 987 6543', vehicleName: 'Hyundai Staria', vehicleNumber: 'XYZ 5678' });
  }
}
