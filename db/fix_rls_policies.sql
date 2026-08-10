-- ============================================================
-- SCRIPT: Correction des politiques RLS pour l'app BGM iCom
-- À exécuter dans le Supabase SQL Editor (Dashboard)
-- L'app utilise son propre système d'auth (pas Supabase Auth)
-- donc on autorise toutes les opérations via la clé anon
-- ============================================================

-- TABLES CONCERNÉES
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users', 'magasins', 'articles', 'fournisseurs',
    'commandes', 'receptions', 'affectations', 'transferts',
    'stocks', 'mouvements_stock', 'inventaires',
    'factures', 'paiements', 'employes', 'chantiers',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Vérifier si la table existe avant d'agir dessus
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- Activer RLS (si pas déjà actif)
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

      -- Supprimer les policies existantes pour éviter les conflits
      EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "allow all" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_all" ON %I', t);

      -- Créer une policy permissive pour SELECT
      EXECUTE format(
        'CREATE POLICY "allow_select" ON %I FOR SELECT TO anon, authenticated USING (true)',
        t
      );
      -- Supprimer au cas où elle existait déjà
      EXECUTE format('DROP POLICY IF EXISTS "allow_select" ON %I', t);
      EXECUTE format(
        'CREATE POLICY "allow_select" ON %I FOR SELECT TO anon, authenticated USING (true)',
        t
      );

      -- Créer une policy permissive pour INSERT
      EXECUTE format('DROP POLICY IF EXISTS "allow_insert" ON %I', t);
      EXECUTE format(
        'CREATE POLICY "allow_insert" ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)',
        t
      );

      -- Créer une policy permissive pour UPDATE
      EXECUTE format('DROP POLICY IF EXISTS "allow_update" ON %I', t);
      EXECUTE format(
        'CREATE POLICY "allow_update" ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)',
        t
      );

      -- Créer une policy permissive pour DELETE
      EXECUTE format('DROP POLICY IF EXISTS "allow_delete" ON %I', t);
      EXECUTE format(
        'CREATE POLICY "allow_delete" ON %I FOR DELETE TO anon, authenticated USING (true)',
        t
      );

      RAISE NOTICE '✅ RLS policies configured for table: %', t;
    ELSE
      RAISE NOTICE '⚠️  Table not found (skipped): %', t;
    END IF;
  END LOOP;
END $$;

-- Vérification finale : lister les policies créées
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
