import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  const { error } = await supabase.from('audit_logs').select('table').limit(1);
  if (!error) {
    console.log("✅ Column 'table' exists in audit_logs!");
  } else {
    console.log("❌ Column 'table' error:", error.message);
  }
}

runTest();
