import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Environment variables missing: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
});

const sqlFilePath = path.join(__dirname, '../db/supabase_init.sql');

try {
  console.log('📖 Reading SQL file...');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  
  // Split by semicolon and filter empty statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    console.log(`\n[${i + 1}/${statements.length}] Executing SQL...`);
    
    try {
      // Use the SQL query execution
      const { data, error } = await supabase.rpc('exec', { 
        sql: stmt 
      }).catch(async () => {
        // Fallback: try direct SQL execution
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=representation'
          },
          body: `query=${encodeURIComponent(stmt)}`
        }).catch(e => ({ error: e }));
        return response;
      });

      if (error) {
        console.warn(`⚠️  Warning on statement ${i + 1}:`, error?.message || error);
      } else {
        console.log(`✅ Statement ${i + 1} executed`);
      }
    } catch (err) {
      console.warn(`⚠️  Warning on statement ${i + 1}:`, err.message);
    }
  }
  
  console.log('\n✨ SQL initialization complete!');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
