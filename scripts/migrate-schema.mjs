import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateSchema() {
  console.log('🔄 Checking and fixing schema...\n');

  try {
    // Check articles table - just try to insert/select to see structure
    console.log('📝 Testing articles table...');
    const { error: articlesTestError } = await supabase
      .from('articles')
      .select('*', { count: 'estimated' })
      .limit(0);
    
    if (articlesTestError) {
      console.log('  ⚠️  Articles table error:', articlesTestError.message);
      console.log('     Code:', articlesTestError.code);
    } else {
      console.log('  ✅ Articles table accessible');
    }

    // Try to get table info using information_schema (may not work with anon key)
    console.log('\n📝 Fetching table schemas...');
    const { data: tableInfo, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'articles' })
      .catch(() => ({ data: null, error: { message: 'RPC not available' } }));
    
    if (tableInfo) {
      console.log('  Articles columns:', tableInfo);
    } else {
      console.log('  ℹ️  Cannot fetch schema via RPC (expected with anon key)');
    }

    // Check transferts table
    console.log('\n📝 Testing transferts table...');
    const { error: transfertsError } = await supabase
      .from('transferts')
      .select('*', { count: 'estimated' })
      .limit(0);
    
    if (transfertsError) {
      console.log('  ⚠️  Transferts table error:', transfertsError.message);
      console.log('     Code:', transfertsError.code);
    } else {
      console.log('  ✅ Transferts table accessible');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('⚠️  SCHEMA FIX REQUIRED - Use Supabase SQL Editor:');
  console.log('='.repeat(60));
  console.log(`
1. Go to: https://app.supabase.com/project/peshhcjfrlczmgzqcsjv/sql/new
2. Run this SQL:

-- Add missing created_at columns
ALTER TABLE articles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE receptions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE transferts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE factures ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

3. Then refresh the page to apply changes
`);
}

migrateSchema().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
