# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Langue de travail : ce dépôt est francophone. Les libellés, statuts et valeurs d'énumération sont persistés tels quels en français — garder le français pour tout nouveau libellé ou statut.

## Projet

« BG Maçonnerie / BGM Central » — application de gestion multi-magasins de matériaux de construction (contexte algérien : montants en DA, TVA 19 %, timbre fiscal, wilayas). SPA React qui attaque directement Supabase, sans backend intermédiaire (hors proxy de paiement).

## Commandes

```powershell
npm run dev            # serveur Vite sur http://localhost:5173 (host: true)
npm run build          # tsc -b (typecheck des 3 tsconfig) + vite build
npm run lint           # eslint .
npm run preview        # sert dist/
npm run start-server   # proxy de paiement Express sur :8787 (nécessite SUPABASE_SERVICE_ROLE_KEY)
```

Aucun test runner. Les « tests » sont des scripts Node ponctuels, lancés un par un contre le projet Supabase réel :

```powershell
node scripts/test_insert_paiement_authenticated.mjs   # nécessite TEST_USER_EMAIL / TEST_USER_PASSWORD dans .env
node scripts/check-tables.mjs                         # quelles tables/colonnes existent réellement
node scripts/seed-db.mjs / clear-db.mjs / seed-users.mjs
node scripts/run-sql.mjs                              # pousse db/supabase_init.sql (clé service role)
```

Les `scripts/*.mjs` chargent `.env` via dotenv ; quelques-uns lisent `process.env` directement — exporter les variables dans le shell si un script signale une config manquante. Les `check-*.mjs` / `tmp_*.mjs` à la racine sont des sondes de schéma jetables issues de débogages passés : utiles comme source d'information sur le schéma, mais ce n'est pas une suite de tests.

Le parcours de recette manuel des paiements est décrit dans [README_TESTING.md](README_TESTING.md). Le suivi des bugs ouverts se fait dans [UNRESOLVED_ISSUES.md](UNRESOLVED_ISSUES.md) — c'est le journal d'anomalies du projet, à mettre à jour à chaque problème identifié ou résolu.

## Architecture

Trois couches, sans routeur, sans librairie d'état, sans librairie de composants :

- [src/App.tsx](src/App.tsx) — **toute l'interface dans un seul composant exporté par défaut, ~6 000 lignes.** Les ~17 écrans sont des blocs `{activeTab === 'x' && ...}` en ligne (`dashboard`, `magasins`, `articles`, `stocks`, `inventaires`, `fournisseurs`, `achats`, `receptions`, `affectations`, `transferts`, `receptions_transferts`, `employes`, `factures`, `finances`, `users`, `societe`, `sauvegarde`). L'onglet `rapports` (« Analyses & Graphiques ») a été supprimé ; ses exports CSV sont désormais des boutons « Exporter CSV » dans l'en-tête des pages Articles, Magasins, Fournisseurs, Demandes d'Achat et Stocks. Tout l'état est en `useState` en tête de composant ; chaque modale a ses propres états `xModalOpen` + `selectedX` + champs.
- [src/lib/supabaseDb.ts](src/lib/supabaseDb.ts) — `SupabaseDatabase`, classe d'une soixantaine de méthodes **statiques**, seul point d'accès aux données. Elle porte le client Supabase, l'authentification, les règles métier (mouvements de stock, transitions de statut, soldes fournisseurs) et la journalisation d'audit. Elle exporte aussi `DEFAULT_EMPLOYES` / `DEFAULT_CHANTIERS`, qui ne sont plus la source de vérité mais le repli en lecture seule quand les tables `employes` / `chantiers` sont absentes du déploiement.
- [src/lib/types.ts](src/lib/types.ts) — tous les types métier, en camelCase.

[src/lib/mockDb.ts](src/lib/mockDb.ts) est une implémentation localStorage morte de la même surface, importée par personne. [USER_MANAGEMENT.md](USER_MANAGEMENT.md) documente la gestion des utilisateurs sur cette ancienne couche mock — la fonctionnalité a migré vers `SupabaseDatabase`, donc les références d'API et de lignes de ce document sont obsolètes.

