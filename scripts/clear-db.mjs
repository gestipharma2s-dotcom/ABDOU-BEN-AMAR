import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Environment variables missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearDatabase() {
    console.log('🗑️  Clearing all tables in Supabase...\n');
    
    const tables = [
        'transfert_lignes',
        'transferts',
        'commande_lignes',
        'reception_lignes',
        'commandes',
        'receptions',
        'mouvements_stock',
        'stocks',
        'factures',
        'paiements',
        'affectations',
        'fournisseurs',
        'articles',
        'magasins',
        'audit_logs',
        'users'
    ];

    for (const table of tables) {
        try {
            console.log(`Clearing ${table}...`);
            const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            
            if (error) {
                console.warn(`⚠️  Could not clear ${table}:`, error.message);
            } else {
                console.log(`✅ Cleared ${table}`);
            }
        } catch (err) {
            console.warn(`⚠️  Error clearing ${table}:`, err.message);
        }
    }
    
    console.log('\n✨ Database cleared!');
}

clearDatabase().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
