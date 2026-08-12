/**
 * Planifie la sauvegarde pg_dump dans le Planificateur de taches Windows.
 * La sauvegarde tourne alors meme si l'application n'est pas ouverte.
 *
 *   npm run schedule-backup                      # tous les jours a 20:00
 *   npm run schedule-backup -- --time=07:30
 *   npm run schedule-backup -- --frequency=WEEKLY --day=MON
 *   npm run schedule-backup -- --list
 *   npm run schedule-backup -- --remove
 *
 * La tache est creee au niveau de l'utilisateur courant : aucun droit
 * administrateur n'est requis, et rien n'est modifie hors du profil utilisateur.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(__dirname, '..');

const NOM_TACHE = 'BGM - Sauvegarde base de donnees';

const args = process.argv.slice(2);
const arg = (nom, defaut = null) => {
  const trouve = args.find(a => a.startsWith(`--${nom}=`));
  return trouve ? trouve.slice(nom.length + 3) : defaut;
};
const aFlag = (nom) => args.includes(`--${nom}`);

if (process.platform !== 'win32') {
  console.error('❌ Ce script pilote le Planificateur de taches Windows.');
  console.error('   Sous Linux/macOS, planifiez `npm run backup-db` avec cron.');
  process.exit(1);
}

// Chemin absolu plutot que le simple nom : certains environnements (shells restreints,
// sessions de service) n'ont pas System32 dans le PATH, et l'echec est alors muet.
const cheminSchtasks = (() => {
  const absolu = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'schtasks.exe');
  return fs.existsSync(absolu) ? absolu : 'schtasks';
})();

const schtasks = (parametres) => spawnSync(cheminSchtasks, parametres, { encoding: 'utf-8', windowsHide: true });

// ── Consultation ─────────────────────────────────────────────────────────────
if (aFlag('list')) {
  const res = schtasks(['/Query', '/TN', NOM_TACHE, '/FO', 'LIST']);
  if (res.status === 0) {
    console.log(res.stdout.trim());
  } else {
    console.log('Aucune sauvegarde planifiee.');
    console.log('Pour en creer une :  npm run schedule-backup');
  }
  process.exit(0);
}

// ── Suppression ──────────────────────────────────────────────────────────────
if (aFlag('remove')) {
  const res = schtasks(['/Delete', '/TN', NOM_TACHE, '/F']);
  if (res.status === 0) {
    console.log('✅ Sauvegarde planifiee supprimee.');
  } else {
    console.log('Aucune sauvegarde planifiee a supprimer.');
  }
  process.exit(0);
}

// ── Creation ─────────────────────────────────────────────────────────────────
const heure = arg('time', '20:00');
if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) {
  console.error(`❌ Heure invalide : « ${heure} ». Format attendu : HH:MM (ex. 20:00).`);
  process.exit(1);
}
const frequence = (arg('frequency', 'DAILY') || '').toUpperCase();
if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequence)) {
  console.error(`❌ Frequence invalide : « ${frequence} ». Valeurs : DAILY, WEEKLY, MONTHLY.`);
  process.exit(1);
}
const jour = (arg('day', 'MON') || '').toUpperCase();

// Un .cmd sert d'enveloppe : schtasks ne sait pas fixer le repertoire de travail,
// or les scripts lisent .env a la racine du projet. Il journalise aussi la sortie,
// seule trace disponible pour une execution sans fenetre.
const cheminCmd = path.join(racine, 'scripts', 'backup-auto.cmd');
const contenuCmd = [
  '@echo off',
  'rem Genere par scripts/schedule-backup.mjs — sauvegarde automatique de la base.',
  'rem Ne pas modifier a la main : relancez `npm run schedule-backup` apres tout deplacement du projet.',
  `cd /d "${racine}"`,
  'if not exist "backups" mkdir "backups"',
  'echo. >> "backups\\journal-sauvegarde.log"',
  'echo ===== %DATE% %TIME% ===== >> "backups\\journal-sauvegarde.log"',
  `"${process.execPath}" "${path.join(racine, 'scripts', 'backup-db.mjs')}" >> "backups\\journal-sauvegarde.log" 2>&1`,
  'exit /b %ERRORLEVEL%',
  ''
].join('\r\n');
fs.writeFileSync(cheminCmd, contenuCmd, 'utf-8');

const parametres = [
  '/Create', '/TN', NOM_TACHE,
  '/TR', `"${cheminCmd}"`,
  '/SC', frequence,
  '/ST', heure,
  '/F' // remplace une tache homonyme existante
];
if (frequence === 'WEEKLY') parametres.push('/D', jour);
if (frequence === 'MONTHLY') parametres.push('/D', '1');

const res = schtasks(parametres);
if (res.status !== 0) {
  console.error('❌ Creation de la tache impossible.');
  const detail = (res.stderr || res.stdout || '').trim();
  console.error(detail || `(${res.error?.message || 'schtasks n\'a rien renvoye'})`);
  console.error(`   Commande : ${cheminSchtasks} ${parametres.join(' ')}`);
  process.exit(1);
}

const libelleFrequence = frequence === 'DAILY'
  ? 'tous les jours'
  : frequence === 'WEEKLY' ? `chaque semaine (${jour})` : 'le 1er de chaque mois';

console.log('✅ Sauvegarde automatique planifiee.');
console.log(`   Tache    : ${NOM_TACHE}`);
console.log(`   Quand    : ${libelleFrequence} a ${heure}`);
console.log(`   Action   : ${cheminCmd}`);
console.log(`   Sortie   : ${path.join(racine, 'backups')}`);
console.log(`   Journal  : ${path.join(racine, 'backups', 'journal-sauvegarde.log')}`);
console.log('');
console.log('   Le poste doit etre allume a cette heure-la : une execution manquee');
console.log('   n\'est pas rattrapee automatiquement par le planificateur.');
console.log('');
console.log('   Verifier :  npm run schedule-backup -- --list');
console.log('   Supprimer : npm run schedule-backup -- --remove');
console.log('   Tester tout de suite : schtasks /Run /TN "' + NOM_TACHE + '"');
