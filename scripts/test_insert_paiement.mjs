import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
// Prefer service role key for test scripts if available (bypasses RLS). Only use in trusted environments.
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!anonKey && !serviceKey) {
  console.error('Missing Supabase anon or service role key in environment.');
  process.exit(1);
}

if (!url || (!anonKey && !serviceKey)) {
  console.error('Missing Supabase URL or anon/service API key in environment (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

function camelToSnake(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  const converted = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    converted[snake] = camelToSnake(v);
  }
  return converted;
}

// Create two clients: public (anon) for selects, admin (service role) for inserts when available.
const publicSupabase = createClient(url, anonKey || serviceKey, { auth: { persistSession: false } });
const adminSupabase = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;
const supabase = adminSupabase || publicSupabase;

(async () => {
  try {
    const attempts = [
      { montant: 1, code: 'TEST_MIN_' + Date.now(), mode: 'Test', referenceTransaction: 'ref-' + Date.now(), comptableNom: 'Script' },
      { montant: 1, code: 'TEST_DATE_' + Date.now(), datePaiement: new Date().toISOString(), mode: 'Test', referenceTransaction: 'ref-' + Date.now(), comptableNom: 'Script' },
      { montant: 1, code: 'TEST_REF_' + Date.now(), referenceTransaction: 'ref-' + Date.now(), mode: 'Test', comptableNom: 'Script' }
    ];

    // Try to find an existing fournisseur id to satisfy NOT NULL constraints
    let fournisseurId = null;
    let fournisseurName = null;
    try {
      const { data: fournisseurs, error: fouError } = await publicSupabase.from('fournisseurs').select('id, nomSociete').limit(1);
      if (fouError) console.error('Error selecting fournisseur:', fouError);
      fournisseurId = (fournisseurs && fournisseurs[0] && fournisseurs[0].id) ? fournisseurs[0].id : null;
      fournisseurName = (fournisseurs && fournisseurs[0]) ? (fournisseurs[0].nomSociete) : null;
    } catch (e) {
      console.error('Selecting fournisseur failed:', e?.message || e);
    }

    // Fallback: allow TEST_FOURNISSEUR_ID / TEST_FOURNISSEUR_NOM from env for offline testing
    if (!fournisseurId) {
      const envId = process.env.TEST_FOURNISSEUR_ID || process.env.TEST_FOURNISSEUR_UUID;
      const envNom = process.env.TEST_FOURNISSEUR_NOM || process.env.TEST_FOURNISSEUR_NAME;
      if (envId) {
        console.warn('No fournisseur found via API — using TEST_FOURNISSEUR_ID from environment for insert.');
        fournisseurId = envId;
        fournisseurName = envNom || 'Test Fournisseur';
      } else {
        console.error('No fournisseur found in DB; set TEST_FOURNISSEUR_ID in environment to run test insert without querying the API.');
        process.exit(1);
      }
    }

    for (const payload of attempts) {
      // ensure fournisseurId and fournisseurNom present to avoid NOT NULL violations
      payload.fournisseurId = fournisseurId;
      payload.fournisseurNom = fournisseurName;
      console.log('\nTrying insert with payload keys:', Object.keys(payload));
      const { data, error } = await supabase.from('paiements').insert([payload]).select().single();
      if (error) {
        console.error('Insert error:', error);
      } else {
        console.log('Insert OK:', data);
        break;
      }
    }
  } catch (e) {
    console.error('Unexpected error:', e);
  } finally {
    process.exit(0);
  }
})();
