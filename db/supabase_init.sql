-- Supabase / PostgreSQL initialization script for BGM Central iCom
-- Creates core tables and inserts demo users

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL,
  magasin_id uuid NULL,
  magasins_ids uuid[] DEFAULT '{}',
  telephone text,
  actif boolean DEFAULT true,
  avatar text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NULL
);

-- Magasins
CREATE TABLE IF NOT EXISTS magasins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  nom text NOT NULL,
  ville text,
  wilaya text,
  responsable text,
  telephone text,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Articles
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  designation text NOT NULL,
  categorie text,
  unite text,
  stock_minimum integer DEFAULT 0,
  prix_moyen numeric DEFAULT 0,
  photo_url text,
  qr_code text,
  created_at timestamptz DEFAULT now()
);

-- Fournisseurs
CREATE TABLE IF NOT EXISTS fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_societe text NOT NULL,
  rc_nif text,
  telephone text,
  adresse text,
  contact_nom text,
  solde numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Bon de Commande and lines
CREATE TABLE IF NOT EXISTS commandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  fournisseur_id uuid REFERENCES fournisseurs(id),
  fournisseur_nom text,
  statut text,
  date_commande timestamptz DEFAULT now(),
  magasin_destination_id uuid REFERENCES magasins(id),
  created_by_id uuid REFERENCES users(id),
  created_by_nom text,
  total_ht numeric DEFAULT 0,
  tva numeric DEFAULT 0,
  total_ttc numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commande_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id uuid REFERENCES commandes(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id),
  designation text,
  quantite integer DEFAULT 0,
  quantite_recue integer DEFAULT 0,
  prix_unitaire numeric DEFAULT 0
);

-- Receptions and lines
CREATE TABLE IF NOT EXISTS receptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  commande_id uuid REFERENCES commandes(id),
  commande_code text,
  magasin_id uuid REFERENCES magasins(id),
  magasin_nom text,
  date_reception timestamptz DEFAULT now(),
  bon_livraison_ref text,
  facture_fournisseur_ref text,
  magasinier_id uuid REFERENCES users(id),
  magasinier_nom text,
  statut text DEFAULT 'Brouillon'
);

CREATE TABLE IF NOT EXISTS reception_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id uuid REFERENCES receptions(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id),
  designation text,
  quantite_demandee integer DEFAULT 0,
  quantite_recue integer DEFAULT 0
);

-- Factures
CREATE TABLE IF NOT EXISTS factures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  fournisseur_id uuid REFERENCES fournisseurs(id),
  fournisseur_nom text,
  commande_id uuid REFERENCES commandes(id),
  commande_code text,
  reception_id uuid REFERENCES receptions(id),
  reception_code text,
  date_facture timestamptz DEFAULT now(),
  montant_ht numeric DEFAULT 0,
  taux_tva numeric DEFAULT 0.19,
  montant_tva numeric DEFAULT 0,
  timbre numeric DEFAULT 0,
  frais_port numeric DEFAULT 0,
  montant_ttc numeric DEFAULT 0,
  solde_restant numeric DEFAULT 0,
  statut text DEFAULT 'Non payée'
);

-- Stocks
CREATE TABLE IF NOT EXISTS stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  magasin_id uuid REFERENCES magasins(id),
  article_id uuid REFERENCES articles(id),
  quantite numeric DEFAULT 0
);

-- Mouvements Stock
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  magasin_id uuid REFERENCES magasins(id),
  magasin_nom text,
  article_id uuid REFERENCES articles(id),
  article_designation text,
  type text,
  quantite numeric,
  reference_doc text,
  date_mouvement timestamptz DEFAULT now(),
  note text,
  utilisateur_nom text
);

-- Transferts (inter-store transfers)
CREATE TABLE IF NOT EXISTS transferts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  magasin_depart_id uuid REFERENCES magasins(id),
  magasin_depart_nom text,
  magasin_dest_id uuid REFERENCES magasins(id),
  magasin_dest_nom text,
  statut text DEFAULT 'Demande',
  date_demande timestamptz DEFAULT now(),
  date_expedition timestamptz,
  date_reception timestamptz,
  demandeur_nom text,
  valideur_nom text,
  receveur_nom text,
  motif text,
  lignes jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS transfert_lignes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfert_id uuid REFERENCES transferts(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id),
  designation text,
  quantite integer DEFAULT 0
);

-- Affectations (material assignments to employees/sites)
CREATE TABLE IF NOT EXISTS affectations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  employe_id text,
  employe_nom text,
  chantier_id text,
  chantier_nom text,
  magasin_id uuid REFERENCES magasins(id),
  magasin_nom text,
  date_affectation timestamptz DEFAULT now(),
  article_id uuid REFERENCES articles(id),
  article_designation text,
  quantite integer DEFAULT 0,
  motif text,
  statut text DEFAULT 'Affecté',
  date_retour timestamptz,
  magasinier_nom text
);

-- Paiements
CREATE TABLE IF NOT EXISTS paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur_id uuid REFERENCES fournisseurs(id),
  montant numeric DEFAULT 0,
  mode text,
  reference_transaction text,
  note text,
  facture_id uuid REFERENCES factures(id),
  date_paiement timestamptz DEFAULT now(),
  code text,
  comptable_nom text,
  lettre boolean DEFAULT false,
  facture_ref text
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  user_nom text,
  user_role text,
  action text,
  table_name text,
  record_id uuid,
  ancienne_valeur text,
  nouvelle_valeur text,
  date_action timestamptz DEFAULT now()
);