### Conventions d'interface

L'habillage imite une application de bureau Windows : en-tête + barre d'outils type ruban (`btn-action`) + panneau arborescent à gauche (`tree-node`) + barre d'onglets + grille de données (`win-table`) + panneau de filtres à droite. Les actions sur les lignes passent par `handleRibbonAdd` / `handleRibbonEdit` / `handleRibbonDelete`, qui aiguillent selon `activeTab` et agissent sur `selectedRowId` ; les boutons par ligne délèguent via `handleRowEdit` / `handleRowDelete`. L'impression affiche une surcouche `printDoc` (bon de commande, bon de réception, affectation, inventaire, état de stock).

Le style est du CSS écrit à la main dans [src/index.css](src/index.css) (~1 450 lignes), refondu en système de jetons : `:root` porte la palette claire complète, le thème sombre est redéfini deux fois (`@media (prefers-color-scheme: dark)` guardé par `:root:not([data-theme="light"])` pour l'état « système », et `[data-theme="dark"]` pour le sélecteur). Ni Tailwind, ni CSS modules. Les icônes viennent de `lucide-react`. Le néomorphisme et la police Fraunces (chargée depuis Google Fonts) ont été retirés : l'interface utilise les faces système et `Consolas` pour les chiffres et les codes.

**Les noms de jetons font partie du contrat** : `App.tsx` référence depuis ses styles en ligne `--text-muted`, `--text-main`, `--text`, `--border`, `--accent`, `--bg-hover`, `--bg-sidebar`, `--radius-sm`, `--primary`, `--primary-light`, `--win-blue-dark`, les couleurs d'état `--c-good` / `--c-danger` / `--c-warn` (+ leurs `-bg`) et les jetons de données `--viz-*`. Les renommer casse silencieusement des couleurs en ligne. Les `--viz-*` sont une palette validée (ΔE 24,7 en protanopie, contraste ≥ 3:1 dans les deux thèmes) : ne pas les remplacer par les couleurs de marque, dont le chroma OKLCH est sous le plancher de 0,10.

### Flux de données

`App` charge tout une fois dans un `useEffect` (`SupabaseDatabase.getX().then(setX)`), puis recharge les collections concernées après chaque mutation. `SupabaseDatabase` maintient en plus des caches statiques (`magasinsCache`, `stocksCache`, …) pour que `getDashboardKPIs()` puisse s'exécuter de façon synchrone.

### Chaîne métier

Deux points d'entrée pour une réception : depuis une demande d'achat (chaîne ci-dessous) ou en **réception directe** sans DA (`createReceptionDirecte`, fournisseur porté par la réception via `receptions."fournisseurId"`, statut `Validée` et entrée en stock immédiates). Partout où un traitement remonte au fournisseur d'une réception, passer par le helper `getReceptionFournisseurId` d'`App.tsx` plutôt que par `commandes.find(...)`, sinon les réceptions directes sont invisibles en facturation et en règlement.

**Valorisation** : chaque ligne de réception porte un `prixUnitaire` (JSONB, pas de colonne dédiée) — saisi sur le BL, pré-rempli avec le prix de la demande d'achat. C'est lui qui valorise la dette fournisseur et qui alimente la facture, avec repli sur `articles.prixMoyen` pour les lignes anciennes qui n'en ont pas. Côté UI, toujours passer par `getLigneValeurHT` ; côté données, appliquer le même repli (`receiveGoods`, `createReceptionDirecte`, `validateReceptionStatutOnly`, `reconcileFournisseurSoldes`) sous peine de soldes incohérents entre l'enregistrement et le recalcul.

`BonCommande` (Brouillon → Validé → Commandé) → `transitionCommandeStatut('Commandé')` crée automatiquement une `Reception` en brouillon → `receiveGoods()` écrit les `reception_lignes`, incrémente `stocks`, ajoute un `MouvementStock` et met à jour `quantiteRecue` sur les lignes de commande → `createFactureFromReceptions()` construit une `Facture` (HT + TVA + timbre + frais de port) → `recordPayment()` décrémente `facture.soldeRestant` et `fournisseur.solde` → `lettrerPaiement()` / `delettrerPaiement()` pour le lettrage. Le stock bouge aussi via `Transfert` (Demande → Validé → Reçu, ou Refusé à la validation : `validerTransfert()` sort la marchandise du dépôt départ, `recevoirTransfert()` l'entre au dépôt destination, `refuserTransfert()` clôt sans mouvement ; `'Expédié'` est l'ancien libellé de `'Validé'`, ramené par `normalizeTransfertStatut()` à la lecture, et la colonne `"dateExpedition"` porte la date de validation. **L'étape 3 a son propre écran** (`receptions_transferts`, sous Chantiers & Logistique) : la page `transferts` n'y renvoie plus qu'un bouton de navigation. Le périmètre y est celui du dépôt **destination** seul, alors que la page `transferts` filtre sur « départ ou destination ». Entre validation et réception la marchandise n'est comptée dans aucun stock, d'où la colonne d'ancienneté qui signale les transferts qui dorment), `Affectation` (vers un employé/chantier, avec retour) et `Inventaire` (régularisation par écart). Presque chaque mutation appelle `logAction()` → `audit_logs`.

### Authentification et rôles

`authenticateUser()` tente, dans l'ordre : la liste `DEMO_USERS` codée en dur, puis `supabase.auth.signInWithPassword` (c'est ce qui crée la session dont la RLS a besoin), puis une recherche héritée en clair dans `users.password_hash`. L'utilisateur courant est mis en cache dans `localStorage.currentUser`, et `App` initialise `currentUser` à partir de là avec un repli sur le rôle `direction` — l'interface peut donc être « connectée » sans session Supabase, auquel cas les écritures protégées par RLS échouent. Vérifier `SupabaseDatabase.hasSession()` quand une écriture doit être authentifiée.

