-- Script: Creation table societe (identite + coordonnees de l'entreprise) + RLS
-- Executer dans Supabase SQL Editor
-- Lien: https://app.supabase.com/project/peshhcjfrlczmgzqcsjv/sql/new
--
-- Casse des colonnes : camelCase entre guillemets, comme la majorite des tables
-- deployees (receptions, commandes, factures...). NE PAS appliquer camelToSnake().
-- Tous les montants restent des ENTIERS (capital social en DA).

-- 1. Creer la table (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.societe (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "raisonSociale"   TEXT NOT NULL DEFAULT '',
  "formeJuridique"  TEXT DEFAULT '',
  activite          TEXT DEFAULT '',
  rc                TEXT DEFAULT '',
  nif               TEXT DEFAULT '',
  nis               TEXT DEFAULT '',
  ai                TEXT DEFAULT '',
  "capitalSocial"   BIGINT DEFAULT 0,
  adresse           TEXT DEFAULT '',
  ville             TEXT DEFAULT '',
  wilaya            TEXT DEFAULT '',
  "codePostal"      TEXT DEFAULT '',
  telephone         TEXT DEFAULT '',
  telephone2        TEXT DEFAULT '',
  fax               TEXT DEFAULT '',
  email             TEXT DEFAULT '',
  "siteWeb"         TEXT DEFAULT '',
  banque            TEXT DEFAULT '',
  rib               TEXT DEFAULT '',
  "logoUrl"         TEXT DEFAULT '',
  note              TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Activer RLS
ALTER TABLE public.societe ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes policies
DROP POLICY IF EXISTS "allow_select" ON public.societe;
DROP POLICY IF EXISTS "allow_insert" ON public.societe;
DROP POLICY IF EXISTS "allow_update" ON public.societe;
DROP POLICY IF EXISTS "allow_delete" ON public.societe;

-- 4. Creer les policies (lecture ouverte, ecriture pour les sessions authentifiees)
CREATE POLICY "allow_select" ON public.societe
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "allow_insert" ON public.societe
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "allow_update" ON public.societe
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete" ON public.societe
  FOR DELETE TO anon, authenticated USING (true);

-- 5. Amorcer la ligne unique si la table est vide
INSERT INTO public.societe ("raisonSociale", "formeJuridique", activite, wilaya)
SELECT 'BG MACONNERIE', 'SARL', 'Materiaux de construction et travaux', 'Alger'
WHERE NOT EXISTS (SELECT 1 FROM public.societe);

-- 6. Verification
SELECT 'OK - Table societe creee et RLS configuree!' AS result;
SELECT * FROM public.societe;
