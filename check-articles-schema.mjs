import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkSchema() {
  try {
    const { data: testData, error: testError } = await supabase
      .from('articles')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Could not query articles:', testError.message);
      return;
    }
    
    console.log('✅ Articles table is accessible');
    if (testData && testData.length > 0) {
      console.log('📋 Columns in first row:', Object.keys(testData[0]));
    } else {
      console.log('📋 Table is empty');
      // Try insert with minimal data to see what columns are required
      const testInsert = await supabase
        .from('articles')
        .insert([{ reference: 'TEST-SCHEMA-CHECK' }])
        .select();
      
      if (testInsert.data && testInsert.data.length > 0) {
        console.log('📋 Test insert returned columns:', Object.keys(testInsert.data[0]));
        // Delete the test record
        await supabase.from('articles').delete().eq('reference', 'TEST-SCHEMA-CHECK');
      } else if (testInsert.error) {
        console.error('❌ Test insert failed:', testInsert.error.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkSchema();
