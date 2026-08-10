-- Script de mise à jour pour la table affectations (Bon de Sortie)
-- Note: Les colonnes sont créées avec des guillemets pour respecter le camelCase attendu par l'application.

-- 1. Ajout de la colonne pour gérer plusieurs articles (lignes)
ALTER TABLE affectations ADD COLUMN IF NOT EXISTS "lignes" jsonb DEFAULT '[]'::jsonb;

-- 2. Ajout des colonnes pour la destination "Magasin" (Dépôt Récepteur)
ALTER TABLE affectations ADD COLUMN IF NOT EXISTS "magasinDestId" uuid REFERENCES magasins(id);
ALTER TABLE affectations ADD COLUMN IF NOT EXISTS "magasinDestNom" text;

-- 3. Ajout des champs complémentaires pour le bon de sortie
ALTER TABLE affectations ADD COLUMN IF NOT EXISTS "chauffeur" text;
ALTER TABLE affectations ADD COLUMN IF NOT EXISTS "vehicule" text;

-- 4. Pour rétro-compatibilité, on migre les anciens articles uniques vers la colonne lignes (si vous utilisez le snake_case dans l'ancienne version, adaptez les noms)
-- UPDATE affectations 
-- SET "lignes" = jsonb_build_array(
--   jsonb_build_object(
--     'articleId', "articleId", 
--     'designation', "articleDesignation", 
--     'quantite', "quantite"
--   )
-- )
-- WHERE "lignes" = '[]'::jsonb AND "articleId" IS NOT NULL;

-- 5. Rendre optionnelles les anciennes colonnes
ALTER TABLE affectations ALTER COLUMN "articleId" DROP NOT NULL;
ALTER TABLE affectations ALTER COLUMN "articleDesignation" DROP NOT NULL;
ALTER TABLE affectations ALTER COLUMN "quantite" DROP NOT NULL;
