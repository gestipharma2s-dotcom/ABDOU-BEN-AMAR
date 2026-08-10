import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
if (!url || !key) { console.error('Missing Supabase URL or API key'); process.exit(1); }
const supabase = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  try {
    console.log('Querying fournisseurs via anon key...');
    const { data, error } = await supabase.from('fournisseurs').select('*').limit(5);
    if (error) console.error('Select fournisseurs error:', error);
    console.log('Rows:', data && data.length ? data.length : 0);
    if (data && data.length) console.log(JSON.stringify(data, null, 2));
  } catch (e) { console.error('Probe error:', e); }
  process.exit(0);
})();
