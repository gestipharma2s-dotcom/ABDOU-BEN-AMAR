-- ============================================================
-- REMISE À ZÉRO DES DONNÉES D'EXPLOITATION (jeu de test)
-- ------------------------------------------------------------
-- Supprime réceptions, factures et règlements, ET défait leurs
-- effets : dettes fournisseurs, stocks, mouvements, statuts des
-- commandes. Supprimer seulement les lignes laisserait la base
-- incohérente (dette sans réception, stock sans mouvement...).
--
-- CONSERVÉ : utilisateurs, magasins, articles, fournisseurs,
--            employés, chantiers, commandes (remises à neuf).
--
-- ⚠️ IRRÉVERSIBLE. À exécuter dans le SQL Editor de Supabase.
-- ============================================================

BEGIN;

-- 1. Règlements (d'abord : ils référencent les factures)
DELETE FROM public.paiements;

-- 2. Factures (elles référencent les réceptions)
DELETE FROM public.factures;

-- 3. Réceptions
DELETE FROM public.receptions;

-- 4. Mouvements de stock issus des achats/réceptions.
--    Retirer le WHERE pour purger AUSSI transferts, affectations et inventaires.
DELETE FROM public.mouvements_stock
WHERE type = 'ENTREE_ACHAT';

-- 5. Dettes fournisseurs : elles proviennent uniquement des réceptions,
--    qui viennent d'être supprimées.
UPDATE public.fournisseurs SET solde = 0;

-- 6. Stocks : les quantités reçues doivent disparaître avec les réceptions.
--    ⚠️ Remet TOUT le stock à zéro. Commenter ce bloc pour conserver
--    les quantités issues des transferts / inventaires.
UPDATE public.stocks SET quantite = 0;

-- 7. Commandes : les rendre à nouveau réceptionnables
--    (statut + quantités reçues remises à zéro dans le JSONB des lignes).
UPDATE public.commandes
SET statut = 'Validé',
    lignes = COALESCE((
      SELECT jsonb_agg(ligne || jsonb_build_object('quantiteRecue', 0))
      FROM jsonb_array_elements(lignes) AS ligne
    ), '[]'::jsonb)
WHERE lignes IS NOT NULL;

COMMIT;

-- ------------------------------------------------------------
-- CONTRÔLE APRÈS EXÉCUTION (doit renvoyer 0 partout)
-- ------------------------------------------------------------
-- SELECT
--   (SELECT count(*) FROM public.receptions)                         AS receptions,
--   (SELECT count(*) FROM public.factures)                           AS factures,
--   (SELECT count(*) FROM public.paiements)                          AS paiements,
--   (SELECT count(*) FROM public.mouvements_stock
--      WHERE type = 'ENTREE_ACHAT')                                  AS mouvements_achat,
--   (SELECT coalesce(sum(solde), 0) FROM public.fournisseurs)        AS total_dettes,
--   (SELECT coalesce(sum(quantite), 0) FROM public.stocks)           AS total_stock;
