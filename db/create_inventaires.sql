-- ==========================================================
-- SCRIPT: Créer la table inventaires dans Supabase
-- Copiez ce script dans Supabase > SQL Editor > Run
-- ==========================================================

CREATE TABLE IF NOT EXISTS inventaires (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL,
  magasin_id      UUID REFERENCES magasins(id) ON DELETE SET NULL,
  magasin_nom     TEXT,
  date_inventaire TIMESTAMPTZ NOT NULL DEFAULT now(),
  note            TEXT,
  statut          TEXT NOT NULL DEFAULT 'Brouillon',
  lignes          JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_by_id   UUID,
  created_by_nom  TEXT,
  validated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventaires_magasin ON inventaires(magasin_id);
CREATE INDEX IF NOT EXISTS idx_inventaires_date    ON inventaires(date_inventaire DESC);

ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;

DO  BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventaires' AND policyname='Read inventaires') THEN
    CREATE POLICY Read inventaires  ON inventaires FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventaires' AND policyname='Write inventaires') THEN
    CREATE POLICY Write inventaires ON inventaires FOR ALL    USING (true);
  END IF;
END ;

-- Verify
SELECT 'Table inventaires créée avec succès!' as result;
