// Type definitions for the Multi-Store Construction Management Application

export type UserRole = 'direction' | 'magasinier' | 'achat' | 'comptabilite' | 'chef_chantier';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  magasinId?: string; // Magasin principal (rétrocompat – magasinier mono-site)
  magasinsIds?: string[]; // Un ou plusieurs magasins autorisés
  email: string;
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
  createdAt: string;
}

export type CommandeStatus = 'Brouillon' | 'Validé' | 'Commandé' | 'Reçu partiellement' | 'Reçu totalement' | 'Clôturé';

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
  fournisseurId: string;
  fournisseurNom: string;
  statut: CommandeStatus;
  dateCommande: string;
  lignes: BonCommandeLigne[];
  totalHT: number;
  tva: number;
  totalTTC: number;
  magasinDestinationId: string;
  createdById: string;
  createdByNom: string;
}

export interface ReceptionLigne {
  articleId: string;
  designation: string;
  quantiteDemandee: number;
  quantiteRecue: number;
}

export interface Reception {
  id: string;
  code: string;
  commandeId: string;
  commandeCode: string;
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

export type MouvementType = 'ENTREE_ACHAT' | 'ENTREE_TRANSFERT' | 'SORTIE_AFFECTATION' | 'SORTIE_TRANSFERT' | 'CORRECTION_INVENTAIRE';

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

export interface Affectation {
  id: string;
  code: string;
  employeId: string;
  employeNom: string;
  chantierId: string;
  chantierNom: string;
  magasinId: string;
  magasinNom: string;
  dateAffectation: string;
  articleId: string;
  articleDesignation: string;
  quantite: number;
  motif: string;
  statut: 'Affecté' | 'Retourné';
  dateRetour?: string;
  magasinierNom: string;
}

export interface Employe {
  id: string;
  nom: string;
  fonction: string;
  service: string;
  telephone: string;
  chantierId?: string;
  chantierNom?: string;
}

export interface Chantier {
  id: string;
  nom: string;
  wilaya: string;
  chefNom: string;
  actif: boolean;
}

export type TransfertStatus = 'Demande' | 'Expédié' | 'Reçu' | 'Refusé';

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
  dateExpedition?: string;
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

export type ModePaiement = 'Virement' | 'Chèque' | 'Espèces';

export interface Paiement {
  id: string;
  code: string;
  fournisseurId: string;
  fournisseurNom: string;
  factureId?: string; // Associated Facture ID
  factureRef?: string; // Associated Facture Code/Ref
  lettre: boolean; // Whether the payment is matched/lettered
  montant: number;
  datePaiement: string;
  mode: ModePaiement;
  referenceTransaction: string;
  comptableNom: string;
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
