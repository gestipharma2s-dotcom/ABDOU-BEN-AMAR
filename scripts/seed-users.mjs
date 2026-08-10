import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Environment variables missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const demoUsers = [
  {
    name: 'Karim Benamar',
    email: 'directeur@benamar.dz',
    password_hash: 'dir2026',
    role: 'direction',
    magasins_ids: [],
    telephone: '0551 00 00 01',
    actif: true
  },
  {
    name: 'Rachid Magasiner',
    email: 'rachid.alg@benamar.dz',
    password_hash: 'mag2026',
    role: 'magasinier',
    magasins_ids: [],
    telephone: '0661 12 34 56',
    actif: true
  },
  {
    name: 'Kamel Achat',
    email: 'kamel.achats@benamar.dz',
    password_hash: 'ach2026',
    role: 'achat',
    magasins_ids: [],
    telephone: '0550 44 55 66',
    actif: true
  },
  {
    name: 'Amine Finance',
    email: 'amine.compta@benamar.dz',
    password_hash: 'fin2026',
    role: 'comptabilite',
    magasins_ids: [],
    telephone: '0661 77 88 99',
    actif: true
  },
  {
    name: 'Omar Chef Chantier',
    email: 'omar.chef@benamar.dz',
    password_hash: 'chef2026',
    role: 'chef_chantier',
    magasins_ids: [],
    telephone: '0558 33 22 11',
    actif: true
  }
];

async function seedUsers() {
  console.log('🌱 Seeding demo users...');

  for (const user of demoUsers) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select();

      if (error) {
        console.error(`❌ Failed to insert ${user.email}:`, error.message);
      } else {
        console.log(`✅ Inserted ${user.email}`);
      }
    } catch (err) {
      console.error(`❌ Error for ${user.email}:`, err.message);
    }
  }

  console.log('✨ Seeding complete!');
}

seedUsers();
