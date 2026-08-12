/**
 * Verifie que les identifiants PostgreSQL du .env permettent bien de joindre la base.
 *
 *   npm run check-db
 *
 * A lancer AVANT `npm run backup-db` : le diagnostic est explicite, la que pg_dump
 * se contente d'un « password authentication failed » sans dire ce qui cloche.
 * Aucune ecriture, aucune donnee lue : juste la connexion et la version du serveur.
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { resoudreConnexion, aideConnexion, masquer } from './lib/pg-tools.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const connexion = resoudreConnexion(null);
if (!connexion) {
  console.error('❌ Identifiants absents ou laisses a l\'etat de gabarit dans .env.');
  console.error('');
  console.error(aideConnexion());
  process.exit(1);
}

const cible = new URL(connexion.url);
console.log(`🔌 Test de connexion — ${connexion.source}`);
console.log(`   ${masquer(connexion.url)}`);
console.log('');

const client = new pg.Client({
  connectionString: connexion.url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

try {
  await client.connect();
  const { rows } = await client.query(
    "select version() as v, current_database() as db," +
    " (select count(*) from information_schema.tables where table_schema = 'public') as tables"
  );
  const majeure = Number((rows[0].v.match(/PostgreSQL (\d+)/) || [])[1] || 0);

  console.log('✅ Connexion etablie.');
  console.log(`   ${rows[0].v.split(' on ')[0]}`);
  console.log(`   base « ${rows[0].db} » — ${rows[0].tables} table(s) dans le schema public`);
  console.log('');
  console.log(`   pg_dump doit etre en version ${majeure} ou superieure pour sauvegarder ce serveur.`);
  console.log('   Vous pouvez lancer :  npm run backup-db');
  await client.end();
} catch (err) {
  const message = err.message || String(err);
  console.error('❌ ' + message);
  console.error('');

  if (/password authentication failed/i.test(message)) {
    console.error('   Le serveur repond : l\'hote et le projet sont bons, seul le mot de passe est refuse.');
    console.error('   Ce n\'est ni le mot de passe de connexion a l\'application, ni une cle API :');
    console.error('   c\'est celui de la base Postgres, jamais reaffiche apres la creation du projet.');
    console.error('   Redefinissez-le : Project Settings > Database > Reset database password,');
    console.error('   puis reportez-le dans SUPABASE_DB_PASSWORD (.env).');
  } else if (/tenant or user not found|tenant\/user/i.test(message)) {
    console.error('   Le pooler ne reconnait pas le locataire : SUPABASE_DB_HOST pointe sur la mauvaise');
    console.error('   region, ou SUPABASE_DB_USER n\'est pas au format postgres.<ref>.');
  } else if (/ETIMEDOUT|ENETUNREACH|ENOTFOUND/i.test(message)) {
    console.error(`   Hote injoignable (${cible.hostname}).`);
    console.error('   L\'hote de connexion directe db.<ref>.supabase.co est publie en IPv6 uniquement :');
    console.error('   utilisez la chaine « Session pooler » (IPv4), port 5432.');
  }
  process.exit(1);
}
