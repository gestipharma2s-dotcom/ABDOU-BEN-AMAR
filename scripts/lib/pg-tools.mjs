/**
 * Outils partages par backup-db.mjs et restore-db.mjs :
 * localisation des binaires PostgreSQL et construction de la chaine de connexion.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ── Binaires PostgreSQL ──────────────────────────────────────────────────────
// Ils ne sont pas toujours dans le PATH sous Windows ; on balaie aussi les
// installations standard. Chaque candidat est teste : une installation cassee
// (DLL manquante, --version muet) est ignoree, et on retient la version la plus
// recente qui repond reellement.
function versionDe(binaire) {
  try {
    const res = spawnSync(binaire, ['--version'], { encoding: 'utf-8' });
    if (res.status !== 0 || !res.stdout) return null;
    const m = res.stdout.match(/(\d+)\.(\d+)/);
    return m ? { texte: res.stdout.trim(), majeure: Number(m[1]) } : null;
  } catch {
    return null;
  }
}

export function trouverOutil(nom) {
  // Sous Windows, un chemin explicite doit porter son extension : sans le .exe,
  // le test d'existence echoue et le dossier PG_BIN est ignore en silence.
  const executable = process.platform === 'win32' ? `${nom}.exe` : nom;
  const candidats = [];
  if (process.env.PG_BIN) candidats.push(path.join(process.env.PG_BIN, executable));
  candidats.push(nom); // PATH

  for (const base of ['C:\\Program Files\\PostgreSQL', 'C:\\Program Files (x86)\\PostgreSQL']) {
    if (!fs.existsSync(base)) continue;
    for (const v of fs.readdirSync(base)) {
      candidats.push(path.join(base, v, 'bin', executable));
    }
  }

  const valides = [];
  for (const c of candidats) {
    if (c !== nom && !fs.existsSync(c)) continue;
    const v = versionDe(c);
    if (v) valides.push({ chemin: c, ...v });
  }
  valides.sort((a, b) => b.majeure - a.majeure);
  return valides[0] || null;
}

// ── Chaine de connexion ──────────────────────────────────────────────────────
// Un gabarit non remplace (`<MOT_DE_PASSE>`, `[YOUR-PASSWORD]`, `username:password@db.host`)
// doit etre traite comme une valeur absente, sinon la connexion echoue avec un
// message incomprehensible.
const GABARIT = /username:password@db\.host|<[^>]*>|\[[^\]]*\]|A_REMPLACER/i;
const estRenseigne = (v) => !!v && !GABARIT.test(v);

export function masquer(url) {
  return String(url).replace(/:\/\/([^:@/]+):([^@]*)@/, '://$1:****@');
}

/**
 * Renvoie { url, source } ou null si rien d'exploitable.
 * Ordre : --url= > SUPABASE_DB_URL > variables discretes (HOST/PORT/USER/PASSWORD).
 *
 * Les variables discretes evitent d'avoir a encoder le mot de passe : un `@` ou un
 * `#` dans un mot de passe casse une URI s'il n'est pas percent-encode, ce qui donne
 * une erreur d'authentification trompeuse. Ici l'encodage est fait pour l'appelant.
 */
export function resoudreConnexion(urlArg) {
  if (estRenseigne(urlArg)) return { url: urlArg, source: '--url' };
  if (estRenseigne(process.env.SUPABASE_DB_URL)) return { url: process.env.SUPABASE_DB_URL, source: '.env (SUPABASE_DB_URL)' };

  const mdp = process.env.SUPABASE_DB_PASSWORD;
  if (!estRenseigne(mdp)) return null;

  let hote = process.env.SUPABASE_DB_HOST;
  let utilisateur = process.env.SUPABASE_DB_USER;
  const port = process.env.SUPABASE_DB_PORT || '5432';

  // A defaut d'hote explicite, on retombe sur la connexion directe deduite de
  // l'URL du projet — a n'utiliser que depuis un reseau IPv6, cet hote n'ayant
  // pas d'enregistrement A.
  if (!estRenseigne(hote) || !estRenseigne(utilisateur)) {
    let ref = '';
    try {
      ref = new URL(process.env.VITE_SUPABASE_URL || '').hostname.split('.')[0];
    } catch { /* url projet absente */ }
    if (!ref) return null;
    if (!estRenseigne(hote)) hote = `db.${ref}.supabase.co`;
    if (!estRenseigne(utilisateur)) utilisateur = hote.includes('pooler.supabase.com') ? `postgres.${ref}` : 'postgres';
  }

  const url = `postgresql://${encodeURIComponent(utilisateur)}:${encodeURIComponent(mdp)}@${hote}:${port}/postgres`;
  return { url, source: '.env (SUPABASE_DB_HOST / USER / PASSWORD)' };
}

export function aideConnexion() {
  return [
    '   Tableau de bord Supabase : Project Settings > Database > Connection string.',
    '   ⚠️  Onglet « Session pooler » (IPv4) et NON « Direct connection » : l\'hote direct',
    '       db.<ref>.supabase.co n\'a qu\'une adresse IPv6, injoignable sans connectivite IPv6.',
    '       Port 5432 (session) et non 6543 (transaction), ou pg_dump echoue.',
    '',
    '   Le plus simple dans .env — aucun encodage a faire, meme avec des @ ou des # :',
    '     SUPABASE_DB_HOST=aws-0-<region>.pooler.supabase.com',
    '     SUPABASE_DB_PORT=5432',
    '     SUPABASE_DB_USER=postgres.<ref>',
    '     SUPABASE_DB_PASSWORD=<mot de passe de la base>',
    '',
    '   Ou, en une seule variable (caracteres speciaux a percent-encoder : @ = %40) :',
    '     SUPABASE_DB_URL=postgresql://postgres.<ref>:<MDP>@aws-0-<region>.pooler.supabase.com:5432/postgres'
  ].join('\n');
}
