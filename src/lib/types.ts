// Type definitions for the Multi-Store Construction Management Application

export type UserRole = 'direction' | 'magasinier' | 'achat' | 'comptabilite' | 'chef_chantier' | 'demandeur' | 'responsable' | 'acheteur' | 'comptable' | 'directeur';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  magasinId?: string; // Magasin principal (rétrocompat – magasinier mono-site)
  magasinsIds?: string[]; // Un ou plusieurs magasins autorisés
  email: string;
  privileges?: string[]; // Optional admin-granted privileges
  telephone?: string;
  password: string; // Texte brut en mode mock; à hacher en production
  actif: boolean;
  avatar?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Magasin {
  id: string;
  code: string;
  nom: string;
  ville: string;
  wilaya: string;
  responsable: string;
  telephone: string;
  actif: boolean;
  createdAt: string;
}

export interface Article {
  id: string;
  reference: string;
  designation: string;
  categorie: string;
  unite: string;
  stockMinimum: number;
  prixMoyen: number;
  photoUrl?: string;
  qrCode?: string;
  createdAt: string;
}

export interface Fournisseur {
  id: string;
  nomSociete: string;
  rcNif: string;
  telephone: string;
  adresse: string;
  contactNom: string;
  solde: number; // Current balance/debt
  nif?: string;
  nis?: string;
  ai?: string;
  rc?: string;
  email?: string;
  createdAt: string;
}

export type CommandeStatus = 'Brouillon' | 'En attente' | 'Validée' | 'Validé' | 'Refusée' | 'Commandé' | 'Reçu partiellement' | 'Reçu totalement' | 'Clôturé';

export interface BonCommandeLigne {
  articleId: string;
  designation: string;
  quantite: number;
  quantiteRecue: number;
  prixUnitaire: number;
}

export interface BonCommande {
  id: string;
  code: string;
  fournisseurId?: string;
  fournisseurNom?: string;
  statut: CommandeStatus;
  dateCommande: string;
  lignes: BonCommandeLigne[];
  totalHT: number;
  tva: number;
  totalTTC: number;
  magasinDestinationId: string;
  createdById: string;
  createdByNom: string;
  priorite?: 'Basse' | 'Moyenne' | 'Haute' | 'Urgente';
  observation?: string;
}

export interface ReceptionLigne {
  articleId: string;
  designation: string;
  quantiteDemandee: number;
  quantiteRecue: number;
  prixUnitaire?: number; // Saisi en réception directe (sans DA) ; sinon prixMoyen de l'article
}

export interface Reception {
  id: string;
  code: string;
  commandeId: string; // Vide pour une réception directe (sans Demande d'Achat)
  commandeCode: string;
  fournisseurId?: string; // Renseigné uniquement pour une réception directe
  fournisseurNom?: string;
  magasinId: string;
  magasinNom: string;
  dateReception: string;
  bonLivraisonRef: string;
  factureFournisseurRef?: string;
  lignes: ReceptionLigne[];
  scanDetails?: string;
  magasinierId: string;
  magasinierNom: string;
  statut: 'Brouillon' | 'Validée'; // Added status for reception workflow
}

export interface StockItem {
  id: string;
  magasinId: string;
  articleId: string;
  quantite: number;
}

export type MouvementType = 'ENTREE_ACHAT' | 'ENTREE_TRANSFERT' | 'SORTIE_AFFECTATION' | 'SORTIE_TRANSFERT' | 'RETOUR_AFFECTATION' | 'CORRECTION_INVENTAIRE' | 'ENTREE_INVENTAIRE' | 'SORTIE_INVENTAIRE' | 'SORTIE_CONSOMMATION';

export interface MouvementStock {
  id: string;
  magasinId: string;
  magasinNom: string;
  articleId: string;
  articleDesignation: string;
  type: MouvementType;
  quantite: number;
  referenceDoc: string; // ID of the PO, Transfer, or Affectation
  dateMouvement: string;
  note?: string;
  utilisateurNom: string;
}

export interface InventaireLigne {
  articleId: string;
  designation: string;
  quantiteTheorique: number;
  quantiteReelle: number;
  ecart: number;
}

export interface Inventaire {
  id: string;
  code: string;
  magasinId: string;
  magasinNom: string;
  dateInventaire: string;
  statut: 'Brouillon' | 'Validé';
  lignes: InventaireLigne[];
  creeParNom: string;
  valideParNom?: string;
  note?: string;
}