Les rôles (`direction | magasinier | achat | comptabilite | chef_chantier`, plus les alias hérités dans `UserRole`) conditionnent la barre latérale et les actions de ligne directement dans `App.tsx` ; `direction` est le seul rôle à voir l'onglet `users`. Les identifiants de démonstration sont dans `DEMO_USERS` / `MOCK_USERS` (`directeur@benamar.dz` / `dir2026`, etc.).

## Pièges connus

- **Casse réelle des colonnes, vérifiée sur la base déployée** (ne pas se fier à `db/supabase_init.sql`) :

  | Table | Casse |
  |---|---|
  | `users` | snake_case (`magasin_id`, `password_hash`, `created_at`) |
  | `inventaires` | snake_case (`magasin_id`, `date_inventaire`, `created_by_id`) |
  | `receptions`, `commandes`, `factures`, `paiements`, `fournisseurs`, `stocks`, `mouvements_stock`, `affectations`, `transferts`, `magasins`, `articles`, `employes`, `chantiers` | **camelCase** (`fournisseurId`, `soldeRestant`, `referenceDoc`, `chantierId`, `chefNom`…) |

  N'appliquer `camelToSnake()` qu'aux écritures vers `users` et `inventaires`. Un insert mal casé est rejeté par PostgREST (« Could not find the 'x' column ») et, comme la plupart des inserts de `mouvements_stock` ne testent pas `error`, **l'échec est silencieux** — c'est ainsi que la traçabilité des mouvements a été perdue pendant un temps.

- **Toutes les colonnes monétaires sont des ENTIERS** : `factures.montantHT/montantTVA/montantTTC/soldeRestant/timbreAlgerien/fraisPort`, `fournisseurs.solde`, `paiements.montant`. Seul `factures.tauxTVA` accepte les décimales. Passer une valeur décimale renvoie « invalid input syntax for type integer » — d'où le helper `roundDA()` appliqué à toute écriture de montant. Les prix unitaires des lignes vivent dans du JSONB et échappent à cette contrainte.

