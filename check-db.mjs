import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
    const r1 = await supabase.from('drivers').select('*').limit(1);
    console.log('drivers error:', r1.error);
    if (r1.data) console.log('drivers cols:', Object.keys(r1.data[0] || {}));

    const r2 = await supabase.from('bookings').select('*').limit(1);
    console.log('bookings error:', r2.error);
    if (r2.data) console.log('bookings cols:', Object.keys(r2.data[0] || {}));
}
run();
