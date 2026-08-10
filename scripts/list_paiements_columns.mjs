import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
if (!url || !key) {
  console.error('Missing Supabase URL or API key in environment.');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  try {
    console.log('Querying information_schema.columns for table paiements...');
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name,ordinal_position,is_nullable,data_type')
      .eq('table_name', 'paiements')
      .order('ordinal_position', { ascending: true });

    if (error) {
      console.error('Error querying information_schema.columns:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('No columns returned from information_schema for table paiements.');
    } else {
      console.log('Columns for paiements:');
      data.forEach(col => console.log(`- ${col.column_name} | ${col.data_type} | nullable=${col.is_nullable}`));
    }
  } catch (e) {
    console.error('Unexpected error:', e);
  } finally {
    process.exit(0);
  }
})();
