-- Script: Creation des tables `chantiers` et `employes` (page « Employes & Chantiers ») + RLS
-- Executer dans Supabase SQL Editor
-- Lien: https://app.supabase.com/project/peshhcjfrlczmgzqcsjv/sql/new
--
-- Casse des colonnes : camelCase entre guillemets, comme la majorite des tables
-- deployees (receptions, commandes, factures...). NE PAS appliquer camelToSnake().
--
-- IDENTIFIANTS EN TEXT (et non UUID) : les affectations existantes referencent les
-- employes / chantiers par les identifiants codes en dur ('emp-1', 'cha-100log'...)
-- via affectations."employeId" / "chantierId" qui sont de type text. On conserve donc
-- ces memes identifiants a l'amorcage pour ne casser aucun bon de sortie deja emis.

-- 1. Chantiers ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chantiers (
  id          TEXT PRIMARY KEY,
  nom         TEXT NOT NULL,
  wilaya      TEXT DEFAULT '',
  "chefNom"   TEXT DEFAULT '',
  actif       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Employes ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employes (
  id            TEXT PRIMARY KEY,
  nom           TEXT NOT NULL,
  fonction      TEXT DEFAULT '',
  service       TEXT DEFAULT '',
  telephone     TEXT DEFAULT '',
  -- ON DELETE SET NULL : un chantier ne peut de toute facon pas etre supprime
  -- tant qu'un employe y est affecte (controle applicatif), le garde-fou est ici
  -- pour les suppressions faites directement en SQL.
  "chantierId"  TEXT REFERENCES public.chantiers(id) ON DELETE SET NULL,
  "chantierNom" TEXT DEFAULT '',
  actif         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Unicite des libelles (meme controle que cote application, insensible a la casse)
CREATE UNIQUE INDEX IF NOT EXISTS chantiers_nom_unique ON public.chantiers (lower(nom));
CREATE UNIQUE INDEX IF NOT EXISTS employes_nom_unique  ON public.employes (lower(nom));
CREATE INDEX IF NOT EXISTS employes_chantier_idx ON public.employes ("chantierId");

-- 4. Activer RLS
ALTER TABLE public.chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employes  ENABLE ROW LEVEL SECURITY;

-- 5. Supprimer les anciennes policies
DROP POLICY IF EXISTS "allow_select" ON public.chantiers;
DROP POLICY IF EXISTS "allow_insert" ON public.chantiers;
DROP POLICY IF EXISTS "allow_update" ON public.chantiers;
DROP POLICY IF EXISTS "allow_delete" ON public.chantiers;
DROP POLICY IF EXISTS "allow_select" ON public.employes;
DROP POLICY IF EXISTS "allow_insert" ON public.employes;
DROP POLICY IF EXISTS "allow_update" ON public.employes;
DROP POLICY IF EXISTS "allow_delete" ON public.employes;

-- 6. Creer les policies (lecture ouverte, ecriture pour les sessions authentifiees)
CREATE POLICY "allow_select" ON public.chantiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_insert" ON public.chantiers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_update" ON public.chantiers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete" ON public.chantiers FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "allow_select" ON public.employes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "allow_insert" ON public.employes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "allow_update" ON public.employes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete" ON public.employes FOR DELETE TO anon, authenticated USING (true);

-- 7. Amorcage : reprend a l'identique les listes codees en dur dans supabaseDb.ts
--    (DEFAULT_CHANTIERS / DEFAULT_EMPLOYES), identifiants compris.
INSERT INTO public.chantiers (id, nom, wilaya, "chefNom", actif) VALUES
  ('cha-100log',   'Chantier 100 Logements LPP - Alger (Reghaia)',   'Alger (16)',       'Omar Chef',     true),
  ('cha-aeroport', 'Chantier Extension Aerogare Ouest - Oran',       'Oran (31)',        'Mourad Ziri',   true),
  ('cha-viaduc',   'Chantier Viaduc Transrhumel - Constantine',      'Constantine (25)', 'Sofiane Bati',  true),
  ('cha-stade',    'Chantier Nouveau Stade - Tizi Ouzou',            'Tizi Ouzou (15)',  'Lounes Khelil', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.employes (id, nom, fonction, service, telephone, "chantierId", "chantierNom", actif) VALUES
  ('emp-1', 'Mustapha Loucif',  'Macon Qualifie',            'Production Gros Oeuvre', '0555 12 34 56', 'cha-100log',   '100 Logements LPP',             true),
  ('emp-2', 'Yacine Mezouar',   'Chef d''Equipe Electricien', 'Second Oeuvre',         '0661 98 76 54', 'cha-100log',   '100 Logements LPP',             true),
  ('emp-3', 'Mourad Khelifi',   'Ferrailleur',               'Production Gros Oeuvre', '0770 44 55 66', 'cha-aeroport', 'Extension Aerogare Oran',       true),
  ('emp-4', 'Salim Tebboune',   'Peintre Applicateur',       'Finition',               '0550 33 22 11', 'cha-aeroport', 'Extension Aerogare Oran',       true),
  ('emp-5', 'Sid Ahmed Ziani',  'Magasinier Assistant',      'Logistique',             '0658 99 88 77', 'cha-viaduc',   'Viaduc Transrhumel Constantine', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Verification
SELECT 'OK - Tables chantiers et employes creees et RLS configuree!' AS result;
SELECT * FROM public.chantiers ORDER BY nom;
SELECT * FROM public.employes  ORDER BY nom;
