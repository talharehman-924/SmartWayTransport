import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  try {
    // Check local database for admin credentials
    const { data: adminUser, error } = await supabase.from('admin_users').select('*').eq('email', email.trim().toLowerCase()).single();

    if (error || !adminUser) {
      // Graceful fallback to env values if table is not created yet
      const fallbackEmail = process.env.ADMIN_EMAIL || 'admin@smartway.com';
      const fallbackPass = process.env.ADMIN_PASSWORD || 'Admin@12345';
      if (email.trim().toLowerCase() === fallbackEmail.toLowerCase() && password === fallbackPass) {
        return res.status(200).json({ success: true, user: { email: fallbackEmail, role: 'admin' } });
      }
      return res.status(401).json({ error: 'Invalid admin credentials or Admin not found.' });
    }

    const isValid = await bcrypt.compare(password, adminUser.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid admin credentials.' });

    return res.status(200).json({ success: true, user: { email: adminUser.email, role: 'admin' } });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
