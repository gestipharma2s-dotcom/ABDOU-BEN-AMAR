import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!serviceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante dans .env');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const anonClient = createClient(supabaseUrl, anonKey);

const TABLES = [
  'users', 'magasins', 'articles', 'fournisseurs',
  'commandes', 'receptions', 'affectations', 'transferts',
  'stocks', 'mouvements_stock', 'inventaires',
  'factures', 'paiements', 'employes', 'chantiers', 'audit_logs'
];

async function checkPolicies() {
  console.log('📋 Diagnostic RLS sur tables clés...\n');
  
  for (const table of ['affectations', 'stocks', 'commandes', 'receptions']) {
    const { error: selErr } = await anonClient.from(table).select('id').limit(1);
    console.log(`SELECT ${table} (anon): ${selErr ? '❌ ' + selErr.message : '✅ OK'}`);
    
    const { error: insErr } = await anonClient.from(table).insert([{ code: '__TEST__' }]);
    if (insErr?.code === '42501') {
      console.log(`INSERT ${table} (anon): ❌ Bloqué par RLS (42501)`);
    } else if (insErr?.code === '23502' || insErr?.code === '23505' || insErr?.code === 'PGRST204') {
      console.log(`INSERT ${table} (anon): ✅ Policy INSERT OK (rejeté pour autre raison: ${insErr.code})`);
    } else {
      console.log(`INSERT ${table} (anon): ${insErr ? '⚠️  ' + insErr.code + ': ' + insErr.message : '✅ OK'}`);
    }
    console.log('');
  }
}

async function applyRLSWithServiceKey() {
  console.log('🔐 Application des policies RLS avec service role key...\n');

  for (const table of TABLES) {
    // Test si la table existe d'abord
    const { error: checkErr } = await adminClient.from(table).select('id').limit(0);
    if (checkErr && (checkErr.code === '42P01' || checkErr.message.includes('not exist'))) {
      console.log(`⚠️  Table ignorée (n'existe pas): ${table}`);
      continue;
    }

    console.log(`  Configuring: ${table}...`);
  }
  
  console.log('\n⚠️  La modification des politiques RLS via l\'API REST n\'est pas possible.');
  console.log('   Il faut exécuter le SQL directement dans le Dashboard Supabase.\n');
  console.log('   ✅ Fichier SQL créé : db/fix_rls_policies.sql');
  console.log('   🌐 Allez sur : https://supabase.com/dashboard/project/peshhcjfrlczmgzqcsjv/sql/new');
  console.log('   📋 Copiez-collez le contenu du fichier db/fix_rls_policies.sql et cliquez Run\n');
}

await checkPolicies();
await applyRLSWithServiceKey();
