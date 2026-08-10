import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkMagasinsSchema() {
  try {
    const { data, error } = await supabase
      .from('magasins')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying magasins:', error.message);
      return;
    }

    console.log('✅ Magasins table accessible');
    if (data && data.length > 0) {
      console.log('📋 Columns in magasins:', Object.keys(data[0]));
    } else {
      console.log('📋 Magasins table is empty. Testing insert...');
      const testInsert = await supabase
        .from('magasins')
        .insert([{ code: 'TEST-MAG-SCHEMA', nom: 'Test Magasin' }])
        .select();

      if (testInsert.data && testInsert.data.length > 0) {
        console.log('📋 Test insert columns:', Object.keys(testInsert.data[0]));
        await supabase.from('magasins').delete().eq('code', 'TEST-MAG-SCHEMA');
      } else if (testInsert.error) {
        console.error('❌ Test insert error:', testInsert.error.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkMagasinsSchema();
