// Génère WORKFLOW_PRO.pdf depuis WORKFLOW_PRO.md, schémas Mermaid rendus en vectoriel.
//
//   node scripts/build-workflow-pdf.mjs
//
// Aucune dépendance npm : le rendu utilise Chrome ou Edge déjà installés, et la
// bibliothèque Mermaid est téléchargée une fois dans node_modules/.cache.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(RACINE, 'WORKFLOW_PRO.md');
const CIBLE_PDF = path.join(RACINE, 'WORKFLOW_PRO.pdf');
const CACHE = path.join(RACINE, 'node_modules', '.cache', 'workflow-pdf');
const MERMAID = path.join(CACHE, 'mermaid.min.js');
const HTML_TMP = path.join(CACHE, 'workflow-print.html');

const NAVIGATEURS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

// ---------------------------------------------------------------- utilitaires
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = s => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/~~([^~]+)~~/g, '<del>$1</del>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

// ------------------------------------------------------ markdown → fragments
function convertir(md) {
  const lignes = md.split(/\r?\n/);
  const out = [];
  let i = 0, nDiag = 0;
  const estSep = l => /^\|[\s:|-]+\|$/.test(l.trim());

  while (i < lignes.length) {
    const l = lignes[i];

    if (l.trim() === '```mermaid') {
      const buf = []; i++;
      while (i < lignes.length && lignes[i].trim() !== '```') buf.push(lignes[i++]);
      i++; nDiag++;
      // Contenu échappé : Mermaid lit textContent, un <br/> non échappé serait perdu
      out.push(`<figure class="diagramme"><pre class="mermaid">${esc(buf.join('\n'))}</pre><figcaption>Schéma ${nDiag}</figcaption></figure>`);
      continue;
    }

    if (l.trim().startsWith('```')) {
      const buf = []; i++;
      while (i < lignes.length && !lignes[i].trim().startsWith('```')) buf.push(lignes[i++]);
      i++;
      out.push(`<pre class="code">${esc(buf.join('\n'))}</pre>`);
      continue;
    }

    if (l.trim().startsWith('|') && estSep(lignes[i + 1] || '')) {
      const cel = x => x.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      const entetes = cel(l);
      const aligns = cel(lignes[i + 1]).map(a =>
        a.startsWith(':') && a.endsWith(':') ? 'center' : a.endsWith(':') ? 'right' : 'left');
      i += 2;
      const corps = [];
      while (i < lignes.length && lignes[i].trim().startsWith('|')) corps.push(cel(lignes[i++]));
      out.push('<div class="tableau-conteneur"><table><thead><tr>' +
        entetes.map((h, k) => `<th style="text-align:${aligns[k] || 'left'}">${inline(h)}</th>`).join('') +
        '</tr></thead><tbody>' +
        corps.map(r => '<tr>' + r.map((c, k) => `<td style="text-align:${aligns[k] || 'left'}">${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }

    const t = l.match(/^(#{1,4})\s+(.*)$/);
    if (t) { out.push(`<h${t[1].length}>${inline(t[2])}</h${t[1].length}>`); i++; continue; }

    if (/^---+$/.test(l.trim())) { out.push('<hr />'); i++; continue; }

    if (l.trim().startsWith('>')) {
      const buf = [];
      while (i < lignes.length && lignes[i].trim().startsWith('>')) buf.push(lignes[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    if (/^\s*-\s+/.test(l)) {
      const buf = [];
      while (i < lignes.length && /^\s*-\s+/.test(lignes[i])) buf.push(lignes[i++].replace(/^\s*-\s+/, ''));
      out.push('<ul>' + buf.map(x => `<li>${inline(x)}</li>`).join('') + '</ul>');
      continue;
    }

    if (l.trim() === '') { i++; continue; }
    const buf = [];
    while (i < lignes.length && lignes[i].trim() !== '' &&
           !/^[#>|-]/.test(lignes[i].trim()) && !lignes[i].trim().startsWith('```')) buf.push(lignes[i++]);
    if (buf.length) out.push(`<p>${inline(buf.join(' '))}</p>`);
    else i++;
  }
  return { html: out.join('\n'), nDiag, blocs: out.length };
}

// --------------------------------------------------------------------- style
const CSS = `
:root {
  --encre:#16202b; --encre-doux:#55636f; --acier:#1f4e6d;
  --acier-pale:#eef3f7; --filet:#ccd6de; --papier:#fff;
}
@page { size:A4; margin:17mm 16mm 16mm 16mm; }
* { box-sizing:border-box; }
body {
  margin:0; background:var(--papier); color:var(--encre);
  font-family:Cambria,Georgia,"Times New Roman",serif; font-size:10.2pt; line-height:1.5;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
p { margin:0 0 3mm; orphans:3; widows:3; }
.couverture { border-bottom:2.5pt solid var(--acier); padding-bottom:9mm; margin-bottom:8mm; }
.couverture .surtitre {
  font-family:"Segoe UI",system-ui,sans-serif; font-size:7.5pt; font-weight:600;
  letter-spacing:.18em; text-transform:uppercase; color:var(--acier); margin-bottom:3mm;
}
.couverture h1 { border:0; margin:0 0 3mm; padding:0; font-size:22pt; line-height:1.15; }
.couverture .meta {
  font-family:"Segoe UI",system-ui,sans-serif; font-size:8.5pt; color:var(--encre-doux);
  display:flex; gap:6mm; flex-wrap:wrap;
}
h1,h2,h3,h4 {
  font-family:"Segoe UI Semibold","Segoe UI",system-ui,sans-serif; font-weight:600;
  color:var(--encre); text-wrap:balance; break-after:avoid; margin:0 0 3mm;
}
h1 { font-size:20pt; }
h2 { font-size:13.5pt; margin-top:9mm; padding-bottom:1.8mm; border-bottom:1pt solid var(--filet); break-before:page; }
h2:first-of-type { break-before:avoid; }
h3 { font-size:11pt; margin-top:6mm; color:var(--acier); }
h4 { font-size:9.8pt; margin-top:5mm; }
ul { margin:0 0 3mm; padding-left:5.5mm; }
li { margin-bottom:1.2mm; }
a { color:var(--acier); text-decoration:none; border-bottom:.5pt solid var(--filet); }
code {
  font-family:Consolas,"Courier New",monospace; font-size:8.6pt;
  background:var(--acier-pale); color:var(--acier); padding:.3mm 1.1mm; border-radius:1.5pt;
}
del { color:var(--encre-doux); }
blockquote {
  margin:0 0 5mm; padding:3mm 4mm; background:var(--acier-pale); border-left:2.5pt solid var(--acier);
  font-family:"Segoe UI",system-ui,sans-serif; font-size:9pt; color:var(--encre-doux);
}
hr { border:0; border-top:.5pt solid var(--filet); margin:6mm 0; }
.tableau-conteneur { margin:0 0 5mm; break-inside:avoid; }
table { width:100%; border-collapse:collapse; font-size:8.7pt; font-variant-numeric:tabular-nums; }
thead { display:table-header-group; }
th {
  font-family:"Segoe UI Semibold","Segoe UI",sans-serif; font-size:7.8pt; font-weight:600;
  text-transform:uppercase; letter-spacing:.05em; color:#fff; background:var(--acier);
  padding:2mm 2.4mm; border:.5pt solid var(--acier);
}
td { padding:1.9mm 2.4mm; border:.5pt solid var(--filet); vertical-align:top; }
tbody tr:nth-child(even) td { background:#f7fafc; }
.diagramme {
  margin:0 0 6mm; padding:4mm 3mm 3mm; border:.5pt solid var(--filet); border-radius:2pt;
  background:#fcfdfe; break-inside:avoid; text-align:center;
}
.diagramme .mermaid { margin:0; }
/* Borne la hauteur : sans elle, un schéma plus haut qu'une page déborde et Chrome le tronque */
.diagramme svg { max-width:100% !important; max-height:208mm !important; height:auto !important; }
figcaption {
  font-family:"Segoe UI",system-ui,sans-serif; font-size:7.5pt; letter-spacing:.1em;
  text-transform:uppercase; color:var(--encre-doux); margin-top:2.5mm;
}
pre.code {
  font-family:Consolas,monospace; font-size:8.2pt; background:#f7fafc;
  border:.5pt solid var(--filet); padding:3mm; overflow-x:auto; break-inside:avoid;
}
.pied {
  margin-top:9mm; padding-top:3mm; border-top:1pt solid var(--filet);
  font-family:"Segoe UI",sans-serif; font-size:7.5pt; color:var(--encre-doux); text-align:center;
}`;

// ---------------------------------------------------------------------- main
if (!fs.existsSync(SOURCE)) {
  console.error('❌ Introuvable :', SOURCE);
  process.exit(1);
}
fs.mkdirSync(CACHE, { recursive: true });

if (!fs.existsSync(MERMAID)) {
  console.log('⬇️  Téléchargement de Mermaid (une seule fois)...');
  const rep = await fetch('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js');
  if (!rep.ok) { console.error('❌ Téléchargement impossible :', rep.status); process.exit(1); }
  fs.writeFileSync(MERMAID, Buffer.from(await rep.arrayBuffer()));
}

const navigateur = NAVIGATEURS.find(p => fs.existsSync(p));
if (!navigateur) {
  console.error('❌ Ni Chrome ni Edge trouvé. Complétez la liste NAVIGATEURS en tête de script.');
  process.exit(1);
}

const { html: corps, nDiag, blocs } = convertir(fs.readFileSync(SOURCE, 'utf8'));
const dateFr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

fs.writeFileSync(HTML_TMP, `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" />
<title>Workflow professionnel — BGM Central</title>
<style>${CSS}</style></head>
<body>
<header class="couverture">
  <div class="surtitre">Document de référence · Gestion multi-magasins</div>
  <h1>Workflow professionnel — BGM Central</h1>
  <div class="meta"><span>Processus, contrôles et schémas</span><span>·</span><span>${dateFr}</span><span>·</span><span>${nDiag} schémas</span></div>
</header>
${corps}
<div class="pied">BGM Central — Workflow professionnel · Document interne</div>
<script>${fs.readFileSync(MERMAID, 'utf8')}</script>
<script>
mermaid.initialize({
  startOnLoad:false, theme:'neutral', securityLevel:'loose',
  flowchart:{ htmlLabels:true, useMaxWidth:true, curve:'basis' },
  sequence:{ useMaxWidth:true },
  themeVariables:{ fontFamily:'Segoe UI, system-ui, sans-serif', fontSize:'13px',
    primaryColor:'#eef3f7', primaryBorderColor:'#1f4e6d', lineColor:'#55636f' }
});
mermaid.run();
</script>
</body></html>`);

console.log(`📄 ${blocs} blocs, ${nDiag} schémas — rendu via ${path.basename(navigateur)}`);

execFileSync(navigateur, [
  '--headless', '--disable-gpu', '--no-sandbox',
  '--virtual-time-budget=45000',           // laisse Mermaid finir son rendu asynchrone
  '--run-all-compositor-stages-before-draw',
  '--no-pdf-header-footer',
  `--print-to-pdf=${CIBLE_PDF}`,
  'file:///' + HTML_TMP.replace(/\\/g, '/')
], { stdio: 'ignore' });

const pdf = fs.readFileSync(CIBLE_PDF);
const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`✅ ${path.relative(RACINE, CIBLE_PDF)} — ${(pdf.length / 1024).toFixed(0)} Ko, ${pages} pages`);
