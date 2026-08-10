import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function testAll() {
  const queries = [
    ['users', () => supabase.from('users').select('*')],
    ['magasins', () => supabase.from('magasins').select('*')],
    ['articles', () => supabase.from('articles').select('*')],
    ['fournisseurs', () => supabase.from('fournisseurs').select('*')],
    ['employes', () => supabase.from('employes').select('*')],
    ['chantiers', () => supabase.from('chantiers').select('*')],
    ['stocks', () => supabase.from('stocks').select('*')],
    ['mouvements_stock', () => supabase.from('mouvements_stock').select('*')],
    ['commandes', () => supabase.from('commandes').select('*')],
    ['receptions', () => supabase.from('receptions').select('*')],
    ['affectations', () => supabase.from('affectations').select('*')],
    ['transferts', () => supabase.from('transferts').select('*')],
    ['paiements', () => supabase.from('paiements').select('*')],
    ['audit_logs', () => supabase.from('audit_logs').select('*')],
    ['factures', () => supabase.from('factures').select('*')],
    ['inventaires', () => supabase.from('inventaires').select('*')]
  ];

  for (const [name, fn] of queries) {
    const start = Date.now();
    try {
      const { data, error } = await fn();
      const duration = Date.now() - start;
      if (error) {
        console.log(`[${duration}ms] ${name}: ERROR ->`, error.message);
      } else {
        console.log(`[${duration}ms] ${name}: SUCCESS (${data ? data.length : 0} rows)`);
      }
    } catch (e) {
      console.log(`[${Date.now() - start}ms] ${name}: EXCEPTION ->`, e.message);
    }
  }
}

testAll();
