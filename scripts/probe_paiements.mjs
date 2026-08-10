import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing Supabase URL or API key in environment (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  try {
    console.log('Probing table `paiements`...');

    const { data: rows, error: rowsErr } = await supabase
      .from('paiements')
      .select('*')
      .limit(10)
      .order('id', { ascending: false });

    if (rowsErr) console.error('Error fetching paiements rows:', rowsErr);
    console.log('Sample rows count:', Array.isArray(rows) ? rows.length : 0);
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('Keys on first row:', Object.keys(rows[0]));
      console.log(JSON.stringify(rows, null, 2));
    }

    const { data: one, error: oneErr } = await supabase
      .from('paiements')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (oneErr) console.error('Error fetching single paiement:', oneErr);
    if (one) console.log('Single row keys:', Object.keys(one));

    // Also try a simple headless select to force REST call for column discovery
    const { data: ids, error: idsErr } = await supabase
      .from('paiements')
      .select('id')
      .limit(1);

    if (idsErr) console.error('Error fetching ids from paiements:', idsErr);
    else console.log('Fetched id row:', ids && ids[0] ? ids[0] : null);
  } catch (e) {
    console.error('Probe error:', e);
  } finally {
    process.exit(0);
  }
})();
