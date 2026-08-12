/**
 * Sauvegarde complete de la base PostgreSQL Supabase, via pg_dump.
 *
 *   npm run backup-db
 *   npm run backup-db -- --data-only          (donnees seules, sans le schema)
 *   npm run backup-db -- --url="postgresql://..."
 *   npm run backup-db -- --out=D:\sauvegardes
 *
 * Produit DEUX fichiers horodates dans backups/ :
 *   bgm_AAAAMMJJ-HHMM.dump  format custom  -> restauration par pg_restore (recommande)
 *   bgm_AAAAMMJJ-HHMM.sql   format texte   -> lisible, rejouable par psql
 *
 * Contrairement a l'export JSON de l'application (qui ne voit que ce que la RLS
 * autorise), ce dump contient TOUT : tables, contraintes, index, sequences,
 * fonctions, triggers, policies RLS et donnees.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { trouverOutil, resoudreConnexion, aideConnexion, masquer } from './lib/pg-tools.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(__dirname, '..');
dotenv.config({ path: path.join(racine, '.env') });

// ── Arguments ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const arg = (nom) => {
  const trouve = args.find(a => a.startsWith(`--${nom}=`));
  return trouve ? trouve.slice(nom.length + 3) : null;
};
const aFlag = (nom) => args.includes(`--${nom}`);

const donneesSeules = aFlag('data-only');
const schemaCible = arg('schema') || 'public';
const dossierSortie = arg('out') || path.join(racine, 'backups');

// ── 1. Localiser pg_dump ─────────────────────────────────────────────────────
const pgDump = trouverOutil('pg_dump');
if (!pgDump) {
  console.error('❌ pg_dump introuvable.');
  console.error('   Installez les outils clients PostgreSQL (https://www.postgresql.org/download/windows/),');
  console.error('   ou indiquez leur dossier : set PG_BIN=C:\\Program Files\\PostgreSQL\\17\\bin');
  process.exit(1);
}

// ── 2. Chaine de connexion ───────────────────────────────────────────────────
const connexion = resoudreConnexion(arg('url'));
if (!connexion) {
  console.error('❌ Chaine de connexion PostgreSQL absente ou laissee a l\'etat de gabarit.');
  console.error('');
  console.error(aideConnexion());
  process.exit(1);
}
const url = connexion.url;

let hote = '';
try {
  hote = new URL(url).hostname;
} catch {
  console.error('❌ Chaine de connexion illisible :', masquer(url));
  process.exit(1);
}

if (/^db\..*\.supabase\.co$/i.test(hote)) {
  console.warn('⚠️  Hote « connexion directe » detecte : il est publie en IPv6 uniquement.');
  console.warn('    Si le dump echoue sur un timeout reseau, reprenez la chaine « Session pooler » (IPv4).');
}
if (url.includes(':6543')) {
  console.warn('⚠️  Port 6543 = pooler en mode « transaction » : pg_dump y echoue.');
  console.warn('    Utilisez le port 5432 (mode session).');
}

// ── 3. Sortie ────────────────────────────────────────────────────────────────
fs.mkdirSync(dossierSortie, { recursive: true });
const d = new Date();
const p2 = (n) => String(n).padStart(2, '0');
const horodatage = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
const base = path.join(dossierSortie, `bgm_${horodatage}${donneesSeules ? '_donnees' : ''}`);

const optionsCommunes = [
  '--schema', schemaCible,
  // Les roles et ACL de Supabase n'ont pas d'equivalent sur un projet cible :
  // les omettre evite des centaines d'erreurs « role does not exist » a la restauration.
  '--no-owner',
  '--no-privileges',
  '--verbose'
];
if (donneesSeules) optionsCommunes.push('--data-only');

function lancer(sortieFichier, optionsFormat) {
  return new Promise((resolve, reject) => {
    // L'URL passe par --dbname et non en argument positionnel : sous Windows, pg_dump
    // ne permute pas les options placees apres un argument libre (« trop d'arguments »).
    const argsDump = ['--dbname', url, ...optionsCommunes, ...optionsFormat, '--file', sortieFichier];
    const proc = spawn(pgDump.chemin, argsDump, { stdio: ['ignore', 'inherit', 'pipe'] });

    let derniereErreur = '';
    proc.stderr.on('data', (buf) => {
      const texte = buf.toString();
      derniereErreur += texte;
      // pg_dump ecrit sa progression sur stderr avec --verbose : on ne garde que l'essentiel
      for (const ligne of texte.split('\n')) {
        if (/^pg_dump: (error|warning|avertissement|erreur)/i.test(ligne)) console.error('   ' + ligne.trim());
      }
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump a quitte avec le code ${code}\n${derniereErreur.slice(-800)}`));
    });
  });
}

// ── 4. Execution ─────────────────────────────────────────────────────────────
console.log(`🗄️  Sauvegarde PostgreSQL — ${pgDump.texte}`);
console.log(`   Serveur : ${hote}  (connexion issue de ${connexion.source})`);
console.log(`   Schema  : ${schemaCible}${donneesSeules ? ' (donnees seules)' : ' (schema + donnees)'}`);
console.log(`   Sortie  : ${dossierSortie}`);
console.log('');

try {
  console.log('📦 Format custom (.dump)…');
  await lancer(`${base}.dump`, ['--format', 'custom']);

  console.log('📄 Format texte (.sql)…');
  await lancer(`${base}.sql`, ['--format', 'plain']);
} catch (err) {
  console.error('');
  console.error('❌ Echec de la sauvegarde :', err.message);
  if (/version|serveur|server/i.test(err.message)) {
    console.error(`   pg_dump ${pgDump.majeure} ne peut pas sauvegarder un serveur plus recent.`);
    console.error('   Installez la version majeure correspondant au serveur Supabase, puis relancez.');
  }
  process.exit(1);
}

const poids = (f) => `${(fs.statSync(f).size / 1024).toFixed(1)} Ko`;
console.log('');
console.log('✅ Sauvegarde terminee :');
console.log(`   ${base}.dump  (${poids(`${base}.dump`)})`);
console.log(`   ${base}.sql   (${poids(`${base}.sql`)})`);
console.log('');
console.log('   Ces fichiers contiennent TOUTES les donnees, y compris les mots de passe');
console.log('   en clair de la table users : conservez-les sur un support sur.');
console.log('');
console.log('   Restauration :');
console.log(`     npm run restore-db -- "${base}.dump" --confirm=RESTAURER`);
