import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Always allow env-based admin fallback even when DB is unavailable.
    const fallbackEmail = process.env.ADMIN_EMAIL || 'admin@smartway.com';
    const fallbackPass = process.env.ADMIN_PASSWORD || 'Admin@12345';
    if (normalizedEmail === fallbackEmail.toLowerCase() && password === fallbackPass) {
      return res.status(200).json({ success: true, user: { email: fallbackEmail, role: 'admin' } });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Admin database is not configured on the server.' });
    }

    // Check local database for admin credentials
    const { data: adminUser, error } = await supabase.from('admin_users').select('*').eq('email', normalizedEmail).single();

    if (error || !adminUser) {
      return res.status(401).json({ error: 'Invalid admin credentials or Admin not found.' });
    }

    const isValid = await bcrypt.compare(password, adminUser.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid admin credentials.' });

    return res.status(200).json({ success: true, user: { email: adminUser.email, role: 'admin' } });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.', detail: err?.message || 'Unknown error' });
  }
}
