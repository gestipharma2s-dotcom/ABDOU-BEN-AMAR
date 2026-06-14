import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Environment variables missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initDatabase() {
    console.log('📂 Reading SQL file...');
    const sqlContent = fs.readFileSync(
        path.join(path.dirname(fileURLToPath(import.meta.url)), '../db/supabase_init.sql'),
        'utf-8'
    );

    // Split SQL into individual statements
    const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements\n`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        console.log(`[${i + 1}/${statements.length}] Executing...`);
        
        try {
            const { error } = await supabase.rpc('exec', { sql: stmt });
            
            if (error) {
                // Some errors are expected (e.g., table already exists)
                if (error.message.includes('already exists') || error.message.includes('EXTENSION')) {
                    console.log(`  ℹ️  ${error.message}`);
                } else {
                    console.warn(`  ⚠️  ${error.message}`);
                }
            } else {
                console.log(`  ✅ Done`);
            }
        } catch (err) {
            console.warn(`  ⚠️  ${err.message}`);
        }
    }
    
    console.log('\n✨ Database initialization complete!');
}

initDatabase().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
