import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email, currentPassword, newPassword } = req.body || {};
    if (!email || !currentPassword || !newPassword) return res.status(400).json({ error: 'Missing requirements.' });

    try {
        const { data: adminUser, error } = await supabase.from('admin_users').select('*').eq('email', email.trim().toLowerCase()).single();

        if (error || !adminUser) {
            if (error && error.code === '42P01') {
                return res.status(500).json({ error: 'Please run the SQL file (admin_setup.txt) in your Supabase SQL editor first!' });
            }
            return res.status(404).json({ error: 'Admin account not found.' });
        }

        const isValid = await bcrypt.compare(currentPassword, adminUser.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Current password is incorrect.' });

        const newHashed = await bcrypt.hash(newPassword, 10);
        const { error: updateErr } = await supabase.from('admin_users').update({ password_hash: newHashed }).eq('id', adminUser.id);

        if (updateErr) throw new Error('Failed to update password');

        return res.status(200).json({ success: true, message: 'Password updated successfully!' });

    } catch (err) {
        return res.status(500).json({ error: 'Internal server error.' });
    }
}
