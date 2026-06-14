import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use the service role key to bypass RLS!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
    console.log("Attempting to insert a user using service role key...");
    const { data, error } = await supabase.from('users').insert([{
        name: 'Directeur BGM',
        email: 'directeur@benamar.dz',
        password_hash: 'dir2026',
        role: 'direction',
        actif: true,
        telephone: '0550123456'
    }]).select();
    
    if (error) {
        console.error("Insert Error:", error);
    } else {
        console.log("Insert Success! You can now log in.");
        console.log(JSON.stringify(data, null, 2));
    }
}

seed();
