import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Check the actual columns in affectations
console.log('🔍 Inspecting affectations table structure...\n');
const { data: sample } = await supabase.from('affectations').select('*').limit(1);
if (sample?.[0]) {
  console.log('Sample row keys:', Object.keys(sample[0]));
} else {
  console.log('Table is empty - trying insert test...');
}

// Try inserting with chantierId = null to confirm which column causes the issue
const { error: testErr } = await supabase.from('affectations').insert([{
  code: '__SCHEMA_TEST__',
  "chantierId": null,
  "employeId": null,
  "magasinId": null,
  "statut": 'test'
}]);
console.log('Insert test error:', testErr ? `${testErr.code}: ${testErr.message}` : 'OK');

// Clean up if inserted
await supabase.from('affectations').delete().eq('code', '__SCHEMA_TEST__');
