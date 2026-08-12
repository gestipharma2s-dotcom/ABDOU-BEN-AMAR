# Sauvegarde et restauration de la base

Trois niveaux, du plus complet au plus simple. Le premier est la vraie sauvegarde
PostgreSQL ; les deux autres dépannent quand on n'a pas les outils sous la main.

| | Contenu | Où | Restauration |
|---|---|---|---|
| **1. `pg_dump`** | Schéma + contraintes + index + séquences + policies RLS + **toutes** les données | `npm run backup-db` | `npm run restore-db` |
| **2. `.sql` depuis l'app** | Données seules, limitées à ce que la RLS laisse lire | Administration → Sauvegarde de la Base | Coller dans l'éditeur SQL Supabase |
| **3. `.json` depuis l'app** | Copie brute des tables (archivage, traitement externe) | Administration → Sauvegarde de la Base | Aucune (format de travail) |

---

## 1. Sauvegarde complète (`pg_dump`)

### Prérequis — état de ce poste (déjà réglé)

Le serveur Supabase du projet tourne en **PostgreSQL 17.6**, et `pg_dump` refuse de
sauvegarder un serveur d'une version majeure plus récente que la sienne.

Or les deux installations locales posaient problème :

- `C:\Program Files\PostgreSQL\16\bin` → fonctionne, mais **trop ancienne** pour ce serveur ;
- `C:\Program Files\PostgreSQL\17\bin` → **installation incomplète** : 12 DLL au lieu de 29,
  il manque `zlib1.dll`, `liblz4.dll` et `libwinpthread-1.dll` (les bibliothèques de
  compression et de threads). `pg_dump.exe` s'arrêtait aussitôt sur `STATUS_DLL_NOT_FOUND`.

**Correctif appliqué, sans toucher au système ni aux droits administrateur** : les binaires 17
ont été copiés dans `C:\Users\boss\pg17-bin`, complétés par les trois DLL manquantes prises
dans l'installation 16. `pg_dump` 17.5 y fonctionne, et `.env` pointe dessus :

```
PG_BIN=C:\Users\boss\pg17-bin
```

Rien n'a été modifié dans `C:\Program Files` : pour revenir en arrière, il suffit de supprimer
ce dossier et la ligne `PG_BIN`. Le jour où l'installation 17 sera réparée proprement
(réinstallation depuis l'installeur officiel), retirez `PG_BIN` : les scripts balaient
`C:\Program Files\PostgreSQL\*\bin`, testent chaque binaire et retiennent la version la plus
récente qui répond réellement.

> Si le message `version du serveur : 17.x ; pg_dump version : 16.x` réapparaît, c'est que
> `PG_BIN` ne pointe plus sur des binaires 17 valides.

### Chaîne de connexion

Tableau de bord Supabase → **Project Settings → Database → Connection string**.

> ⚠️ **Prenez « Session pooler », pas « Direct connection ».**
> L'hôte direct `db.<ref>.supabase.co` n'est publié qu'en **IPv6**
> (vérifié : un seul enregistrement `AAAA`, aucun `A`). Un poste sans connectivité IPv6
> — c'est le cas de ce PC — ne peut pas l'atteindre : `pg_dump` reste bloqué puis échoue.
> Le pooler de session est joignable en IPv4.

Le port compte aussi : **5432** (mode session) fonctionne, **6543** (mode transaction)
fait échouer `pg_dump`.

**Le projet BGM est hébergé en `eu-west-1`** (identifié en interrogeant le pooler : c'est la
seule région qui reconnaît le locataire du projet). Les variables sont déjà renseignées dans
le `.env` du poste — il ne reste que le mot de passe à coller :

```
SUPABASE_DB_HOST=aws-0-eu-west-1.pooler.supabase.com
SUPABASE_DB_PORT=5432
SUPABASE_DB_USER=postgres.<ref du projet>
SUPABASE_DB_PASSWORD=<mot de passe de la base>
```

> `<ref du projet>` est l'identifiant qui préfixe l'URL Supabase (`VITE_SUPABASE_URL`).
> Il n'est pas recopié ici : ce dépôt est public, et publier une chaîne de connexion
> prête à l'emploi ne laisserait plus que le mot de passe à trouver.

Ces quatre variables séparées sont la voie recommandée : **le mot de passe n'a pas à être
encodé**. Dans une URI, un `@` ou un `#` non *percent-encodé* coupe la chaîne et produit une
erreur d'authentification trompeuse — les scripts font l'encodage à votre place.

L'alternative en une seule variable reste possible (`@` s'écrit alors `%40`) :

