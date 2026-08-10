-- Script: Creation table transferts + RLS
-- Executer dans Supabase SQL Editor
-- Lien: https://app.supabase.com/project/peshhcjfrlczmgzqcsjv/sql/new

-- 1. Creer la table (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.transferts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  "magasinDepartId"  TEXT NOT NULL,
  "magasinDepartNom" TEXT NOT NULL DEFAULT '',
  "magasinDestId"    TEXT NOT NULL,
  "magasinDestNom"   TEXT NOT NULL DEFAULT '',
  lignes           JSONB NOT NULL DEFAULT '[]',
  motif            TEXT DEFAULT '',
  statut           TEXT NOT NULL DEFAULT 'Demande',
  "dateDemande"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "dateExpedition" TIMESTAMPTZ,
  "dateReception"  TIMESTAMPTZ,
  "demandeurNom"   TEXT NOT NULL DEFAULT '',
  "valideurNom"    TEXT,
  "receveurNom"    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Activer RLS
ALTER TABLE public.transferts ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes policies
DROP POLICY IF EXISTS "allow_select"   ON public.transferts;
DROP POLICY IF EXISTS "allow_insert"   ON public.transferts;
DROP POLICY IF EXISTS "allow_update"   ON public.transferts;
DROP POLICY IF EXISTS "allow_delete"   ON public.transferts;
DROP POLICY IF EXISTS "allow_all_anon" ON public.transferts;

-- 4. Creer les policies permissives (clé anon)
CREATE POLICY "allow_select" ON public.transferts
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "allow_insert" ON public.transferts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "allow_update" ON public.transferts
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete" ON public.transferts
  FOR DELETE TO anon, authenticated USING (true);

-- 5. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_transferts_statut ON public.transferts(statut);
CREATE INDEX IF NOT EXISTS idx_transferts_depart ON public.transferts("magasinDepartId");
CREATE INDEX IF NOT EXISTS idx_transferts_dest   ON public.transferts("magasinDestId");

-- 6. Verification
SELECT 'OK - Table transferts creee et RLS configuree!' AS result;
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'transferts';
