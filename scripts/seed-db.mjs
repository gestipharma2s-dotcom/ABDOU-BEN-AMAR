import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Pre-generate UUIDs for consistency
const MAGASIN_IDS = {
  alg: randomUUID(),
  orn: randomUUID(),
  cst: randomUUID(),
  anb: randomUUID()
};

const USER_IDS = {
  directeur: randomUUID(),
  rachid: randomUUID(),
  yassine: randomUUID(),
  kamel: randomUUID(),
  amine: randomUUID(),
  omar: randomUUID(),
  sofiane: randomUUID()
};

const DEMO_USERS = [
  { id: USER_IDS.directeur, name: 'Karim Benamar', role: 'direction', email: 'directeur@benamar.dz', password_hash: 'dir2026', magasin_id: MAGASIN_IDS.alg, magasins_ids: [MAGASIN_IDS.alg, MAGASIN_IDS.orn, MAGASIN_IDS.cst, MAGASIN_IDS.anb], telephone: '0551 00 00 01', actif: true },
  { id: USER_IDS.rachid, name: 'Rachid Magasiner', role: 'magasinier', magasin_id: MAGASIN_IDS.alg, magasins_ids: [MAGASIN_IDS.alg], password_hash: 'mag2026', email: 'rachid.alg@benamar.dz', telephone: '0661 12 34 56', actif: true },
  { id: USER_IDS.yassine, name: 'Yassine Magasiner', role: 'magasinier', magasin_id: MAGASIN_IDS.orn, magasins_ids: [MAGASIN_IDS.orn], password_hash: 'mag2026', email: 'yassine.orn@benamar.dz', telephone: '0772 98 76 54', actif: true },
  { id: USER_IDS.kamel, name: 'Kamel Achat', role: 'achat', password_hash: 'ach2026', magasins_ids: [MAGASIN_IDS.alg, MAGASIN_IDS.orn, MAGASIN_IDS.cst], email: 'kamel.achats@benamar.dz', telephone: '0550 44 55 66', actif: true },
  { id: USER_IDS.amine, name: 'Amine Finance', role: 'comptabilite', password_hash: 'fin2026', magasins_ids: [MAGASIN_IDS.alg, MAGASIN_IDS.orn, MAGASIN_IDS.cst], email: 'amine.compta@benamar.dz', telephone: '0661 77 88 99', actif: true },
  { id: USER_IDS.omar, name: 'Omar Chef Chantier', role: 'chef_chantier', password_hash: 'chef2026', magasins_ids: [MAGASIN_IDS.alg], email: 'omar.chef@benamar.dz', telephone: '0558 33 22 11', actif: true },
  { id: USER_IDS.sofiane, name: 'Sofiane Magasiner', role: 'magasinier', magasin_id: MAGASIN_IDS.cst, magasins_ids: [MAGASIN_IDS.cst], password_hash: 'mag2026', email: 'sofiane.cst@benamar.dz', telephone: '0553 66 55 44', actif: true }
];

const DEMO_MAGASINS = [
  { id: MAGASIN_IDS.alg, code: 'MAG-ALG', nom: 'Magasin Central - Alger', ville: 'Dar El Beïda', wilaya: 'Alger (16)', responsable: 'Rachid Magasiner', telephone: '021 50 12 34', actif: true },
  { id: MAGASIN_IDS.orn, code: 'MAG-ORN', nom: 'Magasin Régional - Oran', ville: 'Bir El Djir', wilaya: 'Oran (31)', responsable: 'Yassine Magasiner', telephone: '041 82 56 78', actif: true },
  { id: MAGASIN_IDS.cst, code: 'MAG-CST', nom: 'Magasin Est - Constantine', ville: 'El Khroub', wilaya: 'Constantine (25)', responsable: 'Sofiane Bati', telephone: '031 94 33 22', actif: true },
  { id: MAGASIN_IDS.anb, code: 'MAG-ANB', nom: 'Dépôt Annaba', ville: 'El Bouni', wilaya: 'Annaba (23)', responsable: 'Fateh Aïn', telephone: '038 66 11 00', actif: false }
];

async function seedDatabase() {
  console.log('🌱 Seeding Supabase with demo data...\n');

  // Insert Users
  console.log('📝 Inserting users...');
  for (const user of DEMO_USERS) {
    const { error } = await supabase.from('users').insert([user]);
    if (error && !error.message.includes('duplicate')) {
      console.warn('  ⚠️ Error inserting user:', error.message);
    } else {
      console.log(`  ✅ ${user.email}`);
    }
  }

  // Insert Magasins
  console.log('\n🏭 Inserting magasins...');
  for (const magasin of DEMO_MAGASINS) {
    const { error } = await supabase.from('magasins').insert([magasin]);
    if (error && !error.message.includes('duplicate')) {
      console.warn('  ⚠️ Error inserting magasin:', error.message);
    } else {
      console.log(`  ✅ ${magasin.nom}`);
    }
  }

  console.log('\n✨ Seeding complete!');
}

seedDatabase().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