```
SUPABASE_DB_URL=postgresql://postgres.<ref>:<MDP>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

ou en ligne de commande : `npm run backup-db -- --url="postgresql://…"`.

Un gabarit laissé en place (`<MOT_DE_PASSE>`, `[YOUR-PASSWORD]`, `username:password@db.host`)
est détecté et traité comme une valeur absente, avec le rappel de la marche à suivre.

### Où trouver le mot de passe de la base

Ce n'est **ni** le mot de passe de connexion à l'application, **ni** une clé API : c'est le
mot de passe Postgres défini à la création du projet. Il n'est affiché nulle part après coup.
Si vous ne l'avez plus : Project Settings → Database → **Reset database password**.

### Vérifier avant de sauvegarder

```powershell
npm run check-db
```

Teste la connexion et affiche la version du serveur, sans rien lire ni écrire. Le diagnostic
distingue les trois causes d'échec (mot de passe refusé, mauvaise région du pooler, hôte
injoignable), là où `pg_dump` se contente d'un message laconique.

### Lancer la sauvegarde

```powershell
npm run backup-db                       # schéma + données du schéma public
npm run backup-db -- --data-only        # données seules
npm run backup-db -- --out=D:\sauvegardes
npm run backup-db -- --schema=public
```

Deux fichiers horodatés sont écrits dans `backups/` (dossier ignoré par git) :

- `bgm_AAAAMMJJ-HHMM.dump` — format *custom*, à restaurer avec `pg_restore`. **À privilégier.**
- `bgm_AAAAMMJJ-HHMM.sql` — format texte, lisible et rejouable avec `psql`.

Les dumps sont pris avec `--no-owner --no-privileges` : les rôles internes de Supabase
n'existent pas à l'identique sur un autre projet, les omettre évite une avalanche
d'erreurs `role does not exist` à la restauration.

### Restaurer

```powershell
npm run restore-db -- backups\bgm_20260812-1830.dump --confirm=RESTAURER
```

- `--confirm=RESTAURER` est **obligatoire** : sans lui le script refuse de démarrer.
- Par défaut `pg_restore --clean --if-exists` : les objets existants sont supprimés puis
  recréés, donc **les données actuelles de la base cible sont remplacées**.
- `--no-clean` ajoute par-dessus l'existant au lieu de le remplacer.
- `--dry-run` affiche la commande sans l'exécuter.
- `--url=…` restaure vers une autre base que celle du `.env` (utile pour tester la
  restauration sur un projet Supabase de recette avant de toucher à la production).

Toujours **sauvegarder l'état courant avant de restaurer** : `npm run backup-db`.

Des erreurs `already exists` pendant `pg_restore` sont bénignes ; une erreur de contrainte
ou de colonne, elle, doit être traitée.

### Automatiser (tâche Windows)

```powershell
npm run schedule-backup                              # tous les jours à 20:00
npm run schedule-backup -- --time=07:30
npm run schedule-backup -- --frequency=WEEKLY --day=MON
npm run schedule-backup -- --list                    # vérifier
npm run schedule-backup -- --remove                  # supprimer
```

La tâche est créée **au niveau de l'utilisateur courant** : aucun droit administrateur, rien
de modifié hors du profil. Elle lance `pg_dump` même application fermée — c'est la seule
sauvegarde vraiment automatique, le planificateur intégré à l'application ne pouvant agir
que lorsqu'un navigateur est ouvert.

Le script génère `scripts/backup-auto.cmd` (ignoré par git : chemins absolus propres au
poste), qui se place dans le dossier du projet — nécessaire pour lire `.env` — et journalise
tout dans `backups/journal-sauvegarde.log`. **Relancez `npm run schedule-backup` après tout
déplacement du projet**, les chemins étant figés dans ce fichier.

Deux limites à connaître : le poste doit être allumé à l'heure prévue (une exécution manquée
n'est pas rattrapée), et les fichiers s'accumulent dans `backups/` — pensez à faire le ménage
et à recopier les sauvegardes hors du poste.

Pour tester sans attendre l'heure :

```powershell
schtasks /Run /TN "BGM - Sauvegarde base de donnees"
```

---

## 2. Sauvegarde `.sql` depuis l'application

Administration → **Sauvegarde de la Base** → « Sauvegarde restaurable (.sql) ».
Ni mot de passe de base, ni outil à installer.

Le script réinjecte chaque table via
`jsonb_populate_recordset(NULL::public.<table>, '…'::jsonb)` : c'est le type de ligne de la
table qui pilote les conversions, donc les colonnes JSONB (`commandes.lignes`), les
tableaux (`users.magasins_ids`) et les dates sont restaurés correctement — là où des
`INSERT` à valeurs formatées à la main casseraient.

### Planificateur intégré

Sur la même page, la carte **Planificateur de sauvegarde automatique** rappelle (bandeau) ou
télécharge (mode automatique) la sauvegarde à échéance : quotidienne, hebdomadaire ou
mensuelle. Le réglage est stocké dans le navigateur (`localStorage`), donc **propre à ce poste**,
et l'échéance n'est évaluée **qu'à l'ouverture de l'application** — pas de minuterie qui
déclencherait des téléchargements sur un onglet laissé ouvert la nuit. Une sauvegarde manuelle
remet le compteur à zéro. En mode automatique, les mots de passe restent toujours masqués :
personne n'est devant l'écran pour valider un export sensible.

Ce planificateur est un garde-fou, pas une sauvegarde de production : si l'application n'est
pas ouverte, rien ne se passe. La tâche Windows ci-dessus reste la sauvegarde de référence.

### Restaurer

Pour restaurer : coller le fichier dans l'éditeur SQL Supabase et exécuter.

- Le **schéma doit déjà exister** (`db/supabase_init.sql`, `db/create_*.sql`) : ce script ne
  contient que des données.
- `ON CONFLICT DO NOTHING` : les lignes déjà présentes ne sont pas écrasées. Pour un
  remplacement complet, décommenter le `TRUNCATE … CASCADE` en tête de fichier.
- Ne contient que ce que la RLS autorise l'utilisateur connecté à lire. **Ce n'est pas un
  substitut à `pg_dump`.**

---

## Ce que contiennent les sauvegardes

Toutes les données de gestion : magasins, articles, fournisseurs, chantiers, employés,
utilisateurs, stocks, mouvements, demandes d'achat, réceptions, affectations, transferts,
inventaires, factures, règlements, journal d'audit, fiche société.

`commande_lignes` et `reception_lignes` sont annoncées « absentes » : ces tables n'existent
pas sur le déploiement, les lignes vivent en JSONB sur la ligne parente.

## Sécurité

Les mots de passe sont stockés **en clair** dans `users.password_hash`.

- Exports de l'application : masqués (`***MASQUE***`) sauf si la case « Inclure les mots de
  passe » est cochée, avec confirmation.
- `pg_dump` : **toujours inclus**, c'est une copie fidèle de la base.

`backups/`, `*.dump` et `sauvegarde-bgm-*.json` sont dans `.gitignore`. Conservez ces
fichiers sur un support sûr (disque chiffré, coffre-fort d'entreprise) et hors du poste de
travail.

## Sauvegardes automatiques Supabase

Le tableau de bord (**Database → Backups**) propose des sauvegardes gérées par Supabase,
avec restauration en un clic. Leur profondeur dépend du plan de l'abonnement — le plan
gratuit n'inclut pas de restauration à un point dans le temps. `npm run backup-db` reste
donc la sauvegarde à faire tourner régulièrement et à conserver hors de Supabase.
