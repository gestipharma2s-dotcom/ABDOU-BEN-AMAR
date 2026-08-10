# Suivi des problèmes non résolus

Ce fichier aide à suivre les problèmes en cours sans devoir chercher et analyser tous les fichiers.
Il doit être mis à jour à chaque fois qu'un problème est identifié et lorsqu'il est résolu.

## Comment l'utiliser

1. Ajouter une nouvelle entrée pour chaque problème non résolu.
2. Décrire clairement le problème, le contexte, les fichiers concernés et l'état actuel.
3. Mettre à jour le statut dès que le problème est résolu.
4. Ajouter une date et un auteur si nécessaire pour la traçabilité.

## Problèmes en cours

| ID | Date | Statut | Problème | Fichier(s) concernés | Action / Résolution | Remarques |
|----|------|--------|----------|----------------------|---------------------|-----------|
| 1 | 2026-08-04 | En cours | Erreur 400 sur l'enregistrement de paiement fournisseur : Supabase REST ne trouve pas `receptionIds` | src/lib/supabaseDb.ts | Confirmer et aligner la conversion des champs entre camelCase et snake_case pour `paiements`; vérifier la cache de schéma Supabase | Build OK, erreur runtime persistante |
| 2 | 2026-08-04 | En cours | Erreur 400 sur la récupération des paiements : `order=date_paiement.desc` invalide | src/lib/supabaseDb.ts | Vérifier l'ordre des colonnes dans `getPaiements()` et adapter aux noms de colonnes exposés par Supabase | À valider après correction de la requête |
| 3 | 2026-08-10 | Résolu | Statut de transfert incohérent : `createTransfert()` insérait `'Demandé'` alors que les garde-fous de transition testaient `'Demande'` — un tel transfert ne pouvait plus jamais être validé ni reçu | src/lib/supabaseDb.ts | Insert aligné sur `'Demande'` et normalisation des statuts historiques à la lecture (`normalizeTransfertStatut` : `'Demandé'`→`'Demande'`, `'Expédié'`→`'Validé'`) | `createTransfert()` reste du code mort : l'UI passe par `createTransfertRequest()` |
| 5 | 2026-08-10 | Résolu | « Demandes d'Achat » introuvable dans le menu de gauche : le filtre des menus testait `'achats'.includes(saisie)` (test inversé), donc taper « demande », « demandes d » ou « da » masquait tout le groupe *Comptoir / Achats* | src/App.tsx | Filtre réécrit sur les libellés réellement affichés via la table `TREE_MENU` + `treeGroupVisible()` (sans casse ni accent), et dépliage forcé des groupes pendant une recherche | Les DA elles-mêmes étaient bien en base (2 lignes vérifiées) : c'était la navigation, pas les données |
| 6 | 2026-08-10 | À vérifier | Comptes sans dépôt : tous les utilisateurs de démonstration ont `magasin_id = null` et `magasins_ids = []`. Pour tout rôle autre que `direction`, `getAuthorizedMagasins()` renvoie alors une liste vide et **tous** les journaux filtrés par dépôt (DA, réceptions, stocks, transferts, affectations, inventaires) s'affichent vides sans explication | src/App.tsx | La grille des DA affiche désormais le motif exact du vide. Reste à décider : soit affecter les dépôts aux comptes, soit considérer `achat` / `comptabilite` comme non rattachés à un dépôt (accès global comme `direction`) | Seul `mhmadani2000@yahoo.fr` (direction) a un périmètre complet |
| 4 | 2026-08-10 | À vérifier | Workflow transfert passé à Demande → Validé → Reçu : les lignes déjà en base au statut `'Expédié'` ne sont pas réécrites, elles sont ramenées à `'Validé'` à la lecture | src/lib/supabaseDb.ts, src/lib/types.ts, src/App.tsx | Vérifier sur la base déployée qu'aucune requête/vue externe ne filtre sur `statut = 'Expédié'` ; une migration `UPDATE transferts SET statut='Validé' WHERE statut='Expédié'` reste possible | Pas de colonne `dateValidation` en base : `"dateExpedition"` porte la date de validation |

## Statuts possibles

- `En cours`
- `Bloqué`
- `À vérifier`
- `Résolu`

## Conseils

- Utiliser ce fichier comme source de vérité locale pendant le développement.
- Lorsqu'un problème est résolu, marquer le statut `Résolu` et noter la solution.
- Si le problème nécessite des étapes supplémentaires, ajouter un lien vers une tâche ou un ticket externe si nécessaire.