-- Indexes to speed lookups
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes(statut);
CREATE INDEX IF NOT EXISTS idx_receptions_statut ON receptions(statut);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);
CREATE INDEX IF NOT EXISTS idx_stocks_magasin_article ON stocks(magasin_id, article_id);

-- Demo seed data: users (passwords are plaintext here; in production store hashes)
INSERT INTO users (id, name, email, password_hash, role, magasins_ids, telephone, actif, created_at) VALUES
  (gen_random_uuid(), 'Karim Benamar', 'directeur@benamar.dz', 'dir2026', 'direction', ARRAY[]::uuid[], '0551 00 00 01', true, now()),
  (gen_random_uuid(), 'Rachid Magasiner', 'rachid.alg@benamar.dz', 'mag2026', 'magasinier', ARRAY[]::uuid[], '0661 12 34 56', true, now()),
  (gen_random_uuid(), 'Kamel Achat', 'kamel.achats@benamar.dz', 'ach2026', 'achat', ARRAY[]::uuid[], '0550 44 55 66', true, now()),
  (gen_random_uuid(), 'Amine Finance', 'amine.compta@benamar.dz', 'fin2026', 'comptabilite', ARRAY[]::uuid[], '0661 77 88 99', true, now()),
  (gen_random_uuid(), 'Omar Chef Chantier', 'omar.chef@benamar.dz', 'chef2026', 'chef_chantier', ARRAY[]::uuid[], '0558 33 22 11', true, now());

-- Demo seed data: magasins
INSERT INTO magasins (code, nom, ville, wilaya, responsable, telephone, actif, created_at) VALUES
  ('MAG-ALG', 'Magasin Central - Alger', 'Dar El Beïda', 'Alger (16)', 'Rachid Magasiner', '021 50 12 34', true, now()),
  ('MAG-ORN', 'Magasin Régional - Oran', 'Bir El Djir', 'Oran (31)', 'Yassine Magasiner', '041 82 56 78', true, now()),
  ('MAG-CST', 'Magasin Est - Constantine', 'El Khroub', 'Constantine (25)', 'Sofiane Bati', '031 94 33 22', true, now()),
  ('MAG-ANB', 'Dépôt Annaba', 'El Bouni', 'Annaba (23)', 'Fateh Aïn', '038 66 11 00', false, now());

-- Demo seed data: articles
INSERT INTO articles (reference, designation, categorie, unite, stock_minimum, prix_moyen, qr_code, created_at) VALUES
  ('MAT-CIM-50K', 'Ciment Gris Lafarge CPJ-CEM II 42.5N', 'Gros Œuvre', 'Sac (50kg)', 100, 850, 'MAT-CIM-50K', now()),
  ('MAT-FER-D12', 'Rond à Béton FE E500 Ø12mm', 'Gros Œuvre', 'Barre (12m)', 150, 1250, 'MAT-FER-D12', now()),
  ('FIN-PEI-AST', 'Peinture Murale Astral Blanche Mat', 'Second Œuvre / Finition', 'Bidon (20kg)', 30, 8200, 'FIN-PEI-AST', now()),
  ('OUT-PER-BOS', 'Perceuse à Percussion Bosch GSB 13 RE 650W', 'Outillage électroportatif', 'Unité', 5, 14500, 'OUT-PER-BOS', now()),
  ('SEC-CAS-MSA', 'Casque de Protection Chantier MSA V-Gard', 'Sécurité / EPI', 'Unité', 50, 1800, 'SEC-CAS-MSA', now()),
  ('SEC-GAN-REP', 'Gants de Protection en Cuir Renforcé', 'Sécurité / EPI', 'Paire', 100, 350, 'SEC-GAN-REP', now()),
  ('ELC-CAB-2X5', 'Câble Électrique Cuivre Rigide R2V 3G2.5', 'Électricité', 'Couronne (100m)', 20, 9500, 'ELC-CAB-2X5', now()),
  ('CON-VIS-B45', 'Vis pour plaques de plâtre 3.5x25mm', 'Consommables', 'Boîte (1000pcs)', 40, 1100, 'CON-VIS-B45', now());

-- Demo seed data: fournisseurs
INSERT INTO fournisseurs (nom_societe, rc_nif, telephone, adresse, contact_nom, solde, created_at) VALUES
  ('Lafarge Ciments Algérie Spa', '000316090940381 / 1631024509', '021 98 20 00', 'Pins Maritimes, Mohammadia, Alger', 'M. Sofiane Hamadouche', 850000, now()),
  ('Sarl BatiPro Distribution', '083416001099824 / 000816090949312', '023 85 41 22', 'Zone Industrielle Oued Smar, Alger', 'Mme. Amina Belkacem', 320000, now()),
  ('Ets Benabderrahmane Outillage', '198431002349001 / 198431020039200', '041 33 44 55', 'Boulevard des Chasseurs, Oran', 'M. Salim Benabderrahmane', 45000, now()),
  ('Spa ENICAB (Algérie Câbles)', '000125039485739 / 0001250394857', '031 66 77 88', 'Zone Industrielle El Khroub, Constantine', 'M. Redouane Zergui', 0, now());

-- Demo seed data: stocks (sample quantities for each store)
INSERT INTO stocks (magasin_id, article_id, quantite) 
SELECT m.id, a.id, FLOOR(RANDOM() * 500 + 50)
FROM magasins m, articles a
WHERE m.actif = true;

-- Note: For Supabase Auth integration, prefer using the Auth schema and store user profiles in a separate table linked to auth.users.

-- End of script
