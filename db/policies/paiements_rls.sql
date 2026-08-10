-- Secure RLS policies for table "paiements" (use in Supabase SQL Editor)
-- WARNING: Execute this on your Supabase project as a privileged user (e.g. SQL Editor).

ALTER TABLE public."paiements" ENABLE ROW LEVEL SECURITY;

-- Remove any old permissive policies
DROP POLICY IF EXISTS insert_paiements_auth ON public."paiements";
DROP POLICY IF EXISTS allow_insert_paiements ON public."paiements";
DROP POLICY IF EXISTS select_paiements_auth ON public."paiements";
DROP POLICY IF EXISTS update_paiements_auth ON public."paiements";
DROP POLICY IF EXISTS delete_paiements_auth ON public."paiements";

-- INSERT: only authenticated users may insert, and required columns must be present
CREATE POLICY insert_paiements_auth
  ON public."paiements"
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND "montant" IS NOT NULL
    AND "mode" IS NOT NULL
    AND "referenceTransaction" IS NOT NULL
    AND "comptableNom" IS NOT NULL
    AND "fournisseurId" IS NOT NULL
    AND "fournisseurNom" IS NOT NULL
  );

-- SELECT: allow authenticated users
CREATE POLICY select_paiements_auth
  ON public."paiements"
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- UPDATE: authenticated users can update (restrict further as needed)
CREATE POLICY update_paiements_auth
  ON public."paiements"
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- DELETE: authenticated users can delete (restrict further as needed)
CREATE POLICY delete_paiements_auth
  ON public."paiements"
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Notes:
-- - If your frontend uses anon (not-authenticated) requests, either authenticate users
--   before allowing INSERT, or route inserts through a server using the service_role key.
-- - Adjust the conditions in WITH CHECK / USING to match your authorization model
--   (e.g., check user id ownership, tenant id, or specific roles).
