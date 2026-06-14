import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
    console.log('📋 Checking tables in Supabase...\n');
    
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
        'users',
        'fournisseurs',
        'articles',
        'magasins',
        'audit_logs'
    ];

    for (const table of tables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('count', { count: 'exact', head: true });
            
            if (error) {
                if (error.message.includes('does not exist')) {
                    console.log(`❌ ${table} - does not exist`);
                } else {
                    console.log(`⚠️  ${table} - ${error.message}`);
                }
            } else {
                console.log(`✅ ${table} - exists`);
            }
        } catch (err) {
            console.log(`❓ ${table} - ${err.message}`);
        }
    }
}

checkTables().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