- **Le nommage des colonnes diverge entre le fichier SQL et la base réelle.** [db/supabase_init.sql](db/supabase_init.sql) déclare des colonnes en snake_case, alors que le projet Supabase déployé utilise majoritairement du camelCase entre guillemets (`"fournisseurId"`, `"montantHT"`, `"datePaiement"` — voir [db/policies/paiements_rls.sql](db/policies/paiements_rls.sql)). `supabaseDb.ts` s'en accommode en lisant les deux formes (`p.fournisseurId || p.fournisseur_id`) et en écrivant en camelCase pour la plupart des tables, `camelToSnake()` n'étant appliqué qu'à quelques-unes (ex. `stocks`). Avant d'ajouter une référence de colonne, vérifier le nom réel avec `node scripts/check-tables.mjs` ou l'une des sondes `check-*.mjs` — les erreurs 400 PostgREST (« column not found », `order=…` invalide) en sont le symptôme habituel, et deux cas restent ouverts dans UNRESOLVED_ISSUES.md.
- `commandes.lignes`, `transferts.lignes` et `inventaires.lignes` sont en pratique des blobs JSONB sur la ligne parente, même si les tables `commande_lignes` / `transfert_lignes` existent dans le script d'initialisation.
- **Le circuit « réception en brouillon » est du code mort.** `createDraftReception()` n'est déclenché que par `transitionCommandeStatut(id, 'Commandé')`, or l'interface ne pose jamais le statut `Commandé` (uniquement `Validé` / `Refusée`) ; `updateDraftReception()` n'est appelé nulle part. En pratique tous les BL naissent déjà `Validée` via `receiveGoods()` ou `createReceptionDirecte()`, le bouton « ✓ Valider » de l'onglet Réceptions est donc inatteignable. Ne pas conclure de la présence de ces méthodes que le workflow brouillon existe.
- La table `inventaires` peut être absente sur certains déploiements ; `SupabaseDatabase` la détecte via `isInventairesAvailable` et `App` conditionne le rendu à `inventairesReady`. Même mécanisme pour la table `societe` (fiche entreprise, une seule ligne, alimente l'en-tête des documents imprimés) : `isSocieteAvailable` / `societeReady`, script de création [db/create_societe.sql](db/create_societe.sql) à exécuter dans l'éditeur SQL Supabase. Idem pour `employes` / `chantiers` : `isEmployesAvailable` / `isChantiersAvailable` côté données, `employesReady` / `chantiersReady` côté UI (la page bascule en lecture seule sur `DEFAULT_EMPLOYES` / `DEFAULT_CHANTIERS`), script [db/create_employes_chantiers.sql](db/create_employes_chantiers.sql).
- **Sauvegarde de la base** — trois niveaux documentés dans [BACKUP.md](BACKUP.md). La vraie sauvegarde est `npm run backup-db` ([scripts/backup-db.mjs](scripts/backup-db.mjs), `pg_dump` : schéma + policies + données), restaurée par `npm run restore-db` (confirmation `--confirm=RESTAURER` obligatoire). Deux pièges vérifiés sur cet environnement : l'hôte de connexion directe `db.<ref>.supabase.co` est publié **en IPv6 uniquement** (utiliser la chaîne « Session pooler », port 5432 — le 6543 en mode transaction fait échouer `pg_dump`), et l'installation PostgreSQL 17 du poste est cassée (`STATUS_DLL_NOT_FOUND`), d'où la détection d'outil qui teste chaque binaire avant de retenir la version la plus récente qui répond. Côté application (onglet `sauvegarde`, Administration, rôle `direction`), `exporterSauvegarde()` relit chaque table de `TABLES_SAUVEGARDE` **en brut** (aucun mappage de casse, aucun repli sur les valeurs par défaut) et `exporterSauvegardeSQL()` en fait un script rejouable via `jsonb_populate_recordset(NULL::public.<table>, …)` — c'est le type de ligne de la table qui pilote les conversions JSONB / tableaux / dates. À respecter en cas de modification : lecture paginée par lots de 1 000 (PostgREST plafonne une réponse à 1 000 lignes, sinon `mouvements_stock` serait tronqué en silence) et `users.password_hash` masqué sauf demande explicite. Les tables absentes (`commande_lignes`, `reception_lignes`) sont listées, pas fatales. Aucune restauration déclenchable depuis l'UI. Le **planificateur** (carte de la page `sauvegarde`) est volontairement local au poste (`localStorage`, clé `bgm_plan_sauvegarde`) et n'évalue l'échéance qu'à l'ouverture de session, via un `useEffect` gardé par `planExecuteRef` : ne pas le convertir en `setInterval`, un onglet laissé ouvert téléchargerait des fichiers sans personne devant l'écran. La sauvegarde réellement automatique est la tâche Windows créée par `npm run schedule-backup` ([scripts/schedule-backup.mjs](scripts/schedule-backup.mjs)), qui passe par l'enveloppe générée `scripts/backup-auto.cmd` — `schtasks` ne sait pas fixer de répertoire de travail, or les scripts lisent `.env` à la racine.
- **`employes` et `chantiers` ont des identifiants TEXT** (`emp-…`, `cha-…`) et non des UUID : `affectations."employeId"` / `"chantierId"` sont des colonnes texte qui référencent les valeurs d'origine codées en dur. Générer les nouveaux identifiants sur le même modèle (`emp-${Date.now().toString(36)}`) plutôt qu'en UUID. `employes."chantierNom"` est dénormalisé : `saveChantier()` répercute un renommage sur les employés rattachés, mais laisse les bons de sortie déjà émis intacts.
- `.env` est désormais ignoré par git (et n'est pas suivi) mais contient `VITE_SUPABASE_SERVICE_ROLE_KEY`. Tout ce qui est préfixé `VITE_*` est embarqué dans le bundle client : la clé service role part donc dans le navigateur, et `recordPayment()` s'en sert pour contourner la RLS lorsqu'un utilisateur privilégié n'a pas de session. La correction prévue est le proxy [server/server.js](server/server.js) (`POST /api/payments`, qui vérifie le jeton porteur et le rôle de l'appelant côté serveur) — privilégier ce chemin pour toute nouvelle écriture privilégiée plutôt que d'étendre l'usage client de la clé service role.
- **Deux circuits de règlement distincts, à ne pas confondre.** Page *Fournisseurs* → `recordPayment()` : règlement sur solde, `lettre: false`, aucune facture touchée. Page *Règlements Fournisseurs* → `recordPaymentAvecLettrage()` : le montant est ventilé sur les factures ouvertes et **une ligne de paiement est créée par facture imputée** (le modèle n'autorise qu'un `factureId` par ligne), toutes partageant la même `referenceTransaction` et un code suffixé `/1`, `/2`… Le solde fournisseur n'est décrémenté qu'une fois, du total.
- **Suppressions encore branchées sur `localStorage`** (vestige de `mockDb`) : dans `handleRibbonDelete`, les branches `achats` (commandes) et `finances` (paiements) écrivent dans `localStorage` au lieu d'appeler Supabase — la ligne réapparaît au rechargement. La branche `factures` a été corrigée (`SupabaseDatabase.deleteFacture`), les deux autres restent à faire.
- **Supprimer une facture ne touche pas au solde fournisseur** : la dette provient des réceptions. `deleteFacture()` refuse en revanche toute facture rattachée à un règlement (par `factureId` ou par `factureRef`) et renvoie la liste des réceptions rendues re-facturables.
- Les mots de passe sont stockés et comparés en clair (`users.password_hash`).
- `receiveGoods()` et `createDraftReception()` dérivent les codes de documents d'un comptage de lignes / du plus grand suffixe existant, avec l'année `2026` codée en dur (`BC-2026-001`, `BR-2026-001`, `FAC-2026-001`).
- Les retours utilisateur passent par des `alert()` / `confirm()` appelés directement depuis les méthodes de `supabaseDb.ts`, pas seulement depuis la couche UI.
- La racine du dépôt contient des fichiers parasites de 0 octet nommés `({`, `1)`, `console.error(e))`, etc., issus de commandes shell mal formées, et `db/DESIGN SKILL` est un document HTML sans rapport avec le projet. Les ignorer.