export interface Affectation {
  id: string;
  code: string;
  employeId: string;
  employeNom: string;
  chantierId?: string; // Optional if destination is magasin
  chantierNom?: string;
  magasinId: string; // Source warehouse
  magasinNom: string;
  magasinDestId?: string; // Destination warehouse
  magasinDestNom?: string;
  dateAffectation: string;
  lignes: { articleId: string; designation: string; quantite: number }[]; // Replaces single article logic
  motif: string;
  chauffeur?: string;
  vehicule?: string;
  statut: 'En attente' | 'Validé' | 'Affecté' | 'Retourné';
  dateRetour?: string;
  magasinierNom: string;
  
  // Legacy fields for backward compatibility during migration
  articleId?: string;
  articleDesignation?: string;
  quantite?: number;
}

export interface Employe {
  id: string;
  nom: string;
  fonction: string;
  service: string;
  telephone: string;
  chantierId?: string;
  chantierNom?: string;
  // Un employé référencé par un bon de sortie ne peut pas être supprimé :
  // il est alors désactivé (sorti des effectifs) et masqué des listes de saisie.
  actif?: boolean;
}

export interface Chantier {
  id: string;
  nom: string;
  wilaya: string;
  chefNom: string;
  actif: boolean;
}

// Workflow transfert : Demande → Validé (sortie du dépôt départ) → Reçu (entrée au dépôt destination).
// 'Refusé' clôt la demande à la validation. 'Expédié' est l'ancien libellé de 'Validé' : il subsiste
// dans les lignes déjà en base et est ramené à 'Validé' à la lecture (normalizeTransfertStatut).
export type TransfertStatus = 'Demande' | 'Validé' | 'Expédié' | 'Reçu' | 'Refusé';

export interface TransfertLigne {
  articleId: string;
  designation: string;
  quantite: number;
}

export interface Transfert {
  id: string;
  code: string;
  magasinDepartId: string;
  magasinDepartNom: string;
  magasinDestId: string;
  magasinDestNom: string;
  statut: TransfertStatus;
  dateDemande: string;
  dateExpedition?: string; // Date de validation = sortie effective du dépôt départ (colonne "dateExpedition" en base)
  dateReception?: string;
  lignes: TransfertLigne[];
  demandeurNom: string;
  valideurNom?: string;
  receveurNom?: string;
  motif?: string;
}

export interface Facture {
  id: string;
  code: string; // e.g. FAC-2026-001
  fournisseurId: string;
  fournisseurNom: string;
  commandeId?: string;
  commandeCode?: string;
  receptionId?: string;
  receptionCode?: string;
  dateFacture: string;
  montantHT: number;
  tauxTVA?: number; // Default 19%, adjustable (Algérie = 19%)
  montantTVA: number;
  timbreAlgerien?: number; // Optional Algerian stamp tax (e.g., 500-2000 DA)
  fraisPort?: number; // Optional shipping/handling fees
  montantTTC: number;
  soldeRestant: number;
  statut: 'Non payée' | 'Partiellement payée' | 'Payée';
  receptionValideId?: string; // Reference to the validated reception that triggered auto-creation
}

export type ModePaiement = 'Virement' | 'Chèque' | 'Espèces' | 'CCP' | 'Carte bancaire';

export interface Paiement {
  id: string;
  code: string;
  fournisseurId: string;
  fournisseurNom: string;
  factureId?: string; // Associated Facture ID
  factureRef?: string; // Associated Facture or Reception references
  receptionIds?: string[]; // Optionally selected receptions / BL ids
  lettre: boolean; // Whether the payment is matched/lettered
  montant: number;
  datePaiement: string;
  mode: ModePaiement;
  referenceTransaction: string;
  comptableNom: string;
  note?: string;
}

// Identité et coordonnées de l'entreprise (une seule ligne en base, table `societe`).
// Sert d'en-tête aux documents imprimés (bons de commande, BL, factures, transferts).
export interface Societe {
  id: string;
  raisonSociale: string;
  formeJuridique?: string;
  activite?: string;
  // Identifiants fiscaux algériens
  rc?: string;
  nif?: string;
  nis?: string;
  ai?: string;   // Article d'imposition
  capitalSocial?: number;
  // Coordonnées
  adresse?: string;
  ville?: string;
  wilaya?: string;
  codePostal?: string;
  telephone?: string;
  telephone2?: string;
  fax?: string;
  email?: string;
  siteWeb?: string;
  // Coordonnées bancaires
  banque?: string;
  rib?: string;
  logoUrl?: string;
  note?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userNom: string;
  userRole: UserRole;
  action: string; // e.g., "Création d'un magasin"
  table: string; // e.g., "magasins"
  recordId: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  dateAction: string;
}

export interface Notification {
  id: string;
  titre: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  lu: boolean;
  dateNotification: string;
}

