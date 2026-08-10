-- ============================================================
-- Réception directe (sans Demande d'Achat / Bon de Commande)
-- ------------------------------------------------------------
-- À exécuter dans le SQL Editor de Supabase AVANT d'utiliser
-- le bouton « Réception Directe » de l'onglet Réceptions.
--
-- ATTENTION : la base déployée utilise des colonnes en camelCase
-- entre guillemets ("commandeId", "magasinId", …). Les noms
-- ci-dessous respectent cette convention.
-- ============================================================

-- 1. Rattacher une réception directement à un fournisseur
--    (sans passer par la commande, qui n'existe pas dans ce cas)
ALTER TABLE public.receptions
  ADD COLUMN IF NOT EXISTS "fournisseurId" uuid REFERENCES public.fournisseurs(id);

ALTER TABLE public.receptions
  ADD COLUMN IF NOT EXISTS "fournisseurNom" text;

-- 2. La commande devient facultative pour une réception directe
ALTER TABLE public.receptions
  ALTER COLUMN "commandeId" DROP NOT NULL;

-- 3. Index de recherche par fournisseur (facturation / règlements)
CREATE INDEX IF NOT EXISTS idx_receptions_fournisseur
  ON public.receptions("fournisseurId");

-- ------------------------------------------------------------
-- Vérification
-- ------------------------------------------------------------
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'receptions'
-- ORDER BY ordinal_position;
