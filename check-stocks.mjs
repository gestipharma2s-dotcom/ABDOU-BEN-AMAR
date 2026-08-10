import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("=== STOCKS ===");
  const { data: stocks, error: err1 } = await supabase.from('stocks').select('*');
  console.log(err1 || stocks);

  console.log("\n=== ARTICLES ===");
  const { data: articles } = await supabase.from('articles').select('id, reference, designation');
  console.log(articles);

  console.log("\n=== MAGASINS ===");
  const { data: magasins } = await supabase.from('magasins').select('id, code, nom');
  console.log(magasins);
}

run();
