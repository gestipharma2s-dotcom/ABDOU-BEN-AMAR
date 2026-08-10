import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

if (!url || !anonKey) {
  console.error('Missing Supabase URL or anon key in environment (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  process.exit(1);
}

if (!email || !password) {
  console.error('Please set TEST_USER_EMAIL and TEST_USER_PASSWORD in your .env to run this authenticated test.');
  process.exit(1);
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

async function main() {
  // Sign in the test user
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('Sign-in error:', signInError);
    process.exit(1);
  }

  console.log('Signed in as', signInData?.user?.email || signInData?.user?.id);

  // Find a fournisseur
  const { data: fournisseurs, error: fouError } = await supabase.from('fournisseurs').select('id, nomSociete').limit(1);
  if (fouError) {
    console.error('Error selecting fournisseur:', fouError);
    process.exit(1);
  }
  const fournisseurId = (fournisseurs && fournisseurs[0] && fournisseurs[0].id) ? fournisseurs[0].id : null;
  const fournisseurName = (fournisseurs && fournisseurs[0]) ? (fournisseurs[0].nomSociete) : null;

  if (!fournisseurId) {
    console.error('No fournisseur found in DB; please create one or set TEST_FOURNISSEUR_ID/NAME in .env');
    process.exit(1);
  }

  const payload = {
    montant: 1,
    code: 'AUTOTEST_' + Date.now(),
    mode: 'Test',
    referenceTransaction: 'auth-ref-' + Date.now(),
    comptableNom: 'ScriptAuth',
    fournisseurId,
    fournisseurNom: fournisseurName
  };

  console.log('Inserting paiement as authenticated user with payload keys:', Object.keys(payload));
  const { data, error } = await supabase.from('paiements').insert([payload]).select().single();
  if (error) {
    console.error('Insert error:', error);
    process.exit(1);
  }
  console.log('Insert OK:', data);
  process.exit(0);
}

main().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
