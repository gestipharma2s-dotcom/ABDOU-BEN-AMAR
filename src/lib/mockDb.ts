// Mock Database in LocalStorage mimicking Supabase API behavior
import type { 
  UserProfile, UserRole, Magasin, Article, Fournisseur, BonCommande, 
  Reception, ReceptionLigne, StockItem, MouvementStock, Affectation, 
  Employe, Chantier, Transfert, TransfertLigne, Paiement, AuditLog, Notification, CommandeStatus, ModePaiement, MouvementType,
  Facture
} from './types';

// Pre-defined users for simulation
export const MOCK_USERS: UserProfile[] = [
  { id: 'usr-dir', name: 'Karim Benamar', role: 'direction', email: 'directeur@benamar.dz', password: 'dir2026', magasinsIds: ['mag-alg','mag-orn','mag-cst','mag-anb'], telephone: '0551 00 00 01', actif: true, createdAt: '2026-01-01T08:00:00Z', createdBy: 'system', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&auto=format&fit=crop&q=60' },
  { id: 'usr-mag-alg', name: 'Rachid Magasiner', role: 'magasinier', magasinId: 'mag-alg', magasinsIds: ['mag-alg'], password: 'mag2026', email: 'rachid.alg@benamar.dz', telephone: '0661 12 34 56', actif: true, createdAt: '2026-01-10T08:00:00Z', createdBy: 'usr-dir', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=60' },
  { id: 'usr-mag-orn', name: 'Yassine Magasiner', role: 'magasinier', magasinId: 'mag-orn', magasinsIds: ['mag-orn'], password: 'mag2026', email: 'yassine.orn@benamar.dz', telephone: '0772 98 76 54', actif: true, createdAt: '2026-02-15T09:00:00Z', createdBy: 'usr-dir', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=60' },
  { id: 'usr-ach', name: 'Kamel Achat', role: 'achat', password: 'ach2026', magasinsIds: ['mag-alg','mag-orn','mag-cst'], email: 'kamel.achats@benamar.dz', telephone: '0550 44 55 66', actif: true, createdAt: '2026-01-10T08:00:00Z', createdBy: 'usr-dir', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=60' },
  { id: 'usr-compt', name: 'Amine Finance', role: 'comptabilite', password: 'fin2026', magasinsIds: ['mag-alg','mag-orn','mag-cst'], email: 'amine.compta@benamar.dz', telephone: '0661 77 88 99', actif: true, createdAt: '2026-01-10T08:00:00Z', createdBy: 'usr-dir', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=60' },
  { id: 'usr-chef', name: 'Omar Chef Chantier', role: 'chef_chantier', password: 'chef2026', magasinsIds: ['mag-alg'], email: 'omar.chef@benamar.dz', telephone: '0558 33 22 11', actif: true, createdAt: '2026-01-10T08:00:00Z', createdBy: 'usr-dir', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=60' },
  { id: 'usr-mag-cst', name: 'Sofiane Magasiner', role: 'magasinier', magasinId: 'mag-cst', magasinsIds: ['mag-cst'], password: 'mag2026', email: 'sofiane.cst@benamar.dz', telephone: '0553 66 55 44', actif: true, createdAt: '2026-03-01T10:00:00Z', createdBy: 'usr-dir' }
];


// Helper to generate unique codes
const genId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

// Default Data Set
const DEFAULT_MAGASINS: Magasin[] = [
  { id: 'mag-alg', code: 'MAG-ALG', nom: 'Magasin Central - Alger', ville: 'Dar El Beïda', wilaya: 'Alger (16)', responsable: 'Rachid Magasiner', telephone: '021 50 12 34', actif: true, createdAt: '2026-01-10T08:00:00Z' },
  { id: 'mag-orn', code: 'MAG-ORN', nom: 'Magasin Régional - Oran', ville: 'Bir El Djir', wilaya: 'Oran (31)', responsable: 'Yassine Magasiner', telephone: '041 82 56 78', actif: true, createdAt: '2026-02-15T09:00:00Z' },
  { id: 'mag-cst', code: 'MAG-CST', nom: 'Magasin Est - Constantine', ville: 'El Khroub', wilaya: 'Constantine (25)', responsable: 'Sofiane Bati', telephone: '031 94 33 22', actif: true, createdAt: '2026-03-01T10:00:00Z' },
  { id: 'mag-anb', code: 'MAG-ANB', nom: 'Dépôt Annaba', ville: 'El Bouni', wilaya: 'Annaba (23)', responsable: 'Fateh Aïn', telephone: '038 66 11 00', actif: false, createdAt: '2026-03-20T11:00:00Z' }
];

const DEFAULT_ARTICLES: Article[] = [
  { id: 'art-ciment', reference: 'MAT-CIM-50K', designation: 'Ciment Gris Lafarge CPJ-CEM II 42.5N', categorie: 'Gros Œuvre', unite: 'Sac (50kg)', stockMinimum: 100, prixMoyen: 850, photoUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&auto=format&fit=crop&q=60', qrCode: 'MAT-CIM-50K', createdAt: '2026-01-11T09:00:00Z' },
  { id: 'art-fer12', reference: 'MAT-FER-D12', designation: 'Rond à Béton FE E500 Ø12mm', categorie: 'Gros Œuvre', unite: 'Barre (12m)', stockMinimum: 150, prixMoyen: 1250, photoUrl: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=200&auto=format&fit=crop&q=60', qrCode: 'MAT-FER-D12', createdAt: '2026-01-11T09:30:00Z' },
  { id: 'art-peinture', reference: 'FIN-PEI-AST', designation: 'Peinture Murale Astral Blanche Mat', categorie: 'Second Œuvre / Finition', unite: 'Bidon (20kg)', stockMinimum: 30, prixMoyen: 8200, photoUrl: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=200&auto=format&fit=crop&q=60', qrCode: 'FIN-PEI-AST', createdAt: '2026-01-12T10:00:00Z' },
  { id: 'art-perceuse', reference: 'OUT-PER-BOS', designation: 'Perceuse à Percussion Bosch GSB 13 RE 650W', categorie: 'Outillage électroportatif', unite: 'Unité', stockMinimum: 5, prixMoyen: 14500, photoUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&auto=format&fit=crop&q=60', qrCode: 'OUT-PER-BOS', createdAt: '2026-01-12T10:30:00Z' },
  { id: 'art-casque', reference: 'SEC-CAS-MSA', designation: 'Casque de Protection Chantier MSA V-Gard', categorie: 'Sécurité / EPI', unite: 'Unité', stockMinimum: 50, prixMoyen: 1800, photoUrl: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?w=200&auto=format&fit=crop&q=60', qrCode: 'SEC-CAS-MSA', createdAt: '2026-01-13T11:00:00Z' },
  { id: 'art-gants', reference: 'SEC-GAN-REP', designation: 'Gants de Protection en Cuir Renforcé', categorie: 'Sécurité / EPI', unite: 'Paire', stockMinimum: 100, prixMoyen: 350, photoUrl: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=200&auto=format&fit=crop&q=60', qrCode: 'SEC-GAN-REP', createdAt: '2026-01-13T11:15:00Z' },
  { id: 'art-cables', reference: 'ELC-CAB-2X5', designation: 'Câble Électrique Cuivre Rigide R2V 3G2.5', categorie: 'Électricité', unite: 'Couronne (100m)', stockMinimum: 20, prixMoyen: 9500, photoUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&auto=format&fit=crop&q=60', qrCode: 'ELC-CAB-2X5', createdAt: '2026-01-14T08:30:00Z' },
  { id: 'art-vis', reference: 'CON-VIS-B45', designation: 'Vis pour plaques de plâtre 3.5x25mm', categorie: 'Consommables', unite: 'Boîte (1000pcs)', stockMinimum: 40, prixMoyen: 1100, photoUrl: 'https://images.unsplash.com/photo-1530124560072-a059b014b411?w=200&auto=format&fit=crop&q=60', qrCode: 'CON-VIS-B45', createdAt: '2026-01-15T09:00:00Z' }
];

const DEFAULT_FOURNISSEURS: Fournisseur[] = [
  { id: 'fou-lafarge', nomSociete: 'Lafarge Ciments Algérie Spa', rcNif: '000316090940381 / 1631024509', telephone: '021 98 20 00', adresse: 'Pins Maritimes, Mohammadia, Alger', contactNom: 'M. Sofiane Hamadouche', solde: 850000, createdAt: '2026-01-15T10:00:00Z' },
  { id: 'fou-batipro', nomSociete: 'Sarl BatiPro Distribution', rcNif: '083416001099824 / 000816090949312', telephone: '023 85 41 22', adresse: 'Zone Industrielle Oued Smar, Alger', contactNom: 'Mme. Amina Belkacem', solde: 320000, createdAt: '2026-01-16T11:00:00Z' },
  { id: 'fou-quincaillerie', nomSociete: 'Ets Benabderrahmane Outillage', rcNif: '198431002349001 / 198431020039200', telephone: '041 33 44 55', adresse: 'Boulevard des Chasseurs, Oran', contactNom: 'M. Salim Benabderrahmane', solde: 45000, createdAt: '2026-01-20T09:00:00Z' },
  { id: 'fou-algerie_cables', nomSociete: 'Spa ENICAB (Algérie Câbles)', rcNif: '000125039485739 / 0001250394857', telephone: '031 66 77 88', adresse: 'Zone Industrielle El Khroub, Constantine', contactNom: 'M. Redouane Zergui', solde: 0, createdAt: '2026-02-10T14:00:00Z' }
];

const DEFAULT_EMPLOYES: Employe[] = [
  { id: 'emp-1', nom: 'Mustapha Loucif', fonction: 'Maçon Qualifié', service: 'Production Gros Œuvre', telephone: '0555 12 34 56', chantierId: 'cha-100log', chantierNom: '100 Logements LPP' },
  { id: 'emp-2', nom: 'Yacine Mezouar', fonction: 'Chef d\'Équipe Électricien', service: 'Second Œuvre', telephone: '0661 98 76 54', chantierId: 'cha-100log', chantierNom: '100 Logements LPP' },
  { id: 'emp-3', nom: 'Mourad Khelifi', fonction: 'Ferrailleur', service: 'Production Gros Œuvre', telephone: '0770 44 55 66', chantierId: 'cha-aeroport', chantierNom: 'Extension Aérogare Oran' },
  { id: 'emp-4', nom: 'Salim Tebboune', fonction: 'Peintre Applicateur', service: 'Finition', telephone: '0550 33 22 11', chantierId: 'cha-aeroport', chantierNom: 'Extension Aérogare Oran' },
  { id: 'emp-5', nom: 'Sid Ahmed Ziani', fonction: 'Magasinier Assistant', service: 'Logistique', telephone: '0658 99 88 77', chantierId: 'cha-viaduc', chantierNom: 'Viaduc Transrhumel Constantine' }
];

const DEFAULT_CHANTIERS: Chantier[] = [
  { id: 'cha-100log', nom: 'Chantier 100 Logements LPP - Alger (Reghaïa)', wilaya: 'Alger (16)', chefNom: 'Omar Chef', actif: true },
  { id: 'cha-aeroport', nom: 'Chantier Extension Aérogare Ouest - Oran', wilaya: 'Oran (31)', chefNom: 'Mourad Ziri', actif: true },
  { id: 'cha-viaduc', nom: 'Chantier Viaduc Transrhumel - Constantine', wilaya: 'Constantine (25)', chefNom: 'Sofiane Bati', actif: true },
  { id: 'cha-stade', nom: 'Chantier Nouveau Stade - Tizi Ouzou', wilaya: 'Tizi Ouzou (15)', chefNom: 'Lounes Khelil', actif: false }
];

const DEFAULT_STOCKS: StockItem[] = [
  // Magasin Alger
  { id: 'stk-1', magasinId: 'mag-alg', articleId: 'art-ciment', quantite: 450 },
  { id: 'stk-2', magasinId: 'mag-alg', articleId: 'art-fer12', quantite: 80 }, // Alert: stockMinimum = 150
  { id: 'stk-3', magasinId: 'mag-alg', articleId: 'art-peinture', quantite: 15 }, // Alert: stockMinimum = 30
  { id: 'stk-4', magasinId: 'mag-alg', articleId: 'art-perceuse', quantite: 8 },
  { id: 'stk-5', magasinId: 'mag-alg', articleId: 'art-casque', quantite: 120 },
  { id: 'stk-6', magasinId: 'mag-alg', articleId: 'art-gants', quantite: 340 },
  { id: 'stk-7', magasinId: 'mag-alg', articleId: 'art-cables', quantite: 45 },
  { id: 'stk-8', magasinId: 'mag-alg', articleId: 'art-vis', quantite: 80 },

  // Magasin Oran
  { id: 'stk-9', magasinId: 'mag-orn', articleId: 'art-ciment', quantite: 180 },
  { id: 'stk-10', magasinId: 'mag-orn', articleId: 'art-fer12', quantite: 220 },
  { id: 'stk-11', magasinId: 'mag-orn', articleId: 'art-peinture', quantite: 45 },
  { id: 'stk-12', magasinId: 'mag-orn', articleId: 'art-perceuse', quantite: 3 }, // Alert: stockMinimum = 5
  { id: 'stk-13', magasinId: 'mag-orn', articleId: 'art-casque', quantite: 65 },
  { id: 'stk-14', magasinId: 'mag-orn', articleId: 'art-gants', quantite: 150 },
  { id: 'stk-15', magasinId: 'mag-orn', articleId: 'art-cables', quantite: 12 }, // Alert: stockMinimum = 20
  { id: 'stk-16', magasinId: 'mag-orn', articleId: 'art-vis', quantite: 30 }, // Alert: stockMinimum = 40

  // Magasin Constantine
  { id: 'stk-17', magasinId: 'mag-cst', articleId: 'art-ciment', quantite: 350 },
  { id: 'stk-18', magasinId: 'mag-cst', articleId: 'art-fer12', quantite: 190 },
  { id: 'stk-19', magasinId: 'mag-cst', articleId: 'art-peinture', quantite: 10 }, // Alert: stockMinimum = 30
  { id: 'stk-20', magasinId: 'mag-cst', articleId: 'art-perceuse', quantite: 6 },
  { id: 'stk-21', magasinId: 'mag-cst', articleId: 'art-casque', quantite: 80 },
  { id: 'stk-22', magasinId: 'mag-cst', articleId: 'art-gants', quantite: 210 },
  { id: 'stk-23', magasinId: 'mag-cst', articleId: 'art-cables', quantite: 25 },
  { id: 'stk-24', magasinId: 'mag-cst', articleId: 'art-vis', quantite: 50 }
];

const DEFAULT_MOUVEMENTS: MouvementStock[] = [
  { id: 'mov-1', magasinId: 'mag-alg', magasinNom: 'Magasin Central - Alger', articleId: 'art-ciment', articleDesignation: 'Ciment Gris Lafarge CPJ-CEM II 42.5N', type: 'ENTREE_ACHAT', quantite: 500, referenceDoc: 'BC-2026-001', dateMouvement: '2026-05-10T11:00:00Z', note: 'Réception totale Commande BC-2026-001', utilisateurNom: 'Rachid Magasiner' },
  { id: 'mov-2', magasinId: 'mag-alg', magasinNom: 'Magasin Central - Alger', articleId: 'art-ciment', articleDesignation: 'Ciment Gris Lafarge CPJ-CEM II 42.5N', type: 'SORTIE_AFFECTATION', quantite: -50, referenceDoc: 'BS-2026-001', dateMouvement: '2026-05-12T14:30:00Z', note: 'Sortie pour Chantier 100 Logements LPP', utilisateurNom: 'Rachid Magasiner' },
  { id: 'mov-3', magasinId: 'mag-orn', magasinNom: 'Magasin Régional - Oran', articleId: 'art-fer12', type: 'ENTREE_TRANSFERT', articleDesignation: 'Rond à Béton FE E500 Ø12mm', quantite: 100, referenceDoc: 'TR-2026-001', dateMouvement: '2026-05-15T10:00:00Z', note: 'Réception transfert de Alger', utilisateurNom: 'Yassine Magasiner' },
  { id: 'mov-4', magasinId: 'mag-alg', magasinNom: 'Magasin Central - Alger', articleId: 'art-fer12', type: 'SORTIE_TRANSFERT', articleDesignation: 'Rond à Béton FE E500 Ø12mm', quantite: -100, referenceDoc: 'TR-2026-001', dateMouvement: '2026-05-14T09:00:00Z', note: 'Expédition transfert vers Oran', utilisateurNom: 'Rachid Magasiner' }
];

const DEFAULT_COMMANDES: BonCommande[] = [
  {
    id: 'cmd-1',
    code: 'BC-2026-001',
    fournisseurId: 'fou-lafarge',
    fournisseurNom: 'Lafarge Ciments Algérie Spa',
    statut: 'Reçu totalement',
    dateCommande: '2026-05-02T10:00:00Z',
    magasinDestinationId: 'mag-alg',
    createdById: 'usr-ach',
    createdByNom: 'Kamel Achat',
    totalHT: 425000,
    tva: 80750,
    totalTTC: 505750,
    lignes: [
      { articleId: 'art-ciment', designation: 'Ciment Gris Lafarge CPJ-CEM II 42.5N', quantite: 500, quantiteRecue: 500, prixUnitaire: 850 }
    ]
  },
  {
    id: 'cmd-2',
    code: 'BC-2026-002',
    fournisseurId: 'fou-batipro',
    fournisseurNom: 'Sarl BatiPro Distribution',
    statut: 'Commandé',
    dateCommande: '2026-05-18T14:00:00Z',
    magasinDestinationId: 'mag-orn',
    createdById: 'usr-ach',
    createdByNom: 'Kamel Achat',
    totalHT: 375000,
    tva: 71250,
    totalTTC: 446250,
    lignes: [
      { articleId: 'art-fer12', designation: 'Rond à Béton FE E500 Ø12mm', quantite: 300, quantiteRecue: 0, prixUnitaire: 1250 }
    ]
  },
  {
    id: 'cmd-3',
    code: 'BC-2026-003',
    fournisseurId: 'fou-quincaillerie',
    fournisseurNom: 'Ets Benabderrahmane Outillage',
    statut: 'Brouillon',
    dateCommande: '2026-05-20T16:00:00Z',
    magasinDestinationId: 'mag-alg',
    createdById: 'usr-ach',
    createdByNom: 'Kamel Achat',
    totalHT: 58000,
    tva: 11020,
    totalTTC: 69020,
    lignes: [
      { articleId: 'art-perceuse', designation: 'Perceuse à Percussion Bosch GSB 13 RE 650W', quantite: 4, quantiteRecue: 0, prixUnitaire: 14500 }
    ]
  }
];

const DEFAULT_RECEPTIONS: Reception[] = [
  {
    id: 'rec-1',
    code: 'BR-2026-001',
    commandeId: 'cmd-1',
    commandeCode: 'BC-2026-001',
    magasinId: 'mag-alg',
    magasinNom: 'Magasin Central - Alger',
    dateReception: '2026-05-10T11:00:00Z',
    bonLivraisonRef: 'BL-992834',
    factureFournisseurRef: 'FAC-2026-044',
    magasinierId: 'usr-mag-alg',
    magasinierNom: 'Rachid Magasiner',
    statut: 'Validée',
    lignes: [
      { articleId: 'art-ciment', designation: 'Ciment Gris Lafarge CPJ-CEM II 42.5N', quantiteDemandee: 500, quantiteRecue: 500 }
    ]
  }
];

const DEFAULT_AFFECTATIONS: Affectation[] = [
  {
    id: 'aff-1',
    code: 'BS-2026-001',
    employeId: 'emp-1',
    employeNom: 'Mustapha Loucif',
    chantierId: 'cha-100log',
    chantierNom: 'Chantier 100 Logements LPP - Alger (Reghaïa)',
    magasinId: 'mag-alg',
    magasinNom: 'Magasin Central - Alger',
    dateAffectation: '2026-05-12T14:30:00Z',
    articleId: 'art-ciment',
    articleDesignation: 'Ciment Gris Lafarge CPJ-CEM II 42.5N',
    quantite: 50,
    motif: 'Coulage dalle rez-de-chaussée Bloc C',
    statut: 'Affecté',
    magasinierNom: 'Rachid Magasiner'
  },
  {
    id: 'aff-2',
    code: 'BS-2026-002',
    employeId: 'emp-2',
    employeNom: 'Yacine Mezouar',
    chantierId: 'cha-100log',
    chantierNom: 'Chantier 100 Logements LPP - Alger (Reghaïa)',
    magasinId: 'mag-alg',
    magasinNom: 'Magasin Central - Alger',
    dateAffectation: '2026-05-13T09:15:00Z',
    articleId: 'art-perceuse',
    articleDesignation: 'Perceuse à Percussion Bosch GSB 13 RE 650W',
    quantite: 1,
    motif: 'Pose de goulottes et tableaux électriques',
    statut: 'Affecté',
    magasinierNom: 'Rachid Magasiner'
  }
];

const DEFAULT_TRANSFERTS: Transfert[] = [
  {
    id: 'tr-1',
    code: 'TR-2026-001',
    magasinDepartId: 'mag-alg',
    magasinDepartNom: 'Magasin Central - Alger',
    magasinDestId: 'mag-orn',
    magasinDestNom: 'Magasin Régional - Oran',
    statut: 'Reçu',
    dateDemande: '2026-05-13T10:00:00Z',
    dateExpedition: '2026-05-14T09:00:00Z',
    dateReception: '2026-05-15T10:00:00Z',
    demandeurNom: 'Yassine Magasiner',
    valideurNom: 'Rachid Magasiner',
    receveurNom: 'Yassine Magasiner',
    motif: 'Dépannage urgent en fers à béton Ø12 pour le chantier de l\'aéroport',
    lignes: [
      { articleId: 'art-fer12', designation: 'Rond à Béton FE E500 Ø12mm', quantite: 100 }
    ]
  },
  {
    id: 'tr-2',
    code: 'TR-2026-002',
    magasinDepartId: 'mag-alg',
    magasinDepartNom: 'Magasin Central - Alger',
    magasinDestId: 'mag-cst',
    magasinDestNom: 'Magasin Est - Constantine',
    statut: 'Expédié',
    dateDemande: '2026-05-20T11:00:00Z',
    dateExpedition: '2026-05-21T08:30:00Z',
    demandeurNom: 'Sofiane Bati',
    valideurNom: 'Rachid Magasiner',
    motif: 'Stock de sécurité peinture épuisé à Constantine',
    lignes: [
      { articleId: 'art-peinture', designation: 'Peinture Murale Astral Blanche Mat', quantite: 10 }
    ]
  }
];

const DEFAULT_FACTURES: Facture[] = [
  {
    id: 'fac-1',
    code: 'FAC-2026-044',
    fournisseurId: 'fou-lafarge',
    fournisseurNom: 'Lafarge Ciments Algérie Spa',
    commandeId: 'cmd-1',
    commandeCode: 'BC-2026-001',
    receptionId: 'rec-1',
    receptionCode: 'BR-2026-001',
    dateFacture: '2026-05-10T11:00:00Z',
    montantHT: 425000,
    montantTVA: 80750,
    montantTTC: 505750,
    soldeRestant: 205750,
    statut: 'Partiellement payée'
  }
];

const DEFAULT_PAIEMENTS: Paiement[] = [
  {
    id: 'pay-1',
    code: 'REG-2026-001',
    fournisseurId: 'fou-lafarge',
    fournisseurNom: 'Lafarge Ciments Algérie Spa',
    factureId: 'fac-1',
    factureRef: 'FAC-2026-044',
    lettre: true,
    montant: 300000,
    datePaiement: '2026-05-15T14:30:00Z',
    mode: 'Virement',
    referenceTransaction: 'VIR-9982430129-BNA',
    comptableNom: 'Amine Finance',
    note: 'Acompte facture FAC-2026-044'
  }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  { id: 'aud-1', userId: 'usr-ach', userNom: 'Kamel Achat', userRole: 'achat', action: 'Création du bon de commande BC-2026-001', table: 'bons_commande', recordId: 'cmd-1', dateAction: '2026-05-02T10:00:00Z' },
  { id: 'aud-2', userId: 'usr-mag-alg', userNom: 'Rachid Magasiner', userRole: 'magasinier', action: 'Réception marchandise BR-2026-001 pour BC-2026-001', table: 'receptions', recordId: 'rec-1', dateAction: '2026-05-10T11:00:00Z' },
  { id: 'aud-3', userId: 'usr-mag-alg', userNom: 'Rachid Magasiner', userRole: 'magasinier', action: 'Affectation outillage BS-2026-002 à Yacine Mezouar', table: 'affectations', recordId: 'aff-2', dateAction: '2026-05-13T09:15:00Z' },
  { id: 'aud-4', userId: 'usr-compt', userNom: 'Amine Finance', userRole: 'comptabilite', action: 'Enregistrement règlement REG-2026-001 pour Lafarge', table: 'paiements', recordId: 'pay-1', dateAction: '2026-05-15T14:30:00Z' }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: 'not-1', titre: 'Alerte Stock Faible', message: 'Le stock de Fer à béton Ø12 au Magasin d\'Alger est en dessous du minimum (80/150).', type: 'warning', lu: false, dateNotification: '2026-05-19T08:00:00Z' },
  { id: 'not-2', titre: 'Demande de Transfert Réceptionnée', message: 'Le transfert TR-2026-001 a été validé et reçu avec succès au magasin d\'Oran.', type: 'success', lu: true, dateNotification: '2026-05-15T10:05:00Z' },
  { id: 'not-3', titre: 'Nouvelle Commande à Réceptionner', message: 'Le bon de commande BC-2026-002 a été envoyé au fournisseur BatiPro pour le Magasin d\'Oran.', type: 'info', lu: false, dateNotification: '2026-05-18T14:15:00Z' }
];

// Database Manager
export class MockDatabase {
  private static get<T>(key: string, defaultValue: T[]): T[] {
    if (typeof window === 'undefined') return defaultValue;
    const data = localStorage.getItem(`bgm_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  }

  private static set<T>(key: string, value: T[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`bgm_${key}`, JSON.stringify(value));
    }
  }

  // --- Current User Management ---
  static getCurrentUser(): UserProfile {
    if (typeof window === 'undefined') return MOCK_USERS[0];
    const user = localStorage.getItem('bgm_current_user');
    return user ? JSON.parse(user) : MOCK_USERS[0]; // Defaults to Direction
  }

  static setCurrentUser(user: UserProfile): void {
    localStorage.setItem('bgm_current_user', JSON.stringify(user));
    this.logAction(user.id, user.name, user.role, `Connexion de l'utilisateur ${user.name}`, 'auth', user.id);
  }

  static authenticateUser(email: string, password: string): UserProfile | null {
    const allUsers = [...MOCK_USERS, ...this.getUsers().filter(u => !MOCK_USERS.some(m => m.id === u.id))];
    const user = allUsers.find(u => u.email === email && u.password === password && u.actif);
    if (user) {
      this.setCurrentUser(user);
      localStorage.setItem('bgm_authenticated', 'true');
      return user;
    }
    return null;
  }

  static isAuthenticated(): boolean {
    return localStorage.getItem('bgm_authenticated') === 'true';
  }

  static logout(): void {
    localStorage.removeItem('bgm_authenticated');
    localStorage.removeItem('bgm_current_user');
  }

  // --- CRUD Utilisateurs ---
  static getUsers(): UserProfile[] {
    return this.get<UserProfile>('users', MOCK_USERS);
  }

  static saveUser(user: Partial<UserProfile>): UserProfile {
    const list = this.getUsers();
    const currentUser = this.getCurrentUser();
    let result: UserProfile;

    if (user.role === 'magasinier' && !user.magasinId) {
      throw new Error('Un magasinier doit obligatoirement avoir un magasin affecté.');
    }

    if (user.id) {
      const idx = list.findIndex(u => u.id === user.id);
      if (idx === -1) throw new Error('Utilisateur non trouvé');
      const old = list[idx];
      result = { ...old, ...user } as UserProfile;
      list[idx] = result;
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Modification de l'utilisateur ${result.name}`, 'users', result.id, old, result);
      
      // Update current session user if they edited their own profile
      if (result.id === currentUser.id) {
        localStorage.setItem('bgm_current_user', JSON.stringify(result));
      }
    } else {
      // Check for duplicate email
      if (list.some(u => u.email === user.email)) {
        throw new Error(`L'adresse email ${user.email} est déjà utilisée par un autre compte.`);
      }
      result = {
        ...user,
        id: genId('usr'),
        actif: true,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id
      } as UserProfile;
      list.push(result);
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Création de l'utilisateur ${result.name} (${result.role})`, 'users', result.id, null, result);
      this.pushNotification(
        'Nouvel Utilisateur Créé',
        `Le compte de ${result.name} (${result.role}) a été créé avec succès.`,
        'success'
      );
    }
    this.set('users', list);
    return result;
  }

  static toggleUserActif(userId: string): UserProfile {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('Utilisateur non trouvé');
    const currentUser = this.getCurrentUser();
    
    // Prevent self-suspension
    if (userId === currentUser.id) {
      throw new Error('Vous ne pouvez pas suspendre votre propre compte en cours de session.');
    }

    const old = list[idx];
    const updated: UserProfile = { ...old, actif: !old.actif };
    list[idx] = updated;
    this.set('users', list);
    const action = updated.actif ? 'Activation' : 'Désactivation';
    this.logAction(currentUser.id, currentUser.name, currentUser.role, `${action} du compte utilisateur ${updated.name}`, 'users', updated.id, old, updated);
    this.pushNotification(
      `Compte ${updated.actif ? 'Activé' : 'Désactivé'}`,
      `Le compte de ${updated.name} a été ${updated.actif ? 'réactivé' : 'désactivé'}.`,
      updated.actif ? 'success' : 'warning'
    );
    return updated;
  }

  static deleteUser(userId: string): void {
    const list = this.getUsers();
    const user = list.find(u => u.id === userId);
    if (!user) throw new Error('Utilisateur non trouvé');
    const currentUser = this.getCurrentUser();
    
    // Prevent self-deletion
    if (userId === currentUser.id) {
      throw new Error('Vous ne pouvez pas supprimer votre propre compte en cours de session.');
    }

    if (user.role === 'direction' && list.filter(u => u.role === 'direction' && u.actif).length <= 1) {
      throw new Error('Impossible de supprimer le dernier administrateur Directeur actif.');
    }
    const updated = list.filter(u => u.id !== userId);
    this.set('users', updated);
    this.logAction(currentUser.id, currentUser.name, currentUser.role, `Suppression du compte utilisateur ${user.name}`, 'users', userId, user, null);
  }

  // --- Password Management ---
  static resetUserPassword(userId: string, newPassword?: string): string {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('Utilisateur non trouvé');
    const currentUser = this.getCurrentUser();

    // Prevent self-reset without explicit consent
    if (userId === currentUser.id) {
      throw new Error('Utilisez votre profil pour modifier votre propre mot de passe.');
    }

    const old = list[idx];
    const generated = newPassword || `tmp-${Math.random().toString(36).slice(2,10)}`;
    const updated: UserProfile = { ...old, password: generated };
    list[idx] = updated;
    this.set('users', list);

    this.logAction(currentUser.id, currentUser.name, currentUser.role, `Réinitialisation du mot de passe pour ${old.name}`, 'users', old.id, { password: '***' }, { password: '***' });

    this.pushNotification(
      'Mot de passe réinitialisé',
      `Le mot de passe de ${old.name} a été réinitialisé par ${currentUser.name}.`,
      'info'
    );

    return generated;
  }

  // --- Audit Log Utility ---
  static logAction(userId: string, userNom: string, userRole: UserRole, action: string, table: string, recordId: string, oldVal?: unknown, newVal?: unknown) {
    const logs = this.get<AuditLog>('audit_logs', DEFAULT_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: genId('aud'),
      userId,
      userNom,
      userRole,
      action,
      table,
      recordId,
      ancienneValeur: oldVal ? JSON.stringify(oldVal) : undefined,
      nouvelleValeur: newVal ? JSON.stringify(newVal) : undefined,
      dateAction: new Date().toISOString()
    };
    this.set('audit_logs', [newLog, ...logs]);
  }

  static getAuditLogs(): AuditLog[] {
    return this.get<AuditLog>('audit_logs', DEFAULT_AUDIT_LOGS);
  }

  // --- Notifications Utility ---
  static pushNotification(titre: string, message: string, type: 'info' | 'warning' | 'success' | 'danger') {
    const notifs = this.get<Notification>('notifications', DEFAULT_NOTIFICATIONS);
    const newNotif: Notification = {
      id: genId('not'),
      titre,
      message,
      type,
      lu: false,
      dateNotification: new Date().toISOString()
    };
    this.set('notifications', [newNotif, ...notifs]);
  }

  // --- CRUD Magasins ---
  static getMagasins(): Magasin[] {
    return this.get<Magasin>('magasins', DEFAULT_MAGASINS);
  }

  static saveMagasin(magasin: Partial<Magasin>): Magasin {
    const list = this.getMagasins();
    const currentUser = this.getCurrentUser();
    let result: Magasin;

    if (magasin.id) {
      const idx = list.findIndex(m => m.id === magasin.id);
      const old = list[idx];
      result = { ...old, ...magasin } as Magasin;
      list[idx] = result;
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Modification du magasin ${result.nom}`, 'magasins', result.id, old, result);
    } else {
      result = {
        ...magasin,
        id: genId('mag'),
        actif: true,
        createdAt: new Date().toISOString()
      } as Magasin;
      list.push(result);
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Création du magasin ${result.nom}`, 'magasins', result.id, null, result);
      
      // Initialize zero stocks for new magasin
      const articles = this.getArticles();
      const stocks = this.getStocks();
      articles.forEach(art => {
        stocks.push({
          id: genId('stk'),
          magasinId: result.id,
          articleId: art.id,
          quantite: 0
        });
      });
      this.set('stocks', stocks);
    }
    this.set('magasins', list);
    return result;
  }

  // --- CRUD Articles ---
  static getArticles(): Article[] {
    return this.get<Article>('articles', DEFAULT_ARTICLES);
  }

  static saveArticle(article: Partial<Article>): Article {
    const list = this.getArticles();
    const currentUser = this.getCurrentUser();
    let result: Article;

    if (article.id) {
      const idx = list.findIndex(a => a.id === article.id);
      const old = list[idx];
      result = { ...old, ...article } as Article;
      list[idx] = result;
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Modification de l'article ${result.designation}`, 'articles', result.id, old, result);
    } else {
      result = {
        ...article,
        id: genId('art'),
        qrCode: article.reference,
        createdAt: new Date().toISOString()
      } as Article;
      list.push(result);
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Ajout de l'article ${result.designation}`, 'articles', result.id, null, result);

      // Create initial stock entries of 0 for this article across all stores
      const magasins = this.getMagasins();
      const stocks = this.getStocks();
      magasins.forEach(mag => {
        stocks.push({
          id: genId('stk'),
          magasinId: mag.id,
          articleId: result.id,
          quantite: 0
        });
      });
      this.set('stocks', stocks);
    }
    this.set('articles', list);
    return result;
  }

  // --- CRUD Fournisseurs ---
  static getFournisseurs(): Fournisseur[] {
    return this.get<Fournisseur>('fournisseurs', DEFAULT_FOURNISSEURS);
  }

  static saveFournisseur(fournisseur: Partial<Fournisseur>): Fournisseur {
    const list = this.getFournisseurs();
    const currentUser = this.getCurrentUser();
    let result: Fournisseur;

    if (fournisseur.id) {
      const idx = list.findIndex(f => f.id === fournisseur.id);
      const old = list[idx];
      result = { ...old, ...fournisseur } as Fournisseur;
      list[idx] = result;
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Modification du fournisseur ${result.nomSociete}`, 'fournisseurs', result.id, old, result);
    } else {
      result = {
        ...fournisseur,
        id: genId('fou'),
        solde: 0,
        createdAt: new Date().toISOString()
      } as Fournisseur;
      list.push(result);
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Ajout du fournisseur ${result.nomSociete}`, 'fournisseurs', result.id, null, result);
    }
    this.set('fournisseurs', list);
    return result;
  }

  // --- CRUD Employes & Chantiers ---
  static getEmployes(): Employe[] {
    return this.get<Employe>('employes', DEFAULT_EMPLOYES);
  }

  static saveEmploye(employe: Partial<Employe>): Employe {
    const list = this.getEmployes();
    const currentUser = this.getCurrentUser();
    let result: Employe;

    if (employe.id) {
      const idx = list.findIndex(e => e.id === employe.id);
      const old = list[idx];
      result = { ...old, ...employe } as Employe;
      list[idx] = result;
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Modification de l'employé ${result.nom}`, 'employes', result.id, old, result);
    } else {
      result = {
        ...employe,
        id: genId('emp')
      } as Employe;
      list.push(result);
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Création de l'employé ${result.nom}`, 'employes', result.id, null, result);
    }
    this.set('employes', list);
    return result;
  }

  static getChantiers(): Chantier[] {
    return this.get<Chantier>('chantiers', DEFAULT_CHANTIERS);
  }

  static saveChantier(chantier: Partial<Chantier>): Chantier {
    const list = this.getChantiers();
    const currentUser = this.getCurrentUser();
    let result: Chantier;

    if (chantier.id) {
      const idx = list.findIndex(c => c.id === chantier.id);
      const old = list[idx];
      result = { ...old, ...chantier } as Chantier;
      list[idx] = result;
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Modification du chantier ${result.nom}`, 'chantiers', result.id, old, result);
    } else {
      result = {
        ...chantier,
        id: genId('cha'),
        actif: true
      } as Chantier;
      list.push(result);
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Création du chantier ${result.nom}`, 'chantiers', result.id, null, result);
    }
    this.set('chantiers', list);
    return result;
  }

  // --- Stocks & Movements Management ---
  static getStocks(): StockItem[] {
    return this.get<StockItem>('stocks', DEFAULT_STOCKS);
  }

  static getMouvementsStock(): MouvementStock[] {
    return this.get<MouvementStock>('mouvements_stock', DEFAULT_MOUVEMENTS);
  }

  static updateStock(magasinId: string, articleId: string, deltaQuantite: number, type: MouvementType, refDoc: string, note?: string) {
    const stocks = this.getStocks();
    const idx = stocks.findIndex(s => s.magasinId === magasinId && s.articleId === articleId);
    const currentUser = this.getCurrentUser();

    const article = this.getArticles().find(a => a.id === articleId);
    const magasin = this.getMagasins().find(m => m.id === magasinId);

    if (!article || !magasin) return;

    if (idx !== -1) {
      stocks[idx].quantite += deltaQuantite;
    } else {
      stocks.push({
        id: genId('stk'),
        magasinId,
        articleId,
        quantite: deltaQuantite
      });
    }

    const currentQty = (idx !== -1) ? stocks[idx].quantite : deltaQuantite;

    this.set('stocks', stocks);

    // Save movements log
    const movements = this.getMouvementsStock();
    const movement: MouvementStock = {
      id: genId('mov'),
      magasinId,
      magasinNom: magasin.nom,
      articleId,
      articleDesignation: article.designation,
      type,
      quantite: deltaQuantite,
      referenceDoc: refDoc,
      dateMouvement: new Date().toISOString(),
      note,
      utilisateurNom: currentUser.name
    };
    this.set('mouvements_stock', [movement, ...movements]);

    // Check low stock warning
    if (currentQty < article.stockMinimum) {
      this.pushNotification(
        'Alerte Stock Faible',
        `Le stock de ${article.designation} au ${magasin.nom} est de ${currentQty} ${article.unite} (minimum requis: ${article.stockMinimum}).`,
        'warning'
      );
    }
  }

  // --- Purchases / Commandes Management ---
  static getCommandes(): BonCommande[] {
    return this.get<BonCommande>('commandes', DEFAULT_COMMANDES);
  }

  static saveCommande(commande: Partial<BonCommande>): BonCommande {
    const list = this.getCommandes();
    const currentUser = this.getCurrentUser();
    let result: BonCommande;

    const fournisseur = this.getFournisseurs().find(f => f.id === commande.fournisseurId);

    // Compute Totals
    const lines = commande.lignes || [];
    const totalHT = lines.reduce((acc, l) => acc + (l.quantite * l.prixUnitaire), 0);
    const tva = totalHT * 0.19; // Standard Algerian TVA is 19%
    const totalTTC = totalHT + tva;

    if (commande.id) {
      const idx = list.findIndex(c => c.id === commande.id);
      const old = list[idx];
      result = { 
        ...old, 
        ...commande,
        totalHT,
        tva,
        totalTTC
      } as BonCommande;
      list[idx] = result;
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Modification du bon de commande ${result.code}`, 'bons_commande', result.id, old, result);
    } else {
      const count = list.length + 1;
      const code = `BC-2026-${String(count).padStart(3, '0')}`;
      result = {
        ...commande,
        id: genId('cmd'),
        code,
        fournisseurNom: fournisseur?.nomSociete || 'Fournisseur inconnu',
        statut: 'Brouillon',
        dateCommande: new Date().toISOString(),
        createdById: currentUser.id,
        createdByNom: currentUser.name,
        totalHT,
        tva,
        totalTTC,
        lignes: lines.map(l => ({ ...l, quantiteRecue: 0 }))
      } as BonCommande;
      list.push(result);
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Création du bon de commande ${result.code}`, 'bons_commande', result.id, null, result);
    }
    this.set('commandes', list);
    return result;
  }

  static transitionCommandeStatut(commandeId: string, newStatut: CommandeStatus): BonCommande {
    const list = this.getCommandes();
    const idx = list.findIndex(c => c.id === commandeId);
    if (idx === -1) throw new Error('Commande non trouvée');

    const old = list[idx];
    const currentUser = this.getCurrentUser();
    
    // When PO transitions to Validé, we alert
    if (newStatut === 'Validé') {
      this.pushNotification(
        'Commande Validée',
        `Le bon de commande ${old.code} a été validé par la direction. Prêt à être envoyé au fournisseur.`,
        'success'
      );
    }

    // When PO transitions to Commandé, we alert
    if (newStatut === 'Commandé') {
      this.pushNotification(
        'Commande Envoyée',
        `Le bon de commande ${old.code} a été passé auprès du fournisseur ${old.fournisseurNom}.`,
        'info'
      );

      // Increase Supplier balance/debt by totalTTC
      const fournisseurs = this.getFournisseurs();
      const fIdx = fournisseurs.findIndex(f => f.id === old.fournisseurId);
      if (fIdx !== -1) {
        fournisseurs[fIdx].solde += old.totalTTC;
        this.set('fournisseurs', fournisseurs);
      }
    }

    const updated = { ...old, statut: newStatut };
    list[idx] = updated;
    this.set('commandes', list);

    this.logAction(currentUser.id, currentUser.name, currentUser.role, `Changement statut commande ${old.code} vers ${newStatut}`, 'bons_commande', old.id, old, updated);
    return updated;
  }

  // --- Goods Reception (Réception Marchandises) ---
  static getReceptions(): Reception[] {
    return this.get<Reception>('receptions', DEFAULT_RECEPTIONS);
  }

  static receiveGoods(commandeId: string, deliveryRef: string, invoiceRef: string | undefined, lines: { articleId: string; quantiteRecue: number }[], scanDetails?: string): Reception {
    const listReceptions = this.getReceptions();
    const listCommandes = this.getCommandes();
    const cIdx = listCommandes.findIndex(c => c.id === commandeId);
    if (cIdx === -1) throw new Error('Commande non trouvée');

    const commande = listCommandes[cIdx];
    const currentUser = this.getCurrentUser();
    const magasin = this.getMagasins().find(m => m.id === commande.magasinDestinationId);

    const count = listReceptions.length + 1;
    const code = `BR-2026-${String(count).padStart(3, '0')}`;

    const receptionLignes: ReceptionLigne[] = [];

    // Process each line, updating PO quantities received and stocks
    const updatedLines = commande.lignes.map(poLine => {
      const match = lines.find(l => l.articleId === poLine.articleId);
      const qtyRecueThisTime = match ? match.quantiteRecue : 0;
      
      if (qtyRecueThisTime > 0) {
        // Increase stocks
        this.updateStock(
          commande.magasinDestinationId,
          poLine.articleId,
          qtyRecueThisTime,
          'ENTREE_ACHAT',
          commande.code,
          `Réception Marchandise via ${code}`
        );

        receptionLignes.push({
          articleId: poLine.articleId,
          designation: poLine.designation,
          quantiteDemandee: poLine.quantite,
          quantiteRecue: qtyRecueThisTime
        });
      }

      return {
        ...poLine,
        quantiteRecue: poLine.quantiteRecue + qtyRecueThisTime
      };
    });

    // Check if fully received
    const allReceived = updatedLines.every(l => l.quantiteRecue >= l.quantite);
    const partiallyReceived = updatedLines.some(l => l.quantiteRecue > 0);
    const newStatus: CommandeStatus = allReceived ? 'Reçu totalement' : (partiallyReceived ? 'Reçu partiellement' : 'Commandé');

    listCommandes[cIdx] = {
      ...commande,
      lignes: updatedLines,
      statut: newStatus
    };
    this.set('commandes', listCommandes);

    const reception: Reception = {
      id: genId('rec'),
      code,
      commandeId,
      commandeCode: commande.code,
      magasinId: commande.magasinDestinationId,
      magasinNom: magasin?.nom || 'Magasin inconnu',
      dateReception: new Date().toISOString(),
      bonLivraisonRef: deliveryRef,
      factureFournisseurRef: invoiceRef,
      lignes: receptionLignes,
      scanDetails,
      magasinierId: currentUser.id,
      magasinierNom: currentUser.name,
      statut: 'Brouillon'
    };

    listReceptions.push(reception);
    this.set('receptions', listReceptions);

    // Auto-generate invoice if invoice reference is provided
    if (invoiceRef && invoiceRef.trim() !== '') {
      const receptionHT = lines.reduce((acc, matchLine) => {
        const poLine = commande.lignes.find(l => l.articleId === matchLine.articleId);
        return acc + (poLine ? (poLine.prixUnitaire * matchLine.quantiteRecue) : 0);
      }, 0);
      const receptionTVA = receptionHT * 0.19;
      const receptionTTC = receptionHT + receptionTVA;

      const factures = this.getFactures();
      const newFacture: Facture = {
        id: genId('fac'),
        code: invoiceRef.trim(),
        fournisseurId: commande.fournisseurId,
        fournisseurNom: commande.fournisseurNom,
        commandeId: commande.id,
        commandeCode: commande.code,
        receptionId: reception.id,
        receptionCode: reception.code,
        dateFacture: new Date().toISOString(),
        montantHT: receptionHT,
        montantTVA: receptionTVA,
        montantTTC: receptionTTC,
        soldeRestant: receptionTTC,
        statut: 'Non payée'
      };
      factures.push(newFacture);
      this.set('factures', factures);
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Génération automatique de la facture d'achat ${newFacture.code} pour réception ${reception.code}`, 'factures', newFacture.id, null, newFacture);
    }

    this.pushNotification(
      'Réception Marchandise',
      `Le bon de réception ${code} a été enregistré pour la commande ${commande.code} au ${magasin?.nom}.`,
      'success'
    );

    this.logAction(currentUser.id, currentUser.name, currentUser.role, `Enregistrement de la réception ${code} pour commande ${commande.code}`, 'receptions', reception.id, null, reception);
    return reception;
  }

  // --- Material Allocations (Affectations aux employés/chantiers) ---
  static getAffectations(): Affectation[] {
    return this.get<Affectation>('affectations', DEFAULT_AFFECTATIONS);
  }

  static createAffectation(employeId: string, chantierId: string, magasinId: string, articleId: string, quantite: number, motif: string): Affectation {
    const list = this.getAffectations();
    const currentUser = this.getCurrentUser();
    
    // Safety check: Stock availability
    const stocks = this.getStocks();
    const stock = stocks.find(s => s.magasinId === magasinId && s.articleId === articleId);
    if (!stock || stock.quantite < quantite) {
      throw new Error(`Stock insuffisant. Disponible : ${stock ? stock.quantite : 0}`);
    }

    const employe = this.getEmployes().find(e => e.id === employeId);
    const chantier = this.getChantiers().find(c => c.id === chantierId);
    const article = this.getArticles().find(a => a.id === articleId);
    const magasin = this.getMagasins().find(m => m.id === magasinId);

    const count = list.length + 1;
    const code = `BS-2026-${String(count).padStart(3, '0')}`;

    const affectation: Affectation = {
      id: genId('aff'),
      code,
      employeId,
      employeNom: employe?.nom || 'Employé inconnu',
      chantierId,
      chantierNom: chantier?.nom || 'Chantier inconnu',
      magasinId,
      magasinNom: magasin?.nom || 'Magasin inconnu',
      dateAffectation: new Date().toISOString(),
      articleId,
      articleDesignation: article?.designation || 'Article inconnu',
      quantite,
      motif,
      statut: 'Affecté',
      magasinierNom: currentUser.name
    };

    // Deduct Stock and record movement
    this.updateStock(
      magasinId,
      articleId,
      -quantite,
      'SORTIE_AFFECTATION',
      code,
      `Affectation à ${employe?.nom} (${chantier?.nom})`
    );

    list.push(affectation);
    this.set('affectations', list);

    this.pushNotification(
      'Matériel Affecté',
      `Bon de sortie ${code} créé : ${quantite} ${article?.unite} de ${article?.designation} affecté(s) à ${employe?.nom}.`,
      'info'
    );

    this.logAction(currentUser.id, currentUser.name, currentUser.role, `Création affectation ${code} pour ${employe?.nom}`, 'affectations', affectation.id, null, affectation);
    return affectation;
  }

  static returnAffectation(affectationId: string, quantiteRetournee: number): Affectation {
    const list = this.getAffectations();
    const idx = list.findIndex(a => a.id === affectationId);
    if (idx === -1) throw new Error('Affectation non trouvée');

    const aff = list[idx];
    if (aff.statut === 'Retourné') throw new Error('Matériel déjà retourné');

    const currentUser = this.getCurrentUser();

    // Re-introduce Stock
    this.updateStock(
      aff.magasinId,
      aff.articleId,
      quantiteRetournee,
      'CORRECTION_INVENTAIRE',
      aff.code,
      `Retour de matériel par ${aff.employeNom}`
    );

    const updated: Affectation = {
      ...aff,
      statut: 'Retourné',
      dateRetour: new Date().toISOString(),
      motif: `${aff.motif} (Retourné ${quantiteRetournee} unités)`
    };

    list[idx] = updated;
    this.set('affectations', list);

    this.pushNotification(
      'Matériel Retourné',
      `${aff.employeNom} a retourné ${quantiteRetournee} unités de ${aff.articleDesignation}.`,
      'success'
    );

    this.logAction(currentUser.id, currentUser.name, currentUser.role, `Retour de matériel pour l'affectation ${aff.code}`, 'affectations', aff.id, aff, updated);
    return updated;
  }

  // --- Inter-Store Transfers (Transferts Inter-Magasins) ---
  static getTransferts(): Transfert[] {
    return this.get<Transfert>('transferts', DEFAULT_TRANSFERTS);
  }

  static createTransfertRequest(magDepartId: string, magDestId: string, lignes: TransfertLigne[], motif: string): Transfert {
    const list = this.getTransferts();
    const currentUser = this.getCurrentUser();

    const magDepart = this.getMagasins().find(m => m.id === magDepartId);
    const magDest = this.getMagasins().find(m => m.id === magDestId);

    const count = list.length + 1;
    const code = `TR-2026-${String(count).padStart(3, '0')}`;

    const transfert: Transfert = {
      id: genId('tr'),
      code,
      magasinDepartId: magDepartId,
      magasinDepartNom: magDepart?.nom || 'Magasin Départ',
      magasinDestId: magDestId,
      magasinDestNom: magDest?.nom || 'Magasin Destination',
      statut: 'Demande',
      dateDemande: new Date().toISOString(),
      lignes,
      demandeurNom: currentUser.name,
      motif
    };

    list.push(transfert);
    this.set('transferts', list);

    this.pushNotification(
      'Demande de Transfert',
      `Nouvelle demande de transfert ${code} initiée de ${magDepart?.nom} vers ${magDest?.nom}.`,
      'info'
    );

    this.logAction(currentUser.id, currentUser.name, currentUser.role, `Création demande de transfert ${code}`, 'transferts', transfert.id, null, transfert);
    return transfert;
  }

  static expedierTransfert(transfertId: string): Transfert {
    const list = this.getTransferts();
    const idx = list.findIndex(t => t.id === transfertId);
    if (idx === -1) throw new Error('Transfert non trouvé');

    const tr = list[idx];
    if (tr.statut !== 'Demande') throw new Error('Le transfert ne peut pas être expédié dans cet état');

    const currentUser = this.getCurrentUser();

    // Check stock availability at department store and deduct it
    const stocks = this.getStocks();
    tr.lignes.forEach(ligne => {
      const stock = stocks.find(s => s.magasinId === tr.magasinDepartId && s.articleId === ligne.articleId);
      if (!stock || stock.quantite < ligne.quantite) {
        throw new Error(`Stock insuffisant pour ${ligne.designation} au magasin de départ.`);
      }
    });

    // Deduct from departing store
    tr.lignes.forEach(ligne => {
      this.updateStock(
        tr.magasinDepartId,
        ligne.articleId,
        -ligne.quantite,
        'SORTIE_TRANSFERT',
        tr.code,
        `Expédition transfert vers ${tr.magasinDestNom}`
      );
    });

    const updated: Transfert = {
      ...tr,
      statut: 'Expédié',
      dateExpedition: new Date().toISOString(),
      valideurNom: currentUser.name
    };

    list[idx] = updated;
    this.set('transferts', list);

    this.pushNotification(
      'Transfert Expédié',
      `Le transfert ${tr.code} a été expédié de ${tr.magasinDepartNom}. En attente de réception.`,
      'info'
    );

    this.logAction(currentUser.id, currentUser.name, currentUser.role, `Expédition du transfert ${tr.code}`, 'transferts', tr.id, tr, updated);
    return updated;
  }

  static recevoirTransfert(transfertId: string): Transfert {
    const list = this.getTransferts();
    const idx = list.findIndex(t => t.id === transfertId);
    if (idx === -1) throw new Error('Transfert non trouvé');

    const tr = list[idx];
    if (tr.statut !== 'Expédié') throw new Error('Le transfert doit être au statut Expédié pour être réceptionné');

    const currentUser = this.getCurrentUser();

    // Add stock to destination store
    tr.lignes.forEach(ligne => {
      this.updateStock(
        tr.magasinDestId,
        ligne.articleId,
        ligne.quantite,
        'ENTREE_TRANSFERT',
        tr.code,
        `Réception transfert depuis ${tr.magasinDepartNom}`
      );
    });

    const updated: Transfert = {
      ...tr,
      statut: 'Reçu',
      dateReception: new Date().toISOString(),
      receveurNom: currentUser.name
    };

    list[idx] = updated;
    this.set('transferts', list);

    this.pushNotification(
      'Transfert Réceptionné',
      `Le transfert ${tr.code} a été réceptionné avec succès au magasin ${tr.magasinDestNom}.`,
      'success'
    );

    this.logAction(currentUser.id, currentUser.name, currentUser.role, `Réception du transfert ${tr.code}`, 'transferts', tr.id, tr, updated);
    return updated;
  }

  // --- Financials / Payments Management ---
  static getPaiements(): Paiement[] {
    return this.get<Paiement>('paiements', DEFAULT_PAIEMENTS);
  }

  // --- Factures / Invoices Operations ---
  static getFactures(): Facture[] {
    return this.get<Facture>('factures', DEFAULT_FACTURES);
  }

  static saveFacture(facture: Partial<Facture>): Facture {
    const list = this.getFactures();
    const currentUser = this.getCurrentUser();
    let result: Facture;

    if (facture.id) {
      const idx = list.findIndex(f => f.id === facture.id);
      const old = list[idx];
      result = { ...old, ...facture } as Facture;
      list[idx] = result;
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Modification de la facture ${result.code}`, 'factures', result.id, old, result);
    } else {
      const count = list.length + 1;
      const code = facture.code || `FAC-2026-${String(count).padStart(3, '0')}`;
      
      const montantHT = facture.montantHT || 0;
      const montantTTC = facture.montantTTC || (montantHT * 1.19);
      const soldeRestant = facture.soldeRestant !== undefined ? facture.soldeRestant : montantTTC;
      
      let statut: 'Non payée' | 'Partiellement payée' | 'Payée' = 'Non payée';
      if (soldeRestant === 0) {
        statut = 'Payée';
      } else if (soldeRestant < montantTTC) {
        statut = 'Partiellement payée';
      }

      result = {
        ...facture,
        id: genId('fac'),
        code,
        montantHT,
        montantTTC,
        soldeRestant,
        statut,
        dateFacture: facture.dateFacture || new Date().toISOString()
      } as Facture;
      list.push(result);
      this.logAction(currentUser.id, currentUser.name, currentUser.role, `Création de la facture ${result.code}`, 'factures', result.id, null, result);
    }
    this.set('factures', list);
    return result;
  }

  static lettrerPaiement(payId: string, facId: string): { paiement: Paiement; facture: Facture } {
    const paiements = this.getPaiements();
    const factures = this.getFactures();
    
    const pIdx = paiements.findIndex(p => p.id === payId);
    if (pIdx === -1) throw new Error('Paiement non trouvé');
    const pay = paiements[pIdx];
    
    const fIdx = factures.findIndex(f => f.id === facId);
    if (fIdx === -1) throw new Error('Facture non trouvée');
    const fac = factures[fIdx];

    if (pay.lettre) {
      throw new Error('Ce paiement est déjà lettré.');
    }

    const currentUser = this.getCurrentUser();

    // Link payment
    const updatedPay: Paiement = {
      ...pay,
      factureId: fac.id,
      factureRef: fac.code,
      lettre: true
    };
    paiements[pIdx] = updatedPay;
    this.set('paiements', paiements);

    // Update invoice soldeRestant
    const newSolde = Math.max(0, fac.soldeRestant - pay.montant);
    let newStatut: 'Non payée' | 'Partiellement payée' | 'Payée' = 'Non payée';
    if (newSolde === 0) {
      newStatut = 'Payée';
    } else if (newSolde < fac.montantTTC) {
      newStatut = 'Partiellement payée';
    }

    const updatedFac: Facture = {
      ...fac,
      soldeRestant: newSolde,
      statut: newStatut
    };
    factures[fIdx] = updatedFac;
    this.set('factures', factures);

    this.pushNotification(
      'Lettrage Effectué',
      `Le règlement ${pay.code} de ${pay.montant.toLocaleString('fr-FR')} DA a été associé à la facture ${fac.code}.`,
      'success'
    );

    this.logAction(
      currentUser.id, 
      currentUser.name, 
      currentUser.role, 
      `Association (Lettrage) règlement ${pay.code} avec facture ${fac.code}`, 
      'paiements', 
      pay.id, 
      pay, 
      updatedPay
    );

    return { paiement: updatedPay, facture: updatedFac };
  }

  static delettrerPaiement(payId: string): { paiement: Paiement; facture?: Facture } {
    const paiements = this.getPaiements();
    const pIdx = paiements.findIndex(p => p.id === payId);
    if (pIdx === -1) throw new Error('Paiement non trouvé');
    const pay = paiements[pIdx];

    if (!pay.lettre || !pay.factureId) {
      throw new Error('Ce paiement n\'est pas lettré.');
    }

    const currentUser = this.getCurrentUser();
    const facId = pay.factureId;

    // Unlink payment
    const updatedPay: Paiement = {
      ...pay,
      factureId: undefined,
      factureRef: undefined,
      lettre: false
    };
    paiements[pIdx] = updatedPay;
    this.set('paiements', paiements);

    // Update invoice soldeRestant
    const factures = this.getFactures();
    const fIdx = factures.findIndex(f => f.id === facId);
    let updatedFac: Facture | undefined;

    if (fIdx !== -1) {
      const fac = factures[fIdx];
      const newSolde = Math.min(fac.montantTTC, fac.soldeRestant + pay.montant);
      let newStatut: 'Non payée' | 'Partiellement payée' | 'Payée' = 'Non payée';
      if (newSolde === 0) {
        newStatut = 'Payée';
      } else if (newSolde < fac.montantTTC) {
        newStatut = 'Partiellement payée';
      }

      updatedFac = {
        ...fac,
        soldeRestant: newSolde,
        statut: newStatut
      };
      factures[fIdx] = updatedFac;
      this.set('factures', factures);

      this.pushNotification(
        'Délettrage Effectué',
        `Le règlement ${pay.code} a été dissocié de la facture ${fac.code}.`,
        'info'
      );

      this.logAction(
        currentUser.id, 
        currentUser.name, 
        currentUser.role, 
        `Dissociation (Délettrage) règlement ${pay.code} de la facture ${fac.code}`, 
        'paiements', 
        pay.id, 
        pay, 
        updatedPay
      );
    }

    return { paiement: updatedPay, facture: updatedFac };
  }

  static recordPayment(fournisseurId: string, montant: number, mode: ModePaiement, refTrans: string, note?: string, invoiceId?: string): Paiement {
    const list = this.getPaiements();
    const currentUser = this.getCurrentUser();

    const fournisseur = this.getFournisseurs().find(f => f.id === fournisseurId);
    if (!fournisseur) throw new Error('Fournisseur non trouvé');

    const count = list.length + 1;
    const code = `REG-2026-${String(count).padStart(3, '0')}`;

    let paiement: Paiement = {
      id: genId('pay'),
      code,
      fournisseurId,
      fournisseurNom: fournisseur.solde !== undefined ? fournisseur.nomSociete : 'Fournisseur inconnu',
      montant,
      datePaiement: new Date().toISOString(),
      mode,
      referenceTransaction: refTrans,
      comptableNom: currentUser.name,
      note,
      lettre: false
    };

    // Deduct Supplier Solde/Debt
    const fournisseurs = this.getFournisseurs();
    const fIdx = fournisseurs.findIndex(f => f.id === fournisseurId);
    if (fIdx !== -1) {
      fournisseurs[fIdx].solde -= montant;
      this.set('fournisseurs', fournisseurs);
    }

    list.push(paiement);
    this.set('paiements', list);

    this.pushNotification(
      'Paiement Enregistré',
      `Paiement de ${montant.toLocaleString('fr-FR')} DA enregistré pour ${fournisseur.nomSociete} (${mode}).`,
      'success'
    );

    this.logAction(currentUser.id, currentUser.name, currentUser.role, `Règlement ${code} de ${montant} DA à ${fournisseur.nomSociete}`, 'paiements', paiement.id, null, paiement);

    // Automate lettering if invoiceId is provided
    if (invoiceId) {
      try {
        const result = this.lettrerPaiement(paiement.id, invoiceId);
        paiement = result.paiement;
      } catch (err) {
        console.error('Erreur lors du lettrage automatique:', err);
      }
    }

    return paiement;
  }

  // --- Notifications lu / non lu ---
  static getNotifications(): Notification[] {
    return this.get<Notification>('notifications', DEFAULT_NOTIFICATIONS);
  }

  static markAllNotificationsRead() {
    const notifs = this.getNotifications();
    const updated = notifs.map(n => ({ ...n, lu: true }));
    this.set('notifications', updated);
  }

  // --- Reporting & Dashboard Helpers ---
  static getDashboardKPIs(authorizedStoreIds?: string[]) {
    let magasins = this.getMagasins().filter(m => m.actif);
    if (authorizedStoreIds) {
      magasins = magasins.filter(m => authorizedStoreIds.includes(m.id));
    }
    const articles = this.getArticles();
    let stocks = this.getStocks();
    if (authorizedStoreIds) {
      stocks = stocks.filter(s => authorizedStoreIds.includes(s.magasinId));
    }
    let commandes = this.getCommandes();
    if (authorizedStoreIds) {
      commandes = commandes.filter(cmd => authorizedStoreIds.includes(cmd.magasinDestinationId));
    }
    const fournisseurs = this.getFournisseurs();

    // Value total stock (sum of quantity * averagePrice for each stockItem)
    let valTotalStock = 0;
    stocks.forEach(stk => {
      const art = articles.find(a => a.id === stk.articleId);
      if (art) {
        valTotalStock += stk.quantite * art.prixMoyen;
      }
    });

    // Monthly purchases (sum of POs created/received in May 2026)
    let achatsMensuels = 0;
    commandes.forEach(cmd => {
      if (cmd.statut !== 'Brouillon') {
        achatsMensuels += cmd.totalTTC;
      }
    });

    // Total supplier debt (sum of supplier solde)
    const dettesFournisseurs = fournisseurs.reduce((sum, f) => sum + f.solde, 0);

    // Critical low articles
    let articlesCritiquesCount = 0;
    stocks.forEach(stk => {
      const art = articles.find(a => a.id === stk.articleId);
      if (art && stk.quantite < art.stockMinimum) {
        articlesCritiquesCount++;
      }
    });

    return {
      activeStores: magasins.length,
      totalArticles: articles.length,
      valTotalStock,
      achatsMensuels,
      dettesFournisseurs,
      articlesCritiquesCount
    };
  }
}
