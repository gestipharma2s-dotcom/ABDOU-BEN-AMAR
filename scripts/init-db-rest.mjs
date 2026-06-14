import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    try {
        // Try a simple query to test connection
        const { data, error } = await supabase
            .from('users')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Connection Error:', error.message);
            return false;
        }
        
        console.log('✅ Connection successful!');
        return true;
    } catch (err) {
        console.error('❌ Error:', err.message);
        return false;
    }
}

async function initDatabase() {
    console.log('\n📂 Reading SQL file...');
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

    // Execute via REST API directly
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        console.log(`[${i + 1}/${statements.length}] Executing SQL statement...`);
        
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ sql: stmt })
            });

            const result = await response.json();
            
            if (!response.ok) {
                console.warn(`  ⚠️  ${result.message || 'Unknown error'}`);
            } else {
                console.log(`  ✅ Done`);
            }
        } catch (err) {
            console.warn(`  ⚠️  ${err.message}`);
        }
    }
    
    console.log('\n✨ Database initialization attempt complete!');
}

async function main() {
    const connected = await testConnection();
    if (connected) {
        await initDatabase();
    } else {
        console.log('\n⚠️  Could not connect to Supabase. Check your credentials.');
    }
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
