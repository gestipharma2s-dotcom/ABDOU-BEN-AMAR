/**
 * Restauration d'une sauvegarde produite par scripts/backup-db.mjs.
 *
 *   npm run restore-db -- backups\bgm_20260812-1830.dump --confirm=RESTAURER
 *   npm run restore-db -- backups\bgm_20260812-1830.sql  --confirm=RESTAURER --url="postgresql://..."
 *
 * ⚠️ OPERATION DESTRUCTIVE : par defaut, --clean supprime les objets existants du
 * schema avant de les recreer. Toutes les donnees actuelles de la base cible sont
 * remplacees par celles du fichier. La confirmation explicite --confirm=RESTAURER
 * est obligatoire, il n'y a pas de mode « au cas ou ».
 *
 * Options :
 *   --url=...        base cible (par defaut SUPABASE_DB_URL du .env)
 *   --no-clean       n'efface pas les objets existants (insertion par-dessus)
 *   --dry-run        affiche la commande sans l'executer
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { trouverOutil, resoudreConnexion, aideConnexion } from './lib/pg-tools.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(__dirname, '..');
dotenv.config({ path: path.join(racine, '.env') });

const args = process.argv.slice(2);
const arg = (nom) => {
  const trouve = args.find(a => a.startsWith(`--${nom}=`));
  return trouve ? trouve.slice(nom.length + 3) : null;
};
const aFlag = (nom) => args.includes(`--${nom}`);

const fichier = args.find(a => !a.startsWith('--'));
if (!fichier) {
  console.error('❌ Indiquez le fichier de sauvegarde a restaurer.');
  console.error('   npm run restore-db -- backups\\bgm_AAAAMMJJ-HHMM.dump --confirm=RESTAURER');
  process.exit(1);
}
const chemin = path.isAbsolute(fichier) ? fichier : path.join(racine, fichier);
if (!fs.existsSync(chemin)) {
  console.error('❌ Fichier introuvable :', chemin);
  process.exit(1);
}

if (arg('confirm') !== 'RESTAURER') {
  console.error('⛔ Restauration non confirmee.');
  console.error('');
  console.error('   Cette commande REMPLACE les donnees de la base cible par celles du fichier.');
  console.error('   Faites d\'abord une sauvegarde de l\'etat actuel :  npm run backup-db');
  console.error('');
  console.error('   Puis relancez avec la confirmation explicite :');
  console.error(`     npm run restore-db -- "${fichier}" --confirm=RESTAURER`);
  process.exit(1);
}

// ── Outil selon le format ────────────────────────────────────────────────────
const estDump = chemin.toLowerCase().endsWith('.dump');
const nomOutil = estDump ? 'pg_restore' : 'psql';

const outil = trouverOutil(nomOutil);
if (!outil) {
  console.error(`❌ ${nomOutil} introuvable. Installez les outils clients PostgreSQL ou definissez PG_BIN.`);
  process.exit(1);
}

// ── Cible ────────────────────────────────────────────────────────────────────
const connexion = resoudreConnexion(arg('url'));
if (!connexion) {
  console.error('❌ Base cible absente ou laissee a l\'etat de gabarit.');
  console.error('');
  console.error(aideConnexion());
  process.exit(1);
}
const url = connexion.url;

let hote = '';
try {
  hote = new URL(url).hostname;
} catch {
  console.error('❌ Chaine de connexion illisible.');
  process.exit(1);
}

const nettoyer = !aFlag('no-clean');
const commande = outil.chemin;
const argv = estDump
  ? [
      '--dbname', url,
      ...(nettoyer ? ['--clean', '--if-exists'] : []),
      '--no-owner',
      '--no-privileges',
      '--verbose',
      chemin
    ]
  : [
      // --dbname plutot qu'un argument positionnel : sous Windows, les options
      // placees apres un argument libre ne sont pas prises en compte.
      '--dbname', url,
      '--variable', 'ON_ERROR_STOP=1',
      '--file', chemin
    ];

console.log(`♻️  Restauration — ${outil.texte}`);
console.log(`   Fichier : ${chemin}`);
console.log(`   Cible   : ${hote}`);
console.log(`   Mode    : ${estDump ? (nettoyer ? 'pg_restore --clean (remplacement)' : 'pg_restore (ajout)') : 'psql (rejeu du script)'}`);
console.log('');

if (aFlag('dry-run')) {
  console.log('🔎 --dry-run : commande qui serait executee');
  console.log(`   ${commande} ${argv.map(a => (a === url ? '<URL>' : a)).join(' ')}`);
  process.exit(0);
}

const proc = spawn(commande, argv, { stdio: 'inherit' });
proc.on('error', (err) => {
  console.error('❌ Echec du lancement :', err.message);
  process.exit(1);
});
proc.on('close', (code) => {
  console.log('');
  if (code === 0) {
    console.log('✅ Restauration terminee.');
    console.log('   Verifiez l\'application, puis les compteurs : node scripts/check-tables.mjs');
  } else {
    // pg_restore renvoie un code non nul des qu'un objet existant genere une erreur :
    // ce n'est pas toujours fatal, d'ou le message nuance.
    console.error(`⚠️  ${nomOutil} a quitte avec le code ${code}.`);
    console.error('   Relisez les erreurs ci-dessus : des messages « already exists » sont benins,');
    console.error('   une erreur de contrainte ou de colonne, elle, doit etre traitee.');
    process.exit(code);
  }
});
