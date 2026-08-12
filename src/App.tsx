import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Package, Truck, ShoppingCart, ShieldCheck, 
  Users, RefreshCw, Landmark, BarChart3, Search, 
  Plus, Edit, Trash, Printer, QrCode, ClipboardList,
  ChevronRight, ChevronDown, Info, Moon, Sun,
  Folder, FileText, CheckSquare, LogOut, Lock, Mail, Eye, EyeOff, AlertCircle,
  AlertTriangle, Database, Download
} from 'lucide-react';
import { SupabaseDatabase } from './lib/supabaseDb';
import type { 
  UserProfile, Magasin, Article, Fournisseur, BonCommande, 
  Reception, ReceptionLigne, StockItem, MouvementStock, Affectation,
  Employe, Chantier, Transfert, Paiement, ModePaiement, Facture, Inventaire, InventaireLigne,
  Societe
} from './lib/types';

// ── PLANIFICATEUR DE SAUVEGARDE ───────────────────────────────────────────────
// Réglage volontairement local au poste (localStorage) et non en base : c'est ce
// navigateur-là qui télécharge le fichier, deux postes peuvent donc avoir des
// rythmes différents. Pour une sauvegarde qui tourne application fermée, voir
// `npm run schedule-backup` (tâche Windows appelant pg_dump).
type FrequenceSauvegarde = 'quotidienne' | 'hebdomadaire' | 'mensuelle';

interface PlanSauvegarde {
  actif: boolean;
  frequence: FrequenceSauvegarde;
  format: 'sql' | 'json';
  mode: 'auto' | 'rappel';
  derniereExecution: string | null;
}

const CLE_PLAN_SAUVEGARDE = 'bgm_plan_sauvegarde';

const PLAN_SAUVEGARDE_DEFAUT: PlanSauvegarde = {
  actif: false,
  frequence: 'hebdomadaire',
  format: 'sql',
  mode: 'rappel',
  derniereExecution: null
};

const JOURS_FREQUENCE: Record<FrequenceSauvegarde, number> = {
  quotidienne: 1,
  hebdomadaire: 7,
  mensuelle: 30
};

function lirePlanSauvegarde(): PlanSauvegarde {
  try {
    const brut = localStorage.getItem(CLE_PLAN_SAUVEGARDE);
    if (!brut) return { ...PLAN_SAUVEGARDE_DEFAUT };
    // Fusion avec les valeurs par défaut : un réglage écrit par une version
    // antérieure ne doit pas laisser de champ indéfini.
    return { ...PLAN_SAUVEGARDE_DEFAUT, ...JSON.parse(brut) };
  } catch {
    return { ...PLAN_SAUVEGARDE_DEFAUT };
  }
}

function ecrirePlanSauvegarde(plan: PlanSauvegarde) {
  try {
    localStorage.setItem(CLE_PLAN_SAUVEGARDE, JSON.stringify(plan));
  } catch (err) {
    console.error('Enregistrement du plan de sauvegarde impossible:', err);
  }
}

const prochaineEcheance = (plan: PlanSauvegarde): Date | null => {
  if (!plan.derniereExecution) return null;
  const date = new Date(plan.derniereExecution);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + JOURS_FREQUENCE[plan.frequence]);
  return date;
};

// Jamais exécutée = due immédiatement : sans cela, activer le planificateur
// n'aurait aucun effet visible avant la première sauvegarde manuelle.
const sauvegardeEstDue = (plan: PlanSauvegarde): boolean => {
  if (!plan.actif) return false;
  const echeance = prochaineEcheance(plan);
  return echeance === null || echeance.getTime() <= Date.now();
};

export default function App() {
  // --- Auth States ---
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      } catch (e) {}
    }
    return {
      id: 'usr-dir',
      name: 'Karim Benamar',
      role: 'direction',
      email: 'directeur@benamar.dz',
      password: 'dir2026',
      actif: true,
      createdAt: new Date().toISOString()
    };
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);

  // --- States (loaded from Supabase BDD) ---
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMagasinFilter, setSelectedMagasinFilter] = useState<string | null>(null);
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);
  const [commandes, setCommandes] = useState<BonCommande[]>([]);
  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [, setAuditLogs] = useState<any[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [inventairesReady, setInventairesReady] = useState<boolean>(false);
  // Employés / chantiers : tables optionnelles (db/create_employes_chantiers.sql). Si elles
  // sont absentes, les listes codées en dur restent affichées mais en lecture seule.
  const [employesReady, setEmployesReady] = useState<boolean>(true);
  const [chantiersReady, setChantiersReady] = useState<boolean>(true);
  // Fiche société : identité et coordonnées de l'entreprise (une seule ligne en base)
  const [societe, setSociete] = useState<Societe | null>(null);
  const [societeReady, setSocieteReady] = useState<boolean>(true);
  const [societeForm, setSocieteForm] = useState<Partial<Societe>>({});
  const [isSavingSociete, setIsSavingSociete] = useState(false);
  // Sauvegarde de la base : export JSON téléchargé sur le poste de l'utilisateur
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);
  const [sauvegardeEtape, setSauvegardeEtape] = useState<string>('');
  const [sauvegardeMotsDePasse, setSauvegardeMotsDePasse] = useState(false);
  const [derniereSauvegarde, setDerniereSauvegarde] = useState<{
    fichier: string;
    date: string;
    lignes: number;
    poids: string;
    statistiques: Record<string, number>;
    tablesAbsentes: string[];
    erreurs: { table: string; message: string }[];
  } | null>(null);

  // Planificateur de sauvegarde : le navigateur ne peut agir que lorsque l'application
  // est ouverte. Le réglage est donc local au poste (localStorage) et l'échéance est
  // évaluée à l'ouverture, pas par une minuterie qui tournerait en arrière-plan.
  const [planSauvegarde, setPlanSauvegarde] = useState<PlanSauvegarde>(() => lirePlanSauvegarde());
  const [sauvegardeDue, setSauvegardeDue] = useState(false);
  const planExecuteRef = useRef(false);

  
  // UI States & Selections
  const [theme, setTheme] = useState<string>('light');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [treeFilter, setTreeFilter] = useState<string>('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Helper pour extraire un ID valide (chaîne non vide, non [object Object])
  const getSanitizedId = (input: any): string | null => {
    if (typeof input === 'string' && input.trim() !== '' && input !== '[object Object]') return input;
    if (input && typeof input === 'object' && typeof input.id === 'string' && input.id.trim() !== '' && input.id !== '[object Object]') return input.id;
    return null;
  };

  // Les actions Modifier / Supprimer sont portées par l'en-tête de page (handleRibbonEdit /
  // handleRibbonDelete sur la ligne sélectionnée) : plus de boutons par ligne sur Articles et Magasins.
  const [rightPanelActive, setRightPanelActive] = useState<'filters' | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    stock: true,
    achats: true,
    chantiers: true,
    compta: true,
    admin: true
  });
  
  // Modals & Selected Items
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Partial<UserProfile> | null>(null);
  
  const [magasinModalOpen, setMagasinModalOpen] = useState(false);
  const [selectedMagasin, setSelectedMagasin] = useState<Partial<Magasin> | null>(null);
  
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Partial<Article> | null>(null);

  // Page « Employés & Chantiers » : deux grilles côte à côte, donc deux sélections
  // distinctes plutôt que le `selectedRowId` global partagé par les autres pages.
  const [employeModalOpen, setEmployeModalOpen] = useState(false);
  const [selectedEmploye, setSelectedEmploye] = useState<Partial<Employe> | null>(null);
  const [employeRowId, setEmployeRowId] = useState<string | null>(null);
  const [chantierModalOpen, setChantierModalOpen] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState<Partial<Chantier> | null>(null);
  const [chantierRowId, setChantierRowId] = useState<string | null>(null);

  const [createInventaireModalOpen, setCreateInventaireModalOpen] = useState(false);
  const [inventaireMagasinId, setInventaireMagasinId] = useState('');
  
  const [fournisseurModalOpen, setFournisseurModalOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Partial<Fournisseur> | null>(null);

  const [commandeModalOpen, setCommandeModalOpen] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<Partial<BonCommande> | null>(null);
  const [commandeLines, setCommandeLines] = useState<{ articleId: string; quantite: number; prixUnitaire: number }[]>([]);

  const [receptionModalOpen, setReceptionModalOpen] = useState(false);
  const [receptionMode, setReceptionMode] = useState<'commande' | 'directe'>('commande');
  const [receptionCommandeId, setReceptionCommandeId] = useState<string>('');
  const [receptionLines, setReceptionLines] = useState<{ articleId: string; quantiteRecue: number; prixUnitaire: number }[]>([]);
  const [receptionBL, setReceptionBL] = useState('');
  const [receptionFacture, setReceptionFacture] = useState('');
  // Réception directe (sans demande d'achat)
  const [receptionFournisseurId, setReceptionFournisseurId] = useState('');
  const [receptionMagasinId, setReceptionMagasinId] = useState('');
  const [receptionDirecteLines, setReceptionDirecteLines] = useState<{ articleId: string; quantiteRecue: number; prixUnitaire: number }[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  
  const [affectationModalOpen, setAffectationModalOpen] = useState(false);
  const [affectationEmpId, setAffectationEmpId] = useState('');
  const [affectationChaId, setAffectationChaId] = useState('');
  const [affectationLignes, setAffectationLignes] = useState<{ articleId: string; designation: string; quantite: number }[]>([]);
  const [affectationMotif, setAffectationMotif] = useState('');
  const [affectationChauffeur, setAffectationChauffeur] = useState('');
  const [affectationVehicule, setAffectationVehicule] = useState('');
  const [affectationMagasinId, setAffectationMagasinId] = useState('');
  const [editingAffectationId, setEditingAffectationId] = useState<string | null>(null);

  const [transfertModalOpen, setTransfertModalOpen] = useState(false);
  const [transfertDepartId, setTransfertDepartId] = useState('');
  const [transfertDestId, setTransfertDestId] = useState('');
  const [transfertLines, setTransfertLines] = useState<{ articleId: string; quantite: number }[]>([]);
  const [transfertMotif, setTransfertMotif] = useState('');
  const [isSubmittingTransfert, setIsSubmittingTransfert] = useState(false);
  // Verrou anti double-soumission : une seule modale est ouverte à la fois, un seul verrou suffit.
  // Sans lui, un double clic crée deux documents (deux factures, deux règlements, deux BL).
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [inventaireModalOpen, setInventaireModalOpen] = useState(false);
  const [selectedInventaire, setSelectedInventaire] = useState<Inventaire | null>(null);
  const [inventaireLines, setInventaireLines] = useState<InventaireLigne[]>([]);
  const [stockConsolideMode, setStockConsolideMode] = useState(false);
  // Tableau de bord : période analysée (en jours) et marque survolée pour l'infobulle
  const [dashPeriode, setDashPeriode] = useState<7 | 30 | 90>(30);
  const [dashHover, setDashHover] = useState<string | null>(null);
  // Fiche de stock : historique complet (entrées / sorties) d'un article.
  // magasinId à null = consolidé tous dépôts autorisés.
  const [ficheStockOpen, setFicheStockOpen] = useState(false);
  const [ficheStockArticleId, setFicheStockArticleId] = useState<string | null>(null);
  const [ficheStockMagasinId, setFicheStockMagasinId] = useState<string | null>(null);

  const [paiementModalOpen, setPaiementModalOpen] = useState(false);
  const [payFournisseurId, setPayFournisseurId] = useState('');
  const [payMontant, setPayMontant] = useState<number>(0);
  const [payMode, setPayMode] = useState<ModePaiement>('Virement');
  const [payRefTrans, setPayRefTrans] = useState('');
  const [payNote, setPayNote] = useState('');
  // 'simple'   : règlement sur solde depuis la page Fournisseurs, sans lettrage
  // 'lettrage' : règlement imputé sur les factures ouvertes, depuis Règlements Fournisseurs
  const [payMode2, setPayMode2] = useState<'simple' | 'lettrage'>('simple');
  const [payDate, setPayDate] = useState<string>('');
  const [payImputations, setPayImputations] = useState<Record<string, number>>({});

  // Print Preview Overlay
  const [printDoc, setPrintDoc] = useState<
    | { type: 'commande'; data: BonCommande }
    | { type: 'reception'; data: Reception }
    | { type: 'affectation'; data: Affectation }
    | { type: 'inventaire'; data: Inventaire; lines: InventaireLigne[] }
    | { type: 'stock'; magasinNom: string; isConsolide: boolean; items: any[] }
    | { type: 'fiche_stock'; article: Article; magasinNom: string; stockActuel: number; mouvements: MouvementStock[] }
    | { type: 'transfert'; data: Transfert }
    // Les factures n'ont pas de colonne `lignes` en base : le détail est reconstitué
    // depuis les réceptions rattachées, et les règlements depuis `paiements`.
    | { type: 'facture'; data: Facture; lignes: { designation: string; quantite: number; prixUnitaire: number }[]; reglements: Paiement[] }
    | null
  >(null);

  // --- Facture Creation Modal ---
  const [factureModalOpen, setFactureModalOpen] = useState(false);
  const [factureStep, setFactureStep] = useState<1 | 2 | 3>(1);
  const [factureFournisseurId, setFactureFournisseurId] = useState('');
  const [factureSelectedRecs, setFactureSelectedRecs] = useState<string[]>([]);
  const [factureLignes, setFactureLignes] = useState<{ articleId: string; designation: string; quantite: number; prixUnitaire: number }[]>([]);
  const [factureTauxTVA, setFactureTauxTVA] = useState(0.19);
  const [factureTimbre, setFactureTimbre] = useState(500);
  const [factureFraisPort, setFactureFraisPort] = useState(0);
  const [factureNote, setFactureNote] = useState('');


  // --- Load data from Supabase on mount ---
  // --- Load data from Supabase on mount ---
  const reloadData = async () => {
    SupabaseDatabase.getUsers().then(setUsers).catch(err => console.error('getUsers:', err));
    SupabaseDatabase.getMagasins().then(setMagasins).catch(err => console.error('getMagasins:', err));
    SupabaseDatabase.getArticles().then(setArticles).catch(err => console.error('getArticles:', err));
    SupabaseDatabase.getFournisseurs().then(setFournisseurs).catch(err => console.error('getFournisseurs:', err));
    SupabaseDatabase.getEmployes().then(list => {
      setEmployes(list);
      setEmployesReady(SupabaseDatabase.isEmployesAvailable);
    }).catch(err => console.error('getEmployes:', err));
    SupabaseDatabase.getChantiers().then(list => {
      setChantiers(list);
      setChantiersReady(SupabaseDatabase.isChantiersAvailable);
    }).catch(err => console.error('getChantiers:', err));
    SupabaseDatabase.getStocks().then(setStocks).catch(err => console.error('getStocks:', err));
    SupabaseDatabase.getMouvementsStock().then(setMouvements).catch(err => console.error('getMouvementsStock:', err));
    SupabaseDatabase.getCommandes().then(setCommandes).catch(err => console.error('getCommandes:', err));
    SupabaseDatabase.getReceptions().then(setReceptions).catch(err => console.error('getReceptions:', err));
    SupabaseDatabase.getAffectations().then(setAffectations).catch(err => console.error('getAffectations:', err));
    SupabaseDatabase.getTransferts().then(setTransferts).catch(err => console.error('getTransferts:', err));
    SupabaseDatabase.getPaiements().then(setPaiements).catch(err => console.error('getPaiements:', err));
    SupabaseDatabase.getAuditLogs().then(setAuditLogs).catch(err => console.error('getAuditLogs:', err));
    SupabaseDatabase.getFactures().then(setFactures).catch(err => console.error('getFactures:', err));
    SupabaseDatabase.getInventaires().then(invs => {
      setInventaires(invs);
      setInventairesReady(true);
    }).catch(err => console.error('getInventaires:', err));
    // La table `societe` peut être absente du déploiement : on mémorise sa
    // disponibilité pour afficher la notice d'installation plutôt qu'une erreur.
    SupabaseDatabase.getSociete().then(s => {
      setSociete(s);
      setSocieteReady(SupabaseDatabase.isSocieteAvailable);
    }).catch(err => console.error('getSociete:', err));
  };

  // Restore session from localStorage or auto-authenticate default user on mount
  useEffect(() => {
    const storedUserStr = localStorage.getItem('currentUser');
    if (storedUserStr) {
      try {
        const parsed = JSON.parse(storedUserStr);
        if (parsed && parsed.email) {
          setCurrentUser(parsed);
          // continue to check actual Supabase session below
        }
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
    // Check Supabase session to determine authenticated state
    SupabaseDatabase.hasSession().then(has => {
      if (has) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    }).catch(err => {
      console.error('Error checking Supabase session:', err);
      setIsAuthenticated(false);
    });
  }, []);

  // Load data on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      reloadData();
    }
  }, [isAuthenticated]);

  // Theme support
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle Tab Switch (reset selected row context)
  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setSelectedRowId(null);
    setEmployeRowId(null);
    setChantierRowId(null);
    // La recherche porte sur la page courante : la conserver d'un onglet à l'autre donnait
    // des journaux vides sans raison apparente (« la recherche ne marche pas »).
    setSearchQuery('');
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const authSuccess = await SupabaseDatabase.authenticateUser(loginEmail, loginPassword);
      if (authSuccess) {
        const user = SupabaseDatabase.getCurrentUser();
        setCurrentUser(user);
        setIsAuthenticated(true);
        setLoginEmail('');
        setLoginPassword('');
        reloadData();

        if (user.role === 'magasinier') {
          switchTab('stocks');
        } else if (user.role === 'achat') {
          switchTab('achats');
        } else if (user.role === 'comptabilite') {
          switchTab('finances');
        } else {
          switchTab('dashboard');
        }
      } else {
        setLoginError('Email ou mot de passe incorrect, ou le compte est désactivé.');
      }
    } catch (err) {
      setLoginError('Erreur de connexion. Vérifiez votre connexion internet.');
      console.error('Login error:', err);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    SupabaseDatabase.logout();
    setIsAuthenticated(false);
    setCurrentUser({} as UserProfile);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    switchTab('dashboard');
    // Clear all data
    setUsers([]);
    setMagasins([]);
    setArticles([]);
    setFournisseurs([]);
    setEmployes([]);
    setChantiers([]);
    setStocks([]);
    setMouvements([]);
    setCommandes([]);
    setReceptions([]);
    setAffectations([]);
    setTransferts([]);
    setPaiements([]);
    setAuditLogs([]);
    setFactures([]);
  };

  // Role label helper
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'direction': return 'Direction Générale';
      case 'magasinier': return 'Magasinier';
      case 'achat': return 'Service Achats';
      case 'comptabilite': return 'Comptabilité';
      case 'chef_chantier': return 'Chef de Chantier';
      default: return role;
    }
  };

  // --- CRUD Save/Process Handlers ---
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      try {
        await SupabaseDatabase.saveUser(selectedUser);
        setUserModalOpen(false);
        setSelectedUser(null);
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    }
  };

  const handleSaveMagasin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMagasin) {
      try {
        await SupabaseDatabase.saveMagasin(selectedMagasin);
        setMagasinModalOpen(false);
        setSelectedMagasin(null);
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedArticle) {
      try {
        await SupabaseDatabase.saveArticle(selectedArticle);
        setArticleModalOpen(false);
        setSelectedArticle(null);
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    }
  };

  const handleSaveFournisseur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFournisseur) {
      try {
        await SupabaseDatabase.saveFournisseur(selectedFournisseur);
        setFournisseurModalOpen(false);
        setSelectedFournisseur(null);
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    }
  };

  // ── EMPLOYÉS & CHANTIERS ────────────────────────────────────────────────────
  // Le fichier du personnel et la liste des chantiers sont tenus par la direction et
  // les chefs de chantier ; les autres rôles consultent la page sans pouvoir la modifier.
  // 'directeur' / 'responsable' sont les alias hérités de 'direction' dans UserRole.
  const peutGererPersonnel = ['direction', 'directeur', 'responsable', 'chef_chantier'].includes(currentUser.role);

  // Numéro algérien : mobile 0[5-7] + 8 chiffres, ou fixe 0[2-4] + 7 chiffres.
  const telephoneValide = (tel: string) => {
    const chiffres = (tel || '').replace(/\D/g, '');
    return /^0[5-7]\d{8}$/.test(chiffres) || /^0[2-4]\d{7}$/.test(chiffres);
  };

  const NOTICE_TABLES_RH =
    'Les tables « employes » et « chantiers » sont absentes de la base : la page reste en lecture seule.\n\n' +
    'Exécutez le script db/create_employes_chantiers.sql dans l\'éditeur SQL Supabase, puis actualisez.';

  const refuserSiLectureSeule = (pret: boolean) => {
    if (!peutGererPersonnel) {
      alert('⛔ Action réservée à la direction et aux chefs de chantier.');
      return true;
    }
    if (!pret) {
      alert('⚠️ ' + NOTICE_TABLES_RH);
      return true;
    }
    return false;
  };

  const openEmployeModal = (emp?: Employe) => {
    if (refuserSiLectureSeule(employesReady)) return;
    setSelectedEmploye(emp ? { ...emp } : { actif: true, chantierId: '' });
    setEmployeModalOpen(true);
  };

  const handleEditEmploye = () => {
    const emp = employes.find(e => e.id === employeRowId);
    if (!emp) {
      alert('Veuillez d\'abord sélectionner un employé dans la liste.');
      return;
    }
    openEmployeModal(emp);
  };

  const handleSaveEmploye = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmploye || isSubmitting) return;

    const nom = (selectedEmploye.nom || '').trim();
    if (nom.length < 3) {
      alert('Le nom & prénom de l\'employé est obligatoire (3 caractères minimum).');
      return;
    }
    // Unicité : contrôle immédiat sur la liste chargée, doublé en base par un index unique.
    const doublon = employes.find(
      emp => emp.id !== selectedEmploye.id && normalizeSearch(emp.nom).trim() === normalizeSearch(nom).trim()
    );
    if (doublon) {
      alert(`⛔ Doublon détecté\n\nUn employé nommé « ${doublon.nom} » figure déjà au fichier du personnel.`);
      return;
    }
    if (!telephoneValide(selectedEmploye.telephone || '')) {
      alert(
        'Numéro de téléphone invalide.\n\n' +
        'Formats attendus :\n• Mobile : 0555 12 34 56 (10 chiffres, 05/06/07)\n• Fixe : 021 23 45 67 (9 chiffres, 02/03/04)'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await SupabaseDatabase.saveEmploye({ ...selectedEmploye, nom, chantierId: selectedEmploye.chantierId || undefined });
      setEmployeModalOpen(false);
      setSelectedEmploye(null);
      await reloadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmploye = async () => {
    if (refuserSiLectureSeule(employesReady)) return;
    const emp = employes.find(e => e.id === employeRowId);
    if (!emp) {
      alert('Veuillez d\'abord sélectionner un employé dans la liste.');
      return;
    }

    // Un employé qui figure sur un bon de sortie ne peut pas disparaître : le document
    // resterait avec un signataire introuvable. On propose la sortie des effectifs.
    const affLiees = affectations.filter(a => a.employeId === emp.id);
    if (affLiees.length > 0) {
      const codes = affLiees.slice(0, 5).map(a => a.code).filter(Boolean);
      const suite = affLiees.length > 5 ? `\n• … et ${affLiees.length - 5} autre(s)` : '';
      if (emp.actif === false) {
        alert(
          '⛔ Suppression impossible — Employé référencé\n\n' +
          `« ${emp.nom} » figure sur ${affLiees.length} bon(s) de sortie matériel :\n• ${codes.join('\n• ')}${suite}\n\n` +
          'Il est déjà sorti des effectifs : son historique est conservé.'
        );
        return;
      }
      const desactiver = window.confirm(
        '⛔ Suppression impossible — Employé référencé\n\n' +
        `« ${emp.nom} » figure sur ${affLiees.length} bon(s) de sortie matériel :\n• ${codes.join('\n• ')}${suite}\n\n` +
        'Voulez-vous le sortir des effectifs ? Il disparaîtra des listes de saisie mais restera lisible dans l\'historique.'
      );
      if (!desactiver) return;
      try {
        await SupabaseDatabase.saveEmploye({ ...emp, actif: false });
        setEmployeRowId(null);
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
      return;
    }

    if (!window.confirm(
      `Supprimer définitivement l'employé « ${emp.nom} » (${emp.fonction}) ?\n\nCette action est irréversible.`
    )) return;

    const res = await SupabaseDatabase.deleteEmploye(emp.id);
    if (!res.success) {
      alert('⛔ Suppression impossible\n\n' + (res.raison || 'Erreur inconnue.'));
      return;
    }
    setEmployeRowId(null);
    await reloadData();
  };

  // Bascule « en poste » / « sorti des effectifs » sans passer par la modale.
  const handleToggleEmployeActif = async () => {
    if (refuserSiLectureSeule(employesReady)) return;
    const emp = employes.find(e => e.id === employeRowId);
    if (!emp) {
      alert('Veuillez d\'abord sélectionner un employé dans la liste.');
      return;
    }
    const actifCible = emp.actif === false;
    if (!window.confirm(
      actifCible
        ? `Réintégrer « ${emp.nom} » dans les effectifs ?`
        : `Sortir « ${emp.nom} » des effectifs ?\n\nIl ne sera plus proposé sur les bons de sortie matériel.`
    )) return;
    try {
      await SupabaseDatabase.saveEmploye({ ...emp, actif: actifCible });
      await reloadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  };

  const openChantierModal = (cha?: Chantier) => {
    if (refuserSiLectureSeule(chantiersReady)) return;
    setSelectedChantier(cha ? { ...cha } : { actif: true });
    setChantierModalOpen(true);
  };

  const handleEditChantier = () => {
    const cha = chantiers.find(c => c.id === chantierRowId);
    if (!cha) {
      alert('Veuillez d\'abord sélectionner un chantier dans la liste.');
      return;
    }
    openChantierModal(cha);
  };

  const handleSaveChantier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChantier || isSubmitting) return;

    const nom = (selectedChantier.nom || '').trim();
    if (nom.length < 3) {
      alert('La désignation du chantier est obligatoire (3 caractères minimum).');
      return;
    }
    const doublon = chantiers.find(
      cha => cha.id !== selectedChantier.id && normalizeSearch(cha.nom).trim() === normalizeSearch(nom).trim()
    );
    if (doublon) {
      alert(`⛔ Doublon détecté\n\nUn chantier nommé « ${doublon.nom} » existe déjà.`);
      return;
    }

    // Clôturer un chantier (passage en « Livré ») laisse ses employés sans site actif :
    // on l'annonce avant, la réaffectation restant à la main du responsable.
    const ancien = chantiers.find(c => c.id === selectedChantier.id);
    if (ancien && ancien.actif && selectedChantier.actif === false) {
      const empLies = employes.filter(emp => emp.chantierId === ancien.id && emp.actif !== false);
      if (empLies.length > 0 && !window.confirm(
        `Marquer « ${ancien.nom} » comme livré ?\n\n` +
        `${empLies.length} employé(s) y sont encore affectés :\n• ${empLies.map(emp => emp.nom).join('\n• ')}\n\n` +
        'Ils resteront rattachés à ce chantier tant qu\'ils ne seront pas réaffectés, et le chantier ne sera plus proposé sur les bons de sortie.'
      )) return;
    }

    setIsSubmitting(true);
    try {
      await SupabaseDatabase.saveChantier({ ...selectedChantier, nom });
      setChantierModalOpen(false);
      setSelectedChantier(null);
      await reloadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChantier = async () => {
    if (refuserSiLectureSeule(chantiersReady)) return;
    const cha = chantiers.find(c => c.id === chantierRowId);
    if (!cha) {
      alert('Veuillez d\'abord sélectionner un chantier dans la liste.');
      return;
    }

    const empLies = employes.filter(emp => emp.chantierId === cha.id);
    const affLiees = affectations.filter(a => a.chantierId === cha.id);
    if (empLies.length > 0 || affLiees.length > 0) {
      const details: string[] = [];
      if (empLies.length > 0) details.push(`• ${empLies.length} employé(s) affecté(s) : ${empLies.map(emp => emp.nom).join(', ')}`);
      if (affLiees.length > 0) details.push(`• ${affLiees.length} bon(s) de sortie matériel : ${affLiees.slice(0, 5).map(a => a.code).filter(Boolean).join(', ')}`);
      alert(
        '⛔ Suppression impossible — Chantier référencé\n\n' +
        `« ${cha.nom} » est encore lié à :\n\n` + details.join('\n') +
        '\n\nRéaffectez les employés concernés. Les bons déjà émis, eux, ne peuvent pas être déliés : ' +
        'marquez alors le chantier comme « Livré » (décochez « Chantier actif ») au lieu de le supprimer.'
      );
      return;
    }

    if (!window.confirm(
      `Supprimer définitivement le chantier « ${cha.nom} » (${cha.wilaya}) ?\n\nCette action est irréversible.`
    )) return;

    const res = await SupabaseDatabase.deleteChantier(cha.id);
    if (!res.success) {
      alert('⛔ Suppression impossible\n\n' + (res.raison || 'Erreur inconnue.'));
      return;
    }
    setChantierRowId(null);
    await reloadData();
  };

  const handleCreateCommande = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCommande && selectedCommande.fournisseurId && selectedCommande.magasinDestinationId) {
      if (commandeLines.length === 0) {
        alert('Veuillez ajouter au moins une ligne d\'article');
        return;
      }
      
      try {
        const newCmd: Partial<BonCommande> = {
          ...selectedCommande,
          lignes: commandeLines.map(line => {
            const art = articles.find(a => a.id === line.articleId);
            return {
              articleId: line.articleId,
              designation: art ? art.designation : 'Article inconnu',
              quantite: line.quantite,
              quantiteRecue: 0,
              prixUnitaire: line.prixUnitaire
            };
          })
        };

        await SupabaseDatabase.saveCommande(newCmd);
        setCommandeModalOpen(false);
        setSelectedCommande(null);
        setCommandeLines([]);
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    }
  };

  // Ouvre la modale de réception dans l'un des deux modes et remet les champs à zéro
  const openReceptionModal = (mode: 'commande' | 'directe') => {
    setReceptionMode(mode);
    setReceptionCommandeId('');
    setReceptionLines([]);
    setReceptionBL('');
    setReceptionFacture('');
    setReceptionFournisseurId('');
    setReceptionMagasinId(currentUser.magasinId || '');
    setReceptionDirecteLines([]);
    setReceptionModalOpen(true);
  };

  const resetReceptionForm = () => {
    setReceptionModalOpen(false);
    setReceptionCommandeId('');
    setReceptionLines([]);
    setReceptionBL('');
    setReceptionFacture('');
    setReceptionFournisseurId('');
    setReceptionMagasinId('');
    setReceptionDirecteLines([]);
  };

  // Fournisseur d'une réception : via la commande liée, ou porté directement (réception sans DA)
  const getReceptionFournisseurId = (rec: Reception): string => {
    const raw = rec as Reception & { fournisseur_id?: string; commande_id?: string };
    const direct = raw.fournisseurId || raw.fournisseur_id;
    if (direct) return String(direct);
    const cmd = commandes.find(c => c.id === (raw.commandeId || raw.commande_id));
    return cmd?.fournisseurId ? String(cmd.fournisseurId) : '';
  };

  // Valeur HT d'une ligne de réception : prix saisi en réception directe, sinon PMP de l'article
  const getLigneValeurHT = (ligne: ReceptionLigne): number => {
    const prix = ligne.prixUnitaire !== undefined && ligne.prixUnitaire !== null
      ? ligne.prixUnitaire
      : (articles.find(a => a.id === ligne.articleId)?.prixMoyen || 0);
    return prix * (ligne.quantiteRecue || 0);
  };

  const handleProcessReception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await processReception();
    } finally {
      setIsSubmitting(false);
    }
  };

  const processReception = async () => {
    // --- Mode 2 : réception directe, sans demande d'achat ---
    if (receptionMode === 'directe') {
      if (!receptionFournisseurId || !receptionMagasinId || !receptionBL) {
        alert('Fournisseur, magasin de destination et n° de Bon de Livraison sont obligatoires.');
        return;
      }
      const validLines = receptionDirecteLines.filter(l => l.articleId && l.quantiteRecue > 0);
      if (validLines.length === 0) {
        alert('Veuillez ajouter au moins un article avec une quantité positive.');
        return;
      }

      try {
        await SupabaseDatabase.createReceptionDirecte({
          fournisseurId: receptionFournisseurId,
          fournisseurNom: fournisseurs.find(f => f.id === receptionFournisseurId)?.nomSociete,
          magasinId: receptionMagasinId,
          magasinNom: magasins.find(m => m.id === receptionMagasinId)?.nom,
          bonLivraisonRef: receptionBL,
          factureFournisseurRef: receptionFacture || undefined,
          lignes: validLines.map(l => ({
            articleId: l.articleId,
            designation: articles.find(a => a.id === l.articleId)?.designation || '',
            quantiteRecue: l.quantiteRecue,
            prixUnitaire: l.prixUnitaire
          }))
        });
        resetReceptionForm();
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
      return;
    }

    // --- Mode 1 : réception depuis une demande d'achat ---
    // validLines porte quantiteRecue ET prixUnitaire : c'est ce prix qui valorise la dette.
    if (receptionCommandeId && receptionBL) {
      const validLines = receptionLines.filter(l => l.quantiteRecue > 0);
      if (validLines.length === 0) {
        alert('Veuillez réceptionner au moins un article avec une quantité positive.');
        return;
      }

      try {
        await SupabaseDatabase.receiveGoods(receptionCommandeId, receptionBL, receptionFacture || undefined, validLines);
        resetReceptionForm();
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    }
  };

  const openEditAffectation = (aff: Affectation) => {
    if (['Validé', 'Validée'].includes(String(aff.statut))) {
      alert("⛔ Modification impossible\n\nCe Bon d'Affectation (BS) a été validé et ne peut plus être modifié.");
      return;
    }
    setEditingAffectationId(aff.id);
    setAffectationEmpId(aff.employeId || '');
    setAffectationChaId(aff.chantierId || '');
    setAffectationMagasinId(aff.magasinId || currentUser.magasinId || '');
    setAffectationLignes(aff.lignes || []);
    setAffectationMotif(aff.motif || '');
    setAffectationChauffeur(aff.chauffeur || '');
    setAffectationVehicule(aff.vehicule || '');
    setAffectationModalOpen(true);
  };

  const handleProcessAffectation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (affectationEmpId && affectationLignes.length > 0 && affectationChaId) {
      try {
        const affPayload = {
          employeId: affectationEmpId,
          chantierId: affectationChaId,
          magasinId: affectationMagasinId || currentUser.magasinId || 'mag-alg',
          lignes: affectationLignes,
          motif: affectationMotif,
          chauffeur: affectationChauffeur,
          vehicule: affectationVehicule
        };

        if (editingAffectationId) {
          const updated = await SupabaseDatabase.updateAffectation(editingAffectationId, affPayload);
          if (!updated) throw new Error('Échec de la modification de l\'affectation');
        } else {
          const created = await SupabaseDatabase.createAffectation(affPayload);
          if (!created) throw new Error('Échec de la création de l\'affectation');
        }

        setAffectationModalOpen(false);
        setEditingAffectationId(null);
        setAffectationEmpId('');
        setAffectationChaId('');
        setAffectationLignes([]);
        setAffectationMotif('');
        setAffectationChauffeur('');
        setAffectationVehicule('');
        setAffectationMagasinId('');
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    }
  };

  const handleProcessTransfert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTransfert) return;
    if (transfertDepartId && transfertDestId && transfertLines.length > 0) {
      if (transfertDepartId === transfertDestId) {
        alert('Les magasins de départ et de destination doivent être différents.');
        return;
      }
      
      setIsSubmittingTransfert(true);
      try {
        const tr: Partial<Transfert> = {
          magasinDepartId: transfertDepartId,
          magasinDestId: transfertDestId,
          lignes: transfertLines.map(l => {
            const art = articles.find(a => a.id === l.articleId);
            return {
              articleId: l.articleId,
              designation: art ? art.designation : 'Article inconnu',
              quantite: l.quantite
            };
          }),
          motif: transfertMotif
        };
        
        await SupabaseDatabase.createTransfertRequest(tr);
        setTransfertModalOpen(false);
        setTransfertDepartId('');
        setTransfertDestId('');
        setTransfertLines([]);
        setTransfertMotif('');
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setIsSubmittingTransfert(false);
      }
    }
  };

  // Factures encore ouvertes d'un fournisseur, les plus anciennes d'abord (imputation FIFO)
  const getFacturesOuvertes = (fournisseurId: string): Facture[] =>
    factures
      .filter(f => f.fournisseurId === fournisseurId && (f.soldeRestant || 0) > 0)
      .sort((a, b) => new Date(a.dateFacture).getTime() - new Date(b.dateFacture).getTime());

  const resetPaiementForm = () => {
    setPaiementModalOpen(false);
    setPayFournisseurId('');
    setPayMontant(0);
    setPayMode('Virement');
    setPayRefTrans('');
    setPayNote('');
    setPayImputations({});
    setPayDate('');
  };

  const openPaiementModal = (mode: 'simple' | 'lettrage', fournisseurId?: string) => {
    if (!isAuthenticated) { setLoginModalOpen(true); return; }
    const fid = fournisseurId || fournisseurs[0]?.id || '';
    const four = fournisseurs.find(f => f.id === fid);
    setPayMode2(mode);
    setPayFournisseurId(fid);
    setPayMontant(mode === 'simple' ? (four?.solde || 0) : 0);
    setPayMode('Virement');
    setPayRefTrans('');
    setPayNote('');
    setPayImputations({});
    setPayDate(new Date().toISOString().slice(0, 10));
    setPaiementModalOpen(true);
  };

  // Ventilation automatique du montant sur les factures ouvertes, de la plus ancienne
  // à la plus récente, sans jamais dépasser le restant dû de chacune.
  const repartirAutomatiquement = (montant: number, fournisseurId: string) => {
    let reste = montant;
    const next: Record<string, number> = {};
    for (const fac of getFacturesOuvertes(fournisseurId)) {
      if (reste <= 0) break;
      const impute = Math.min(reste, fac.soldeRestant || 0);
      if (impute > 0) {
        next[fac.id] = impute;
        reste -= impute;
      }
    }
    setPayImputations(next);
  };

  const totalImpute = Object.values(payImputations).reduce((s, v) => s + (v || 0), 0);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await processPayment();
    } finally {
      setIsSubmitting(false);
    }
  };

  const processPayment = async () => {
    if (!isAuthenticated) {
      setLoginError('Veuillez vous connecter avant d\'effectuer un règlement.');
      setLoginModalOpen(true);
      return;
    }
    if (!payFournisseurId || !payRefTrans) return;

    const dateIso = payDate ? new Date(payDate).toISOString() : new Date().toISOString();

    // --- Règlement AVEC lettrage (page Règlements Fournisseurs) ---
    if (payMode2 === 'lettrage') {
      const imputations = Object.entries(payImputations)
        .map(([factureId, montant]) => ({ factureId, montant: Number(montant) || 0 }))
        .filter(i => i.montant > 0);

      if (imputations.length === 0) {
        alert('Aucune facture imputée.\n\nSaisissez un montant puis cliquez sur « Répartir automatiquement », ou imputez manuellement.');
        return;
      }

      try {
        const lignes = await SupabaseDatabase.recordPaymentAvecLettrage({
          fournisseurId: payFournisseurId,
          mode: payMode,
          referenceTransaction: payRefTrans,
          datePaiement: dateIso,
          note: payNote,
          imputations
        });
        if (!lignes || lignes.length === 0) throw new Error('Impossible d\'enregistrer le règlement.');
        resetPaiementForm();
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
      return;
    }

    // --- Règlement SANS lettrage (page Fournisseurs) : acompte / règlement sur solde ---
    if (payMontant > 0) {
      const four = fournisseurs.find(f => f.id === payFournisseurId);
      if (four && payMontant > (four.solde || 0)) {
        const ok = window.confirm(
          `Le montant (${payMontant.toLocaleString()} DA) dépasse la dette actuelle de ${four.nomSociete} ` +
          `(${(four.solde || 0).toLocaleString()} DA).\n\nEnregistrer quand même ce règlement ?`
        );
        if (!ok) return;
      }

      try {
        const pay: Partial<Paiement> = {
          fournisseurId: payFournisseurId,
          montant: payMontant,
          mode: payMode,
          referenceTransaction: payRefTrans,
          datePaiement: dateIso,
          note: payNote,
          lettre: false
        };
        const paymentResult = await SupabaseDatabase.recordPayment(pay);
        if (!paymentResult) {
          throw new Error('Impossible d\'enregistrer le règlement fournisseur.');
        }
        resetPaiementForm();
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    }
  };

  // --- Ribbon Toolbar Trigger Logic ---
  const handleRibbonAdd = () => {
    if (activeTab === 'articles') {
      setSelectedArticle({});
      setArticleModalOpen(true);
    } else if (activeTab === 'magasins') {
      setSelectedMagasin({});
      setMagasinModalOpen(true);
    } else if (activeTab === 'fournisseurs') {
      setSelectedFournisseur({});
      setFournisseurModalOpen(true);
    } else if (activeTab === 'achats') {
      const authorized = getAuthorizedMagasins();
      setSelectedCommande({
        fournisseurId: fournisseurs[0]?.id || '',
        magasinDestinationId: authorized[0]?.id || ''
      });
      setCommandeLines([]);
      setCommandeModalOpen(true);
    } else if (activeTab === 'affectations') {
      const authorized = getAuthorizedMagasins();
      setEditingAffectationId(null);
      setAffectationEmpId('');
      setAffectationChaId('');
      setAffectationLignes([]);
      setAffectationMotif('');
      setAffectationChauffeur('');
      setAffectationVehicule('');
      const emitterMagasins = getAffectationEmitterMagasins();
      setAffectationMagasinId(currentUser.magasinId || emitterMagasins[0]?.id || authorized[0]?.id || '');
      setAffectationModalOpen(true);
    } else if (activeTab === 'transferts') {
      const authorized = getAuthorizedMagasins();
      const allActive = magasins.filter(m => m.actif);
      const firstAuth = authorized[0]?.id || '';
      const firstDest = allActive.find(m => m.id !== firstAuth)?.id || '';
      setTransfertDepartId(firstAuth);
      setTransfertDestId(firstDest);
      setTransfertLines([]);
      setTransfertMotif('');
      setTransfertModalOpen(true);
    } else if (activeTab === 'finances') {
      openPaiementModal('lettrage');
    } else if (activeTab === 'users') {
      setSelectedUser({ role: 'magasinier', actif: true, magasinsIds: [] });
      setUserModalOpen(true);
    } else if (activeTab === 'inventaires') {
      const magId = currentUser.magasinId || magasins[0]?.id || '';
      SupabaseDatabase.createInventaire(magId).then(inv => {
        setSelectedInventaire(inv);
        setInventaireLines(inv.lignes);
        setInventaireModalOpen(true);
        reloadData();
      });
    } else {
      alert(`L'ajout n'est pas configuré pour le module actif : ${activeTab}`);
    }
  };

  const handleRibbonEdit = (targetId?: any) => {
    const rowId = getSanitizedId(targetId) || getSanitizedId(selectedRowId);
    if (!rowId) {
      alert('Veuillez d\'abord sélectionner une ligne dans le tableau.');
      return;
    }
    if (activeTab === 'articles') {
      const item = articles.find(a => a.id === rowId);
      if (item) {
        setSelectedArticle(item);
        setArticleModalOpen(true);
      }
    } else if (activeTab === 'magasins') {
      const item = magasins.find(m => m.id === rowId);
      if (item) {
        setSelectedMagasin(item);
        setMagasinModalOpen(true);
      }
    } else if (activeTab === 'fournisseurs') {
      const item = fournisseurs.find(f => f.id === rowId);
      if (item) {
        setSelectedFournisseur(item);
        setFournisseurModalOpen(true);
      }
    } else if (activeTab === 'users') {
      const item = users.find(u => u.id === rowId);
      if (item) {
        setSelectedUser(item);
        setUserModalOpen(true);
      }
    } else if (activeTab === 'inventaires') {
      const item = inventaires.find(i => i.id === rowId);
      if (item) {
        setSelectedInventaire(item);
        setInventaireLines(item.lignes);
        setInventaireModalOpen(true);
      }
    } else if (activeTab === 'achats') {
      alert("La modification directe d'une Demande d'Achat validée n'est pas autorisée. Vous pouvez supprimer et recréer la DA si elle est encore en Brouillon.");
    } else if (activeTab === 'affectations') {
      const item = affectations.find(a => a.id === rowId);
      if (item) {
        openEditAffectation(item);
      }
    } else {
      alert('La modification n\'est pas disponible pour ce module.');
    }
  };

  const handleRibbonDelete = async (targetId?: any) => {
    const rowId = getSanitizedId(targetId) || getSanitizedId(selectedRowId);
    if (!rowId) {
      alert('Veuillez sélectionner un élément à supprimer.');
      return;
    }

    // ── 1. ARTICLES ────────────────────────────────────────────────────────────
    if (activeTab === 'articles') {
      const hasBC  = commandes.some(c => c.lignes.some(l => l.articleId === rowId));
      const hasRec = receptions.some(r => r.lignes.some(l => l.articleId === rowId));
      const hasStock = stocks.some(s => s.articleId === rowId && s.quantite > 0);
      const hasAff = affectations.some(a => a.articleId === rowId);
      const hasTr  = transferts.some(t => t.lignes.some(l => l.articleId === rowId));
      const hasMov = mouvements.some(m => m.articleId === rowId);

      if (hasBC || hasRec || hasStock || hasAff || hasTr || hasMov) {
        const details: string[] = [];
        if (hasBC)    details.push('• Demandes d\'Achat');
        if (hasRec)   details.push('• Bons de Réception (BL)');
        if (hasStock) details.push('• Stock physique existant (quantité > 0)');
        if (hasAff)   details.push('• Affectations de matériel');
        if (hasTr)    details.push('• Transferts inter-magasins');
        if (hasMov)   details.push('• Mouvements de stock');
        alert(
          '⛔ Suppression impossible — Article associé\n\n' +
          'Cet article ne peut pas être supprimé car il est référencé dans :\n\n' +
          details.join('\n') +
          '\n\nVeuillez d\'abord clôturer ou supprimer les pièces associées.'
        );
        return;
      }
    }

    // ── 2. MAGASINS ────────────────────────────────────────────────────────────
    else if (activeTab === 'magasins') {
      const hasBC  = commandes.some(c => c.magasinDestinationId === rowId);
      const hasRec = receptions.some(r => r.magasinId === rowId);
      const hasStock = stocks.some(s => s.magasinId === rowId && s.quantite > 0);
      const hasAff = affectations.some(a => a.magasinId === rowId);
      const hasTr  = transferts.some(t => t.magasinDepartId === rowId || t.magasinDestId === rowId);
      const hasMov = mouvements.some(m => m.magasinId === rowId);

      if (hasBC || hasRec || hasStock || hasAff || hasTr || hasMov) {
        const details: string[] = [];
        if (hasBC)    details.push('• Demandes d\'Achat destinées à ce magasin');
        if (hasRec)   details.push('• Réceptions de marchandises');
        if (hasStock) details.push('• Stock physique existant (quantité > 0)');
        if (hasAff)   details.push('• Affectations de matériel sorties de ce dépôt');
        if (hasTr)    details.push('• Transferts inter-magasins (départ ou destination)');
        if (hasMov)   details.push('• Mouvements de stock enregistrés');
        alert(
          '⛔ Suppression impossible — Magasin associé\n\n' +
          'Ce magasin/dépôt ne peut pas être supprimé car il est lié à :\n\n' +
          details.join('\n') +
          '\n\nVeuillez d\'abord archiver les pièces associées à ce dépôt.'
        );
        return;
      }
    }

    // ── 3. FOURNISSEURS ────────────────────────────────────────────────────────
    else if (activeTab === 'fournisseurs') {
      const hasBC  = commandes.some(c => c.fournisseurId === rowId);
      const hasFac = factures.some(f => f.fournisseurId === rowId);
      const hasPay = paiements.some(p => p.fournisseurId === rowId);

      if (hasBC || hasFac || hasPay) {
        const details: string[] = [];
        if (hasBC)  details.push('• Demandes d\'Achat émises à ce fournisseur');
        if (hasFac) details.push('• Factures d\'achat enregistrées');
        if (hasPay) details.push('• Règlements / Paiements effectués');
        alert(
          '⛔ Suppression impossible — Fournisseur associé\n\n' +
          'Ce fournisseur ne peut pas être supprimé car il possède des pièces comptables actives :\n\n' +
          details.join('\n') +
          '\n\nVeuillez d\'abord clôturer toutes les pièces de ce fournisseur.'
        );
        return;
      }
    }

    // ── 4. DEMANDES D\'ACHAT (DA) ────────────────────────────────────────────
    else if (activeTab === 'achats') {
      const hasRec = receptions.some(r => r.commandeId === rowId);
      const hasFac = factures.some(f => f.commandeId === rowId);

      if (hasRec || hasFac) {
        const details: string[] = [];
        if (hasRec) details.push('• Bon(s) de Réception (BL) liés à cette DA');
        if (hasFac) details.push('• Facture(s) d\'achat associées à cette DA');
        alert(
          '⛔ Suppression impossible — Demande d\'Achat associée\n\n' +
          'Cette Demande d\'Achat ne peut pas être supprimée car elle est référencée dans :\n\n' +
          details.join('\n') +
          '\n\nVeuillez d\'abord supprimer les réceptions et factures liées.'
        );
        return;
      }
    }

    // ── 5. RÉCEPTIONS (BL) ──────────────────────────────────────────────────
    else if (activeTab === 'receptions') {
      const rec = receptions.find(r => r.id === rowId);
      if (rec && rec.statut === 'Validée') {
        alert(
          '⛔ Suppression impossible — BL Validé\n\n' +
          'Ce Bon de Réception a été validé et ne peut plus être supprimé.\n\n' +
          'Seuls les BL non validés peuvent être supprimés.'
        );
        return;
      }
      const hasFac = factures.some(f => f.receptionId === rowId);
      if (hasFac) {
        alert(
          '⛔ Suppression impossible — Réception associée\n\n' +
          'Ce Bon de Réception (BL) ne peut pas être supprimé car une Facture d\'achat y est associée.\n\n' +
          'Veuillez d\'abord supprimer ou délier la facture correspondante.'
        );
        return;
      }
    }

    // ── 6. FACTURES ─────────────────────────────────────────────────────────
    else if (activeTab === 'factures') {
      const fac = factures.find(f => f.id === rowId);
      // Rattachement par identifiant OU par référence seule (lettrage orphelin)
      const linkedPays = paiements.filter(p => p.factureId === rowId || (fac && p.factureRef === fac.code));

      if (linkedPays.length > 0) {
        const refs = linkedPays.map(p => `${p.code} (${p.montant.toLocaleString()} DA)`).join('\n• ');
        alert(
          '⛔ Suppression impossible — Facture lettrée\n\n' +
          'Cette Facture est associée aux règlements suivants :\n\n' +
          '• ' + refs +
          '\n\nVeuillez d\'abord délettrer (dissocier) ces règlements avant de supprimer la facture.'
        );
        return;
      }

      if (fac) {
        const recs = (fac.receptionCode || '').split(',').map(c => c.trim()).filter(Boolean);
        const partiellementReglee = fac.soldeRestant !== fac.montantTTC;
        const ok = window.confirm(
          `Supprimer définitivement la facture ${fac.code} (${fac.montantTTC.toLocaleString()} DA) ?\n\n` +
          (recs.length ? `Réceptions qui redeviendront facturables :\n• ${recs.join('\n• ')}\n\n` : '') +
          'La dette du fournisseur ne sera PAS modifiée : elle provient des réceptions, pas des factures.\n' +
          (partiellementReglee
            ? `\n⚠️ Restant dû (${fac.soldeRestant.toLocaleString()} DA) différent du TTC : cette facture a été réglée puis délettrée.\n`
            : '') +
          '\nCette action est irréversible.'
        );
        if (!ok) return;
        // Confirmation spécifique déjà obtenue : on court-circuite la confirmation générique
        const res = await SupabaseDatabase.deleteFacture(rowId);
        if (!res.success) {
          alert('⛔ Suppression impossible\n\n' + (res.raison || 'Erreur inconnue.'));
          return;
        }
        setSelectedRowId(null);
        await reloadData();
        return;
      }
    }

    // ── 7. PAIEMENTS / RÈGLEMENTS (FINANCES) ────────────────────────────────
    else if (activeTab === 'finances') {
      const pay = paiements.find(p => p.id === rowId);
      if (pay && pay.lettre) {
        alert(
          '⛔ Suppression impossible — Règlement lettré\n\n' +
          'Ce règlement (réf. ' + pay.code + ') est lettré et associé à la facture ' + (pay.factureRef || pay.factureId) + '.\n\n' +
          'Veuillez d\'abord dissocier ce règlement de la facture avant de le supprimer.'
        );
        return;
      }
    }

    // ── 8. AFFECTATIONS (BS) ──────────────────────────────────────────
    else if (activeTab === 'affectations') {
      const aff = affectations.find(a => a.id === rowId);
      if (aff && ['Validé', 'Validée'].includes(String(aff.statut))) {
        alert(
          '⛔ Suppression impossible — Bon d\'Affectation Validé\n\n' +
          'Ce Bon d\'Affectation (BS) a déjà été validé et ne peut plus être supprimé.\n\n' +
          'Seuls les bons d\'affectation non validés peuvent être supprimés.'
        );
        return;
      }
    }
    // ── 9. TRANSFERTS ───────────────────────────────────────────────────────
    else if (activeTab === 'transferts') {
      const tr = transferts.find(t => t.id === rowId);
      if (tr && (tr.statut === 'Validé' || tr.statut === 'Expédié' || tr.statut === 'Reçu')) {
        alert(
          '⛔ Suppression impossible — Transfert Traité\n\n' +
          'Ce Bon de Transfert a déjà été validé ou reçu et ne peut plus être supprimé.'
        );
        return;
      }
    }

    // ── 10. INVENTAIRES ───────────────────────────────────────────────────────
    else if (activeTab === 'inventaires') {
      const inv = inventaires.find(i => i.id === rowId);
      if (inv && inv.statut === 'Validé') {
        alert(
          '⛔ Suppression impossible — Inventaire Validé\n\n' +
          'Cet inventaire ne peut pas être supprimé car il a déjà été validé et a généré des mouvements de stock.'
        );
        return;
      }
    }

    // ── CONFIRMATION ET SUPPRESSION EFFECTIVE ──────────────────────────────
    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cet élément ?\n\nCette action est irréversible.')) {
      if (activeTab === 'articles') {
        const success = await SupabaseDatabase.deleteArticle(rowId);
        if (!success) {
          alert('Erreur lors de la suppression de l\'article dans Supabase.');
          return;
        }
      } else if (activeTab === 'magasins') {
        const success = await SupabaseDatabase.deleteMagasin(rowId);
        if (!success) {
          alert('Erreur lors de la suppression du magasin dans Supabase.');
          return;
        }
      } else if (activeTab === 'fournisseurs') {
        const success = await SupabaseDatabase.deleteFournisseur(rowId);
        if (!success) {
          alert('Erreur lors de la suppression du fournisseur.');
          return;
        }
      } else if (activeTab === 'achats') {
        const updated = commandes.filter(c => c.id !== rowId);
        localStorage.setItem('bgm_commandes', JSON.stringify(updated));
      } else if (activeTab === 'receptions') {
        const success = await SupabaseDatabase.deleteReception(rowId);
        if (!success) {
          alert('Erreur lors de la suppression du BL dans Supabase.');
          return;
        }
      } else if (activeTab === 'factures') {
        const res = await SupabaseDatabase.deleteFacture(rowId);
        if (!res.success) {
          alert('⛔ Suppression impossible\n\n' + (res.raison || 'Erreur inconnue.'));
          return;
        }
        if (res.receptionsLiberees && res.receptionsLiberees.length > 0) {
          alert(
            '✅ Facture supprimée\n\n' +
            'Les réceptions suivantes redeviennent facturables :\n• ' + res.receptionsLiberees.join('\n• ') +
            '\n\nLa dette du fournisseur est inchangée : elle provient des réceptions, pas des factures.'
          );
        }
      } else if (activeTab === 'affectations') {
        const success = await SupabaseDatabase.deleteAffectation(rowId);
        if (!success) {
          alert('Erreur lors de la suppression du Bon d\'Affectation.');
          return;
        }
      } else if (activeTab === 'transferts') {
        const success = await SupabaseDatabase.deleteTransfert(rowId);
        if (!success) {
          alert('Erreur lors de la suppression du Bon de Transfert.');
          return;
        }
      } else if (activeTab === 'finances') {

        const updated = paiements.filter(p => p.id !== rowId);
        localStorage.setItem('bgm_paiements', JSON.stringify(updated));
      } else if (activeTab === 'inventaires') {
        const success = await SupabaseDatabase.deleteInventaire(rowId);
        if (!success) {
          alert('Erreur lors de la suppression de l\'inventaire dans Supabase.');
          return;
        }
      }
      setSelectedRowId(null);
      reloadData();
    }
  };

  const handleRibbonPrint = () => {
    if (activeTab === 'stocks') {
      const selectedMag = magasins.find(m => m.id === selectedMagasinFilter);
      const items = stockConsolideMode
        ? articles.map(art => ({
            reference: art.reference,
            designation: art.designation,
            unite: art.unite,
            stockMinimum: art.stockMinimum,
            quantite: stocks.filter(s => s.articleId === art.id).reduce((sum, s) => sum + s.quantite, 0)
          }))
        : getFilteredStocks().map(s => {
            const art = articles.find(a => a.id === s.articleId);
            const mag = magasins.find(m => m.id === s.magasinId);
            return {
              reference: art?.reference || '—',
              designation: art?.designation || 'Inconnu',
              magasinNom: mag?.nom || 'Dépôt',
              unite: art?.unite || 'u',
              stockMinimum: art?.stockMinimum || 0,
              quantite: s.quantite
            };
          });

      setPrintDoc({
        type: 'stock',
        magasinNom: stockConsolideMode ? 'Stock Consolidé Global' : (selectedMag?.nom || 'Tous les Dépôts'),
        isConsolide: stockConsolideMode,
        items
      });
      return;
    }

    if (!selectedRowId) {
      alert('Veuillez sélectionner un document dans le tableau à imprimer.');
      return;
    }

    if (activeTab === 'achats') {
      const doc = commandes.find(c => c.id === selectedRowId);
      if (doc) setPrintDoc({ type: 'commande', data: doc });
    } else if (activeTab === 'transferts') {
      const doc = transferts.find(t => t.id === selectedRowId);
      if (doc) setPrintDoc({ type: 'transfert', data: doc });
    } else if (activeTab === 'factures') {
      const doc = factures.find(f => f.id === selectedRowId);
      if (doc) openFacturePrint(doc);
    } else if (activeTab === 'receptions') {
      const doc = receptions.find(r => r.id === selectedRowId);
      if (doc) setPrintDoc({ type: 'reception', data: doc });
    } else if (activeTab === 'affectations') {
      const doc = affectations.find(a => a.id === selectedRowId);
      if (doc) setPrintDoc({ type: 'affectation', data: doc });
    } else if (activeTab === 'inventaires') {
      const doc = inventaires.find(i => i.id === selectedRowId);
      if (doc) {
        let lines: InventaireLigne[] = doc.lignes;
        if (typeof lines === 'string') {
          try { lines = JSON.parse(lines as unknown as string); } catch { lines = []; }
        }
        if (!Array.isArray(lines)) lines = [];
        setPrintDoc({ type: 'inventaire', data: doc, lines });
      }
    } else {
      alert('Impression indisponible pour ce module.');
    }
  };

  // Contenu imprimable d'une facture : la table `factures` ne stocke pas de lignes,
  // on reconstitue le détail depuis les réceptions rattachées (receptionId + codes de
  // receptionCode, qui peut en lister plusieurs) et les règlements depuis `paiements`
  // (rattachement par factureId, ou par factureRef pour le lettrage hérité).
  const openFacturePrint = (fac: Facture) => {
    const codesRecs = (fac.receptionCode || '').split(',').map(c => c.trim()).filter(Boolean);
    const recsLiees = receptions.filter(r => r.id === fac.receptionId || codesRecs.includes(r.code));

    const lignes = recsLiees.flatMap(rec =>
      (rec.lignes || [])
        .filter(l => (l.quantiteRecue || 0) > 0)
        .map(l => ({
          designation: l.designation,
          quantite: l.quantiteRecue || 0,
          prixUnitaire: l.quantiteRecue ? getLigneValeurHT(l) / l.quantiteRecue : 0
        }))
    );

    const reglements = paiements.filter(p => p.factureId === fac.id || (!!fac.code && p.factureRef === fac.code));

    setPrintDoc({ type: 'facture', data: fac, lignes, reglements });
  };

  // ── SAUVEGARDE DE LA BASE ───────────────────────────────────────────────────
  // Copie intégrale des tables Supabase dans un fichier JSON téléchargé localement.
  // Aucune écriture n'est faite : c'est un export de sécurité, pas une migration.
  // `auto` : déclenchement par le planificateur. Aucune boîte de dialogue ne doit
  // s'interposer, et les mots de passe restent masqués quel que soit le réglage
  // de la case — personne n'est là pour valider un export sensible.
  const handleTelechargerSauvegarde = async (format: 'json' | 'sql', auto = false) => {
    if (currentUser.role !== 'direction' && currentUser.role !== 'directeur') {
      if (!auto) alert('⛔ La sauvegarde de la base est réservée à la direction.');
      return;
    }
    if (sauvegardeEnCours) return;

    const inclureMotsDePasse = sauvegardeMotsDePasse && !auto;

    if (inclureMotsDePasse && !window.confirm(
      '⚠️ Les mots de passe des utilisateurs sont stockés en clair.\n\n' +
      'Le fichier téléchargé contiendra donc tous les identifiants de connexion.\n' +
      'Conservez-le sur un support sûr (disque chiffré, coffre-fort numérique).\n\n' +
      'Continuer avec les mots de passe inclus ?'
    )) return;

    setSauvegardeEnCours(true);
    setSauvegardeEtape('Préparation…');
    try {
      const options = {
        inclureMotsDePasse,
        onProgress: (table: string, index: number, total: number) => {
          setSauvegardeEtape(table ? `Lecture de « ${table} » (${index + 1}/${total})…` : 'Génération du fichier…');
        }
      };

      const sauvegarde = format === 'sql'
        ? await SupabaseDatabase.exporterSauvegardeSQL(options)
        : await SupabaseDatabase.exporterSauvegarde(options);

      const contenu = format === 'sql'
        ? (sauvegarde as { sql: string }).sql
        : JSON.stringify(sauvegarde, null, 2);

      const maintenant = new Date();
      const horodatage =
        `${maintenant.getFullYear()}${String(maintenant.getMonth() + 1).padStart(2, '0')}${String(maintenant.getDate()).padStart(2, '0')}` +
        `-${String(maintenant.getHours()).padStart(2, '0')}${String(maintenant.getMinutes()).padStart(2, '0')}`;
      const fichier = `sauvegarde-bgm-${horodatage}.${format}`;

      const blob = new Blob([contenu], {
        type: format === 'sql' ? 'application/sql;charset=utf-8;' : 'application/json;charset=utf-8;'
      });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = fichier;
      lien.click();
      URL.revokeObjectURL(url);

      const poidsKo = blob.size / 1024;
      setDerniereSauvegarde({
        fichier,
        date: maintenant.toLocaleString('fr-FR'),
        lignes: sauvegarde.meta.nombreLignesTotal,
        poids: poidsKo > 1024 ? `${(poidsKo / 1024).toFixed(2)} Mo` : `${poidsKo.toFixed(1)} Ko`,
        statistiques: sauvegarde.statistiques,
        tablesAbsentes: sauvegarde.tablesAbsentes,
        erreurs: sauvegarde.erreurs
      });

      // Une sauvegarde manuelle remet aussi le compteur à zéro : inutile d'en
      // réclamer une le lendemain si l'utilisateur vient d'en faire une.
      const planMaj = { ...planSauvegarde, derniereExecution: maintenant.toISOString() };
      setPlanSauvegarde(planMaj);
      ecrirePlanSauvegarde(planMaj);
      setSauvegardeDue(false);

      if (sauvegarde.erreurs.length > 0) {
        alert(
          '⚠️ Sauvegarde téléchargée, mais certaines tables n\'ont pas pu être lues :\n\n' +
          sauvegarde.erreurs.map(e => `• ${e.table} : ${e.message}`).join('\n') +
          '\n\nCes tables sont absentes du fichier. Vérifiez les droits (RLS) puis relancez la sauvegarde.'
        );
      }
    } catch (err) {
      alert('⛔ Échec de la sauvegarde\n\n' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSauvegardeEnCours(false);
      setSauvegardeEtape('');
    }
  };

  // Planificateur : l'échéance est évaluée une seule fois par session, à l'ouverture.
  // Pas de minuterie répétée — un onglet laissé ouvert plusieurs jours déclencherait
  // des téléchargements sans personne devant l'écran.
  // Déclaré ici, après handleTelechargerSauvegarde, pour ne pas le référencer avant
  // son initialisation.
  useEffect(() => {
    if (!isAuthenticated || planExecuteRef.current) return;
    if (currentUser.role !== 'direction' && currentUser.role !== 'directeur') return;
    if (!sauvegardeEstDue(planSauvegarde)) return;

    planExecuteRef.current = true;
    // Différé : laisse le chargement initial se terminer avant de relire toutes les tables.
    const minuterie = setTimeout(() => {
      if (planSauvegarde.mode === 'auto') void handleTelechargerSauvegarde(planSauvegarde.format, true);
      else setSauvegardeDue(true);
    }, planSauvegarde.mode === 'auto' ? 4000 : 1200);
    return () => clearTimeout(minuterie);
    // handleTelechargerSauvegarde est volontairement hors des dépendances : son identité
    // change à chaque rendu, l'effet serait rejoué et son nettoyage annulerait la minuterie
    // avant qu'elle n'arrive à échéance. Le garde planExecuteRef assure l'exécution unique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, planSauvegarde, currentUser.role]);

  const handleGenericExport = () => {
    // Basic CSV helper to export current filter items
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `mgx-manager_export_${activeTab}.csv`;

    if (activeTab === 'articles') {
      headers = ['Référence', 'Désignation', 'Catégorie', 'Unité', 'Stock Min', 'Prix Moyen'];
      rows = getFilteredArticles().map(a => [a.reference, a.designation, a.categorie, a.unite, String(a.stockMinimum), String(a.prixMoyen)]);
    } else if (activeTab === 'magasins') {
      headers = ['Code', 'Nom', 'Ville', 'Wilaya', 'Responsable', 'Téléphone', 'Statut'];
      rows = getFilteredMagasins().map(m => [m.code, m.nom, m.ville, m.wilaya, m.responsable, m.telephone, m.actif ? 'Actif' : 'Inactif']);
    } else if (activeTab === 'fournisseurs') {
      headers = ['Société', 'RC/NIF', 'Contact', 'Téléphone', 'Adresse', 'Solde'];
      rows = fournisseurs.map(f => [f.nomSociete, f.rcNif, f.contactNom, f.telephone, f.adresse, String(f.solde)]);
    } else if (activeTab === 'achats') {
      headers = ['Code', 'Date', 'Fournisseur', 'Total TTC', 'Statut'];
      rows = getFilteredCommandes().map(c => [c.code, c.dateCommande, c.fournisseurNom || '', String(c.totalTTC), c.statut]);
    } else if (activeTab === 'stocks') {
      headers = ['Magasin', 'Article', 'Stock Actuel'];
      rows = getFilteredStocks().map(s => {
        const art = articles.find(a => a.id === s.articleId);
        const mag = magasins.find(m => m.id === s.magasinId);
        return [mag?.nom || '', art?.designation || '', String(s.quantite)];
      });
    } else {
      alert('Export CSV générique non disponible pour ce module.');
      return;
    }

    const content = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...rows.map(r => r.map(escapeCsv).join(';'))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper values
  const getAuthorizedMagasins = () => {
    return magasins.filter(m => 
      currentUser.role === 'direction' || 
      (currentUser.magasinsIds && currentUser.magasinsIds.includes(m.id)) || 
      currentUser.magasinId === m.id
    );
  };

  const getAffectationEmitterMagasins = () => {
    return [...magasins]
      .filter(m => m.actif !== false)
      .sort((a, b) => a.nom.localeCompare(b.nom));
  };

  // ── RECHERCHE GLOBALE (champ « Rechercher… » de l'en-tête) ───────────────────
  // Insensible à la casse ET aux accents : indispensable en français, « bejaia » doit
  // trouver « Béjaïa » et « recu » doit trouver « Reçu ». Une requête vide laisse tout passer.
  const normalizeSearch = (v: unknown) =>
    String(v ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, ''); // supprime les signes diacritiques laissés par la décomposition NFD

  const searchTerm = normalizeSearch(searchQuery).trim();

  // matchSearch(...champs) : vrai si la recherche est vide ou si un champ contient le terme.
  // Les nombres sont acceptés (recherche par montant) et les valeurs vides ignorées.
  const matchSearch = (...values: unknown[]) => {
    if (!searchTerm) return true;
    return values.some(v => v !== undefined && v !== null && v !== '' && normalizeSearch(v).includes(searchTerm));
  };

  const getFilteredMagasins = () => {
    return getAuthorizedMagasins().filter(m => {
      if (m.actif === false) return false;
      return matchSearch(m.nom, m.code, m.ville, m.wilaya, m.responsable, m.telephone);
    });
  };

  // Filter lists based on search
  const getFilteredArticles = () => {
    return articles.filter(art => matchSearch(art.designation, art.reference, art.categorie, art.unite));
  };

  const getFilteredFournisseurs = () => {
    return fournisseurs.filter(f => matchSearch(f.nomSociete, f.rcNif, f.contactNom, f.telephone, f.email, f.adresse));
  };

  const getFilteredStocks = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return stocks.filter(stk => {
      if (!authIds.includes(stk.magasinId)) return false;
      if (selectedMagasinFilter && stk.magasinId !== selectedMagasinFilter) return false;

      const art = articles.find(a => a.id === stk.articleId);
      const mag = magasins.find(m => m.id === stk.magasinId);
      if (!art || !mag) return false;
      return matchSearch(art.designation, art.reference, art.categorie, mag.nom);
    });
  };

  const getFilteredCommandes = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return commandes.filter(cmd => {
      if (!authIds.includes(cmd.magasinDestinationId)) return false;
      if (selectedMagasinFilter && cmd.magasinDestinationId !== selectedMagasinFilter) return false;

      return matchSearch(cmd.code, cmd.fournisseurNom, cmd.statut, cmd.createdByNom, cmd.observation);
    });
  };

  const getFilteredTransferts = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return transferts.filter(tr => {
      const hasDepart = authIds.includes(tr.magasinDepartId);
      const hasDest = authIds.includes(tr.magasinDestId);
      if (!hasDepart && !hasDest) return false;

      if (selectedMagasinFilter &&
          tr.magasinDepartId !== selectedMagasinFilter &&
          tr.magasinDestId !== selectedMagasinFilter) {
        return false;
      }
      return matchSearch(tr.code, tr.magasinDepartNom, tr.magasinDestNom, tr.statut, tr.demandeurNom, tr.motif);
    });
  };

  const getFilteredAffectations = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return affectations.filter(aff => {
      if (!authIds.includes(aff.magasinId)) return false;
      if (selectedMagasinFilter && aff.magasinId !== selectedMagasinFilter) return false;

      return matchSearch(aff.code, aff.employeNom, aff.chantierNom, aff.articleDesignation, aff.magasinNom, aff.statut);
    });
  };

  const getFilteredReceptions = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return receptions.filter(rec => {
      if (!authIds.includes(rec.magasinId)) return false;
      if (selectedMagasinFilter && rec.magasinId !== selectedMagasinFilter) return false;

      return matchSearch(rec.code, rec.bonLivraisonRef, rec.commandeCode, rec.fournisseurNom, rec.magasinNom, rec.statut);
    });
  };

  const getFilteredInventaires = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return inventaires.filter(inv => {
      if (!authIds.includes(inv.magasinId)) return false;
      if (selectedMagasinFilter && inv.magasinId !== selectedMagasinFilter) return false;
      return matchSearch(inv.code, inv.magasinNom, inv.statut, inv.creeParNom);
    });
  };

  const getFilteredFactures = () => {
    return factures.filter(fac => matchSearch(fac.code, fac.fournisseurNom, fac.statut, fac.commandeCode, fac.receptionCode));
  };

  const getFilteredPaiements = () => {
    return paiements.filter(pay => matchSearch(pay.code, pay.fournisseurNom, pay.mode, pay.referenceTransaction, pay.factureRef, pay.comptableNom));
  };

  const getFilteredEmployes = () => {
    return employes.filter(emp => matchSearch(emp.nom, emp.fonction, emp.service, emp.telephone, emp.chantierNom));
  };

  const getFilteredChantiers = () => {
    return chantiers.filter(cha => matchSearch(cha.nom, cha.wilaya, cha.chefNom));
  };

  const getFilteredUsers = () => {
    return users.filter(u => matchSearch(u.name, u.email, u.telephone, u.role));
  };

  // ── FILTRE DU MENU ARBORESCENT (champ « Filtrer les menus… ») ────────────────
  // Le test était inversé : il vérifiait si un mot-clé codé en dur contenait la saisie
  // ('achats'.includes('demande') === false), donc taper « demande » ou « da » masquait
  // le groupe qui contient « Demandes d'Achat ». On compare désormais la saisie aux
  // libellés réellement affichés, sans accent ni casse.
  const TREE_MENU: Record<string, { groupe: string; noeuds: string[] }> = {
    stock: { groupe: 'Stock', noeuds: ['Catalogue Articles', 'Magasins / Dépôts', 'Niveaux de Stocks', 'Inventaires Physiques'] },
    achats: { groupe: 'Comptoir / Achats', noeuds: ["Demandes d'Achat", 'DA', 'Réceptions BL', 'Fournisseurs'] },
    chantiers: { groupe: 'Chantiers & Logistique', noeuds: ['Affectations Matériel', 'Employés & Chantiers', 'Transferts Inter-Mag'] },
    compta: { groupe: 'Comptabilité & Analyses', noeuds: ["Factures d'Achats", 'Règlements Fournisseurs', 'Rapports & Graphiques'] },
    admin: { groupe: 'Administration', noeuds: ['Utilisateurs & Droits', 'Société — Infos & Coordonnées', 'entreprise', 'coordonnées', 'Sauvegarde de la Base', 'backup', 'export', 'archive'] }
  };

  const treeGroupVisible = (key: keyof typeof TREE_MENU | string) => {
    const filtre = normalizeSearch(treeFilter).trim();
    if (!filtre) return true;
    const entry = TREE_MENU[key];
    if (!entry) return true;
    return normalizeSearch(entry.groupe).includes(filtre) ||
           entry.noeuds.some(n => normalizeSearch(n).includes(filtre));
  };

  // Un groupe replié resterait vide pendant une recherche : on le déplie tant qu'un filtre est saisi.
  const treeGroupExpanded = (key: string) => !!treeFilter || !!expandedNodes[key];

  // Fiche de stock : tout l'historique d'un article (réceptions, sorties, transferts, inventaires),
  // trié du plus ancien au plus récent pour pouvoir cumuler le solde ligne par ligne.
  // magasinId à null = consolidé sur tous les dépôts autorisés.
  const getFicheStockMouvements = (articleId: string, magasinId: string | null) => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return mouvements
      .filter(mov => mov.articleId === articleId)
      .filter(mov => (magasinId ? mov.magasinId === magasinId : authIds.includes(mov.magasinId)))
      .sort((a, b) => new Date(a.dateMouvement).getTime() - new Date(b.dateMouvement).getTime());
  };

  const openFicheStock = (articleId: string, magasinId: string | null) => {
    setFicheStockArticleId(articleId);
    setFicheStockMagasinId(magasinId);
    setFicheStockOpen(true);
  };

  const currentMagasinName = currentUser.magasinId 
    ? magasins.find(m => m.id === currentUser.magasinId)?.nom 
    : 'Tous les magasins';

  // Toggle tree node expansion
  const toggleNode = (node: string) => {
    setExpandedNodes({
      ...expandedNodes,
      [node]: !expandedNodes[node]
    });
  };

  // Helper to map activeTab to display title
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Page d\'accueil';
      case 'magasins': return 'Magasins';
      case 'articles': return 'Catalogue Articles';
      case 'fournisseurs': return 'Fournisseurs';
      case 'achats': return "Demandes d'Achat (DA)";
      case 'receptions': return 'Réceptions BL';
      case 'stocks': return 'Niveaux de Stocks';
      case 'affectations': return 'Affectations Matériel';
      case 'employes': return 'Employés & Chantiers';
      case 'transferts': return 'Transferts Inter-Mag';
      case 'factures': return 'Factures d\'Achats';
      case 'finances': return 'Paiements / Règlements';
      case 'audit': return 'Journal d\'Audit';
      case 'societe': return 'Société';
      case 'users': return 'Utilisateurs & Droits';
      case 'sauvegarde': return 'Sauvegarde de la Base';
      default: return tab;
    }
  };

  // ═══════════════════════════════════════════════════════
  // LOGIN PAGE (shown when not authenticated)
  // ═══════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="login-page" data-theme={theme}>
        {/* Animated background shapes */}
        <div className="login-bg-shapes">
          <div className="login-shape login-shape-1"></div>
          <div className="login-shape login-shape-2"></div>
          <div className="login-shape login-shape-3"></div>
          <div className="login-shape login-shape-4"></div>
        </div>

        <div className="login-container">
          {/* Left branding panel */}
          <div className="login-brand-panel">
            <div className="login-brand-content">
              <div className="login-logo-icon">
                <Building2 size={40} />
              </div>
              <h1 className="login-brand-title">MGX-MANAGER</h1>
              <p className="login-brand-subtitle">Gestion Multi-Magasins</p>
              <div className="login-brand-divider"></div>
              <p className="login-brand-desc">
                Plateforme intégrée de gestion des stocks, achats, comptabilité et chantiers pour l'entreprise de construction.
              </p>
              <div className="login-brand-features">
                <div className="login-feature-item"><Package size={16} /> <span>Stocks multi-dépôts</span></div>
                <div className="login-feature-item"><ShoppingCart size={16} /> <span>Cycle Achats complet</span></div>
                <div className="login-feature-item"><Landmark size={16} /> <span>Comptabilité & Lettrage</span></div>
                <div className="login-feature-item"><BarChart3 size={16} /> <span>Analyses en temps réel</span></div>
              </div>
            </div>
          </div>

          {/* Right login form panel */}
          <div className="login-form-panel">
            <div className="login-form-header">
              <button 
                className="login-theme-toggle" 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                title="Basculer le thème"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <h2 className="login-title">Connexion</h2>
              <p className="login-subtitle">Bienvenue ! Veuillez vous authentifier pour accéder à votre espace de travail.</p>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              {loginError && (
                <div className="login-error">
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="login-field">
                <label className="login-label">Adresse e-mail</label>
                <div className="login-input-wrapper">
                  <Mail size={18} className="login-input-icon" />
                  <input
                    type="email"
                    className="login-input"
                    placeholder="nom@benamar.dz"
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label">Mot de passe</label>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className={`login-submit-btn ${loginLoading ? 'loading' : ''}`}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <span className="login-spinner"></span>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Se connecter</span>
                  </>
                )}
              </button>
            </form>

          </div>
        </div>

        <div className="login-footer">
          <span>© 2026 MGX-MANAGER — Benamar Group Management</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // MAIN APPLICATION (shown when authenticated)
  // ═══════════════════════════════════════════════════════
  return (
    <div className="app-container">
      {loginModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Connexion requise</h3>
            <form onSubmit={(e) => { setLoginError(''); handleLogin(e); setLoginModalOpen(false); }}>
              {loginError && <div className="login-error"><AlertCircle size={16} /><span>{loginError}</span></div>}
              <div className="login-field">
                <label>Adresse e-mail</label>
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
              </div>
              <div className="login-field">
                <label>Mot de passe</label>
                <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setLoginModalOpen(false)}>Annuler</button>
                <button type="submit" className={loginLoading ? 'loading' : ''}>{loginLoading ? 'Connexion...' : 'Se connecter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- Modern App Header --- */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo-container">
            <Building2 className="header-logo" size={24} />
          </div>
          <div className="header-titles">
            <h1>MGX-MANAGER</h1>
            <span className="header-badge">{getTabLabel(activeTab)}</span>
          </div>
        </div>
        
        <div className="header-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder={['dashboard', 'societe'].includes(activeTab)
              ? 'Recherche indisponible sur cette page'
              : `Rechercher dans ${getTabLabel(activeTab)}…`}
            title="La recherche filtre le journal de la page affichée (insensible à la casse et aux accents)"
            disabled={['dashboard', 'societe'].includes(activeTab)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="win-tab-close"
              style={{ flexShrink: 0, marginLeft: '8px' }}
              title="Effacer la recherche"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="header-right">
          <div className="magasin-badge">
            <span className="magasin-dot"></span>
            {!currentUser.magasinId ? (
              <select 
                value={selectedMagasinFilter || ''}
                onChange={(e) => setSelectedMagasinFilter(e.target.value || null)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', WebkitAppearance: 'none' }}
              >
                {currentUser.role === 'direction' ? (
                  <option value="">Tous les magasins</option>
                ) : (
                  <option value="">Tous mes magasins ({getAuthorizedMagasins().length})</option>
                )}
                {getAuthorizedMagasins().map(m => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
            ) : (
              currentMagasinName
            )}
          </div>
          {/* Actualiser : seule action de l'ancienne barre d'outils à ne pas être dupliquée
              par page — recharge toutes les collections depuis Supabase. */}
          <button className="icon-btn" onClick={() => { void reloadData(); }} title="Actualiser les données">
            <RefreshCw size={18} />
          </button>
          <button className="icon-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Basculer le thème">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <div className="user-info-badge">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="user-avatar-img" />
            ) : (
              <div className="user-avatar-placeholder">
                <ShieldCheck size={16} />
              </div>
            )}
            <div className="user-info-text">
              <span className="user-info-name">{currentUser.name}</span>
              <span className="user-info-role">{getRoleLabel(currentUser.role)}</span>
            </div>
          </div>
          <button className="icon-btn logout-btn" onClick={handleLogout} title="Se déconnecter">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Barre d'outils globale supprimée : ses actions (Nouveau / Modifier / Supprimer / Imprimer)
          faisaient doublon avec les boutons d'en-tête propres à chaque page. */}

      {/* 5. Main split layout */}
      <div className="win-workspace">
        {/* Left Side Tree Navigation Pane */}
        <aside className="win-left-panel">
          <div className="win-panel-header">
            <span>Gestion commerciale</span>
            <Folder size={12} />
          </div>
          
          <div className="win-tree-filter">
            <input 
              type="text" 
              placeholder="Filtrer les menus..." 
              className="win-tree-filter-input"
              value={treeFilter}
              onChange={(e) => setTreeFilter(e.target.value)}
            />
          </div>

          <div className="win-tree-container">
            {/* Group 1: Stock */}
            {treeGroupVisible('stock') && (
              <div className="tree-group">
                <div className="tree-group-header" onClick={() => toggleNode('stock')}>
                  {treeGroupExpanded('stock') ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} style={{ color: '#ffc107' }} />
                  <span>Stock</span>
                </div>
                {treeGroupExpanded('stock') && (
                  <div className="tree-group-nodes">
                    <div className={`tree-node ${activeTab === 'articles' ? 'active' : ''}`} onClick={() => switchTab('articles')}>
                      <Package size={12} style={{ color: '#4caf50' }} />
                      <span>Catalogue Articles</span>
                    </div>
                    {currentUser.role === 'direction' && (
                      <div className={`tree-node ${activeTab === 'magasins' ? 'active' : ''}`} onClick={() => switchTab('magasins')}>
                        <Building2 size={12} style={{ color: '#2196f3' }} />
                        <span>Magasins / Dépôts</span>
                      </div>
                    )}
                    <div className={`tree-node ${activeTab === 'stocks' ? 'active' : ''}`} onClick={() => switchTab('stocks')}>
                      <ClipboardList size={12} style={{ color: '#00bcd4' }} />
                      <span>Niveaux de Stocks</span>
                    </div>
                    <div className={`tree-node ${activeTab === 'inventaires' ? 'active' : ''}`} onClick={() => switchTab('inventaires')}>
                      <FileText size={12} style={{ color: '#ff9800' }} />
                      <span>Inventaires Physiques</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Group 2: Comptoir / Achats */}
            {treeGroupVisible('achats') && (
              <div className="tree-group">
                <div className="tree-group-header" onClick={() => toggleNode('achats')}>
                  {treeGroupExpanded('achats') ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} style={{ color: '#ffc107' }} />
                  <span>Comptoir / Achats</span>
                </div>
                {treeGroupExpanded('achats') && (
                  <div className="tree-group-nodes">
                    {(currentUser.role === 'direction' || currentUser.role === 'achat' || currentUser.role === 'magasinier') && (
                      <div className={`tree-node ${activeTab === 'achats' ? 'active' : ''}`} onClick={() => switchTab('achats')}>
                        <ShoppingCart size={12} style={{ color: '#e91e63' }} />
                        <span>Demandes d'Achat</span>
                      </div>
                    )}
                    {(currentUser.role === 'direction' || currentUser.role === 'magasinier') && (
                      <div className={`tree-node ${activeTab === 'receptions' ? 'active' : ''}`} onClick={() => switchTab('receptions')}>
                        <CheckSquare size={12} style={{ color: '#9c27b0' }} />
                        <span>Réceptions BL</span>
                      </div>
                    )}
                    <div className={`tree-node ${activeTab === 'fournisseurs' ? 'active' : ''}`} onClick={() => switchTab('fournisseurs')}>
                      <Truck size={12} style={{ color: '#ff5722' }} />
                      <span>Fournisseurs</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Group 3: Chantiers & Logistique */}
            {treeGroupVisible('chantiers') && (
              <div className="tree-group">
                <div className="tree-group-header" onClick={() => toggleNode('chantiers')}>
                  {treeGroupExpanded('chantiers') ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} style={{ color: '#ffc107' }} />
                  <span>Chantiers & Logistique</span>
                </div>
                {treeGroupExpanded('chantiers') && (
                  <div className="tree-group-nodes">
                    <div className={`tree-node ${activeTab === 'affectations' ? 'active' : ''}`} onClick={() => switchTab('affectations')}>
                      <Users size={12} style={{ color: '#3f51b5' }} />
                      <span>Affectations Matériel</span>
                    </div>
                    <div className={`tree-node ${activeTab === 'employes' ? 'active' : ''}`} onClick={() => switchTab('employes')}>
                      <Users size={12} style={{ color: '#009688' }} />
                      <span>Employés & Chantiers</span>
                    </div>
                    <div className={`tree-node ${activeTab === 'transferts' ? 'active' : ''}`} onClick={() => switchTab('transferts')}>
                      <RefreshCw size={12} style={{ color: '#673ab7' }} />
                      <span>Transferts Inter-Mag</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Group 4: Comptabilité & Audit */}
            {treeGroupVisible('compta') && (
              <div className="tree-group">
                <div className="tree-group-header" onClick={() => toggleNode('compta')}>
                  {treeGroupExpanded('compta') ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} style={{ color: '#ffc107' }} />
                  <span>Comptabilité & Analyses</span>
                </div>
                {treeGroupExpanded('compta') && (
                  <div className="tree-group-nodes">
                    {(currentUser.role === 'direction' || currentUser.role === 'comptabilite') && (
                      <div className={`tree-node ${activeTab === 'factures' ? 'active' : ''}`} onClick={() => switchTab('factures')}>
                        <FileText size={12} style={{ color: '#009688' }} />
                        <span>Factures d'Achats</span>
                      </div>
                    )}
                    {(currentUser.role === 'direction' || currentUser.role === 'comptabilite') && (
                      <div className={`tree-node ${activeTab === 'finances' ? 'active' : ''}`} onClick={() => switchTab('finances')}>
                        <Landmark size={12} style={{ color: '#795548' }} />
                        <span>Règlements Fourn.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Group 5: Administration */}
            {currentUser.role === 'direction' && treeGroupVisible('admin') && (
              <div className="tree-group">
                <div className="tree-group-header" onClick={() => toggleNode('admin')}>
                  {treeGroupExpanded('admin') ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} style={{ color: '#ffc107' }} />
                  <span>Administration</span>
                </div>
                {treeGroupExpanded('admin') && (
                  <div className="tree-group-nodes">
                    <div className={`tree-node ${activeTab === 'users' ? 'active' : ''}`} onClick={() => switchTab('users')}>
                      <Users size={12} style={{ color: '#6366f1' }} />
                      <span>Utilisateurs & Droits</span>
                    </div>
                    <div
                      className={`tree-node ${activeTab === 'societe' ? 'active' : ''}`}
                      onClick={() => {
                        // Le formulaire part toujours des valeurs enregistrées
                        setSocieteForm(societe || {});
                        switchTab('societe');
                      }}
                    >
                      <Building2 size={12} style={{ color: '#00bcd4' }} />
                      <span>Société — Infos & Coordonnées</span>
                    </div>
                    <div className={`tree-node ${activeTab === 'sauvegarde' ? 'active' : ''}`} onClick={() => switchTab('sauvegarde')}>
                      <Database size={12} style={{ color: '#4caf50' }} />
                      <span>Sauvegarde de la Base</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </aside>

        {/* Center Panel (Tabs + Grid content) */}
        <main className="win-center-panel">
          {/* Central view Tabs Bar */}
          <div className="win-tabs-bar">
            <div 
              className={`win-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => switchTab('dashboard')}
            >
              <span>Page d'accueil</span>
            </div>
            {activeTab !== 'dashboard' && (
              <div className="win-tab active">
                <span>{getTabLabel(activeTab)}</span>
                <button className="win-tab-close" onClick={() => switchTab('dashboard')}>×</button>
              </div>
            )}
          </div>

          <div className="win-content-area">
            {/* Rappel de sauvegarde : le planificateur est en mode « rappel » et l'échéance est passée. */}
            {sauvegardeDue && activeTab !== 'sauvegarde' && (
              <div style={{
                marginBottom: '12px', padding: '10px 14px', borderRadius: '8px',
                background: 'var(--c-warn-bg)', border: '1px solid var(--c-warn)',
                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '12.5px'
              }}>
                <AlertTriangle size={16} style={{ color: 'var(--c-warn)', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: '220px' }}>
                  <strong>Sauvegarde {planSauvegarde.frequence} due.</strong>{' '}
                  {planSauvegarde.derniereExecution
                    ? `Dernière sauvegarde : ${new Date(planSauvegarde.derniereExecution).toLocaleDateString('fr-FR')}.`
                    : 'Aucune sauvegarde effectuée depuis ce poste.'}
                </span>
                <button className="btn-action primary" onClick={() => switchTab('sauvegarde')}>
                  <Database size={14} /> <span>Ouvrir la sauvegarde</span>
                </button>
                <button className="btn-action" onClick={() => setSauvegardeDue(false)} title="Masquer jusqu'à la prochaine ouverture">
                  Plus tard
                </button>
              </div>
            )}
            {/* ─── TAB: TABLEAU DE BORD (page d'accueil) ─────────────────────────
                Tout est cadré par le périmètre de dépôts de l'utilisateur et par
                le sélecteur de magasin de l'en-tête, pour que les chiffres du
                tableau de bord et ceux des journaux concordent toujours. */}
            {activeTab === 'dashboard' && (() => {
              const authIds = getAuthorizedMagasins().map(m => m.id);
              const perimetreIds = selectedMagasinFilter ? [selectedMagasinFilter] : authIds;
              const perimetreNom = selectedMagasinFilter
                ? (magasins.find(m => m.id === selectedMagasinFilter)?.nom || 'Dépôt')
                : `${perimetreIds.length} dépôt(s) autorisé(s)`;

              // Droits d'accès identiques à ceux du menu : ne pas proposer un raccourci
              // vers un module que le rôle n'a pas le droit d'ouvrir.
              const peutVoir = (tab: string) => {
                if (tab === 'achats') return ['direction', 'achat', 'magasinier'].includes(currentUser.role);
                if (tab === 'receptions') return ['direction', 'magasinier'].includes(currentUser.role);
                if (tab === 'factures' || tab === 'finances') return ['direction', 'comptabilite'].includes(currentUser.role);
                return true;
              };

              const prixDe = (articleId: string) => articles.find(a => a.id === articleId)?.prixMoyen || 0;
              const stocksVus = stocks.filter(s => perimetreIds.includes(s.magasinId));
              const magasinsVus = magasins.filter(m => m.actif !== false && perimetreIds.includes(m.id));
              const valeurStock = stocksVus.reduce((sum, s) => sum + s.quantite * prixDe(s.articleId), 0);

              // Ruptures : stock sous le seuil d'alerte, trié par manque décroissant
              const alertes = stocksVus
                .map(s => {
                  const art = articles.find(a => a.id === s.articleId);
                  const mag = magasins.find(m => m.id === s.magasinId);
                  if (!art || !mag) return null;
                  const manque = (art.stockMinimum || 0) - s.quantite;
                  return manque > 0 ? { art, mag, quantite: s.quantite, manque } : null;
                })
                .filter((x): x is { art: Article; mag: Magasin; quantite: number; manque: number } => x !== null)
                .sort((a, b) => b.manque - a.manque);

              const dettesFournisseurs = fournisseurs.reduce((s, f) => s + (f.solde || 0), 0);
              const daAValider = getFilteredCommandes().filter(c => c.statut === 'Brouillon');
              const trAValider = getFilteredTransferts().filter(t => t.statut === 'Demande');
              const trARecevoir = getFilteredTransferts().filter(t => t.statut === 'Validé' || t.statut === 'Expédié');
              const facturesOuvertes = factures.filter(f => f.soldeRestant > 0);
              const resteAPayer = facturesOuvertes.reduce((s, f) => s + f.soldeRestant, 0);

              // Valeur du stock par dépôt — magnitude : une seule teinte, pas de légende
              const parDepot = magasinsVus
                .map(mag => ({
                  nom: mag.nom.replace('MAGASIN-', '').replace('Magasin ', ''),
                  val: stocks.filter(s => s.magasinId === mag.id).reduce((acc, s) => acc + s.quantite * prixDe(s.articleId), 0)
                }))
                .sort((a, b) => b.val - a.val);
              const maxDepot = Math.max(...parDepot.map(d => d.val), 1);

              // Entrées / sorties valorisées sur la période : deux séries, donc légende
              // obligatoire. Les quantités ne sont pas additionnables entre articles
              // (sacs, barres, unités) : on valorise en DA au PMP.
              const nbSeaux = dashPeriode === 7 ? 7 : dashPeriode === 30 ? 5 : 6;
              const tailleSeau = dashPeriode / nbSeaux;
              const debutPeriode = Date.now() - dashPeriode * 86400000;
              const movsPerimetre = mouvements.filter(m => perimetreIds.includes(m.magasinId));
              const movsPeriode = movsPerimetre.filter(m => new Date(m.dateMouvement).getTime() >= debutPeriode);
              const seaux = Array.from({ length: nbSeaux }, (_, i) => {
                const debut = debutPeriode + i * tailleSeau * 86400000;
                const fin = debut + tailleSeau * 86400000;
                const dedans = movsPeriode.filter(m => {
                  const t = new Date(m.dateMouvement).getTime();
                  return t >= debut && t < fin;
                });
                return {
                  label: new Date(debut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                  entrees: dedans.filter(m => m.quantite > 0).reduce((s, m) => s + m.quantite * prixDe(m.articleId), 0),
                  sorties: dedans.filter(m => m.quantite < 0).reduce((s, m) => s + Math.abs(m.quantite) * prixDe(m.articleId), 0)
                };
              });
              const maxFlux = Math.max(...seaux.flatMap(s => [s.entrees, s.sorties]), 1);
              const totalEntrees = seaux.reduce((s, b) => s + b.entrees, 0);
              const totalSorties = seaux.reduce((s, b) => s + b.sorties, 0);
              const fluxVide = totalEntrees === 0 && totalSorties === 0;

              // Accents de chrome (couleurs de marque), pas des teintes de série
              const aTraiter = [
                { cle: 'da', tab: 'achats', libelle: "Demandes d'achat à valider", n: daAValider.length, accent: '#24405e' },
                { cle: 'trv', tab: 'transferts', libelle: 'Transferts à valider', n: trAValider.length, accent: '#2d6a6a' },
                { cle: 'trr', tab: 'transferts', libelle: 'Transferts à réceptionner', n: trARecevoir.length, accent: '#2d6a6a' },
                { cle: 'rec', tab: 'receptions', libelle: 'Réceptions en brouillon', n: getFilteredReceptions().filter(r => r.statut === 'Brouillon').length, accent: '#8a6c14' },
                { cle: 'fac', tab: 'factures', libelle: 'Factures à régler', n: facturesOuvertes.length, accent: '#a63d40' }
              ].filter(x => x.n > 0 && peutVoir(x.tab));

              const typeCourt: Record<string, string> = {
                ENTREE_ACHAT: 'Réception achat',
                ENTREE_TRANSFERT: 'Entrée transfert',
                SORTIE_AFFECTATION: 'Sortie affectation',
                SORTIE_TRANSFERT: 'Sortie transfert',
                RETOUR_AFFECTATION: 'Retour affectation',
                CORRECTION_INVENTAIRE: 'Régul. inventaire',
                ENTREE_INVENTAIRE: 'Entrée inventaire',
                SORTIE_INVENTAIRE: 'Sortie inventaire',
                SORTIE_CONSOMMATION: 'Sortie consommation'
              };
              const activite = [...movsPerimetre]
                .sort((a, b) => new Date(b.dateMouvement).getTime() - new Date(a.dateMouvement).getTime())
                .slice(0, 7);

              return (
                <div className="dash">
                  {/* Chiffre phare — un seul par vue */}
                  <div className="dash-hero">
                    <div>
                      <div className="dash-hero-label">Valeur totale du stock</div>
                      <div className="dash-hero-value">
                        {valeurStock.toLocaleString('fr-FR')}<span className="dash-hero-unit">DA</span>
                      </div>
                      <div className="dash-hero-meta">
                        {perimetreNom} · {stocksVus.length} ligne(s) de stock · {articles.length} article(s) au catalogue
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="dash-hero-label">Situation au</div>
                      <div className="dash-hero-date">
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="dash-hero-meta">Bonjour {currentUser.name} — {getRoleLabel(currentUser.role)}</div>
                    </div>
                  </div>

                  {/* Indicateurs cliquables : chaque tuile mène au journal correspondant */}
                  <div className="dash-kpis">
                    <button
                      className={`dash-tile ${alertes.length > 0 ? 'is-critical' : 'is-good'}`}
                      onClick={() => switchTab('stocks')}
                    >
                      <span className="dash-tile-top">
                        <span className="dash-tile-icon">
                          {alertes.length > 0 ? <AlertTriangle size={14} /> : <CheckSquare size={14} />}
                        </span>
                        <span className="dash-tile-label">Articles sous le seuil</span>
                      </span>
                      <span className="dash-tile-value">{alertes.length}</span>
                      <span className={`dash-state ${alertes.length > 0 ? 'critical' : 'good'}`}>
                        {alertes.length > 0
                          ? <><AlertTriangle size={11} /> Réapprovisionnement requis</>
                          : <><CheckSquare size={11} /> Tous les stocks conformes</>}
                      </span>
                    </button>

                    {/* Une dette n'est pas un état d'alerte : les couleurs d'état sont
                        réservées, la tuile porte donc un accent de marque (or). */}
                    <button className="dash-tile is-gold" onClick={() => switchTab('fournisseurs')}>
                      <span className="dash-tile-top">
                        <span className="dash-tile-icon"><Truck size={14} /></span>
                        <span className="dash-tile-label">Dettes fournisseurs</span>
                      </span>
                      <span className="dash-tile-value">{dettesFournisseurs.toLocaleString('fr-FR')}</span>
                      <span className="dash-tile-meta">DA — {fournisseurs.filter(f => (f.solde || 0) > 0).length} fournisseur(s) à régler</span>
                    </button>

                    {peutVoir('factures') && (
                      <button className="dash-tile is-navy" onClick={() => switchTab('factures')}>
                        <span className="dash-tile-top">
                          <span className="dash-tile-icon"><Landmark size={14} /></span>
                          <span className="dash-tile-label">Reste à payer sur factures</span>
                        </span>
                        <span className="dash-tile-value">{resteAPayer.toLocaleString('fr-FR')}</span>
                        <span className="dash-tile-meta">DA — {facturesOuvertes.length} facture(s) ouverte(s)</span>
                      </button>
                    )}

                    {peutVoir('achats') && (
                      <button className="dash-tile is-navy" onClick={() => switchTab('achats')}>
                        <span className="dash-tile-top">
                          <span className="dash-tile-icon"><ShoppingCart size={14} /></span>
                          <span className="dash-tile-label">Demandes d'achat à valider</span>
                        </span>
                        <span className="dash-tile-value">{daAValider.length}</span>
                        <span className="dash-tile-meta">sur {getFilteredCommandes().length} DA dans le périmètre</span>
                      </button>
                    )}

                    <button className="dash-tile is-teal" onClick={() => switchTab('transferts')}>
                      <span className="dash-tile-top">
                        <span className="dash-tile-icon"><RefreshCw size={14} /></span>
                        <span className="dash-tile-label">Transferts en cours</span>
                      </span>
                      <span className="dash-tile-value">{trAValider.length + trARecevoir.length}</span>
                      <span className="dash-tile-meta">{trAValider.length} à valider · {trARecevoir.length} à réceptionner</span>
                    </button>
                  </div>

                  {/* Filtres : une seule ligne, au-dessus du contenu qu'ils cadrent */}
                  <div className="dash-filters">
                    <span style={{ fontWeight: 600 }}>Période analysée :</span>
                    {([7, 30, 90] as const).map(p => (
                      <button
                        key={p}
                        className={`dash-chip ${dashPeriode === p ? 'active' : ''}`}
                        onClick={() => setDashPeriode(p)}
                      >
                        {p} derniers jours
                      </button>
                    ))}
                    <span style={{ marginLeft: 'auto' }}>
                      Le sélecteur de dépôt de l'en-tête cadre également ces chiffres.
                    </span>
                  </div>

                  <div className="dash-grid-2">
                    {/* Magnitude : une seule série, donc pas de légende — le titre nomme la donnée */}
                    <div className="card">
                      <div className="card-title card-title--navy">Valeur du stock par dépôt (DA)</div>
                      {parDepot.length === 0 || maxDepot === 1 ? (
                        <div className="dash-empty">Aucun stock valorisé sur le périmètre.</div>
                      ) : parDepot.length === 1 ? (
                        /* Un seul dépôt : un graphique à une barre n'apporte rien,
                           le nombre EST le graphique. */
                        <div style={{ marginTop: '10px' }}>
                          <div className="dash-tile-label">{parDepot[0].nom}</div>
                          <div className="dash-tile-value">{parDepot[0].val.toLocaleString('fr-FR')} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>DA</span></div>
                          <div className="dash-tile-meta">Seul dépôt du périmètre affiché.</div>
                        </div>
                      ) : (
                        <div className="dash-bars" style={{ marginTop: '12px' }}>
                          {parDepot.map(d => (
                            <div className="dash-bar-row" key={d.nom}>
                              <div className="dash-bar-head">
                                <span>{d.nom}</span>
                                <span className="dash-bar-value">{d.val.toLocaleString('fr-FR')} DA</span>
                              </div>
                              <div className="dash-bar-track">
                                <div className="dash-bar-fill" style={{ width: `${Math.max((d.val / maxDepot) * 100, 0.5)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Deux séries : légende obligatoire, valeurs au survol et en pied */}
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div className="card-title card-title--blue">Flux de stock valorisés — {dashPeriode} derniers jours (DA)</div>
                        <div className="dash-legend">
                          <span className="dash-legend-item">
                            <span className="dash-legend-key" style={{ background: 'var(--viz-serie-1)' }} />Entrées
                          </span>
                          <span className="dash-legend-item">
                            <span className="dash-legend-key" style={{ background: 'var(--viz-serie-2)' }} />Sorties
                          </span>
                        </div>
                      </div>
                      {fluxVide ? (
                        <div className="dash-empty">
                          Aucun mouvement de stock enregistré sur les {dashPeriode} derniers jours dans ce périmètre.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                          {/* Graduations alignées sur la boîte de tracé : 0 %, 50 %, 100 % de 150px */}
                          <div style={{ width: '58px', position: 'relative', height: '150px', flexShrink: 0 }}>
                            <span style={{ position: 'absolute', top: '-6px', right: 0, fontSize: '9px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                              {Math.round(maxFlux).toLocaleString('fr-FR')}
                            </span>
                            <span style={{ position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)', fontSize: '9px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                              {Math.round(maxFlux / 2).toLocaleString('fr-FR')}
                            </span>
                            <span style={{ position: 'absolute', bottom: '-6px', right: 0, fontSize: '9px', color: 'var(--text-muted)' }}>0</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ position: 'relative' }}>
                              {/* Repères 1px pleins et discrets, jamais en pointillés */}
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'var(--viz-grid)' }} />
                              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--viz-grid)' }} />
                              <div className="dash-cols">
                                {seaux.map((b, i) => (
                                  <div
                                    className="dash-col-group"
                                    key={i}
                                    onMouseEnter={() => setDashHover(`flux-${i}`)}
                                    onMouseLeave={() => setDashHover(null)}
                                    onFocus={() => setDashHover(`flux-${i}`)}
                                    onBlur={() => setDashHover(null)}
                                    tabIndex={0}
                                  >
                                    {dashHover === `flux-${i}` && (
                                      <div className="dash-tooltip">
                                        <div className="dash-tooltip-value">{Math.round(b.entrees).toLocaleString('fr-FR')} DA</div>
                                        <div>entrées — période du {b.label}</div>
                                        <div className="dash-tooltip-value" style={{ marginTop: '3px' }}>{Math.round(b.sorties).toLocaleString('fr-FR')} DA</div>
                                        <div>sorties</div>
                                      </div>
                                    )}
                                    <div className="dash-col in" style={{ height: `${Math.max((b.entrees / maxFlux) * 100, b.entrees > 0 ? 2 : 0)}%` }} />
                                    <div className="dash-col out" style={{ height: `${Math.max((b.sorties / maxFlux) * 100, b.sorties > 0 ? 2 : 0)}%` }} />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="dash-col-labels">
                              {seaux.map((b, i) => <span className="dash-col-label" key={i}>{b.label}</span>)}
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span>Total entrées : <strong style={{ color: 'var(--text-main)' }}>{Math.round(totalEntrees).toLocaleString('fr-FR')} DA</strong></span>
                              <span>Total sorties : <strong style={{ color: 'var(--text-main)' }}>{Math.round(totalSorties).toLocaleString('fr-FR')} DA</strong></span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="dash-grid-32">
                    {/* Plus de 7 classes porteuses de sens → tableau, pas plus de couleurs */}
                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="card-title card-title--red">Alertes de stock</div>
                        <button className="dash-chip" onClick={() => switchTab('stocks')}>Ouvrir les stocks</button>
                      </div>
                      {alertes.length === 0 ? (
                        <div className="dash-empty">Aucun article sous son seuil d'alerte sur ce périmètre.</div>
                      ) : (
                        <table className="dash-table" style={{ marginTop: '10px' }}>
                          <thead>
                            <tr>
                              <th>Article</th>
                              <th>Dépôt</th>
                              <th className="num">Stock</th>
                              <th className="num">Seuil</th>
                              <th className="num">Manque</th>
                              <th>État</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alertes.slice(0, 8).map((a, i) => {
                              const rupture = a.quantite <= 0;
                              return (
                                <tr key={i}>
                                  <td><strong>{a.art.designation}</strong></td>
                                  <td>{a.mag.nom.replace('MAGASIN-', '')}</td>
                                  <td className="num">{a.quantite} {a.art.unite}</td>
                                  <td className="num">{a.art.stockMinimum}</td>
                                  <td className="num"><strong>{a.manque}</strong></td>
                                  <td>
                                    <span className={`badge ${rupture ? 'badge-danger' : 'badge-warning'}`}>
                                      <AlertTriangle size={10} /> {rupture ? 'Rupture' : 'Sous seuil'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                      {alertes.length > 8 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                          8 lignes affichées sur {alertes.length} — les plus gros manques d'abord.
                        </div>
                      )}
                    </div>

                    <div className="card">
                      <div className="card-title card-title--gold">À traiter</div>
                      {aTraiter.length === 0 ? (
                        <div className="dash-empty">Aucune pièce en attente sur votre périmètre.</div>
                      ) : (
                        <div className="dash-todo" style={{ marginTop: '10px' }}>
                          {aTraiter.map(x => (
                            <button
                              className="dash-todo-item"
                              key={x.cle}
                              onClick={() => switchTab(x.tab)}
                              style={{ ['--todo-accent' as string]: x.accent }}
                            >
                              <span>{x.libelle}</span>
                              <span className="dash-todo-count">{x.n}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title card-title--teal">Derniers mouvements de stock</div>
                    {activite.length === 0 ? (
                      <div className="dash-empty">Aucun mouvement de stock enregistré sur ce périmètre.</div>
                    ) : (
                      <table className="dash-table" style={{ marginTop: '10px' }}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Mouvement</th>
                            <th>Article</th>
                            <th>Dépôt</th>
                            <th>Document</th>
                            <th className="num">Quantité</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activite.map(mov => (
                            <tr key={mov.id}>
                              <td>{new Date(mov.dateMouvement).toLocaleDateString('fr-FR')}</td>
                              <td>
                                <span className="dash-legend-item">
                                  <span className="dash-legend-key" style={{ background: mov.quantite > 0 ? 'var(--viz-serie-1)' : 'var(--viz-serie-2)' }} />
                                  {typeCourt[mov.type] || mov.type}
                                </span>
                              </td>
                              <td>{mov.articleDesignation}</td>
                              <td>{mov.magasinNom.replace('MAGASIN-', '')}</td>
                              <td><code>{mov.referenceDoc}</code></td>
                              <td className="num"><strong>{mov.quantite > 0 ? `+${mov.quantite}` : mov.quantite}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })()}

            {activeTab === 'articles' && (
              <>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><Package size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Articles / Matériaux</h2>
                    <span className="section-lead">Catalogue des matériaux : référence, unité, seuil d'alerte et prix moyen pondéré (PMP)</span>
                  </div>
                  <div className="page-section-actions">
                    {/* Actions uniquement ici : sélectionner une ligne du tableau puis agir */}
                    <button className="btn-action primary" onClick={handleRibbonAdd}>
                      <Plus size={15} /> <span>Nouvel Article</span>
                    </button>
                    <button className="btn-action" onClick={() => handleRibbonEdit()} disabled={!selectedRowId}>
                      <Edit size={15} /> <span>Modifier</span>
                    </button>
                    <button className="btn-action danger" onClick={() => handleRibbonDelete()} disabled={!selectedRowId}>
                      <Trash size={15} /> <span>Supprimer</span>
                    </button>
                    <button className="btn-action" onClick={handleGenericExport} title="Exporter la liste filtrée au format CSV">
                      <FileText size={15} /> <span>Exporter CSV</span>
                    </button>
                  </div>
                </div>
                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Désignation Article</th>
                        <th>Catégorie</th>
                        <th>Unité</th>
                        <th>Stock Minimum</th>
                        <th>Prix Moyen d'achat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredArticles().map(art => (
                        <tr 
                          key={art.id} 
                          className={selectedRowId === art.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(art.id)}
                        >
                          <td><code>{art.reference}</code></td>
                          <td><strong>{art.designation}</strong></td>
                          <td>{art.categorie}</td>
                          <td>{art.unite}</td>
                          <td>{art.stockMinimum}</td>
                          <td>{art.prixMoyen.toLocaleString()} DA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{getFilteredArticles().length} article(s)</span>
                </div>
              </>
            )}

            {/* TAB: MAGASINS */}
            {activeTab === 'magasins' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><Building2 size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Magasins / Dépôts</h2>
                    <span className="section-lead">Gérez les dépôts et entrepôts de l'entreprise</span>
                  </div>
                  <div className="page-section-actions">
                    {/* Actions uniquement ici : sélectionner une ligne du tableau puis agir */}
                    <button className="btn-action primary" onClick={handleRibbonAdd}>
                      <Plus size={15} /> <span>Nouveau Magasin</span>
                    </button>
                    <button className="btn-action" onClick={() => handleRibbonEdit()} disabled={!selectedRowId}>
                      <Edit size={15} /> <span>Modifier</span>
                    </button>
                    <button className="btn-action danger" onClick={() => handleRibbonDelete()} disabled={!selectedRowId}>
                      <Trash size={15} /> <span>Supprimer</span>
                    </button>
                    <button className="btn-action" onClick={handleGenericExport} title="Exporter la liste filtrée au format CSV">
                      <FileText size={15} /> <span>Exporter CSV</span>
                    </button>
                  </div>
                </div>
                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Nom du Magasin</th>
                        <th>Adresse / Ville</th>
                        <th>Wilaya</th>
                        <th>Responsable Désigné</th>
                        <th>Téléphone</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredMagasins().map(mag => (
                        <tr 
                          key={mag.id}
                          className={selectedRowId === mag.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(mag.id)}
                        >
                          <td><code>{mag.code}</code></td>
                          <td><strong>{mag.nom}</strong></td>
                          <td>{mag.ville}</td>
                          <td>{mag.wilaya}</td>
                          <td>{mag.responsable}</td>
                          <td>{mag.telephone}</td>
                          <td>
                            <span className={`badge ${mag.actif ? 'badge-success' : 'badge-danger'}`}>
                              {mag.actif ? 'Actif' : 'Fermé'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{getFilteredMagasins().length} magasin(s)</span>
                </div>
              </div>
            )}

            {/* TAB: FOURNISSEURS */}
            {activeTab === 'fournisseurs' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><Truck size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Fournisseurs</h2>
                    <span className="section-lead">Carnet de contacts et dettes fournisseurs. Le bouton « Payer » enregistre un règlement sur solde, sans lettrage de facture.</span>
                  </div>
                  <div className="page-section-actions">
                    <button className="btn-action primary" onClick={handleRibbonAdd}>
                      <Plus size={15} /> <span>Nouveau Fournisseur</span>
                    </button>
                    <button className="btn-action" onClick={handleRibbonEdit} disabled={!selectedRowId}>
                      <Edit size={15} /> <span>Modifier</span>
                    </button>
                    <button className="btn-action danger" onClick={handleRibbonDelete} disabled={!selectedRowId}>
                      <Trash size={15} /> <span>Supprimer</span>
                    </button>
                    <button className="btn-action" onClick={handleGenericExport} title="Exporter la liste filtrée au format CSV">
                      <FileText size={15} /> <span>Exporter CSV</span>
                    </button>
                  </div>
                </div>
                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Nom Société</th>
                        <th>N° RC / NIF</th>
                        <th>Contact Principal</th>
                        <th>Téléphone</th>
                        <th>Adresse Siège</th>
                        <th>Encours Solde Dû (Dette)</th>
                        <th>Opérations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredFournisseurs().map(four => (
                        <tr 
                          key={four.id}
                          className={selectedRowId === four.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(four.id)}
                        >
                          <td><strong>{four.nomSociete}</strong></td>
                          <td><code>{four.rcNif}</code></td>
                          <td>{four.contactNom}</td>
                          <td>{four.telephone}</td>
                          <td>{four.adresse}</td>
                          <td style={{ fontWeight: 'bold', color: four.solde > 0 ? 'var(--c-danger)' : 'var(--c-good)' }}>
                            {four.solde.toLocaleString()} DA
                          </td>
                          <td>
                            {(currentUser.role === 'direction' || currentUser.role === 'comptabilite') && four.solde > 0 && (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '1px 6px', fontSize: '9px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isAuthenticated) { alert('Veuillez vous connecter pour effectuer un paiement.'); return; }
                                  openPaiementModal('simple', four.id);
                                }}
                                title="Règlement sur solde, sans lettrage de factures"
                              >
                                Payer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedRowId && activeTab === 'fournisseurs' && (() => {
                  const four = fournisseurs.find(f => f.id === selectedRowId);
                  if (!four) return null;
                  const supplierPays = paiements
                    .filter(p => p.fournisseurId === four.id)
                    .sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime());
                  return (
                    <div style={{ marginTop: '20px', padding: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>Journal des règlements</div>
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>Règlements effectués sur le fournisseur sélectionné</div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{supplierPays.length} paiement(s)</div>
                      </div>

                      {supplierPays.length === 0 ? (
                        <p style={{ margin: 0, color: '#475569', fontSize: '12px' }}>Aucun règlement enregistré pour ce fournisseur.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px' }}>Date</th>
                                <th style={{ padding: '8px 10px' }}>Code</th>
                                <th style={{ padding: '8px 10px' }}>Montant</th>
                                <th style={{ padding: '8px 10px' }}>Mode</th>
                                <th style={{ padding: '8px 10px' }}>Réf Transaction</th>
                                <th style={{ padding: '8px 10px' }}>Comptable</th>
                                <th style={{ padding: '8px 10px' }}>Facture</th>
                              </tr>
                            </thead>
                            <tbody>
                              {supplierPays.slice(0, 6).map(pay => (
                                <tr key={pay.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '8px 10px' }}>{new Date(pay.datePaiement).toLocaleDateString('fr-FR')}</td>
                                  <td style={{ padding: '8px 10px' }}><code>{pay.code}</code></td>
                                  <td style={{ padding: '8px 10px', fontWeight: 'bold', color: 'var(--c-good)' }}>{pay.montant.toLocaleString()} DA</td>
                                  <td style={{ padding: '8px 10px' }}>{pay.mode}</td>
                                  <td style={{ padding: '8px 10px' }}><code>{pay.referenceTransaction}</code></td>
                                  <td style={{ padding: '8px 10px' }}>{pay.comptableNom}</td>
                                  <td style={{ padding: '8px 10px' }}>{pay.factureRef || (pay.lettre ? 'Lettré' : '—')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {supplierPays.length > 6 && (
                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#475569' }}>Affiche les 6 derniers règlements. Voir l'onglet Paiements pour consulter toute l'historique.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{getFilteredFournisseurs().length} fournisseur(s)</span>
                </div>
              </div>
            )}

            {/* TAB: ACHATS */}
            {activeTab === 'achats' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><ShoppingCart size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Demandes d'Achat (DA)</h2>
                    <span className="section-lead">Cycle complet des achats — création, validation et réception</span>
                  </div>
                  <div className="page-section-actions">
                    <button className="btn-action primary" onClick={handleRibbonAdd}>
                      <Plus size={15} /> <span>Nouvelle DA</span>
                    </button>
                    <button className="btn-action danger" onClick={handleRibbonDelete} disabled={!selectedRowId}>
                      <Trash size={15} /> <span>Supprimer</span>
                    </button>
                    <button className="btn-action" onClick={handleRibbonPrint} disabled={!selectedRowId}>
                      <Printer size={15} /> <span>Voir / Imprimer</span>
                    </button>
                    <button className="btn-action" onClick={handleGenericExport} title="Exporter la liste filtrée au format CSV">
                      <FileText size={15} /> <span>Exporter CSV</span>
                    </button>
                  </div>
                </div>
                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Code Commande</th>
                        <th>Date d'émission</th>
                        <th>Nom Fournisseur</th>
                        <th>Entrepôt Destination</th>
                        <th>Total TTC (TVA 19%)</th>
                        <th>Statut Workflow</th>
                        <th>Créé Par</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Grille vide : expliquer POURQUOI (aucune DA / hors périmètre dépôt / filtre actif)
                          au lieu d'afficher un tableau vide qui laisse croire à un bug d'affichage. */}
                      {getFilteredCommandes().length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '18px' }}>
                            {commandes.length === 0
                              ? "Aucune demande d'achat enregistrée. Utilisez « Nouvelle DA » pour en créer une."
                              : getAuthorizedMagasins().length === 0
                                ? `${commandes.length} demande(s) d'achat en base, mais votre compte n'est rattaché à aucun dépôt : demandez à la direction de vous affecter un magasin (Administration → Utilisateurs & Droits).`
                                : selectedMagasinFilter
                                  ? `${commandes.length} demande(s) d'achat en base, aucune pour le dépôt sélectionné en haut de l'écran${searchQuery ? ' ou pour la recherche en cours' : ''}.`
                                  : `${commandes.length} demande(s) d'achat en base, aucune dans votre périmètre de dépôts${searchQuery ? ' ou correspondant à la recherche' : ''}.`}
                          </td>
                        </tr>
                      )}
                      {getFilteredCommandes().map(cmd => (
                        <tr
                          key={cmd.id}
                          className={selectedRowId === cmd.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(cmd.id)}
                        >
                          <td><code>{cmd.code}</code></td>
                          <td>{new Date(cmd.dateCommande).toLocaleDateString('fr-FR')}</td>
                          <td><strong>{cmd.fournisseurNom || 'Inconnu'}</strong></td>
                          <td>{magasins.find(m => m.id === cmd.magasinDestinationId)?.nom}</td>
                          <td style={{ fontWeight: 'bold' }}>{cmd.totalTTC.toLocaleString()} DA</td>
                          <td>
                            <span className={`badge ${
                              cmd.statut === 'Brouillon' ? 'badge-info' :
                              cmd.statut === 'Validé' ? 'badge-warning' :
                              'badge-success'
                            }`}>
                              {cmd.statut}
                            </span>
                          </td>
                          <td>{cmd.createdByNom}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {currentUser.role === 'direction' && cmd.statut === 'Brouillon' && (
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '1px 4px', fontSize: '9px', background: 'var(--c-good)', border: 'none' }}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await SupabaseDatabase.transitionCommandeStatut(cmd.id, 'Validé');
                                    reloadData();
                                  }}
                                >
                                  Valider DA
                                </button>
                              )}
                              {currentUser.role === 'direction' && cmd.statut === 'Brouillon' && (
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '1px 4px', fontSize: '9px', marginLeft: '4px' }}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await SupabaseDatabase.transitionCommandeStatut(cmd.id, 'Refusée');
                                    reloadData();
                                  }}
                                >
                                  Refuser
                                </button>
                              )}
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '1px 4px', fontSize: '9px', marginLeft: '4px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRowId(cmd.id);
                                  setPrintDoc({ type: 'commande', data: cmd });
                                }}
                              >
                                Voir
                              </button>
                              {currentUser.role === 'magasinier' && cmd.statut === 'Validé' && (!currentUser.magasinId || cmd.magasinDestinationId === currentUser.magasinId || (cmd as any).magasin_destination_id === currentUser.magasinId) && (
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '1px 4px', fontSize: '9px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReceptionMode('commande');
                                    setReceptionCommandeId(cmd.id);
                                    setReceptionLines(cmd.lignes.map(l => ({ articleId: l.articleId, quantiteRecue: l.quantite - (l.quantiteRecue || 0), prixUnitaire: l.prixUnitaire || 0 })));
                                    setReceptionBL('');
                                    setReceptionFacture('');
                                    setReceptionDirecteLines([]);
                                    setReceptionModalOpen(true);
                                  }}
                                >
                                  Réceptionner
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{getFilteredCommandes().length} commande(s)</span>
                </div>
              </div>
            )}

            {/* TAB: RECEPTIONS */}
            {activeTab === 'receptions' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><CheckSquare size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Réceptions BL</h2>
                    <span className="section-lead">Journal des bons de réception de marchandises</span>
                  </div>
                  <div className="page-section-actions">
                    <button className="btn-action primary" onClick={() => openReceptionModal('commande')}>
                      <Plus size={15} /> <span>Nouvelle Réception</span>
                    </button>
                    <button className="btn-action" onClick={() => openReceptionModal('directe')} title="Entrée de marchandise sans demande d'achat">
                      <Plus size={15} /> <span>Réception Directe (sans DA)</span>
                    </button>
                    <button className="btn-action" onClick={handleRibbonPrint} disabled={!selectedRowId}>
                      <Printer size={15} /> <span>Voir / Imprimer BL</span>
                    </button>
                    <button className="btn-action danger" onClick={handleRibbonDelete} disabled={!selectedRowId}>
                      <Trash size={15} /> <span>Supprimer</span>
                    </button>
                  </div>
                </div>
                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Date et heure</th>
                        <th>Réf Bon Réception</th>
                        <th>Réf Commande Achat</th>
                        <th>Nom du Magasin</th>
                        <th>Réf Bon Livraison (BL)</th>
                        <th>Réf Facture Directe</th>
                        <th style={{ textAlign: 'right' }}>Montant HT</th>
                        <th>Magasinier Signataire</th>
                        <th>Statut</th>
                        <th>Action</th>
                       </tr>
                     </thead>
                    <tbody>
                      {getFilteredReceptions().map(rec => (
                        <tr 
                          key={rec.id}
                          className={selectedRowId === rec.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(rec.id)}
                        >
                          <td>{new Date(rec.dateReception).toLocaleString('fr-FR')}</td>
                          <td><code>{rec.code}</code></td>
                          <td>
                            {rec.commandeCode ? (
                              <code>{rec.commandeCode}</code>
                            ) : (
                              <span title="Réception directe, sans demande d'achat">
                                <span className="badge badge-info">Directe</span>
                                {rec.fournisseurNom && (
                                  <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>{rec.fournisseurNom}</span>
                                )}
                              </span>
                            )}
                          </td>
                          <td>{rec.magasinNom}</td>
                          <td>{rec.bonLivraisonRef}</td>
                          <td>{rec.factureFournisseurRef || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            {(rec.lignes || []).reduce((sum, l) => sum + getLigneValeurHT(l), 0).toLocaleString()} DA
                          </td>
                          <td>{rec.magasinierNom}</td>
                          <td>
                            <span className={`badge ${rec.statut === 'Validée' ? 'badge-success' : 'badge-warning'}`}>
                              {rec.statut || 'Brouillon'}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '1px 8px', fontSize: '10px', whiteSpace: 'nowrap' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowId(rec.id);
                                setPrintDoc({ type: 'reception', data: rec });
                              }}
                            >
                              Voir
                            </button>
                            {rec.statut !== 'Validée' && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '1px 8px', fontSize: '10px', background: 'var(--c-good)', border: 'none', whiteSpace: 'nowrap' }}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!window.confirm(`Valider définitivement le BL ${rec.code} ?\n\nLes quantités entreront en stock et le BL ne pourra plus être supprimé.`)) return;
                                  const ok = await SupabaseDatabase.validateReceptionStatutOnly(rec.id);
                                  if (ok) {
                                    reloadData();
                                  } else {
                                    alert('⛔ Validation impossible\n\nVérifiez que ce BL comporte au moins un article avec une quantité reçue supérieure à 0.');
                                  }
                                }}
                              >
                                ✓ Valider
                              </button>
                            )}
                            {rec.statut !== 'Validée' ? (
                              <button
                                className="btn btn-danger"
                                style={{ padding: '1px 8px', fontSize: '10px', whiteSpace: 'nowrap' }}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const hasFac = factures.some(f => f.receptionId === rec.id);
                                  if (hasFac) {
                                    alert('⛔ Suppression impossible\n\nCe BL est lié à une facture. Supprimez d\'abord la facture.');
                                    return;
                                  }
                                  if (!window.confirm(`Supprimer définitivement le BL ${rec.code} ?\n\nCette action est irréversible.`)) return;
                                  const ok = await SupabaseDatabase.deleteReception(rec.id);
                                  if (ok) { reloadData(); } else { alert('Erreur lors de la suppression dans Supabase.'); }
                                }}
                              >
                                <Trash size={11} style={{ marginRight: 3 }} />Supprimer
                              </button>
                            ) : (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Protégé</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '12px', marginLeft: 'auto', fontWeight: 'bold' }}>
                    Total HT réceptionné : {getFilteredReceptions().reduce((sum, rec) => sum + (rec.lignes || []).reduce((s, l) => s + getLigneValeurHT(l), 0), 0).toLocaleString()} DA
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '16px' }}>{getFilteredReceptions().length} réception(s)</span>
                </div>
              </div>
            )}

            {/* TAB: STOCKS & MOUVEMENTS */}
            {activeTab === 'stocks' && (
              <div>
                <div className="card" style={{ padding: '4px' }}>
                  <div className="win-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📋 {stockConsolideMode ? 'Stock Consolidé Global (Tous Dépôts)' : 'Stock Physique par Dépôt'}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        className="btn-action" 
                        style={{ padding: '2px 8px', fontSize: '10px' }}
                        onClick={() => setStockConsolideMode(!stockConsolideMode)}
                      >
                        {stockConsolideMode ? 'Voir par Dépôt' : 'Voir Stock Consolidé'}
                      </button>
                      <button
                        className="btn-action"
                        style={{ padding: '2px 8px', fontSize: '10px' }}
                        onClick={handleGenericExport}
                        title="Exporter l'état de stock filtré au format CSV"
                      >
                        Exporter CSV
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 'bold' }}
                        onClick={handleRibbonPrint}
                      >
                        🖨️ Imprimer le Stock
                      </button>
                    </div>
                  </div>
                  <div className="win-grid-container" style={{ border: 'none' }}>
                    <table className="win-table">
                      <thead>
                        {stockConsolideMode ? (
                          <tr>
                            <th>Référence</th>
                            <th>Article</th>
                            <th>Stock Total Consolidé</th>
                            <th>PMP</th>
                            <th>Valeur du stock</th>
                            <th>Seuil Mini</th>
                            <th>État</th>
                            <th>Fiche</th>
                          </tr>
                        ) : (
                          <tr>
                            <th>Magasin</th>
                            <th>Article Matériau</th>
                            <th>Stock Réel</th>
                            <th>PMP</th>
                            <th>Valeur du stock</th>
                            <th>Seuil Alerte</th>
                            <th>État</th>
                            <th>Fiche</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {stockConsolideMode ? (
                          getFilteredArticles().map(art => {
                            const totalQty = stocks
                              .filter(s => s.articleId === art.id)
                              .reduce((sum, s) => sum + s.quantite, 0);
                            const isLow = totalQty < art.stockMinimum;
                            return (
                              <tr key={art.id} style={isLow ? { backgroundColor: 'var(--c-danger-bg)' } : {}}>
                                <td><code>{art.reference}</code></td>
                                <td><strong>{art.designation}</strong></td>
                                <td style={{ fontWeight: 'bold', fontSize: '12px' }}>{totalQty} {art.unite}</td>
                                <td style={{ textAlign: 'right' }}>{(art.prixMoyen || 0).toLocaleString()} DA</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{(totalQty * (art.prixMoyen || 0)).toLocaleString()} DA</td>
                                <td>{art.stockMinimum}</td>
                                <td>
                                  <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                                    {isLow ? 'Alerte' : 'Conforme'}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className="btn-action"
                                    style={{ padding: '2px 8px', fontSize: '10px' }}
                                    title="Fiche de stock : toutes les réceptions et sorties de l'article"
                                    onClick={() => openFicheStock(art.id, null)}
                                  >
                                    📄 Fiche de Stock
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          getFilteredStocks().map(stk => {
                            const art = articles.find(a => a.id === stk.articleId);
                            const mag = magasins.find(m => m.id === stk.magasinId);
                            if (!art || !mag) return null;
                            const isLow = stk.quantite < art.stockMinimum;
                            return (
                              <tr key={stk.id} style={isLow ? { backgroundColor: 'var(--c-danger-bg)' } : {}}>
                                <td>{mag.nom}</td>
                                <td><strong>{art.designation}</strong></td>
                                <td style={{ fontWeight: 'bold', fontSize: '12px' }}>{stk.quantite} {art.unite}</td>
                                <td style={{ textAlign: 'right' }}>{(art.prixMoyen || 0).toLocaleString()} DA</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{(stk.quantite * (art.prixMoyen || 0)).toLocaleString()} DA</td>
                                <td>{art.stockMinimum}</td>
                                <td>
                                  <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                                    {isLow ? 'Alerte' : 'Conforme'}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className="btn-action"
                                    style={{ padding: '2px 8px', fontSize: '10px' }}
                                    title="Fiche de stock : toutes les réceptions et sorties de l'article dans ce dépôt"
                                    onClick={() => openFicheStock(art.id, stk.magasinId)}
                                  >
                                    📄 Fiche de Stock
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="win-grid-summary-footer">
                    <span style={{ fontSize: '12px', marginLeft: 'auto', fontWeight: 'bold' }}>
                      Valeur totale du stock : {(stockConsolideMode
                        ? getFilteredArticles().reduce((sum, art) => sum + stocks.filter(s => s.articleId === art.id).reduce((q, s) => q + s.quantite, 0) * (art.prixMoyen || 0), 0)
                        : getFilteredStocks().reduce((sum, stk) => sum + stk.quantite * (articles.find(a => a.id === stk.articleId)?.prixMoyen || 0), 0)
                      ).toLocaleString()} DA
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '16px' }}>
                      {stockConsolideMode ? `${getFilteredArticles().length} article(s)` : `${getFilteredStocks().length} ligne(s) de stock`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INVENTAIRES */}
            {activeTab === 'inventaires' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><FileText size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Inventaires Physiques</h2>
                    <span className="section-lead">Sessions de comptage et régularisation des stocks par dépôt</span>
                  </div>
                  <div className="page-section-actions">
                    <button className="btn-action primary" onClick={() => {
                      const authorized = getAuthorizedMagasins();
                      if (authorized.length === 0) {
                        alert("Vous n'avez accès à aucun magasin pour faire un inventaire.");
                        return;
                      }
                      if (authorized.length === 1) {
                        const magId = authorized[0].id;
                        const existing = inventaires.find(inv => inv.magasinId === magId && inv.statut === 'Brouillon');
                        if (existing) {
                          setSelectedInventaire(existing);
                          setInventaireLines(existing.lignes);
                          setInventaireModalOpen(true);
                        } else {
                          SupabaseDatabase.createInventaire(magId).then(inv => {
                            setSelectedInventaire(inv);
                            setInventaireLines(inv.lignes);
                            setInventaireModalOpen(true);
                            reloadData();
                          }).catch((err) => {
                            console.error(err);
                            alert("Erreur lors de la création de l'inventaire.");
                          });
                        }
                      } else {
                        setInventaireMagasinId(currentUser.magasinId || authorized[0].id);
                        setCreateInventaireModalOpen(true);
                      }
                    }}>
                      <Plus size={15} /> <span>Nouvel Inventaire</span>
                    </button>
                    <button className="btn-action danger" onClick={handleRibbonDelete} disabled={!selectedRowId}>
                      <Trash size={15} /> <span>Supprimer</span>
                    </button>
                  </div>
                </div>

                {/* Setup notice when table doesn't exist */}
                {inventairesReady && inventaires.length === 0 && (
                  <div style={{
                    margin: '12px 0',
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, rgba(255,152,0,0.08), rgba(255,87,34,0.06))',
                    border: '1px solid rgba(255,152,0,0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <div>
                      <strong style={{ color: 'var(--warning, #ff9800)', fontSize: '13px' }}>
                        Table Inventaires non configurée dans Supabase
                      </strong>
                      <p style={{ margin: '4px 0 8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        La table <code>inventaires</code> n'existe pas encore dans votre base de données Supabase.<br/>
                        Exécutez ce SQL dans <strong>Supabase → SQL Editor</strong> :
                      </p>
                      <details>
                        <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold' }}>
                          📋 Afficher le script SQL à exécuter
                        </summary>
                        <pre style={{
                          marginTop: '8px',
                          padding: '10px',
                          background: 'var(--bg-secondary, #1e1e2e)',
                          color: '#a8ff78',
                          borderRadius: '6px',
                          fontSize: '11px',
                          overflow: 'auto',
                          maxHeight: '280px',
                          fontFamily: 'monospace',
                          lineHeight: '1.5'
                        }}>{`CREATE TABLE IF NOT EXISTS inventaires (
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

CREATE INDEX IF NOT EXISTS idx_inventaires_magasin
  ON inventaires(magasin_id);
CREATE INDEX IF NOT EXISTS idx_inventaires_date
  ON inventaires(date_inventaire DESC);

ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all inventaires"
  ON inventaires FOR ALL USING (true) WITH CHECK (true);

SELECT 'Table inventaires créée avec succès!' AS result;`}</pre>
                      </details>
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        <a
                          href={`https://app.supabase.com/project/peshhcjfrlczmgzqcsjv/sql/new`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '5px 12px', background: '#3ecf8e', color: '#000',
                            borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold'
                          }}
                        >
                          🔗 Ouvrir Supabase SQL Editor
                        </a>
                        <button
                          onClick={reloadData}
                          style={{
                            padding: '5px 12px', background: 'transparent', border: '1px solid var(--border)',
                            borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)'
                          }}
                        >
                          🔄 Recharger après exécution
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Code Session</th>
                        <th>Date Inventaire</th>
                        <th>Dépôt</th>
                        <th>Statut</th>
                        <th>Créé Par</th>
                        <th>Validé Par</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredInventaires().map(inv => (
                        <tr 
                          key={inv.id}
                          className={selectedRowId === inv.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(inv.id)}
                        >
                          <td><code>{inv.code}</code></td>
                          <td>{new Date(inv.dateInventaire).toLocaleDateString('fr-FR')}</td>
                          <td>{inv.magasinNom}</td>
                          <td>
                            <span className={`badge ${inv.statut === 'Validé' ? 'badge-success' : 'badge-warning'}`}>
                              {inv.statut}
                            </span>
                          </td>
                          <td>{inv.creeParNom}</td>
                          <td>{inv.valideParNom || '-'}</td>
                          <td>
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '1px 6px', fontSize: '10px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInventaire(inv);
                                let lines: InventaireLigne[] = inv.lignes;
                                if (typeof lines === 'string') {
                                  try { lines = JSON.parse(lines as unknown as string); } catch { lines = []; }
                                }
                                if (!Array.isArray(lines)) lines = [];
                                setInventaireLines(lines);
                                setInventaireModalOpen(true);
                              }}
                            >
                              {inv.statut === 'Validé' ? 'Consulter' : 'Saisir & Valider'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: AFFECTATIONS */}
            {activeTab === 'affectations' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><Users size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Affectations Matériel</h2>
                    <span className="section-lead">Sorties de stock vers les employés et chantiers</span>
                  </div>
                  <div className="page-section-actions">
                    <button className="btn-action primary" onClick={handleRibbonAdd}>
                      <Plus size={15} /> <span>Nouvelle Affectation</span>
                    </button>
                    <button className="btn-action" onClick={() => handleRibbonEdit()} disabled={!selectedRowId}>
                      <Edit size={15} /> <span>Modifier</span>
                    </button>
                    <button className="btn-action danger" onClick={handleRibbonDelete} disabled={!selectedRowId}>
                      <Trash size={15} /> <span>Supprimer</span>
                    </button>
                    <button className="btn-action" onClick={handleRibbonPrint} disabled={!selectedRowId}>
                      <Printer size={15} /> <span>Imprimer</span>
                    </button>
                  </div>
                </div>
                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Bon Sortie</th>
                        <th>Date d'affectation</th>
                        <th>Bénéficiaire / Chauffeur</th>
                        <th>Destination (Chantier/Dépôt)</th>
                        <th>Articles & Quantités</th>
                        <th>Motif d'usage</th>
                        <th>Statut</th>
                        <th>Magasinier</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredAffectations().map(aff => {
                        const isValidated = aff.statut === 'Validé';
                        return (
                          <tr 
                            key={aff.id}
                            className={selectedRowId === aff.id ? 'selected' : ''}
                            onClick={() => setSelectedRowId(aff.id)}
                          >
                            <td><code>{aff.code}</code></td>
                            <td>{new Date(aff.dateAffectation).toLocaleDateString('fr-FR')}</td>
                            <td>
                              <strong>{aff.employeNom}</strong>
                            </td>
                            <td><span style={{fontSize:'11px'}}>{aff.magasinNom}</span></td>
                            <td><span className="badge badge-info">🏗️ {aff.chantierNom || '—'}</span></td>
                            <td>
                              {aff.lignes && aff.lignes.length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '11px' }}>
                                  {aff.lignes.map((l, idx) => <li key={idx}>{l.quantite} × {l.designation}</li>)}
                                </ul>
                              ) : (
                                <span style={{ fontSize: '11px' }}>{aff.quantite} × {aff.articleDesignation}</span>
                              )}
                            </td>
                            <td style={{fontSize:'11px'}}>
                              {aff.chauffeur && <div>🚗 {aff.chauffeur}</div>}
                              {aff.vehicule && <div style={{color:'var(--text-muted)'}}>🔑 {aff.vehicule}</div>}
                            </td>
                            <td style={{fontSize:'11px'}}>{aff.motif}</td>
                            <td>
                              <span className={`badge ${isValidated ? 'badge-success' : aff.statut === 'Retourné' ? 'badge-secondary' : 'badge-warning'}`}>
                                {isValidated ? 'Validé' : (aff.statut || 'En attente')}
                              </span>
                            </td>
                            <td>{aff.magasinierNom}</td>
                            <td style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
                              {!isValidated && aff.statut !== 'Retourné' ? (
                                <>
                                  <button
                                    className="btn btn-primary"
                                    style={{ padding: '1px 8px', fontSize: '10px', background: 'var(--c-good)', border: 'none', whiteSpace: 'nowrap' }}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!window.confirm(`Valider définitivement le Bon de Sortie ${aff.code} ?\n\nUne fois validé, il ne pourra plus être modifié ni supprimé.`)) return;
                                      const ok = await SupabaseDatabase.validateAffectation(aff.id);
                                      if (ok) { await reloadData(); } else { alert('Erreur lors de la validation.'); }
                                    }}
                                  >
                                    ✓ Valider
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    style={{ padding: '1px 8px', fontSize: '10px', background: 'var(--c-danger)', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRibbonDelete(aff.id);
                                    }}
                                  >
                                    🗑️ Supprimer
                                  </button>
                                </>
                              ) : isValidated ? (
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>🔒 Protégé</span>
                              ) : null}
                              {currentUser.role === 'magasinier' && isValidated && (
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '1px 6px', fontSize: '9px', marginLeft: '4px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void (async () => {
                                      await SupabaseDatabase.returnAffectation(aff.id);
                                      await reloadData();
                                    })();
                                  }}
                                >
                                  Retour
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{getFilteredAffectations().length} affectation(s)</span>
                </div>
              </div>
            )}

            {/* TAB: EMPLOYES & CHANTIERS */}
            {activeTab === 'employes' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><Users size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Employés & Chantiers</h2>
                    <span className="section-lead">
                      Fichier du personnel et liste des chantiers. Chaque grille a sa propre sélection :
                      cliquez une ligne puis utilisez les boutons de son panneau. Un employé ou un chantier
                      référencé par un bon de sortie ne peut pas être supprimé — il est sorti des effectifs ou marqué « Livré ».
                    </span>
                  </div>
                </div>

                {(!employesReady || !chantiersReady) && (
                  <div style={{
                    margin: '12px 0',
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, rgba(255,152,0,0.08), rgba(255,87,34,0.06))',
                    border: '1px solid rgba(255,152,0,0.3)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}>
                    <strong>⚠️ Tables « employes » / « chantiers » absentes de la base.</strong>
                    <div style={{ marginTop: '6px', color: 'var(--text-muted)' }}>
                      Exécutez le script <code>db/create_employes_chantiers.sql</code> dans l'éditeur SQL de Supabase,
                      puis actualisez la page. Les listes affichées ci-dessous sont les valeurs par défaut,
                      en lecture seule : l'ajout, la modification et la suppression sont désactivés.
                    </div>
                  </div>
                )}

                <div className="split-view">
                  <div className="card" style={{ padding: '4px' }}>
                    <div className="win-panel-header">
                      <span>👷 Liste Nominative des Employés</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-action primary" onClick={() => openEmployeModal()} disabled={!peutGererPersonnel || !employesReady}>
                          <Plus size={14} /> <span>Ajouter</span>
                        </button>
                        <button className="btn-action" onClick={handleEditEmploye} disabled={!peutGererPersonnel || !employesReady || !employeRowId}>
                          <Edit size={14} /> <span>Modifier</span>
                        </button>
                        <button className="btn-action" onClick={handleToggleEmployeActif} disabled={!peutGererPersonnel || !employesReady || !employeRowId}
                          title="Sortir des effectifs / réintégrer l'employé sélectionné">
                          <RefreshCw size={14} /> <span>Statut</span>
                        </button>
                        <button className="btn-action danger" onClick={handleDeleteEmploye} disabled={!peutGererPersonnel || !employesReady || !employeRowId}>
                          <Trash size={14} /> <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                    <div className="win-grid-container" style={{ border: 'none' }}>
                      <table className="win-table">
                        <thead>
                          <tr>
                            <th>Nom & Prénom</th>
                            <th>Fonction</th>
                            <th>Département</th>
                            <th>Téléphone</th>
                            <th>Chantier Affecté</th>
                            <th>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredEmployes().map(emp => (
                            <tr
                              key={emp.id}
                              className={employeRowId === emp.id ? 'selected' : ''}
                              onClick={() => setEmployeRowId(emp.id)}
                              onDoubleClick={() => openEmployeModal(emp)}
                              style={{ cursor: 'pointer', opacity: emp.actif === false ? 0.6 : 1 }}
                            >
                              <td><strong>{emp.nom}</strong></td>
                              <td>{emp.fonction}</td>
                              <td>{emp.service}</td>
                              <td>{emp.telephone}</td>
                              <td><span className="badge badge-info">{emp.chantierNom || 'Non assigné'}</span></td>
                              <td>
                                <span className={`badge ${emp.actif === false ? 'badge-danger' : 'badge-success'}`}>
                                  {emp.actif === false ? 'Sorti' : 'En poste'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {getFilteredEmployes().length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '18px' }}>
                              Aucun employé enregistré.
                            </td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="win-grid-summary-footer">
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {getFilteredEmployes().filter(e => e.actif !== false).length} en poste / {getFilteredEmployes().length} employé(s)
                      </span>
                    </div>
                  </div>

                  <div className="card" style={{ padding: '4px' }}>
                    <div className="win-panel-header">
                      <span>🏗️ Suivi des Chantiers du Groupe</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-action primary" onClick={() => openChantierModal()} disabled={!peutGererPersonnel || !chantiersReady}>
                          <Plus size={14} /> <span>Ajouter</span>
                        </button>
                        <button className="btn-action" onClick={handleEditChantier} disabled={!peutGererPersonnel || !chantiersReady || !chantierRowId}>
                          <Edit size={14} /> <span>Modifier</span>
                        </button>
                        <button className="btn-action danger" onClick={handleDeleteChantier} disabled={!peutGererPersonnel || !chantiersReady || !chantierRowId}>
                          <Trash size={14} /> <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                    <div className="win-grid-container" style={{ border: 'none' }}>
                      <table className="win-table">
                        <thead>
                          <tr>
                            <th>Désignation Chantier</th>
                            <th>Wilaya</th>
                            <th>Conducteur de travaux</th>
                            <th>Effectif</th>
                            <th>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredChantiers().map(chan => (
                            <tr
                              key={chan.id}
                              className={chantierRowId === chan.id ? 'selected' : ''}
                              onClick={() => setChantierRowId(chan.id)}
                              onDoubleClick={() => openChantierModal(chan)}
                              style={{ cursor: 'pointer', opacity: chan.actif ? 1 : 0.6 }}
                            >
                              <td><strong>{chan.nom}</strong></td>
                              <td>{chan.wilaya}</td>
                              <td>{chan.chefNom}</td>
                              <td>{employes.filter(e => e.chantierId === chan.id && e.actif !== false).length}</td>
                              <td>
                                <span className={`badge ${chan.actif ? 'badge-success' : 'badge-danger'}`}>
                                  {chan.actif ? 'Actif' : 'Livré'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {getFilteredChantiers().length === 0 && (
                            <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '18px' }}>
                              Aucun chantier enregistré.
                            </td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="win-grid-summary-footer">
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {getFilteredChantiers().filter(c => c.actif).length} actif(s) / {getFilteredChantiers().length} chantier(s)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TRANSFERTS INTER-MAGASINS */}
            {activeTab === 'transferts' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><RefreshCw size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Transferts Inter-Mag</h2>
                    <span className="section-lead">Circuit en 3 étapes : 1. Demande → 2. Validation (sortie du dépôt départ) → 3. Réception Transfert (entrée au dépôt destination)</span>
                  </div>
                  <div className="page-section-actions">
                    <button className="btn-action primary" onClick={handleRibbonAdd}>
                      <Plus size={15} /> <span>Demander Transfert</span>
                    </button>
                    <button className="btn-action" onClick={handleRibbonPrint} disabled={!selectedRowId}>
                      <Printer size={15} /> <span>Voir / Imprimer le Bon</span>
                    </button>
                    <button className="btn-action danger" onClick={handleRibbonDelete} disabled={!selectedRowId}>
                      <Trash size={15} /> <span>Supprimer</span>
                    </button>
                  </div>
                </div>
                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Code transfert</th>
                        <th>Date de demande</th>
                        <th>Dépôt Expéditeur</th>
                        <th>Dépôt Réceptionnaire</th>
                        <th>Demandeur</th>
                        <th>Motif du Transfert</th>
                        <th>Statut Logistique</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredTransferts().map(tr => (
                        <tr 
                          key={tr.id}
                          className={selectedRowId === tr.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(tr.id)}
                        >
                          <td><code>{tr.code}</code></td>
                          <td>{new Date(tr.dateDemande).toLocaleDateString('fr-FR')}</td>
                          <td>{tr.magasinDepartNom}</td>
                          <td>{tr.magasinDestNom}</td>
                          <td>{tr.demandeurNom}</td>
                          <td>{tr.motif || '-'}</td>
                          <td>
                            <span className={`badge ${
                              tr.statut === 'Demande' ? 'badge-info' :
                              tr.statut === 'Refusé' ? 'badge-danger' :
                              tr.statut === 'Reçu' ? 'badge-success' :
                              'badge-warning'
                            }`}>
                              {tr.statut === 'Demande' ? '1. Demande' :
                               tr.statut === 'Reçu' ? '3. Reçu' :
                               tr.statut === 'Refusé' ? 'Refusé' :
                               '2. Validé'}
                            </span>
                            {(tr.statut === 'Validé' || tr.statut === 'Expédié') && tr.dateExpedition && (
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                validé le {new Date(tr.dateExpedition).toLocaleDateString('fr-FR')} — en attente de réception
                              </div>
                            )}
                            {tr.statut === 'Reçu' && tr.dateReception && (
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                reçu le {new Date(tr.dateReception).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '1px 6px', fontSize: '9px' }}
                                title="Voir le contenu du bon de transfert et l'imprimer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRowId(tr.id);
                                  setPrintDoc({ type: 'transfert', data: tr });
                                }}
                              >
                                Voir
                              </button>
                              {/* Étape 2 : validation par la direction ou le magasinier du dépôt départ — sort la marchandise */}
                              {tr.statut === 'Demande' && (currentUser.role === 'direction' || (currentUser.role === 'magasinier' && tr.magasinDepartId === currentUser.magasinId)) && (
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: '1px 6px', fontSize: '9px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!confirm(`Valider le transfert ${tr.code} ?\n\nLa marchandise sortira du stock de ${tr.magasinDepartNom}. Elle entrera à ${tr.magasinDestNom} à la réception.`)) return;
                                    void (async () => {
                                      await SupabaseDatabase.validerTransfert(tr.id);
                                      await reloadData();
                                    })();
                                  }}
                                >
                                  ✓ Valider
                                </button>
                              )}
                              {tr.statut === 'Demande' && (currentUser.role === 'direction' || (currentUser.role === 'magasinier' && tr.magasinDepartId === currentUser.magasinId)) && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '1px 6px', fontSize: '9px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const motifRefus = prompt(`Refuser le transfert ${tr.code} — motif du refus :`);
                                    if (motifRefus === null) return;
                                    void (async () => {
                                      await SupabaseDatabase.refuserTransfert(tr.id, motifRefus || undefined);
                                      await reloadData();
                                    })();
                                  }}
                                >
                                  ✗ Refuser
                                </button>
                              )}
                              {/* Étape 3 : réception par la direction ou le magasinier du dépôt destination — entre la marchandise */}
                              {(tr.statut === 'Validé' || tr.statut === 'Expédié') && (currentUser.role === 'direction' || (currentUser.role === 'magasinier' && tr.magasinDestId === currentUser.magasinId)) && (
                                <button
                                  className="btn btn-success"
                                  style={{ padding: '1px 6px', fontSize: '9px', color: '#fff', backgroundColor: 'var(--c-good)' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!confirm(`Confirmer la réception du transfert ${tr.code} à ${tr.magasinDestNom} ?`)) return;
                                    void (async () => {
                                      await SupabaseDatabase.recevoirTransfert(tr.id);
                                      await reloadData();
                                    })();
                                  }}
                                >
                                  📥 Réception Transfert
                                </button>
                              )}
                              {tr.statut === 'Demande' && (
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '1px 6px', fontSize: '9px', background: 'var(--c-danger)', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRibbonDelete(tr.id);
                                  }}
                                >
                                  🗑️ Supprimer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{getFilteredTransferts().length} transfert(s)</span>
                </div>
              </div>
            )}


            {/* TAB: FACTURES */}
            {activeTab === 'factures' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><FileText size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Factures d'Achats</h2>
                    <span className="section-lead">Gestion des factures fournisseurs — à titre informatif (les dettes sont gérées par les réceptions)</span>
                  </div>
                  <div className="page-section-actions">
                    {(currentUser.role === 'direction' || currentUser.role === 'comptabilite') && (
                      <button className="btn-action primary" onClick={() => {
                        setFactureStep(1);
                        setFactureFournisseurId('');
                        setFactureSelectedRecs([]);
                        setFactureLignes([]);
                        setFactureTauxTVA(0.19);
                        setFactureTimbre(500);
                        setFactureFraisPort(0);
                        setFactureNote('');
                        setFactureModalOpen(true);
                      }}>
                        <Plus size={15} /> <span>Nouvelle Facture</span>
                      </button>
                    )}
                    <button className="btn-action" onClick={handleRibbonPrint} disabled={!selectedRowId}>
                      <Printer size={15} /> <span>Voir / Imprimer la Facture</span>
                    </button>
                    <button className="btn-action danger" onClick={handleRibbonDelete} disabled={!selectedRowId}>
                      <Trash size={15} /> <span>Supprimer</span>
                    </button>
                  </div>
                </div>
                <div className="win-grid-container">

                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Date Facture</th>
                        <th>Référence Facture</th>
                        <th>Fournisseur</th>
                        <th>Réf Commande</th>
                        <th>Montant HT</th>
                        <th>Montant TTC</th>
                        <th>Solde Restant</th>
                        <th>Règlements / Lettrage</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredFactures().map(fac => {
                        const matchedPays = paiements.filter(p => p.factureId === fac.id);
                        return (
                          <tr 
                            key={fac.id}
                            className={selectedRowId === fac.id ? 'selected' : ''}
                            onClick={() => setSelectedRowId(fac.id)}
                          >
                            <td>{new Date(fac.dateFacture).toLocaleDateString('fr-FR')}</td>
                            <td><code>{fac.code}</code></td>
                            <td><strong>{fac.fournisseurNom}</strong></td>
                            <td>{fac.commandeCode ? <code>{fac.commandeCode}</code> : '-'}</td>
                            <td>{fac.montantHT.toLocaleString()} DA</td>
                            <td style={{ fontWeight: 'bold' }}>{fac.montantTTC.toLocaleString()} DA</td>
                            <td style={{ fontWeight: 'bold', color: fac.soldeRestant > 0 ? 'var(--c-danger)' : 'var(--c-good)' }}>
                              {fac.soldeRestant.toLocaleString()} DA
                            </td>
                            <td>
                              {matchedPays.length === 0 ? (
                                <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '10px' }}>Non lettrée</span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                  {matchedPays.map(p => (
                                    <span key={p.id} className="badge" style={{ fontSize: '9px', background: 'var(--c-good-bg)', color: 'var(--c-good)', border: '1px solid #c8e6c9', padding: '1px 4px', borderRadius: '4px' }}>
                                      {p.code}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${fac.statut === 'Payée' ? 'badge-success' : fac.statut === 'Partiellement payée' ? 'badge-warning' : 'badge-danger'}`} style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                background: fac.statut === 'Payée' ? 'var(--c-good-bg)' : fac.statut === 'Partiellement payée' ? '#fff3e0' : 'var(--c-danger-bg)',
                                color: fac.statut === 'Payée' ? 'var(--c-good)' : fac.statut === 'Partiellement payée' ? '#ef6c00' : 'var(--c-danger)',
                                border: `1px solid ${fac.statut === 'Payée' ? '#c8e6c9' : fac.statut === 'Partiellement payée' ? '#ffe0b2' : '#ffcdd2'}`
                              }}>
                                {fac.statut}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '1px 6px', fontSize: '9px' }}
                                title="Voir le contenu de la facture et l'imprimer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRowId(fac.id);
                                  openFacturePrint(fac);
                                }}
                              >
                                Voir
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Total facturé : {getFilteredFactures().reduce((acc, f) => acc + f.montantTTC, 0).toLocaleString()} DA | Reste à payer : {getFilteredFactures().reduce((acc, f) => acc + f.soldeRestant, 0).toLocaleString()} DA
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{getFilteredFactures().length} facture(s)</span>
                </div>
              </div>
            )}

            {/* TAB: FINANCES */}
            {activeTab === 'finances' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><Landmark size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Règlements Fourn.</h2>
                    <span className="section-lead">Règlements imputés sur les factures d'achat (lettrage). Pour un règlement sur solde sans facture, utiliser la page Fournisseurs.</span>
                  </div>
                  <div className="page-section-actions">
                    <button className="btn-action primary" onClick={handleRibbonAdd}>
                      <Plus size={15} /> <span>Règlement avec lettrage</span>
                    </button>
                    <button className="btn-action danger" onClick={handleRibbonDelete} disabled={!selectedRowId}>
                      <Trash size={15} /> <span>Supprimer</span>
                    </button>
                  </div>
                </div>
                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Date et heure</th>
                        <th>Code Règlement</th>
                        <th>Société Fournisseur</th>
                        <th>Montant Réglé</th>
                        <th>Mode Paiement</th>
                        <th>Référence Transaction</th>
                        <th>Enregistré Par</th>
                        <th>Lettrage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredPaiements().map(pay => (
                        <tr 
                          key={pay.id}
                          className={selectedRowId === pay.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(pay.id)}
                        >
                          <td>{new Date(pay.datePaiement).toLocaleString('fr-FR')}</td>
                          <td><code>{pay.code}</code></td>
                          <td><strong>{pay.fournisseurNom}</strong></td>
                          <td style={{ fontWeight: 'bold', color: 'var(--c-good)' }}>{pay.montant.toLocaleString()} DA</td>
                          <td>{pay.mode}</td>
                          <td><code>{pay.referenceTransaction}</code></td>
                          <td>{pay.comptableNom}</td>
                          <td>
                            {pay.lettre && pay.factureRef ? (
                              <span className="badge" style={{ fontSize: '9px', background: 'var(--c-good-bg)', color: 'var(--c-good)', border: '1px solid #c8e6c9', padding: '1px 4px', borderRadius: '4px' }}>
                                Lettré : {pay.factureRef}
                              </span>
                            ) : (
                              <span
                                className="badge"
                                style={{ fontSize: '9px', background: '#fff8e1', color: '#8d6e00', border: '1px solid #ffe0a3', padding: '1px 4px', borderRadius: '4px' }}
                                title="Règlement sur solde, non imputé à une facture"
                              >
                                Sur solde
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{getFilteredPaiements().length} règlement(s)</span>
                </div>
              </div>
            )}



            {/* TAB: USERS */}
            {activeTab === 'users' && currentUser.role === 'direction' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><Users size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Utilisateurs & Droits</h2>
                    <span className="section-lead">Administration des comptes et permissions d'accès aux dépôts</span>
                  </div>
                  <div className="page-section-actions">
                    <button className="btn-action primary" onClick={() => { setSelectedUser({ role: 'magasinier', actif: true, magasinsIds: [] }); setUserModalOpen(true); }}>
                      <Plus size={15} /> <span>Créer Nouvel Utilisateur</span>
                    </button>
                  </div>
                </div>
                {/* Stats cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: 'var(--primary-light)', borderLeft: '3px solid var(--primary)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{users.length}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total Utilisateurs</div>
                  </div>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: 'var(--c-good-bg)', borderLeft: '3px solid #4caf50' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--c-good)' }}>{users.filter(u => u.actif).length}</div>
                    <div style={{ fontSize: '10px', color: '#558b2f' }}>Actifs</div>
                  </div>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: 'var(--c-danger-bg)', borderLeft: '3px solid #f44336' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--c-danger)' }}>{users.filter(u => !u.actif).length}</div>
                    <div style={{ fontSize: '10px', color: '#b71c1c' }}>Suspendus</div>
                  </div>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: '#ede7f6', borderLeft: '3px solid #7c4dff' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#512da8' }}>{users.filter(u => u.role === 'direction').length}</div>
                    <div style={{ fontSize: '10px', color: '#673ab7' }}>Administrateurs</div>
                  </div>
                </div>

                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Avatar</th>
                        <th>Nom Complet</th>
                        <th>Adresse E-mail</th>
                        <th>Téléphone</th>
                        <th>Rôle</th>
                        <th>Accès Magasins</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredUsers().map(usr => (
                        <tr 
                          key={usr.id}
                          className={selectedRowId === usr.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(usr.id)}
                        >
                          <td>
                            {usr.avatar ? (
                              <img src={usr.avatar} alt={usr.name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>
                                {usr.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td><strong>{usr.name}</strong></td>
                          <td><code>{usr.email}</code></td>
                          <td>{usr.telephone || '-'}</td>
                          <td>
                            <span className={`badge ${
                              usr.role === 'direction' ? 'badge-danger' :
                              usr.role === 'magasinier' ? 'badge-info' :
                              usr.role === 'achat' ? 'badge-success' :
                              usr.role === 'comptabilite' ? 'badge-warning' :
                              'badge-secondary'
                            }`} style={{ fontSize: '10px' }}>
                              {getRoleLabel(usr.role)}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                              {usr.role === 'direction' ? (
                                <span className="badge badge-success" style={{ fontSize: '9px', padding: '2px 6px', background: '#e3effa', color: 'var(--win-blue-dark)', border: '1px solid #c8dcf0' }}>Tous les magasins</span>
                              ) : usr.magasinsIds && usr.magasinsIds.length > 0 ? (
                                usr.magasinsIds.map(mid => {
                                  const m = magasins.find(x => x.id === mid);
                                  return (
                                    <span key={mid} className="badge" style={{ fontSize: '8px', padding: '1px 4px', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                      {m ? m.nom.replace('Magasin ', '') : mid}
                                    </span>
                                  );
                                })
                              ) : usr.magasinId ? (() => {
                                const m = magasins.find(x => x.id === usr.magasinId);
                                return (
                                  <span className="badge" style={{ fontSize: '8px', padding: '1px 4px', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                    {m ? m.nom.replace('Magasin ', '') : usr.magasinId}
                                  </span>
                                );
                              })() : (
                                <span style={{ fontSize: '9px', color: 'var(--c-danger)', fontWeight: 'bold' }}>Aucun accès</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button 
                              className={`btn ${usr.actif ? 'btn-secondary' : 'btn-primary'}`}
                              style={{ padding: '2px 8px', fontSize: '9px', width: '90px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                void (async () => {
                                  try {
                                    await SupabaseDatabase.toggleUserActif(usr.id, !usr.actif);
                                    await reloadData();
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : 'Erreur');
                                  }
                                })();
                              }}
                            >
                              {usr.actif ? '🟢 Actif' : '🔴 Suspendu'}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '2px 6px', fontSize: '9px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(usr);
                                  setUserModalOpen(true);
                                }}
                              >
                                Modifier
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '2px 6px', fontSize: '9px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void (async () => {
                                    try {
                                      if (window.confirm(`Réinitialiser le mot de passe de ${usr.name} et générer un mot de passe temporaire ?`)) {
                                        const tmp = await SupabaseDatabase.resetUserPassword(usr.id);
                                        await reloadData();
                                        alert(`Mot de passe temporaire généré : ${tmp}\nInformez l'utilisateur de le changer à la prochaine connexion.`);
                                      }
                                    } catch (err) {
                                      alert(err instanceof Error ? err.message : 'Erreur');
                                    }
                                  })();
                                }}
                              >
                                Réinit. mdp
                              </button>
                              <button 
                                className="btn btn-secondary logout-btn" 
                                style={{ padding: '2px 6px', fontSize: '9px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Supprimer définitivement l'utilisateur ${usr.name} ?`)) {
                                    void (async () => {
                                      try {
                                        await SupabaseDatabase.deleteUser(usr.id);
                                        await reloadData();
                                      } catch (err) {
                                        alert(err instanceof Error ? err.message : 'Erreur');
                                      }
                                    })();
                                  }
                                }}
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {getFilteredUsers().length} sur {users.length} utilisateur(s)
                  </span>
                </div>
              </div>
            )}

            {/* TAB: SOCIÉTÉ — identité et coordonnées de l'entreprise (direction uniquement) */}
            {activeTab === 'societe' && currentUser.role === 'direction' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><Building2 size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Société — Informations & Coordonnées</h2>
                    <span className="section-lead">
                      Identité légale, identifiants fiscaux et coordonnées de l'entreprise. Ces informations
                      composent l'en-tête des documents imprimés (bons de commande, BL, factures, transferts).
                    </span>
                  </div>
                  <div className="page-section-actions">
                    <button
                      className="btn-action"
                      onClick={() => setSocieteForm(societe || {})}
                      disabled={!societeReady}
                      title="Abandonner les modifications non enregistrées"
                    >
                      <RefreshCw size={15} /> <span>Réinitialiser</span>
                    </button>
                    <button
                      className="btn-action primary"
                      disabled={!societeReady || isSavingSociete}
                      onClick={() => {
                        if (!societeForm.raisonSociale || !societeForm.raisonSociale.trim()) {
                          alert('La raison sociale est obligatoire.');
                          return;
                        }
                        setIsSavingSociete(true);
                        void (async () => {
                          try {
                            const enregistre = await SupabaseDatabase.saveSociete({ ...societeForm, id: societe?.id });
                            setSociete(enregistre);
                            setSocieteForm(enregistre || {});
                            alert('✅ Informations de la société enregistrées.');
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
                          } finally {
                            setIsSavingSociete(false);
                          }
                        })();
                      }}
                    >
                      <CheckSquare size={15} /> <span>{isSavingSociete ? 'Enregistrement…' : 'Enregistrer'}</span>
                    </button>
                  </div>
                </div>

                {!societeReady && (
                  <div style={{
                    margin: '12px 0',
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, rgba(255,152,0,0.08), rgba(255,87,34,0.06))',
                    border: '1px solid rgba(255,152,0,0.3)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}>
                    <strong>⚠️ Table « societe » absente de la base.</strong>
                    <div style={{ marginTop: '6px', color: 'var(--text-muted)' }}>
                      Exécutez le script <code>db/create_societe.sql</code> dans l'éditeur SQL de Supabase,
                      puis cliquez sur « Actualiser » dans l'en-tête. L'enregistrement est désactivé
                      jusqu'à la création de la table.
                    </div>
                  </div>
                )}

                <div className="dash-grid-2">
                  <div className="card">
                    <div className="card-title card-title--navy">Identité légale</div>
                    <div style={{ marginTop: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Raison sociale *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={societeForm.raisonSociale || ''}
                          onChange={e => setSocieteForm({ ...societeForm, raisonSociale: e.target.value })}
                          placeholder="BG MAÇONNERIE"
                        />
                      </div>
                      <div className="split-view">
                        <div className="form-group">
                          <label className="form-label">Forme juridique</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.formeJuridique || ''}
                            onChange={e => setSocieteForm({ ...societeForm, formeJuridique: e.target.value })}
                            placeholder="SARL, EURL, SPA…"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Capital social (DA)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={societeForm.capitalSocial ?? ''}
                            onChange={e => setSocieteForm({ ...societeForm, capitalSocial: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Activité</label>
                        <input
                          type="text"
                          className="form-input"
                          value={societeForm.activite || ''}
                          onChange={e => setSocieteForm({ ...societeForm, activite: e.target.value })}
                          placeholder="Matériaux de construction et travaux"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Logo (URL)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={societeForm.logoUrl || ''}
                          onChange={e => setSocieteForm({ ...societeForm, logoUrl: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title card-title--gold">Identifiants fiscaux</div>
                    <div style={{ marginTop: '12px' }}>
                      <div className="split-view">
                        <div className="form-group">
                          <label className="form-label">Registre de commerce (RC)</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.rc || ''}
                            onChange={e => setSocieteForm({ ...societeForm, rc: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">NIF</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.nif || ''}
                            onChange={e => setSocieteForm({ ...societeForm, nif: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="split-view">
                        <div className="form-group">
                          <label className="form-label">NIS</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.nis || ''}
                            onChange={e => setSocieteForm({ ...societeForm, nis: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Article d'imposition (AI)</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.ai || ''}
                            onChange={e => setSocieteForm({ ...societeForm, ai: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="split-view">
                        <div className="form-group">
                          <label className="form-label">Banque</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.banque || ''}
                            onChange={e => setSocieteForm({ ...societeForm, banque: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">RIB</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.rib || ''}
                            onChange={e => setSocieteForm({ ...societeForm, rib: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ marginTop: '12px' }}>
                  <div className="card-title card-title--teal">Coordonnées</div>
                  <div style={{ marginTop: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Adresse du siège</label>
                      <input
                        type="text"
                        className="form-input"
                        value={societeForm.adresse || ''}
                        onChange={e => setSocieteForm({ ...societeForm, adresse: e.target.value })}
                      />
                    </div>
                    <div className="dash-grid-2">
                      <div className="split-view">
                        <div className="form-group">
                          <label className="form-label">Ville</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.ville || ''}
                            onChange={e => setSocieteForm({ ...societeForm, ville: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Wilaya</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.wilaya || ''}
                            onChange={e => setSocieteForm({ ...societeForm, wilaya: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="split-view">
                        <div className="form-group">
                          <label className="form-label">Code postal</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.codePostal || ''}
                            onChange={e => setSocieteForm({ ...societeForm, codePostal: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Fax</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.fax || ''}
                            onChange={e => setSocieteForm({ ...societeForm, fax: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="dash-grid-2">
                      <div className="split-view">
                        <div className="form-group">
                          <label className="form-label">Téléphone</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.telephone || ''}
                            onChange={e => setSocieteForm({ ...societeForm, telephone: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Téléphone 2</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.telephone2 || ''}
                            onChange={e => setSocieteForm({ ...societeForm, telephone2: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="split-view">
                        <div className="form-group">
                          <label className="form-label">E-mail</label>
                          <input
                            type="email"
                            className="form-input"
                            value={societeForm.email || ''}
                            onChange={e => setSocieteForm({ ...societeForm, email: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Site web</label>
                          <input
                            type="text"
                            className="form-input"
                            value={societeForm.siteWeb || ''}
                            onChange={e => setSocieteForm({ ...societeForm, siteWeb: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mention libre (pied des documents)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={societeForm.note || ''}
                        onChange={e => setSocieteForm({ ...societeForm, note: e.target.value })}
                        placeholder="Ex. : Merci de votre confiance — conditions de règlement à 30 jours"
                      />
                    </div>
                  </div>
                </div>

                {/* Aperçu de l'en-tête tel qu'il apparaîtra sur les documents imprimés */}
                <div className="card" style={{ marginTop: '12px' }}>
                  <div className="card-title card-title--blue">Aperçu de l'en-tête des documents</div>
                  <div style={{ marginTop: '12px', padding: '16px', background: '#fff', color: '#111827', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a' }}>
                      {societeForm.raisonSociale || 'BGM CONSTRUCTION & LOGISTIQUE'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
                      {[societeForm.formeJuridique, societeForm.activite].filter(Boolean).join(' — ') || 'Gestion Centralisée des Dépôts et Chantiers'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px', lineHeight: 1.6 }}>
                      {[societeForm.adresse, societeForm.codePostal, societeForm.ville, societeForm.wilaya].filter(Boolean).join(' · ')}
                      {(societeForm.telephone || societeForm.email) && <br />}
                      {[societeForm.telephone && `Tél. ${societeForm.telephone}`, societeForm.telephone2, societeForm.fax && `Fax ${societeForm.fax}`, societeForm.email, societeForm.siteWeb].filter(Boolean).join(' · ')}
                      {(societeForm.rc || societeForm.nif || societeForm.nis || societeForm.ai) && <br />}
                      {[societeForm.rc && `RC ${societeForm.rc}`, societeForm.nif && `NIF ${societeForm.nif}`, societeForm.nis && `NIS ${societeForm.nis}`, societeForm.ai && `AI ${societeForm.ai}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SAUVEGARDE DE LA BASE */}
            {activeTab === 'sauvegarde' && currentUser.role === 'direction' && (
              <div>
                <div className="page-section-header">
                  <div className="page-section-title">
                    <h2 className="section-title"><Database size={20} style={{marginRight:8, verticalAlign:'middle'}}/>Sauvegarde de la Base</h2>
                    <span className="section-lead">
                      Copie intégrale des données Supabase (articles, stocks, mouvements, achats, réceptions,
                      factures, règlements, employés, chantiers…) dans un seul fichier JSON téléchargé sur ce poste.
                      L'opération ne fait que lire la base : aucune donnée n'est modifiée.
                    </span>
                  </div>
                  <div className="page-section-actions">
                    <button
                      className="btn-action primary"
                      onClick={() => handleTelechargerSauvegarde('sql')}
                      disabled={sauvegardeEnCours}
                      title="Script SQL rejouable dans l'éditeur SQL Supabase pour restaurer les données"
                    >
                      <Download size={15} /> <span>{sauvegardeEnCours ? 'Sauvegarde en cours…' : 'Sauvegarde restaurable (.sql)'}</span>
                    </button>
                    <button
                      className="btn-action"
                      onClick={() => handleTelechargerSauvegarde('json')}
                      disabled={sauvegardeEnCours}
                      title="Copie brute des tables, pour archivage ou traitement externe"
                    >
                      <Download size={15} /> <span>Export brut (.json)</span>
                    </button>
                  </div>
                </div>

                {sauvegardeEnCours && (
                  <div style={{
                    margin: '12px 0', padding: '12px 16px', borderRadius: '8px',
                    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                    fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px'
                  }}>
                    <RefreshCw size={15} className="spin" />
                    <span>{sauvegardeEtape || 'Lecture des tables…'}</span>
                  </div>
                )}

                <div className="split-view">
                  <div className="card">
                    <div className="card-title card-title--blue">Contenu et options</div>
                    <div style={{ fontSize: '12px', lineHeight: 1.7, marginTop: '10px' }}>
                      <div style={{
                        padding: '10px 14px', marginBottom: '12px', borderRadius: '6px',
                        background: 'var(--c-good-bg)', border: '1px solid var(--c-good)'
                      }}>
                        <strong>Sauvegarde complète de la base (recommandée)</strong>
                        <div style={{ marginTop: '6px' }}>
                          Depuis le dossier du projet, en ligne de commande :
                          <div style={{ margin: '6px 0', fontFamily: 'Consolas, monospace', fontSize: '11.5px' }}>
                            npm run backup-db
                          </div>
                          Produit un vrai <code>pg_dump</code> PostgreSQL : schéma, contraintes, index,
                          séquences, policies RLS <em>et</em> données — tout ce qu'il faut pour reconstruire
                          la base à l'identique. Restauration : <code>npm run restore-db</code>.
                          Procédure détaillée dans <code>BACKUP.md</code>.
                        </div>
                      </div>

                      <p style={{ marginBottom: '10px' }}>
                        Les deux boutons ci-dessus sauvegardent <strong>les données uniquement</strong>, sans
                        installer d'outil ni connaître le mot de passe de la base — et seulement ce que vos
                        droits (RLS) laissent lire. Le <code>.sql</code> se rejoue tel quel dans l'éditeur SQL
                        Supabase (schéma déjà en place, lignes existantes non écrasées) ; le <code>.json</code>
                        est une copie brute pour archivage ou traitement externe.
                        Les tables absentes du déploiement sont listées, sans faire échouer l'export.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                        {SupabaseDatabase.TABLES_SAUVEGARDE.map(t => (
                          <span key={t} className="badge badge-info" style={{ fontFamily: 'Consolas, monospace' }}>{t}</span>
                        ))}
                      </div>

                      <div style={{
                        padding: '10px 14px', borderRadius: '6px',
                        background: 'var(--c-warn-bg)', border: '1px solid var(--c-warn)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="sauvegarde-mdp"
                            checked={sauvegardeMotsDePasse}
                            onChange={e => setSauvegardeMotsDePasse(e.target.checked)}
                            disabled={sauvegardeEnCours}
                          />
                          <label htmlFor="sauvegarde-mdp" className="form-label" style={{ margin: 0 }}>
                            Inclure les mots de passe des utilisateurs
                          </label>
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '11px' }}>
                          Les mots de passe sont stockés en clair dans la base. Décoché (recommandé), ils sont
                          remplacés par <code>***MASQUE***</code> : la liste des comptes reste sauvegardée, mais
                          les mots de passe devront être redéfinis après une restauration.
                        </div>
                      </div>

                      <p style={{ marginTop: '14px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        ℹ️ Conservez les sauvegardes hors du poste de travail (disque externe, cloud d'entreprise).
                        Aucune restauration n'est déclenchable depuis l'application : elle passe par l'éditeur SQL
                        Supabase ou par <code>npm run restore-db</code>, pour éviter tout écrasement accidentel
                        des données en production.
                      </p>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title card-title--blue">Dernière sauvegarde de cette session</div>
                    {!derniereSauvegarde ? (
                      <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Aucune sauvegarde téléchargée depuis l'ouverture de l'application.
                        Cliquez sur « Télécharger la sauvegarde » pour générer le fichier.
                      </div>
                    ) : (
                      <div style={{ marginTop: '10px', fontSize: '12px' }}>
                        <div style={{ marginBottom: '10px', lineHeight: 1.8 }}>
                          <div><strong>Fichier :</strong> <code>{derniereSauvegarde.fichier}</code></div>
                          <div><strong>Généré le :</strong> {derniereSauvegarde.date}</div>
                          <div><strong>Volume :</strong> {derniereSauvegarde.lignes.toLocaleString('fr-FR')} ligne(s) — {derniereSauvegarde.poids}</div>
                        </div>
                        <div className="win-grid-container" style={{ maxHeight: '260px' }}>
                          <table className="win-table">
                            <thead>
                              <tr><th>Table</th><th style={{ textAlign: 'right' }}>Lignes sauvegardées</th></tr>
                            </thead>
                            <tbody>
                              {Object.entries(derniereSauvegarde.statistiques).map(([table, nb]) => (
                                <tr key={table}>
                                  <td><code>{table}</code></td>
                                  <td style={{ textAlign: 'right' }}>{nb.toLocaleString('fr-FR')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {derniereSauvegarde.tablesAbsentes.length > 0 && (
                          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            Tables absentes de ce déploiement (non exportées) : {derniereSauvegarde.tablesAbsentes.join(', ')}
                          </div>
                        )}
                        {derniereSauvegarde.erreurs.length > 0 && (
                          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--c-danger)' }}>
                            ⚠️ Tables illisibles (droits RLS ?) : {derniereSauvegarde.erreurs.map(e => e.table).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── PLANIFICATEUR ─────────────────────────────────────────── */}
                <div className="card" style={{ marginTop: '12px' }}>
                  <div className="card-title card-title--blue">⏱️ Planificateur de sauvegarde automatique</div>
                  <div style={{ fontSize: '12px', lineHeight: 1.7, marginTop: '10px' }}>
                    <p style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>
                      Le planificateur s'exécute <strong>à l'ouverture de l'application sur ce poste</strong> :
                      un navigateur fermé ne peut rien sauvegarder. Le réglage est propre à ce poste et à ce
                      navigateur. Pour une sauvegarde qui tourne même application fermée, voyez la tâche
                      Windows plus bas.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <input
                        type="checkbox"
                        id="plan-actif"
                        checked={planSauvegarde.actif}
                        onChange={e => {
                          const maj = { ...planSauvegarde, actif: e.target.checked };
                          setPlanSauvegarde(maj);
                          ecrirePlanSauvegarde(maj);
                          if (!e.target.checked) setSauvegardeDue(false);
                        }}
                      />
                      <label htmlFor="plan-actif" className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                        Activer la sauvegarde automatique
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Fréquence</label>
                        <select
                          className="form-select"
                          disabled={!planSauvegarde.actif}
                          value={planSauvegarde.frequence}
                          onChange={e => {
                            const maj = { ...planSauvegarde, frequence: e.target.value as FrequenceSauvegarde };
                            setPlanSauvegarde(maj);
                            ecrirePlanSauvegarde(maj);
                          }}
                        >
                          <option value="quotidienne">Quotidienne (1 jour)</option>
                          <option value="hebdomadaire">Hebdomadaire (7 jours)</option>
                          <option value="mensuelle">Mensuelle (30 jours)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Format du fichier</label>
                        <select
                          className="form-select"
                          disabled={!planSauvegarde.actif}
                          value={planSauvegarde.format}
                          onChange={e => {
                            const maj = { ...planSauvegarde, format: e.target.value as 'sql' | 'json' };
                            setPlanSauvegarde(maj);
                            ecrirePlanSauvegarde(maj);
                          }}
                        >
                          <option value="sql">.sql — restaurable</option>
                          <option value="json">.json — export brut</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">À l'échéance</label>
                        <select
                          className="form-select"
                          disabled={!planSauvegarde.actif}
                          value={planSauvegarde.mode}
                          onChange={e => {
                            const maj = { ...planSauvegarde, mode: e.target.value as 'auto' | 'rappel' };
                            setPlanSauvegarde(maj);
                            ecrirePlanSauvegarde(maj);
                          }}
                        >
                          <option value="rappel">Me rappeler (bandeau)</option>
                          <option value="auto">Télécharger sans rien demander</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">État</label>
                        <div style={{ paddingTop: '4px' }}>
                          {/* Pas de comparaison à l'heure courante pendant le rendu : l'échéance
                              dépassée est celle constatée à l'ouverture (sauvegardeDue). */}
                          {!planSauvegarde.actif ? (
                            <span className="badge badge-danger">Désactivé</span>
                          ) : !prochaineEcheance(planSauvegarde) ? (
                            <span className="badge badge-warning">Première sauvegarde attendue</span>
                          ) : sauvegardeDue ? (
                            <span className="badge badge-warning">Échue</span>
                          ) : (
                            <span className="badge badge-success">
                              Prochaine le {prochaineEcheance(planSauvegarde)?.toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                      Dernière sauvegarde depuis ce poste :{' '}
                      {planSauvegarde.derniereExecution
                        ? new Date(planSauvegarde.derniereExecution).toLocaleString('fr-FR')
                        : 'aucune'}
                      {planSauvegarde.mode === 'auto' && planSauvegarde.actif && (
                        <> — en mode automatique, les mots de passe restent toujours masqués.</>
                      )}
                    </div>

                    <div style={{
                      marginTop: '14px', padding: '10px 14px', borderRadius: '6px',
                      background: 'var(--c-good-bg)', border: '1px solid var(--c-good)'
                    }}>
                      <strong>Sauvegarde automatique complète, application fermée</strong>
                      <div style={{ marginTop: '6px' }}>
                        Une tâche Windows lance le vrai <code>pg_dump</code> (schéma + policies + données)
                        à heure fixe, sans que personne n'ouvre l'application :
                        <div style={{ margin: '6px 0', fontFamily: 'Consolas, monospace', fontSize: '11.5px' }}>
                          npm run schedule-backup -- --time=20:00
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>
                          Fichiers dans <code>backups/</code>, journal dans <code>backups/journal-sauvegarde.log</code>.
                          Vérifier : <code>npm run schedule-backup -- --list</code> · Supprimer :{' '}
                          <code>npm run schedule-backup -- --remove</code>. Le poste doit être allumé à l'heure prévue.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

        {/* Right side drawers (Preview & Filters pane) */}
        {rightPanelActive && (
          <aside className="win-preview-panel">
            <div className="win-panel-header">
              <span>Filtres de recherche</span>
              <button className="win-tab-close" onClick={() => setRightPanelActive(null)}>×</button>
            </div>
            
            <div style={{ padding: '8px', overflowY: 'auto', flexGrow: 1, fontSize: '10px' }}>
              {rightPanelActive === 'filters' && (
                <div>
                  {!selectedRowId ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>
                      <Info size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                      Sélectionnez une ligne dans la table centrale pour voir un aperçu en direct ici.
                    </div>
                  ) : (
                    <div>
                      {/* 1. Article preview */}
                      {activeTab === 'articles' && (() => {
                        const art = articles.find(a => a.id === selectedRowId);
                        if (!art) return null;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ border: '1px solid #ccc', background: '#eee', height: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <img src={art.photoUrl || 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?w=200'} alt={art.designation} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <strong style={{ fontSize: '12px' }}>{art.designation}</strong>
                            <p><strong>Code article :</strong> {art.reference}</p>
                            <p><strong>Catégorie :</strong> {art.categorie}</p>
                            <p><strong>Stock d'alerte :</strong> {art.stockMinimum} {art.unite}</p>
                            <p><strong>PMP Moyen :</strong> {art.prixMoyen.toLocaleString()} DA</p>
                            <div style={{ borderTop: '1px solid #ccc', paddingTop: '8px', textAlign: 'center' }}>
                              <QrCode size={48} style={{ margin: '0 auto' }} />
                              <div style={{ fontSize: '8px', marginTop: '2px' }}>Barcode : {art.qrCode}</div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 2. Magasin preview */}
                      {activeTab === 'magasins' && (() => {
                        const mag = magasins.find(m => m.id === selectedRowId);
                        if (!mag) return null;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <strong style={{ fontSize: '12px' }}>{mag.nom}</strong>
                            <p><strong>Code unique :</strong> <code>{mag.code}</code></p>
                            <p><strong>Ville :</strong> {mag.ville}</p>
                            <p><strong>Wilaya :</strong> {mag.wilaya}</p>
                            <p><strong>Responsable principal :</strong> {mag.responsable}</p>
                            <p><strong>Téléphone direct :</strong> {mag.telephone}</p>
                            <p><strong>Statut opérationnel :</strong> {mag.actif ? 'Opérationnel' : 'À l\'arrêt'}</p>
                          </div>
                        );
                      })()}

                      {/* 3. Fournisseur preview */}
                      {activeTab === 'fournisseurs' && (() => {
                        const four = fournisseurs.find(f => f.id === selectedRowId);
                        if (!four) return null;
                        const supplierPays = paiements.filter(p => p.fournisseurId === four.id).sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime());
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <strong style={{ fontSize: '12px' }}>{four.nomSociete}</strong>
                              <p><strong>Registre Commerce (RC) / NIF :</strong> <code>{four.rcNif}</code></p>
                              <p><strong>Contact commercial :</strong> {four.contactNom}</p>
                              <p><strong>Téléphone :</strong> {four.telephone}</p>
                              <p><strong>Adresse siège :</strong> {four.adresse}</p>
                              <div style={{ border: '1px solid var(--c-danger)', background: 'var(--c-danger-bg)', padding: '8px', marginTop: '6px' }}>
                                <p style={{ fontWeight: 'bold', color: 'var(--c-danger)' }}>Encours de dettes de facturation :</p>
                                <strong style={{ fontSize: '14px', color: 'var(--c-danger)' }}>{four.solde.toLocaleString()} DA</strong>
                              </div>
                            </div>

                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <strong style={{ fontSize: '12px' }}>Journal des règlements</strong>
                                <span style={{ fontSize: '11px', color: '#475569' }}>{supplierPays.length} règlement(s)</span>
                              </div>
                              {supplierPays.length === 0 ? (
                                <p style={{ color: '#475569', fontSize: '11px', margin: 0 }}>Aucun règlement enregistré pour ce fournisseur.</p>
                              ) : (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                  {supplierPays.slice(0, 6).map(pay => (
                                    <div key={pay.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', padding: '10px', background: '#fff', border: '1px solid #dbeafe', borderRadius: '6px' }}>
                                      <div>
                                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{pay.code}</div>
                                        <div style={{ fontSize: '11px', color: '#475569' }}>{new Date(pay.datePaiement).toLocaleDateString('fr-FR')} • {pay.mode}</div>
                                        <div style={{ fontSize: '11px', marginTop: '4px' }}><strong>Réf transac. :</strong> {pay.referenceTransaction || '—'}</div>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{pay.montant.toLocaleString()} DA</div>
                                        <div style={{ fontSize: '11px', color: pay.lettre ? '#15803d' : '#b45309' }}>{pay.lettre ? 'Lettré' : 'Non lettré'}</div>
                                      </div>
                                    </div>
                                  ))}
                                  {supplierPays.length > 6 && (
                                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>Affiche les 6 derniers règlements. Aller dans l'onglet Paiements pour voir tous les mouvements.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 4. Commande preview */}
                      {activeTab === 'achats' && (() => {
                        const cmd = commandes.find(c => c.id === selectedRowId);
                        if (!cmd) return null;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ fontSize: '11px' }}>Détails Commande : {cmd.code}</strong>
                            <p><strong>Fournisseur :</strong> {cmd.fournisseurNom}</p>
                            <p><strong>Statut :</strong> {cmd.statut}</p>
                            <p><strong>Total TTC :</strong> {cmd.totalTTC.toLocaleString()} DA</p>
                            <div style={{ borderTop: '1px solid #ccc', marginTop: '6px', paddingTop: '6px' }}>
                              <strong>Articles commandés :</strong>
                              <ul style={{ paddingLeft: '12px', marginTop: '4px' }}>
                                {cmd.lignes.map((l, i) => (
                                  <li key={i}>{l.quantite} × {l.designation}</li>
                                ))}
                              </ul>
                            </div>
                            <button className="btn btn-primary" style={{ marginTop: '10px' }} onClick={handleRibbonPrint}>Ouvrir l'impression</button>
                          </div>
                        );
                      })()}

                      {/* 5. Facture preview */}
                      {activeTab === 'factures' && (() => {
                        const fac = factures.find(f => f.id === selectedRowId);
                        if (!fac) return null;
                        const linkedPays = paiements.filter(p => p.factureId === fac.id);
                        const unlinkedPays = paiements.filter(p => p.fournisseurId === fac.fournisseurId && !p.lettre);

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <strong style={{ fontSize: '12px', color: 'var(--accent)' }}>Détails de la Facture : {fac.code}</strong>
                            <p><strong>Fournisseur :</strong> {fac.fournisseurNom}</p>
                            <p><strong>Date Facture :</strong> {new Date(fac.dateFacture).toLocaleDateString('fr-FR')}</p>
                            {fac.commandeCode && <p><strong>Réf Commande :</strong> <code>{fac.commandeCode}</code></p>}
                            {fac.receptionCode && <p><strong>Réf Réception :</strong> <code>{fac.receptionCode}</code></p>}
                            
                            <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '8px', background: 'rgba(0,0,0,0.02)', marginTop: '4px' }}>
                              <p><strong>Montant HT :</strong> {fac.montantHT.toLocaleString()} DA</p>
                              <p><strong>Montant TTC :</strong> {fac.montantTTC.toLocaleString()} DA</p>
                              <p style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '4px' }}>
                                <strong>Solde Restant :</strong> <span style={{ color: fac.soldeRestant > 0 ? '#d32f2f' : '#388e3c', fontWeight: 'bold' }}>{fac.soldeRestant.toLocaleString()} DA</span>
                              </p>
                              <p><strong>Statut :</strong> <span className={`badge ${fac.statut === 'Payée' ? 'badge-success' : fac.statut === 'Partiellement payée' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '9px', padding: '2px 4px', borderRadius: '4px' }}>{fac.statut}</span></p>
                            </div>

                            <div style={{ marginTop: '8px' }}>
                              <strong>Règlements Associés (Lettrage) :</strong>
                              {linkedPays.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>Aucun règlement associé.</p>
                              ) : (
                                <ul style={{ paddingLeft: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {linkedPays.map(p => (
                                    <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span>{p.code} ({p.montant.toLocaleString()} DA)</span>
                                      <button 
                                        onClick={() => {
                                          void (async () => {
                                            try {
                                              await SupabaseDatabase.delettrerPaiement(p.id);
                                              await reloadData();
                                            } catch (err) {
                                              alert(err instanceof Error ? err.message : 'Erreur');
                                            }
                                          })();
                                        }}
                                        style={{ marginLeft: '6px', background: 'none', border: 'none', color: 'var(--c-danger)', cursor: 'pointer', fontSize: '9px', padding: 0 }}
                                      >
                                        [Dissocier]
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {fac.soldeRestant > 0 && (
                              <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                                <strong>Associer un règlement existant :</strong>
                                {unlinkedPays.length === 0 ? (
                                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '9px', marginTop: '2px' }}>Aucun règlement non-lettré disponible pour ce fournisseur.</p>
                                ) : (
                                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                    <select 
                                      id="fac-associate-pay-select"
                                      className="form-select" 
                                      style={{ fontSize: '9px', padding: '2px', flexGrow: 1 }}
                                    >
                                      {unlinkedPays.map(p => (
                                        <option key={p.id} value={p.id}>
                                          {p.code} - {p.montant.toLocaleString()} DA ({p.mode})
                                        </option>
                                      ))}
                                    </select>
                                    <button 
                                      className="btn btn-primary"
                                      style={{ fontSize: '9px', padding: '2px 6px' }}
                                      onClick={() => {
                                        const selectEl = document.getElementById('fac-associate-pay-select') as HTMLSelectElement;
                                        if (selectEl && selectEl.value) {
                                          void (async () => {
                                            try {
                                              await SupabaseDatabase.lettrerPaiement(selectEl.value, fac.id);
                                              await reloadData();
                                            } catch (err) {
                                              alert(err instanceof Error ? err.message : 'Erreur');
                                            }
                                          })();
                                        }
                                      }}
                                    >
                                      Lier
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* 6. Paiement preview */}
                      {activeTab === 'finances' && (() => {
                        const pay = paiements.find(p => p.id === selectedRowId);
                        if (!pay) return null;
                        const unpaidFacs = factures.filter(f => f.fournisseurId === pay.fournisseurId && f.soldeRestant > 0);

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <strong style={{ fontSize: '12px', color: 'var(--accent)' }}>Détails du Règlement : {pay.code}</strong>
                            <p><strong>Fournisseur :</strong> {pay.fournisseurNom}</p>
                            <p><strong>Date Paiement :</strong> {new Date(pay.datePaiement).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Mode de paiement :</strong> {pay.mode}</p>
                            <p><strong>Réf Transaction :</strong> <code>{pay.referenceTransaction}</code></p>
                            <p><strong>Comptable :</strong> {pay.comptableNom}</p>
                            {pay.note && <p><strong>Note/Memo :</strong> <em>{pay.note}</em></p>}
                            
                            <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '8px', background: 'rgba(0,0,0,0.02)', marginTop: '4px' }}>
                              <p><strong>Montant payé :</strong> <strong style={{ fontSize: '12px', color: 'var(--accent)' }}>{pay.montant.toLocaleString()} DA</strong></p>
                              <p style={{ marginTop: '4px' }}>
                                <strong>Statut Lettrage :</strong>{' '}
                                <span className={`badge ${pay.lettre ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '9px', padding: '2px 4px', borderRadius: '4px' }}>
                                  {pay.lettre ? 'Lettré' : 'Non-lettré'}
                                </span>
                              </p>
                            </div>

                            {pay.lettre && pay.factureId ? (
                              <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                                <p><strong>Facture associée :</strong> <code>{pay.factureRef}</code></p>
                                <button 
                                  className="btn btn-danger" 
                                  style={{ width: '100%', marginTop: '6px', fontSize: '9px', padding: '4px' }}
                                  onClick={() => {
                                    void (async () => {
                                      try {
                                        await SupabaseDatabase.delettrerPaiement(pay.id);
                                        await reloadData();
                                      } catch (err) {
                                        alert(err instanceof Error ? err.message : 'Erreur');
                                      }
                                    })();
                                  }}
                                >
                                  Délettrer (Dissocier règlement)
                                </button>
                              </div>
                            ) : (
                              <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                                <strong>Associer à une facture :</strong>
                                {unpaidFacs.length === 0 ? (
                                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '9px', marginTop: '2px' }}>Aucune facture impayée disponible pour ce fournisseur.</p>
                                ) : (
                                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                    <select 
                                      id="pay-associate-fac-select"
                                      className="form-select" 
                                      style={{ fontSize: '9px', padding: '2px', flexGrow: 1 }}
                                    >
                                      {unpaidFacs.map(f => (
                                        <option key={f.id} value={f.id}>
                                          {f.code} - Solde: {f.soldeRestant.toLocaleString()} DA / TTC: {f.montantTTC.toLocaleString()} DA
                                        </option>
                                      ))}
                                    </select>
                                    <button 
                                      className="btn btn-primary"
                                      style={{ fontSize: '9px', padding: '2px 6px' }}
                                      onClick={() => {
                                        const selectEl = document.getElementById('pay-associate-fac-select') as HTMLSelectElement;
                                        if (selectEl && selectEl.value) {
                                          void (async () => {
                                            try {
                                              await SupabaseDatabase.lettrerPaiement(pay.id, selectEl.value);
                                              await reloadData();
                                            } catch (err) {
                                              alert(err instanceof Error ? err.message : 'Erreur');
                                            }
                                          })();
                                        }
                                      }}
                                    >
                                      Lettrer
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Default display for unsupported tabs */}
                      {activeTab !== 'articles' && activeTab !== 'magasins' && activeTab !== 'fournisseurs' && activeTab !== 'achats' && activeTab !== 'factures' && activeTab !== 'finances' && (
                        <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
                          <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                          Aperçu direct indisponible pour ce type de données.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Right Tab Bar */}
        <aside className="win-right-panel">
          <div 
            className={`win-vertical-tab ${rightPanelActive === 'filters' ? 'active' : ''}`}
            onClick={() => setRightPanelActive(rightPanelActive === 'filters' ? null : 'filters')}
          >
            Filtres rapides
          </div>
        </aside>
      </div>

      {/* ======================================================== */}
      {/* ==================== MODALS INLINE ===================== */}
      {/* ======================================================== */}
      
      {/* 1. Magasin Add/Edit Modal */}
      {magasinModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSaveMagasin}>
              <div className="modal-header">
                <span>{selectedMagasin?.id ? 'Modifier le Magasin' : 'Ajouter un Magasin'}</span>
                <button type="button" className="win-tab-close" onClick={() => setMagasinModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Code unique (ex: MAG-ALG)</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedMagasin?.code || ''}
                    onChange={(e) => setSelectedMagasin({ ...selectedMagasin, code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom du Magasin</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedMagasin?.nom || ''}
                    onChange={(e) => setSelectedMagasin({ ...selectedMagasin, nom: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ville</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedMagasin?.ville || ''}
                    onChange={(e) => setSelectedMagasin({ ...selectedMagasin, ville: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Wilaya</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedMagasin?.wilaya || ''}
                    onChange={(e) => setSelectedMagasin({ ...selectedMagasin, wilaya: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Responsable désigné</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedMagasin?.responsable || ''}
                    onChange={(e) => setSelectedMagasin({ ...selectedMagasin, responsable: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedMagasin?.telephone || ''}
                    onChange={(e) => setSelectedMagasin({ ...selectedMagasin, telephone: e.target.value })}
                  />
                </div>
                {selectedMagasin?.id && (
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="checkbox" 
                      id="actif"
                      checked={selectedMagasin?.actif || false}
                      onChange={(e) => setSelectedMagasin({ ...selectedMagasin, actif: e.target.checked })}
                    />
                    <label htmlFor="actif" className="form-label" style={{ margin: 0 }}>Magasin Actif / Ouvert</label>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setMagasinModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1 bis. Employé Add/Edit Modal */}
      {employeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSaveEmploye}>
              <div className="modal-header">
                <span>{selectedEmploye?.id ? '✏️ Modifier l\'Employé' : '👷 Ajouter un Employé'}</span>
                <button type="button" className="win-tab-close" onClick={() => { setEmployeModalOpen(false); setSelectedEmploye(null); }}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom & Prénom *</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    className="form-input"
                    placeholder="Ex: Mustapha Loucif"
                    value={selectedEmploye?.nom || ''}
                    onChange={(e) => setSelectedEmploye({ ...selectedEmploye, nom: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fonction *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ex: Maçon Qualifié"
                    value={selectedEmploye?.fonction || ''}
                    onChange={(e) => setSelectedEmploye({ ...selectedEmploye, fonction: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Service / Département *</label>
                  <select
                    className="form-select"
                    required
                    value={selectedEmploye?.service || ''}
                    onChange={(e) => setSelectedEmploye({ ...selectedEmploye, service: e.target.value })}
                  >
                    <option value="">-- Sélectionner un service --</option>
                    <option value="Production Gros Œuvre">Production Gros Œuvre</option>
                    <option value="Second Œuvre">Second Œuvre</option>
                    <option value="Finition">Finition</option>
                    <option value="Logistique">Logistique</option>
                    <option value="Administration">Administration</option>
                    <option value="Direction Technique">Direction Technique</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    placeholder="0555 12 34 56"
                    value={selectedEmploye?.telephone || ''}
                    onChange={(e) => setSelectedEmploye({ ...selectedEmploye, telephone: e.target.value })}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Mobile (05/06/07 + 8 chiffres) ou fixe (02/03/04 + 7 chiffres).
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">🏗️ Chantier d'affectation</label>
                  <select
                    className="form-select"
                    value={selectedEmploye?.chantierId || ''}
                    onChange={(e) => setSelectedEmploye({ ...selectedEmploye, chantierId: e.target.value })}
                  >
                    <option value="">-- Non assigné --</option>
                    {/* Un chantier livré n'est plus proposé, sauf s'il est déjà celui de l'employé. */}
                    {chantiers.filter(c => c.actif || c.id === selectedEmploye?.chantierId).map(c => (
                      <option key={c.id} value={c.id}>{c.nom}{c.actif ? '' : ' (livré)'}</option>
                    ))}
                  </select>
                </div>
                {selectedEmploye?.id && (
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      id="employe-actif"
                      checked={selectedEmploye?.actif !== false}
                      onChange={(e) => setSelectedEmploye({ ...selectedEmploye, actif: e.target.checked })}
                    />
                    <label htmlFor="employe-actif" className="form-label" style={{ margin: 0 }}>
                      Employé en poste (décocher = sorti des effectifs)
                    </label>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setEmployeModalOpen(false); setSelectedEmploye(null); }}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Enregistrement…' : 'Valider'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1 ter. Chantier Add/Edit Modal */}
      {chantierModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSaveChantier}>
              <div className="modal-header">
                <span>{selectedChantier?.id ? '✏️ Modifier le Chantier' : '🏗️ Ajouter un Chantier'}</span>
                <button type="button" className="win-tab-close" onClick={() => { setChantierModalOpen(false); setSelectedChantier(null); }}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Désignation du Chantier *</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    className="form-input"
                    placeholder="Ex: Chantier 100 Logements LPP - Alger"
                    value={selectedChantier?.nom || ''}
                    onChange={(e) => setSelectedChantier({ ...selectedChantier, nom: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Wilaya *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ex: Alger (16)"
                    value={selectedChantier?.wilaya || ''}
                    onChange={(e) => setSelectedChantier({ ...selectedChantier, wilaya: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Conducteur de travaux *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ex: Omar Chef"
                    value={selectedChantier?.chefNom || ''}
                    onChange={(e) => setSelectedChantier({ ...selectedChantier, chefNom: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    id="chantier-actif"
                    checked={selectedChantier?.actif !== false}
                    onChange={(e) => setSelectedChantier({ ...selectedChantier, actif: e.target.checked })}
                  />
                  <label htmlFor="chantier-actif" className="form-label" style={{ margin: 0 }}>
                    Chantier actif (décocher = livré / clôturé)
                  </label>
                </div>
                {selectedChantier?.id && employes.filter(e => e.chantierId === selectedChantier.id && e.actif !== false).length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    ℹ️ {employes.filter(e => e.chantierId === selectedChantier.id && e.actif !== false).length} employé(s) actuellement affecté(s) à ce chantier.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setChantierModalOpen(false); setSelectedChantier(null); }}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Enregistrement…' : 'Valider'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Article Add/Edit Modal */}
      {articleModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSaveArticle}>
              <div className="modal-header">
                <span>{selectedArticle?.id ? 'Modifier l\'Article' : 'Ajouter un Article'}</span>
                <button type="button" className="win-tab-close" onClick={() => setArticleModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Référence Code-barres</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedArticle?.reference || ''}
                    onChange={(e) => setSelectedArticle({ ...selectedArticle, reference: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Désignation Produit</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedArticle?.designation || ''}
                    onChange={(e) => setSelectedArticle({ ...selectedArticle, designation: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Catégorie</label>
                  <select 
                    className="form-select"
                    value={selectedArticle?.categorie || 'Gros Œuvre'}
                    onChange={(e) => setSelectedArticle({ ...selectedArticle, categorie: e.target.value })}
                  >
                    <option value="Gros Œuvre">Gros Œuvre / Gros Matériels</option>
                    <option value="Second Œuvre / Finition">Second Œuvre / Peinture & Finitions</option>
                    <option value="Outillage électroportatif">Outillage & Outils de chantier</option>
                    <option value="Sécurité / EPI">Sécurité et Équipement Individuel (EPI)</option>
                    <option value="Électricité">Électricité / Câblage</option>
                    <option value="Consommables">Quincaillerie / Consommables</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unité de mesure</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedArticle?.unite || ''}
                    onChange={(e) => setSelectedArticle({ ...selectedArticle, unite: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock minimum</label>
                  <input 
                    type="number" 
                    required
                    className="form-input" 
                    value={selectedArticle?.stockMinimum || ''}
                    onChange={(e) => setSelectedArticle({ ...selectedArticle, stockMinimum: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prix Moyen d'achat (DA)</label>
                  <input 
                    type="number" 
                    required
                    className="form-input" 
                    value={selectedArticle?.prixMoyen || ''}
                    onChange={(e) => setSelectedArticle({ ...selectedArticle, prixMoyen: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Photo URL (Optionnel)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={selectedArticle?.photoUrl || ''}
                    onChange={(e) => setSelectedArticle({ ...selectedArticle, photoUrl: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setArticleModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2b. Fiche de Stock : historique complet des réceptions et sorties d'un article */}
      {ficheStockOpen && ficheStockArticleId && (() => {
        const art = articles.find(a => a.id === ficheStockArticleId);
        if (!art) return null;
        const mag = ficheStockMagasinId ? magasins.find(m => m.id === ficheStockMagasinId) : null;
        const movs = getFicheStockMouvements(art.id, ficheStockMagasinId);
        const typeLabels: Record<string, string> = {
          ENTREE_ACHAT: 'Réception achat',
          ENTREE_TRANSFERT: 'Entrée transfert',
          SORTIE_AFFECTATION: 'Sortie affectation',
          SORTIE_TRANSFERT: 'Sortie transfert',
          RETOUR_AFFECTATION: 'Retour affectation',
          CORRECTION_INVENTAIRE: 'Régularisation inventaire',
          ENTREE_INVENTAIRE: 'Entrée inventaire',
          SORTIE_INVENTAIRE: 'Sortie inventaire',
          SORTIE_CONSOMMATION: 'Sortie consommation'
        };
        const totalEntrees = movs.filter(m => m.quantite > 0).reduce((s, m) => s + m.quantite, 0);
        const totalSorties = movs.filter(m => m.quantite < 0).reduce((s, m) => s + Math.abs(m.quantite), 0);
        // Stock affiché : celui de la table stocks (référence), pas le cumul des mouvements,
        // afin de rester cohérent avec la grille Stocks.
        const stockActuel = stocks
          .filter(s => s.articleId === art.id && (ficheStockMagasinId ? s.magasinId === ficheStockMagasinId : true))
          .reduce((sum, s) => sum + s.quantite, 0);
        let cumul = 0;
        return (
          <div className="modal-overlay">
            <div className="modal-content large">
              <div className="modal-header">
                <span>📄 Fiche de Stock — {art.designation}</span>
                <button type="button" className="win-tab-close" onClick={() => setFicheStockOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', marginBottom: '12px' }}>
                  <span><strong>Référence :</strong> <code>{art.reference}</code></span>
                  <span><strong>Dépôt :</strong> {mag ? mag.nom : 'Tous les dépôts (consolidé)'}</span>
                  <span><strong>Stock actuel :</strong> {stockActuel} {art.unite}</span>
                  <span><strong>PMP :</strong> {(art.prixMoyen || 0).toLocaleString()} DA</span>
                  <span><strong>Valeur du stock :</strong> {(stockActuel * (art.prixMoyen || 0)).toLocaleString()} DA</span>
                </div>
                <div className="win-grid-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type de mouvement</th>
                        <th>Document</th>
                        <th>Dépôt</th>
                        <th style={{ textAlign: 'right' }}>Entrée</th>
                        <th style={{ textAlign: 'right' }}>Sortie</th>
                        <th style={{ textAlign: 'right' }}>Solde cumulé</th>
                        <th>Opérateur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movs.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                            Aucun mouvement enregistré pour cet article.
                          </td>
                        </tr>
                      ) : (
                        movs.map(mov => {
                          cumul += mov.quantite;
                          const isEntree = mov.quantite > 0;
                          return (
                            <tr key={mov.id}>
                              <td>{new Date(mov.dateMouvement).toLocaleDateString('fr-FR')}</td>
                              <td style={{ color: isEntree ? 'var(--c-good)' : 'var(--c-danger)', fontWeight: 'bold' }}>
                                {typeLabels[mov.type] || mov.type}
                              </td>
                              <td><code>{mov.referenceDoc}</code></td>
                              <td>{mov.magasinNom}</td>
                              <td style={{ textAlign: 'right', color: 'var(--c-good)', fontWeight: 'bold' }}>
                                {isEntree ? mov.quantite : ''}
                              </td>
                              <td style={{ textAlign: 'right', color: 'var(--c-danger)', fontWeight: 'bold' }}>
                                {isEntree ? '' : Math.abs(mov.quantite)}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{cumul}</td>
                              <td>{mov.utilisateurNom}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'flex-end', fontSize: '12px', fontWeight: 'bold', marginTop: '10px' }}>
                  <span style={{ color: 'var(--c-good)' }}>Total entrées : {totalEntrees} {art.unite}</span>
                  <span style={{ color: 'var(--c-danger)' }}>Total sorties : {totalSorties} {art.unite}</span>
                  <span>Solde des mouvements : {cumul} {art.unite}</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setFicheStockOpen(false)}>Fermer</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontWeight: 'bold' }}
                  onClick={() => {
                    // Bascule sur l'overlay d'impression officiel (même gabarit que les autres documents).
                    setFicheStockOpen(false);
                    setPrintDoc({
                      type: 'fiche_stock',
                      article: art,
                      magasinNom: mag ? mag.nom : 'Tous les dépôts (consolidé)',
                      stockActuel,
                      mouvements: movs
                    });
                  }}
                >
                  🖨️ Imprimer la Fiche
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. Fournisseur Add/Edit Modal */}
      {fournisseurModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSaveFournisseur}>
              <div className="modal-header">
                <span>{selectedFournisseur?.id ? 'Modifier le Fournisseur' : 'Ajouter un Fournisseur'}</span>
                <button type="button" className="win-tab-close" onClick={() => setFournisseurModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom Société / Commercial</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedFournisseur?.nomSociete || ''}
                    onChange={(e) => setSelectedFournisseur({ ...selectedFournisseur, nomSociete: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">RC / N° d'identification fiscal (NIF)</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedFournisseur?.rcNif || ''}
                    onChange={(e) => setSelectedFournisseur({ ...selectedFournisseur, rcNif: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom du contact</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedFournisseur?.contactNom || ''}
                    onChange={(e) => setSelectedFournisseur({ ...selectedFournisseur, contactNom: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedFournisseur?.telephone || ''}
                    onChange={(e) => setSelectedFournisseur({ ...selectedFournisseur, telephone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Adresse</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={selectedFournisseur?.adresse || ''}
                    onChange={(e) => setSelectedFournisseur({ ...selectedFournisseur, adresse: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setFournisseurModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Commande creation Modal */}
      {commandeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <form onSubmit={handleCreateCommande} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-header">
                <span>Créer une Demande d'Achat (DA)</span>
                <button type="button" className="win-tab-close" onClick={() => setCommandeModalOpen(false)}>×</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '10px' }}>
                <div className="split-view">
                  <div className="form-group">
                    <label className="form-label">Fournisseur</label>
                    <select 
                      className="form-select"
                      value={selectedCommande?.fournisseurId || ''}
                      onChange={(e) => setSelectedCommande({ ...selectedCommande, fournisseurId: e.target.value })}
                    >
                      {fournisseurs.map(f => (
                        <option key={f.id} value={f.id}>{f.nomSociete}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Magasin Destination *</label>
                    <select 
                      className="form-select"
                      value={selectedCommande?.magasinDestinationId || ''}
                      onChange={(e) => setSelectedCommande({ ...selectedCommande, magasinDestinationId: e.target.value })}
                    >
                      {getAuthorizedMagasins().map(m => (
                        <option key={m.id} value={m.id}>{m.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '10px' }}>
                  <strong style={{ fontSize: '10px', display: 'block', marginBottom: '6px' }}>Ajouter un article :</strong>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    <select id="line-art" className="form-select" style={{ flexGrow: 1 }}>
                      {articles.map(art => (
                        <option key={art.id} value={art.id}>{art.designation} ({art.unite})</option>
                      ))}
                    </select>
                    <input id="line-qty" type="number" placeholder="Qté" defaultValue={10} className="form-input" style={{ width: '60px' }} />
                    <input id="line-pu" type="number" placeholder="P.U (DA)" defaultValue={1000} className="form-input" style={{ width: '85px' }} />
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => {
                        const artId = (document.getElementById('line-art') as HTMLSelectElement).value;
                        const qty = parseInt((document.getElementById('line-qty') as HTMLInputElement).value) || 0;
                        const pu = parseInt((document.getElementById('line-pu') as HTMLInputElement).value) || 0;
                        
                        if (qty > 0 && pu > 0) {
                          const existingIdx = commandeLines.findIndex(l => l.articleId === artId);
                          if (existingIdx !== -1) {
                            const updated = [...commandeLines];
                            updated[existingIdx].quantite += qty;
                            setCommandeLines(updated);
                          } else {
                            setCommandeLines([...commandeLines, { articleId: artId, quantite: qty, prixUnitaire: pu }]);
                          }
                        }
                      }}
                    >
                      + Ajouter
                    </button>
                  </div>

                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Article</th>
                        <th>Quantité</th>
                        <th>P.U (DA)</th>
                        <th>Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commandeLines.map((line, idx) => {
                        const art = articles.find(a => a.id === line.articleId);
                        return (
                          <tr key={idx}>
                            <td>{art?.designation}</td>
                            <td>{line.quantite}</td>
                            <td>{line.prixUnitaire.toLocaleString()}</td>
                            <td>{(line.quantite * line.prixUnitaire).toLocaleString()} DA</td>
                            <td>
                              <button 
                                type="button" 
                                style={{ background: 'none', border: 'none', color: 'var(--c-danger)', cursor: 'pointer' }}
                                onClick={() => setCommandeLines(commandeLines.filter((_, i) => i !== idx))}
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCommandeModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider la Commande</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Reception Modal */}
      {receptionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleProcessReception}>
              <div className="modal-header">
                <span>
                  {receptionMode === 'directe'
                    ? 'Réception Directe (sans Demande d\'Achat)'
                    : 'Enregistrement de la Réception (BL)'}
                </span>
                <button type="button" className="win-tab-close" onClick={resetReceptionForm}>×</button>
              </div>
              <div className="modal-body">
                {/* Choix de l'origine de la réception */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    className={`btn ${receptionMode === 'commande' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '11px' }}
                    onClick={() => {
                      setReceptionMode('commande');
                      setReceptionDirecteLines([]);
                      setReceptionFournisseurId('');
                    }}
                  >
                    Depuis une Demande d'Achat
                  </button>
                  <button
                    type="button"
                    className={`btn ${receptionMode === 'directe' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '11px' }}
                    onClick={() => {
                      setReceptionMode('directe');
                      setReceptionCommandeId('');
                      setReceptionLines([]);
                      if (!receptionMagasinId) setReceptionMagasinId(currentUser.magasinId || '');
                    }}
                  >
                    Réception directe (sans DA)
                  </button>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <span className="form-label">Simulateur Lecteur de Codes-barres / Scanner QR</span>
                  <div className="scanner-box" onClick={() => {
                    setScannerActive(true);
                    setTimeout(() => {
                      setScannerActive(false);
                      alert('Succès : Code article scanné et validé.');
                    }, 1200);
                  }}>
                    {scannerActive ? (
                      <span style={{ color: 'var(--c-good)', fontWeight: 'bold' }}>Scan en cours ...</span>
                    ) : (
                      <span>[Cliquez ici pour simuler un Scan de code article]</span>
                    )}
                  </div>
                </div>

                <div className="split-view">
                  {receptionMode === 'commande' ? (
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Sélectionner la Demande d'Achat Validée *</label>
                      <select
                        className="form-input"
                        value={receptionCommandeId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setReceptionCommandeId(id);
                          const cmd = commandes.find(c => c.id === id);
                          if (cmd) {
                            setReceptionLines(cmd.lignes.map(l => ({ articleId: l.articleId, quantiteRecue: l.quantite - (l.quantiteRecue || 0), prixUnitaire: l.prixUnitaire || 0 })));
                          } else {
                            setReceptionLines([]);
                          }
                        }}
                        required
                      >
                        <option value="">-- Choisir une demande d'achat --</option>
                        {commandes.filter(c => (c.statut === 'Validé' || c.statut === 'Commandé') && (!currentUser.magasinId || c.magasinDestinationId === currentUser.magasinId || (c as any).magasin_destination_id === currentUser.magasinId || currentUser.role === 'direction')).map(c => (
                          <option key={c.id} value={c.id}>{c.code} - {c.fournisseurNom} ({c.statut})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label className="form-label">Fournisseur *</label>
                        <select
                          className="form-input"
                          value={receptionFournisseurId}
                          onChange={(e) => setReceptionFournisseurId(e.target.value)}
                          required
                        >
                          <option value="">-- Choisir un fournisseur --</option>
                          {fournisseurs.map(f => (
                            <option key={f.id} value={f.id}>{f.nomSociete}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Magasin de destination *</label>
                        <select
                          className="form-input"
                          value={receptionMagasinId}
                          onChange={(e) => setReceptionMagasinId(e.target.value)}
                          required
                        >
                          <option value="">-- Choisir un magasin --</option>
                          {magasins.filter(m => m.actif && (currentUser.role === 'direction' || !currentUser.magasinId || m.id === currentUser.magasinId || (currentUser.magasinsIds || []).includes(m.id))).map(m => (
                            <option key={m.id} value={m.id}>{m.nom}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div className="form-group">
                    <label className="form-label">N° Bon Livraison (BL) *</label>

                    <input 
                      type="text" 
                      required
                      placeholder="e.g. BL-LAFARGE-908"
                      className="form-input" 
                      value={receptionBL}
                      onChange={(e) => setReceptionBL(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Facture Réf (Facultatif)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. FAC-9902"
                      className="form-input" 
                      value={receptionFacture}
                      onChange={(e) => setReceptionFacture(e.target.value)}
                    />
                  </div>
                </div>

                <h4 style={{ margin: '8px 0' }}>Quantités réelles reçues :</h4>

                {receptionMode === 'commande' ? (
                  <>
                    <table className="win-table">
                      <thead>
                        <tr>
                          <th>Désignation Article</th>
                          <th style={{ width: '110px' }}>Quantité livrée</th>
                          <th style={{ width: '120px' }}>Prix U. HT (DA)</th>
                          <th style={{ width: '110px', textAlign: 'right' }}>Total HT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receptionLines.map((line, idx) => {
                          const art = articles.find(a => a.id === line.articleId);
                          return (
                            <tr key={idx}>
                              <td>{art?.designation}</td>
                              <td>
                                <input
                                  type="number"
                                  min={0}
                                  className="form-input"
                                  style={{ width: '80px' }}
                                  value={line.quantiteRecue}
                                  onChange={(e) => {
                                    const list = [...receptionLines];
                                    list[idx] = { ...list[idx], quantiteRecue: parseInt(e.target.value) || 0 };
                                    setReceptionLines(list);
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min={0}
                                  className="form-input"
                                  style={{ width: '100px' }}
                                  value={line.prixUnitaire}
                                  onChange={(e) => {
                                    const list = [...receptionLines];
                                    list[idx] = { ...list[idx], prixUnitaire: parseFloat(e.target.value) || 0 };
                                    setReceptionLines(list);
                                  }}
                                />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {(line.quantiteRecue * line.prixUnitaire).toLocaleString()} DA
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <strong style={{ fontSize: '12px' }}>
                        Total HT du BL : {receptionLines.reduce((s, l) => s + l.quantiteRecue * l.prixUnitaire, 0).toLocaleString()} DA
                      </strong>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Le prix est pré-rempli avec celui de la demande d'achat. Corrigez-le s'il diffère sur le BL :
                      c'est ce montant qui constitue la <strong>dette du fournisseur</strong> et qui sera repris en facturation.
                    </p>
                  </>
                ) : (
                  <>
                    <table className="win-table">
                      <thead>
                        <tr>
                          <th>Article</th>
                          <th style={{ width: '100px' }}>Quantité *</th>
                          <th style={{ width: '120px' }}>Prix U. HT (DA)</th>
                          <th style={{ width: '110px', textAlign: 'right' }}>Total HT</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {receptionDirecteLines.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                              Aucun article. Cliquez sur « + Ajouter un article ».
                            </td>
                          </tr>
                        )}
                        {receptionDirecteLines.map((line, idx) => (
                          <tr key={idx}>
                            <td>
                              <select
                                className="form-input"
                                value={line.articleId}
                                onChange={(e) => {
                                  const list = [...receptionDirecteLines];
                                  const art = articles.find(a => a.id === e.target.value);
                                  list[idx] = {
                                    ...list[idx],
                                    articleId: e.target.value,
                                    prixUnitaire: list[idx].prixUnitaire || art?.prixMoyen || 0
                                  };
                                  setReceptionDirecteLines(list);
                                }}
                              >
                                <option value="">-- Choisir un article --</option>
                                {articles.map(a => (
                                  <option key={a.id} value={a.id}>{a.designation} ({a.unite})</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                className="form-input"
                                style={{ width: '80px' }}
                                value={line.quantiteRecue}
                                onChange={(e) => {
                                  const list = [...receptionDirecteLines];
                                  list[idx] = { ...list[idx], quantiteRecue: parseInt(e.target.value) || 0 };
                                  setReceptionDirecteLines(list);
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                className="form-input"
                                style={{ width: '100px' }}
                                value={line.prixUnitaire}
                                onChange={(e) => {
                                  const list = [...receptionDirecteLines];
                                  list[idx] = { ...list[idx], prixUnitaire: parseFloat(e.target.value) || 0 };
                                  setReceptionDirecteLines(list);
                                }}
                              />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {(line.quantiteRecue * line.prixUnitaire).toLocaleString()} DA
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ padding: '1px 6px', fontSize: '10px' }}
                                onClick={() => setReceptionDirecteLines(prev => prev.filter((_, i) => i !== idx))}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '11px' }}
                        onClick={() => setReceptionDirecteLines(prev => [...prev, { articleId: '', quantiteRecue: 0, prixUnitaire: 0 }])}
                      >
                        + Ajouter un article
                      </button>
                      <strong style={{ fontSize: '12px' }}>
                        Total HT : {receptionDirecteLines.reduce((s, l) => s + l.quantiteRecue * l.prixUnitaire, 0).toLocaleString()} DA
                      </strong>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      La réception directe entre immédiatement en stock, est enregistrée comme <strong>Validée</strong> et augmente
                      la dette du fournisseur du montant HT ci-dessus. Elle reste facturable et payable normalement.
                    </p>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetReceptionForm}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting
                    ? '⏳ Enregistrement...'
                    : (receptionMode === 'directe' ? 'Enregistrer la Réception Directe' : 'Valider Réception')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Affectation Modal — Workflow: Dépôt → Chantier */}
      {affectationModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <form onSubmit={handleProcessAffectation} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-header" style={{ flexShrink: 0 }}>
                <span>{editingAffectationId ? '✏️ Modifier le Bon de Sortie Matériel' : '📦 Bon de Sortie Matériel (BS) — Dépôt → Chantier'}</span>
                <button type="button" className="win-tab-close" onClick={() => setAffectationModalOpen(false)}>×</button>
              </div>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>

                {/* Section 1: Dépôt Émetteur + Chantier Destination */}
                <div style={{ background: 'var(--bg-sidebar)', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📍 Trajet de la sortie</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">🏭 Dépôt émetteur *</label>
                      <select
                        className="form-select"
                        value={affectationMagasinId}
                        onChange={(e) => {
                          setAffectationMagasinId(e.target.value);
                          setAffectationLignes([]);
                        }}
                        required
                      >
                        <option value="">-- Sélectionner un dépôt --</option>
                        {getAffectationEmitterMagasins().map(m => (
                          <option key={m.id} value={m.id}>{m.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '20px', paddingBottom: '6px', color: 'var(--accent)' }}>→</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">🏗️ Chantier destination *</label>
                      <select
                        className="form-select"
                        value={affectationChaId}
                        onChange={(e) => setAffectationChaId(e.target.value)}
                        required
                      >
                        <option value="">-- Sélectionner un chantier --</option>
                        {/* Un chantier livré n'est plus proposé, sauf s'il est déjà celui du bon modifié. */}
                        {chantiers.filter(c => c.actif || c.id === affectationChaId).map(c => (
                          <option key={c.id} value={c.id}>{c.nom} — {c.wilaya}{c.actif ? '' : ' (livré)'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Responsable signataire */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">👤 Responsable signataire *</label>
                    <select className="form-select" value={affectationEmpId} onChange={(e) => setAffectationEmpId(e.target.value)} required>
                      <option value="">-- Magasinier / Chef Chantier --</option>
                      {/* Les employés sortis des effectifs ne sont plus proposés à la saisie,
                          sauf s'ils signent déjà le bon en cours de modification. */}
                      {employes.filter(e => e.actif !== false || e.id === affectationEmpId).map(e => (
                        <option key={e.id} value={e.id}>{e.nom} ({e.fonction})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">🚗 Chauffeur (optionnel)</label>
                    <input type="text" className="form-input" value={affectationChauffeur}
                      onChange={(e) => setAffectationChauffeur(e.target.value)} placeholder="Nom du chauffeur" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🔑 Véhicule / Matricule</label>
                    <input type="text" className="form-input" value={affectationVehicule}
                      onChange={(e) => setAffectationVehicule(e.target.value)} placeholder="Ex: 123-A-456" />
                  </div>
                </div>

                {/* Section 3: Articles à sortir */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 Articles à sortir du dépôt</div>
                  <table className="win-table" style={{ fontSize: '12px', marginBottom: '8px' }}>
                    <thead><tr><th>Article</th><th style={{ width: '130px' }}>Qté demandée</th><th>Stock dispo</th><th></th></tr></thead>
                    <tbody>
                      {affectationLignes.map((ligne, idx) => {
                        const stock = stocks.find(s =>
                          (s.articleId === ligne.articleId) &&
                          (s.magasinId === (affectationMagasinId || currentUser.magasinId))
                        )?.quantite || 0;
                        return (
                          <tr key={idx}>
                            <td><strong>{ligne.designation}</strong></td>
                            <td>
                              <input type="number" min={1} max={stock} className="form-input"
                                style={{ width: '100px', padding: '5px 8px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}
                                value={ligne.quantite}
                                onChange={(e) => {
                                  const newLignes = [...affectationLignes];
                                  newLignes[idx].quantite = parseInt(e.target.value) || 1;
                                  setAffectationLignes(newLignes);
                                }} />
                            </td>
                            <td style={{ color: stock < ligne.quantite ? 'var(--c-danger)' : 'var(--c-good)', fontWeight: 600, fontSize: '12px' }}>
                              {stock} u
                            </td>
                            <td>
                              <button type="button" className="btn btn-danger"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                onClick={() => setAffectationLignes(prev => prev.filter((_, i) => i !== idx))}>
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {affectationLignes.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '12px' }}>Aucun article — utilisez le sélecteur ci-dessous</td></tr>
                      )}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select id="affectation-new-art" className="form-select" style={{ flex: 1, fontSize: '12px' }}>
                      <option value="">➕ Ajouter un article au bon de sortie...</option>
                      {articles.map(art => {
                        const stock = stocks.find(s =>
                          s.articleId === art.id &&
                          s.magasinId === (affectationMagasinId || currentUser.magasinId)
                        )?.quantite || 0;
                        return (
                          <option key={art.id} value={art.id} disabled={stock <= 0}>
                            {art.designation} — Stock: {stock} {art.unite || 'u'}
                          </option>
                        );
                      })}
                    </select>
                    <button type="button" className="btn btn-secondary" style={{ whiteSpace: 'nowrap', padding: '6px 12px' }}
                      onClick={() => {
                        const sel = document.getElementById('affectation-new-art') as HTMLSelectElement;
                        if (!sel.value) return;
                        const art = articles.find(a => a.id === sel.value);
                        if (art && !affectationLignes.find(l => l.articleId === art.id)) {
                          setAffectationLignes([...affectationLignes, { articleId: art.id, designation: art.designation, quantite: 1 }]);
                        }
                        sel.value = '';
                      }}>Ajouter</button>
                  </div>
                </div>

                {/* Section 4: Motif */}
                <div className="form-group">
                  <label className="form-label">📝 Motif de sortie *</label>
                  <textarea className="form-textarea" rows={2} required
                    value={affectationMotif}
                    onChange={(e) => setAffectationMotif(e.target.value)}
                    placeholder="Ex: Travaux de fondation — Chantier Oran Phase 2" />
                </div>

              </div>
              <div className="modal-footer" style={{ flexShrink: 0, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAffectationModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 'bold' }}
                  disabled={affectationLignes.length === 0 || !affectationMagasinId || !affectationChaId}>
                  ✅ Valider le Bon de Sortie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Transfert Modal */}
      {transfertModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleProcessTransfert}>
              <div className="modal-header">
                <span>Créer Demande de Transfert Inter-Magasins</span>
                <button type="button" className="win-tab-close" onClick={() => setTransfertModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="split-view">
                  <div className="form-group">
                    <label className="form-label">Magasin Départ</label>
                    <select 
                      className="form-select"
                      value={transfertDepartId}
                      onChange={(e) => setTransfertDepartId(e.target.value)}
                      required
                    >
                      {getAffectationEmitterMagasins().map(m => (
                        <option key={m.id} value={m.id}>{m.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Magasin Destinataire</label>
                    <select 
                      className="form-select"
                      value={transfertDestId}
                      onChange={(e) => setTransfertDestId(e.target.value)}
                      required
                    >
                      {getAffectationEmitterMagasins().map(m => (
                        <option key={m.id} value={m.id}>{m.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Motif du transfert</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    value={transfertMotif}
                    onChange={(e) => setTransfertMotif(e.target.value)}
                  />
                </div>

                <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '10px' }}>
                  <strong style={{ fontSize: '10px', display: 'block', marginBottom: '6px' }}>Ajouter un article :</strong>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    <select id="tr-art" className="form-select" style={{ flexGrow: 1 }}>
                      {articles.map(art => (
                        <option key={art.id} value={art.id}>{art.designation}</option>
                      ))}
                    </select>
                    <input id="tr-qty" type="number" defaultValue={5} className="form-input" style={{ width: '80px' }} />
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => {
                        const artId = (document.getElementById('tr-art') as HTMLSelectElement).value;
                        const qty = parseInt((document.getElementById('tr-qty') as HTMLInputElement).value) || 0;
                        if (qty > 0) {
                          setTransfertLines([...transfertLines, { articleId: artId, quantite: qty }]);
                        }
                      }}
                    >
                      Ajouter
                    </button>
                  </div>

                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Article</th>
                        <th>Quantité</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfertLines.map((line, idx) => {
                        const art = articles.find(a => a.id === line.articleId);
                        return (
                          <tr key={idx}>
                            <td>{art?.designation}</td>
                            <td>{line.quantite}</td>
                            <td>
                              <button 
                                type="button" 
                                style={{ background: 'none', border: 'none', color: 'var(--c-danger)', cursor: 'pointer' }}
                                onClick={() => setTransfertLines(transfertLines.filter((_, i) => i !== idx))}
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setTransfertModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingTransfert || transfertLines.length === 0}>
                  {isSubmittingTransfert ? '⏳ Création en cours...' : 'Valider Transfert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Règlement Paiement Modal */}
      {paiementModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleProcessPayment}>
              <div className="modal-header">
                <span>
                  {payMode2 === 'lettrage'
                    ? '💵 Règlement Fournisseur avec lettrage de factures'
                    : '💵 Règlement Fournisseur sur solde (sans lettrage)'}
                </span>
                <button type="button" className="win-tab-close" onClick={resetPaiementForm}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Fournisseur *</label>
                  <select
                    className="form-select"
                    value={payFournisseurId}
                    onChange={(e) => {
                      const fid = e.target.value;
                      setPayFournisseurId(fid);
                      setPayImputations({});
                      if (payMode2 === 'simple') {
                        setPayMontant(fournisseurs.find(f => f.id === fid)?.solde || 0);
                      } else {
                        setPayMontant(0);
                      }
                    }}
                    required
                  >
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nomSociete} (Dette : {f.solde.toLocaleString()} DA)</option>
                    ))}
                  </select>
                </div>

                {payMode2 === 'simple' ? (
                  <div className="form-group">
                    <label className="form-label">Montant du Règlement (DA) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="form-input"
                      value={payMontant}
                      onChange={(e) => setPayMontant(parseInt(e.target.value) || 0)}
                    />
                    {(() => {
                      const four = fournisseurs.find(f => f.id === payFournisseurId);
                      if (!four) return null;
                      const reste = Math.max(0, (four.solde || 0) - payMontant);
                      return (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Dette actuelle : <strong>{(four.solde || 0).toLocaleString()} DA</strong> →
                          solde après règlement : <strong>{reste.toLocaleString()} DA</strong>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Montant reçu à ventiler (DA)</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="number"
                        min={0}
                        className="form-input"
                        style={{ flex: 1 }}
                        value={payMontant}
                        onChange={(e) => setPayMontant(parseInt(e.target.value) || 0)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                        disabled={payMontant <= 0}
                        onClick={() => repartirAutomatiquement(payMontant, payFournisseurId)}
                      >
                        Répartir automatiquement
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Aide à la saisie : ventile le montant sur les factures ouvertes, de la plus ancienne à la plus récente.
                      Le montant réellement enregistré est le <strong>total imputé</strong> ci-dessous.
                    </div>
                  </div>
                )}
                <div className="split-view">
                  <div className="form-group">
                    <label className="form-label">Mode de Paiement</label>
                    <select 
                      className="form-select"
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value as ModePaiement)}
                    >
                      <option value="Virement">Virement BNA / CPA</option>
                      <option value="Chèque">Chèque Bancaire</option>
                      <option value="Espèces">Espèces (Caisse)</option>
                      <option value="CCP">CCP (Algérie Poste)</option>
                      <option value="Carte bancaire">Carte bancaire (CIB / EDAHABIA)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Réf chèque / transaction *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VIR-CPA-99210"
                      className="form-input"
                      value={payRefTrans}
                      onChange={(e) => setPayRefTrans(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de valeur *</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                    />
                  </div>
                </div>
                {payMode2 === 'lettrage' && (() => {
                  const ouvertes = getFacturesOuvertes(payFournisseurId);
                  const totalOuvert = ouvertes.reduce((s, f) => s + (f.soldeRestant || 0), 0);

                  if (ouvertes.length === 0) {
                    return (
                      <div className="form-group">
                        <label className="form-label">Imputation sur factures</label>
                        <div style={{ fontSize: '11px', color: 'var(--c-danger)', border: '1px solid #ffcdd2', background: 'var(--c-danger-bg)', borderRadius: '6px', padding: '10px' }}>
                          Aucune facture ouverte pour ce fournisseur : il n'y a rien à lettrer.<br />
                          Créez d'abord la facture d'achat (onglet <strong>Factures</strong>), ou enregistrez un règlement
                          sur solde depuis la page <strong>Fournisseurs</strong>.
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="form-group">
                      <label className="form-label">
                        Imputation sur les factures ouvertes ({ouvertes.length} — {totalOuvert.toLocaleString()} DA dus)
                      </label>
                      <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                        <table className="win-table" style={{ fontSize: '11px', margin: 0 }}>
                          <thead>
                            <tr>
                              <th>Facture</th>
                              <th>Date</th>
                              <th style={{ textAlign: 'right' }}>Total TTC</th>
                              <th style={{ textAlign: 'right' }}>Restant dû</th>
                              <th style={{ width: '130px' }}>Montant imputé</th>
                              <th style={{ width: '60px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {ouvertes.map(fac => {
                              const restant = fac.soldeRestant || 0;
                              const impute = payImputations[fac.id] || 0;
                              const trop = impute > restant + 0.01;
                              return (
                                <tr key={fac.id}>
                                  <td><code>{fac.code}</code></td>
                                  <td>{new Date(fac.dateFacture).toLocaleDateString('fr-FR')}</td>
                                  <td style={{ textAlign: 'right' }}>{(fac.montantTTC || 0).toLocaleString()}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{restant.toLocaleString()}</td>
                                  <td>
                                    <input
                                      type="number"
                                      min={0}
                                      max={restant}
                                      className="form-input"
                                      style={{ width: '110px', borderColor: trop ? 'var(--c-danger)' : undefined }}
                                      value={impute || ''}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setPayImputations(prev => {
                                          const next = { ...prev };
                                          if (val <= 0) delete next[fac.id];
                                          else next[fac.id] = val;
                                          return next;
                                        });
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{ padding: '1px 6px', fontSize: '10px' }}
                                      title="Imputer la totalité du restant dû"
                                      onClick={() => setPayImputations(prev => ({ ...prev, [fac.id]: restant }))}
                                    >
                                      Solder
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '12px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '11px' }}
                          onClick={() => setPayImputations({})}
                        >
                          Effacer les imputations
                        </button>
                        <div style={{ textAlign: 'right' }}>
                          <div>
                            <strong>Total du règlement : {totalImpute.toLocaleString()} DA</strong>
                          </div>
                          {payMontant > 0 && (
                            <div style={{ fontSize: '11px', color: totalImpute > payMontant ? 'var(--c-danger)' : 'var(--text-muted)' }}>
                              {totalImpute > payMontant
                                ? `Dépasse de ${(totalImpute - payMontant).toLocaleString()} DA le montant reçu`
                                : `Reste à ventiler : ${(payMontant - totalImpute).toLocaleString()} DA`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="form-group">
                  <label className="form-label">Note / Mémo</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Règlement de l'acompte 50%"
                    className="form-input"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetPaiementForm}>Annuler</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || (payMode2 === 'lettrage' ? totalImpute <= 0 : payMontant <= 0)}
                >
                  {isSubmitting
                    ? '⏳ Enregistrement...'
                    : (payMode2 === 'lettrage'
                      ? `Valider le règlement lettré (${totalImpute.toLocaleString()} DA)`
                      : 'Valider le règlement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nouvelle Facture (Création Manuelle depuis Réceptions) */}
      {factureModalOpen && (() => {
        // Réceptions validées de ce fournisseur (non encore facturées complètement)
        const eligibleRecs = receptions.filter(rec => {
          if (rec.statut !== 'Validée') return false;
          // Check if it's already factured
          const alreadyFactured = factures.some(f => f.receptionCode && f.receptionCode.includes(rec.code));
          if (alreadyFactured) return false;
          // Fournisseur via la commande liée, ou porté par la réception (réception directe)
          return getReceptionFournisseurId(rec) === factureFournisseurId;
        });

        const montantHT = factureLignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
        const montantTVA = montantHT * factureTauxTVA;
        const montantTTC = montantHT + montantTVA + factureTimbre + factureFraisPort;

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '760px', maxHeight: '90vh', overflow: 'auto' }}>
              <div className="modal-header">
                <span>🧾 Nouvelle Facture — Étape {factureStep}/3</span>
                <button type="button" className="win-tab-close" onClick={() => setFactureModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">

                {/* STEP 1: Choisir le fournisseur */}
                {factureStep === 1 && (
                  <div>
                    <p style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      Choisissez le fournisseur à facturer. Seuls les fournisseurs ayant des réceptions validées apparaissent.
                    </p>
                    <div className="form-group">
                      <label className="form-label">Fournisseur *</label>
                      <select className="form-select" value={factureFournisseurId} onChange={e => setFactureFournisseurId(e.target.value)}>
                        <option value="">-- Sélectionner un fournisseur --</option>
                        {fournisseurs.filter(f => {
                          return receptions.some(rec => rec.statut === 'Validée' && getReceptionFournisseurId(rec) === f.id);
                        }).map(f => (
                          <option key={f.id} value={f.id}>{f.nomSociete}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 2: Sélectionner les réceptions */}
                {factureStep === 2 && (
                  <div>
                    <p style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      Cochez les bons de réception à inclure dans cette facture.
                    </p>
                    {eligibleRecs.length === 0 ? (
                      <p style={{ color: 'var(--c-danger)', fontStyle: 'italic' }}>Aucune réception validée disponible pour ce fournisseur.</p>
                    ) : (
                      <table className="win-table" style={{ fontSize: '11px' }}>
                        <thead><tr><th></th><th>Ref BL</th><th>Date</th><th>Articles</th></tr></thead>
                        <tbody>
                          {eligibleRecs.map(rec => (
                            <tr key={rec.id}>
                              <td>
                                <input type="checkbox" checked={factureSelectedRecs.includes(rec.id)}
                                  onChange={e => {
                                    if (e.target.checked) setFactureSelectedRecs(prev => [...prev, rec.id]);
                                    else setFactureSelectedRecs(prev => prev.filter(id => id !== rec.id));
                                  }} />
                              </td>
                              <td><code>{rec.bonLivraisonRef || rec.code}</code></td>
                              <td>{new Date(rec.dateReception).toLocaleDateString('fr-FR')}</td>
                              <td>{(rec.lignes || []).map((l: any) => `${l.quantiteRecue} × ${l.designation}`).join(', ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* STEP 3: Modifier les lignes et saisir les montants */}
                {factureStep === 3 && (
                  <div>
                    <p style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Modifiez les lignes articles, quantités et prix unitaires avant de valider.
                    </p>
                    <table className="win-table" style={{ fontSize: '11px', marginBottom: '12px' }}>
                      <thead><tr><th>Désignation</th><th>Qté</th><th>Prix U. (DA)</th><th>Total HT</th><th></th></tr></thead>
                      <tbody>
                        {factureLignes.map((ligne, idx) => (
                          <tr key={idx}>
                            <td>
                              <input type="text" className="form-input" style={{ fontSize: '11px', padding: '2px 4px' }}
                                value={ligne.designation}
                                onChange={e => {
                                  const updated = [...factureLignes];
                                  updated[idx] = { ...updated[idx], designation: e.target.value };
                                  setFactureLignes(updated);
                                }} />
                            </td>
                            <td>
                              <input type="number" min={0} className="form-input" style={{ fontSize: '11px', padding: '2px 4px', width: '70px' }}
                                value={ligne.quantite}
                                onChange={e => {
                                  const updated = [...factureLignes];
                                  updated[idx] = { ...updated[idx], quantite: Number(e.target.value) };
                                  setFactureLignes(updated);
                                }} />
                            </td>
                            <td>
                              <input type="number" min={0} className="form-input" style={{ fontSize: '11px', padding: '2px 4px', width: '100px' }}
                                value={ligne.prixUnitaire}
                                onChange={e => {
                                  const updated = [...factureLignes];
                                  updated[idx] = { ...updated[idx], prixUnitaire: Number(e.target.value) };
                                  setFactureLignes(updated);
                                }} />
                            </td>
                            <td style={{ fontWeight: 'bold' }}>{(ligne.quantite * ligne.prixUnitaire).toLocaleString()} DA</td>
                            <td>
                              <button type="button" className="btn btn-danger" style={{ padding: '1px 5px', fontSize: '10px' }}
                                onClick={() => setFactureLignes(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Taux TVA</label>
                        <select className="form-select" value={factureTauxTVA}
                          onChange={e => setFactureTauxTVA(Number(e.target.value))}>
                          <option value={0}>0%</option>
                          <option value={0.09}>9%</option>
                          <option value={0.19}>19%</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Timbre (DA)</label>
                        <input type="number" min={0} className="form-input" value={factureTimbre}
                          onChange={e => setFactureTimbre(Number(e.target.value))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Frais Port (DA)</label>
                        <input type="number" min={0} className="form-input" value={factureFraisPort}
                          onChange={e => setFactureFraisPort(Number(e.target.value))} />
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-sidebar)', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Montant HT :</span><strong>{montantHT.toLocaleString()} DA</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>TVA ({(factureTauxTVA * 100).toFixed(0)}%) :</span><strong>{montantTVA.toLocaleString()} DA</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Timbre :</span><strong>{factureTimbre.toLocaleString()} DA</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', marginTop: '6px', paddingTop: '6px', fontWeight: 'bold', fontSize: '14px', color: 'var(--accent)' }}>
                        <span>TOTAL TTC :</span><span>{montantTTC.toLocaleString()} DA</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Note / Observation</label>
                      <input type="text" className="form-input" value={factureNote} onChange={e => setFactureNote(e.target.value)} placeholder="Optionnel..." />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                {factureStep > 1 && (
                  <button type="button" className="btn btn-secondary" onClick={() => setFactureStep(prev => (prev - 1) as 1 | 2 | 3)}>
                    ← Précédent
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setFactureModalOpen(false)}>Annuler</button>

                {factureStep < 3 && (
                  <button type="button" className="btn btn-primary"
                    disabled={factureStep === 1 && !factureFournisseurId || factureStep === 2 && factureSelectedRecs.length === 0}
                    onClick={() => {
                      if (factureStep === 2) {
                        // Construire les lignes depuis les réceptions sélectionnées
                        const lines: typeof factureLignes = [];
                        factureSelectedRecs.forEach(recId => {
                          const rec = receptions.find(r => r.id === recId);
                          (rec?.lignes || []).forEach((l: any) => {
                            const existing = lines.find(x => x.articleId === l.articleId);
                            const art = articles.find(a => a.id === l.articleId);
                            if (existing) {
                              existing.quantite += l.quantiteRecue || 0;
                            } else {
                              lines.push({
                                articleId: l.articleId,
                                designation: l.designation,
                                quantite: l.quantiteRecue || 0,
                                // Prix saisi en réception directe, sinon PMP de l'article
                                prixUnitaire: l.prixUnitaire !== undefined && l.prixUnitaire !== null ? l.prixUnitaire : (art?.prixMoyen || 0)
                              });
                            }
                          });
                        });
                        setFactureLignes(lines);
                      }
                      setFactureStep(prev => (prev + 1) as 2 | 3);
                    }}>
                    Suivant →
                  </button>
                )}

                {factureStep === 3 && (
                  <button type="button" className="btn btn-primary"
                    disabled={factureLignes.length === 0 || isSubmitting}
                    onClick={async () => {
                      if (isSubmitting) return;
                      setIsSubmitting(true);
                      try {
                        const four = fournisseurs.find(f => f.id === factureFournisseurId);
                        const result = await SupabaseDatabase.createFactureFromReceptions(
                          factureFournisseurId,
                          four?.nomSociete || '',
                          factureSelectedRecs,
                          factureLignes,
                          { tauxTVA: factureTauxTVA, timbre: factureTimbre, fraisPort: factureFraisPort, note: factureNote }
                        );
                        if (result) {
                          setFactureModalOpen(false);
                          await reloadData();
                        } else {
                          alert('Erreur lors de la création de la facture. Vérifiez les données.');
                        }
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}>
                    {isSubmitting ? '⏳ Enregistrement...' : '✅ Enregistrer la Facture'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 9. Utilisateur Add/Edit Modal */}

      {userModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSaveUser}>
              <div className="modal-header">
                <span>{selectedUser?.id ? "✏️ Modifier l'Utilisateur et ses Droits" : "➕ Créer un Nouvel Utilisateur"}</span>
                <button type="button" className="win-tab-close" onClick={() => setUserModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom Complet *</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    placeholder="ex: Jean Dupont"
                    value={selectedUser?.name || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  />
                </div>
                <div className="split-view">
                  <div className="form-group">
                    <label className="form-label">Adresse E-mail *</label>
                    <input 
                      type="email" 
                      required
                      className="form-input" 
                      placeholder="ex: jean@benamar.dz"
                      value={selectedUser?.email || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mot de passe initial *</label>
                    <input 
                      type="text" 
                      required
                      className="form-input" 
                      placeholder="ex: pass2026"
                      value={selectedUser?.password || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, password: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="split-view">
                  <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="ex: 0551 12 34 56"
                      value={selectedUser?.telephone || ''}
                      onChange={(e) => setSelectedUser({ ...selectedUser, telephone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rôle / Profil d'accès *</label>
                    <select 
                      className="form-select"
                      required
                      value={selectedUser?.role || 'magasinier'}
                      onChange={(e) => {
                        const newRole = e.target.value as any;
                        const defaultMagasins = newRole === 'direction' ? magasins.map(m => m.id) : [];
                        setSelectedUser({ 
                          ...selectedUser, 
                          role: newRole,
                          magasinsIds: defaultMagasins,
                          magasinId: newRole === 'magasinier' && magasins.length > 0 ? magasins[0].id : undefined
                        });
                      }}
                    >
                      <option value="direction">👑 Direction Générale (Admin)</option>
                      <option value="magasinier">📦 Magasinier (Opérateur Dépôt)</option>
                      <option value="achat">🛒 Service Achats</option>
                      <option value="comptabilite">💰 Comptabilité & Finances</option>
                      <option value="chef_chantier">👷 Chef de Chantier</option>
                    </select>
                  </div>
                </div>

                {/* Primary store if magasinier */}
                {selectedUser?.role === 'magasinier' && (
                  <div className="form-group">
                    <label className="form-label">Dépôt Physique Principal *</label>
                    <select 
                      className="form-select"
                      required
                      value={selectedUser?.magasinId || ''}
                      onChange={(e) => {
                        const mid = e.target.value;
                        const currentAuthorized = selectedUser?.magasinsIds || [];
                        const updatedAuthorized = currentAuthorized.includes(mid) ? currentAuthorized : [...currentAuthorized, mid];
                        setSelectedUser({ 
                          ...selectedUser, 
                          magasinId: mid, 
                          magasinsIds: updatedAuthorized 
                        });
                      }}
                    >
                      <option value="" disabled>-- Sélectionner le dépôt --</option>
                      {magasins.map(m => (
                        <option key={m.id} value={m.id}>{m.nom}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Droit d'accès aux magasins (magasinsIds checklist) */}
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
                    🏢 Magasins et Dépôts Autorisés (Droits d'accès)
                  </label>
                  {selectedUser?.role === 'direction' ? (
                    <div style={{ padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      ℹ️ La Direction Générale possède des droits d'accès administratifs globaux sur tous les magasins.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px', background: 'var(--bg-hover)' }}>
                      {magasins.map(m => {
                        const isChecked = selectedUser?.magasinsIds?.includes(m.id) || false;
                        return (
                          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              disabled={selectedUser?.role === 'magasinier' && selectedUser?.magasinId === m.id} // Magasinier's primary store must be selected
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const currentList = selectedUser?.magasinsIds || [];
                                let newList = [];
                                if (checked) {
                                  newList = [...currentList, m.id];
                                } else {
                                  newList = currentList.filter(id => id !== m.id);
                                }
                                setSelectedUser({ ...selectedUser, magasinsIds: newList });
                              }}
                            />
                            <span>{m.nom}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">🖼️ URL Photo d'Avatar (Optionnelle)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="https://images.unsplash.com/photo-..."
                    value={selectedUser?.avatar || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, avatar: e.target.value })}
                  />
                </div>

                {selectedUser?.id && (
                  <div style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    <strong>Créé par :</strong> {selectedUser.createdBy} <br />
                    <strong>Date :</strong> {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('fr-FR') : '-'}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setUserModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">{selectedUser?.id ? '💾 Mettre à jour' : '➕ Créer l\'utilisateur'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9b. Nouveau Inventaire Modal (Selection Magasin) */}
      {createInventaireModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <span>Nouveau Inventaire Physique</span>
              <button type="button" className="win-tab-close" onClick={() => setCreateInventaireModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Sélectionner le Magasin / Dépôt :</label>
                <select 
                  className="form-select"
                  value={inventaireMagasinId}
                  onChange={(e) => setInventaireMagasinId(e.target.value)}
                >
                  {getAuthorizedMagasins().map(m => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setCreateInventaireModalOpen(false)}>Annuler</button>
              <button type="button" className="btn btn-primary" onClick={() => {
                const existing = inventaires.find(inv => inv.magasinId === inventaireMagasinId && inv.statut === 'Brouillon');
                if (existing) {
                  setSelectedInventaire(existing);
                  setInventaireLines(existing.lignes);
                  setInventaireModalOpen(true);
                  setCreateInventaireModalOpen(false);
                  return;
                }

                SupabaseDatabase.createInventaire(inventaireMagasinId).then(inv => {
                  setSelectedInventaire(inv);
                  setInventaireLines(inv.lignes);
                  setInventaireModalOpen(true);
                  setCreateInventaireModalOpen(false);
                  reloadData();
                }).catch((err) => {
                  console.error(err);
                  alert("La table 'inventaires' n'existe pas encore dans Supabase ou une autre erreur est survenue.");
                });
              }}>Démarrer l'inventaire</button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Inventaire Modal */}
      {inventaireModalOpen && selectedInventaire && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
            <div className="modal-header">
              <span>Saisie & Régularisation Inventaire — {selectedInventaire.code} ({selectedInventaire.magasinNom})</span>
              <button type="button" className="win-tab-close" onClick={() => setInventaireModalOpen(false)}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '10px' }}>
              <div style={{ marginBottom: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <strong>Créé par :</strong> {selectedInventaire.creeParNom} | <strong>Date :</strong> {new Date(selectedInventaire.dateInventaire).toLocaleDateString('fr-FR')} | <strong>Statut :</strong> <span className={`badge ${selectedInventaire.statut === 'Validé' ? 'badge-success' : 'badge-warning'}`}>{selectedInventaire.statut}</span>
              </div>
              <table className="win-table">
                <thead>
                  <tr>
                    <th>Article Matériau</th>
                    <th>Stock Théorique</th>
                    <th>Stock Réel (Compté)</th>
                    <th>Écart Régularisé</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(inventaireLines) ? inventaireLines : []).map((line, idx) => {
                    const ecart = line.quantiteReelle - line.quantiteTheorique;
                    return (
                      <tr key={line.articleId}>
                        <td><strong>{line.designation}</strong></td>
                        <td style={{ fontWeight: 'bold' }}>{line.quantiteTheorique}</td>
                        <td>
                          {selectedInventaire.statut === 'Validé' ? (
                            <strong style={{ fontSize: '12px' }}>{line.quantiteReelle}</strong>
                          ) : (
                            <input 
                              type="number"
                              className="form-input"
                              style={{ width: '100px', fontWeight: 'bold' }}
                              value={line.quantiteReelle}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const copy = [...inventaireLines];
                                copy[idx].quantiteReelle = val;
                                copy[idx].ecart = val - copy[idx].quantiteTheorique;
                                setInventaireLines(copy);
                              }}
                            />
                          )}
                        </td>
                        <td style={{ color: ecart === 0 ? 'inherit' : ecart > 0 ? 'var(--c-good)' : 'var(--c-danger)', fontWeight: 'bold' }}>
                          {ecart > 0 ? `+${ecart}` : ecart}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setInventaireModalOpen(false)}>Fermer</button>
              <button 
                type="button" 
                className="btn btn-secondary"
                style={{ fontWeight: 'bold', color: 'var(--accent)' }}
                onClick={() => {
                  setPrintDoc({ type: 'inventaire', data: selectedInventaire, lines: inventaireLines });
                }}
              >
                🖨️ Imprimer la Fiche d'Inventaire
              </button>
              {selectedInventaire.statut !== 'Validé' && (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={async () => {
                    await SupabaseDatabase.validateInventaire(selectedInventaire.id, inventaireLines);
                    setInventaireModalOpen(false);
                    await reloadData();
                    alert('Inventaire validé avec succès ! Les écarts ont généré les régularisations de stock automatiques.');
                  }}
                >
                  ✓ Valider et Régulariser les Stocks
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 11. Modal d'Impression Officiel (Bon de Sortie, Inventaire, Stock, Réception, Commande) */}
      {printDoc && (
        <div className="modal-overlay print-modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', background: '#fff', color: '#000', padding: '0', overflow: 'hidden' }}>
            <div className="modal-header no-print" style={{ background: '#1e1e2e', color: '#fff', padding: '12px 20px' }}>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
                📄 Document Officiel d'Impression — {printDoc.type === 'stock' ? printDoc.magasinNom
                  : printDoc.type === 'fiche_stock' ? `${printDoc.article.reference} — ${printDoc.magasinNom}`
                  : printDoc.data.code}
              </span>
              <button type="button" className="win-tab-close" style={{ color: '#fff' }} onClick={() => setPrintDoc(null)}>×</button>
            </div>
            
            <div className="print-document-body" style={{ padding: '30px', maxHeight: '80vh', overflowY: 'auto', background: '#ffffff', color: '#111827' }}>
              
              {/* Document Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '15px', marginBottom: '20px' }}>
                {/* En-tête alimenté par la fiche société (Administration → Société),
                    avec repli sur le libellé historique si elle n'est pas renseignée. */}
                <div>
                  <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' }}>
                    {societe?.raisonSociale || 'BGM CONSTRUCTION & LOGISTIQUE'}
                  </h1>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569' }}>
                    {[societe?.formeJuridique, societe?.activite].filter(Boolean).join(' — ') || 'Gestion Centralisée des Dépôts et Chantiers'}
                  </p>
                  {societe && (
                    <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#64748b', lineHeight: 1.6 }}>
                      {[societe.adresse, societe.codePostal, societe.ville, societe.wilaya].filter(Boolean).join(' · ')}
                      {(societe.telephone || societe.email) && <br />}
                      {[societe.telephone && `Tél. ${societe.telephone}`, societe.telephone2, societe.fax && `Fax ${societe.fax}`, societe.email, societe.siteWeb].filter(Boolean).join(' · ')}
                      {(societe.rc || societe.nif || societe.nis || societe.ai) && <br />}
                      {[societe.rc && `RC ${societe.rc}`, societe.nif && `NIF ${societe.nif}`, societe.nis && `NIS ${societe.nis}`, societe.ai && `AI ${societe.ai}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>
                    {printDoc.type === 'affectation' ? 'BON DE SORTIE / AFFECTATION' :
                     printDoc.type === 'reception' ? 'BON DE RÉCEPTION (BL)' :
                     printDoc.type === 'inventaire' ? 'RAPPORT D\'INVENTAIRE PHYSIQUE' :
                     printDoc.type === 'stock' ? 'ÉTAT DES STOCKS PHYSIQUES' :
                     printDoc.type === 'fiche_stock' ? 'FICHE DE STOCK ARTICLE' :
                     printDoc.type === 'transfert' ? 'BON DE TRANSFERT INTER-DÉPÔTS' :
                     printDoc.type === 'facture' ? 'FACTURE D\'ACHAT FOURNISSEUR' : 'BON DE COMMANDE'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                    {printDoc.type === 'stock' ? printDoc.magasinNom :
                     printDoc.type === 'fiche_stock' ? printDoc.article.reference :
                     `N° ${(printDoc.data as any).code}`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Date : {new Date().toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>

              {/* STOCKS PRINT TEMPLATE */}
              {printDoc.type === 'stock' && (
                <div>
                  <div style={{ background: '#f8fafc', padding: '12px 15px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '12px' }}>
                    <strong>Étendue du Stock :</strong> {printDoc.magasinNom} | <strong>Nombre d'articles recensés :</strong> {printDoc.items.length}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: '40px' }}>#</th>
                        {!printDoc.isConsolide && <th style={{ padding: '8px 10px' }}>Dépôt</th>}
                        <th style={{ padding: '8px 10px' }}>Référence</th>
                        <th style={{ padding: '8px 10px' }}>Désignation Article</th>
                        <th style={{ padding: '8px 10px', width: '110px', textAlign: 'right' }}>Stock Réel</th>
                        <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>Seuil Alerte</th>
                        <th style={{ padding: '8px 10px', width: '90px', textAlign: 'center' }}>État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printDoc.items.map((item, idx) => {
                        const isLow = item.quantite < item.stockMinimum;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: isLow ? '#fff1f2' : 'transparent' }}>
                            <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                            {!printDoc.isConsolide && <td style={{ padding: '8px 10px' }}>{item.magasinNom}</td>}
                            <td style={{ padding: '8px 10px' }}><code>{item.reference}</code></td>
                            <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>{item.designation}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: isLow ? '#e11d48' : '#16a34a' }}>
                              {item.quantite} {item.unite || 'u'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>{item.stockMinimum}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', background: isLow ? '#ffe4e6' : '#dcfce7', color: isLow ? '#9f1239' : '#15803d' }}>
                                {isLow ? 'Alerte' : 'Conforme'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '40px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Responsable Stock / Magasinier</div>
                      <div>________________________</div>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Direction Logistique</div>
                      <div>________________________</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TRANSFERT PRINT TEMPLATE — bon de transfert inter-dépôts */}
              {printDoc.type === 'transfert' && (() => {
                const tr = printDoc.data;
                const lignes = Array.isArray(tr.lignes) ? tr.lignes : [];
                const statutAffiche = tr.statut === 'Expédié' ? 'Validé' : tr.statut;
                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', background: '#f8fafc', padding: '12px 15px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', lineHeight: 1.8 }}>
                      <div>
                        <div><strong>Dépôt expéditeur :</strong> {tr.magasinDepartNom}</div>
                        <div><strong>Dépôt réceptionnaire :</strong> {tr.magasinDestNom}</div>
                        <div><strong>Motif :</strong> {tr.motif || '—'}</div>
                      </div>
                      <div>
                        <div><strong>Statut :</strong> {statutAffiche}</div>
                        <div><strong>Demandé le :</strong> {new Date(tr.dateDemande).toLocaleDateString('fr-FR')} par {tr.demandeurNom || '—'}</div>
                        <div><strong>Validé le :</strong> {tr.dateExpedition ? `${new Date(tr.dateExpedition).toLocaleDateString('fr-FR')} par ${tr.valideurNom || '—'}` : '—'}</div>
                        <div><strong>Reçu le :</strong> {tr.dateReception ? `${new Date(tr.dateReception).toLocaleDateString('fr-FR')} par ${tr.receveurNom || '—'}` : '—'}</div>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', width: '40px' }}>#</th>
                          <th style={{ padding: '8px 10px' }}>Désignation Article</th>
                          <th style={{ padding: '8px 10px', width: '110px', textAlign: 'right' }}>Quantité</th>
                          <th style={{ padding: '8px 10px', width: '130px', textAlign: 'center' }}>Quantité reçue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lignes.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '14px 10px', textAlign: 'center', color: '#64748b' }}>Aucune ligne sur ce bon de transfert.</td></tr>
                        ) : (
                          lignes.map((l, idx) => {
                            const art = articles.find(a => a.id === l.articleId);
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>
                                  {l.designation}
                                  {art && <span style={{ fontWeight: 'normal', color: '#64748b' }}> ({art.reference})</span>}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>{l.quantite} {art?.unite || ''}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>____________</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '40px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Magasinier Expéditeur</div>
                        <div>________________________</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{tr.valideurNom || tr.magasinDepartNom}</div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Transporteur</div>
                        <div>________________________</div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Magasinier Réceptionnaire</div>
                        <div>________________________</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{tr.receveurNom || tr.magasinDestNom}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* FACTURE PRINT TEMPLATE — facture d'achat fournisseur */}
              {printDoc.type === 'facture' && (() => {
                const fac = printDoc.data;
                const four = fournisseurs.find(f => f.id === fac.fournisseurId);
                const totalLignes = printDoc.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
                const totalRegle = printDoc.reglements.reduce((s, p) => s + p.montant, 0);
                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', background: '#f8fafc', padding: '12px 15px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', lineHeight: 1.8 }}>
                      <div>
                        <div><strong>Fournisseur :</strong> {fac.fournisseurNom}</div>
                        {four && <div><strong>RC / NIF :</strong> {four.rcNif}</div>}
                        {four && <div><strong>Adresse :</strong> {four.adresse}</div>}
                      </div>
                      <div>
                        <div><strong>Date facture :</strong> {new Date(fac.dateFacture).toLocaleDateString('fr-FR')}</div>
                        <div><strong>Réf. commande :</strong> {fac.commandeCode || '—'}</div>
                        <div><strong>Réf. réception(s) :</strong> {fac.receptionCode || '—'}</div>
                        <div><strong>Statut :</strong> {fac.statut}</div>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', width: '40px' }}>#</th>
                          <th style={{ padding: '8px 10px' }}>Désignation</th>
                          <th style={{ padding: '8px 10px', width: '80px', textAlign: 'right' }}>Qté</th>
                          <th style={{ padding: '8px 10px', width: '110px', textAlign: 'right' }}>P.U. HT</th>
                          <th style={{ padding: '8px 10px', width: '120px', textAlign: 'right' }}>Total HT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printDoc.lignes.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '14px 10px', textAlign: 'center', color: '#64748b' }}>
                              Détail des lignes indisponible : aucune réception rattachée retrouvée. Seuls les montants ci-dessous font foi.
                            </td>
                          </tr>
                        ) : (
                          printDoc.lignes.map((l, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>{l.designation}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{l.quantite}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Math.round(l.prixUnitaire).toLocaleString()} DA</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>{Math.round(l.quantite * l.prixUnitaire).toLocaleString()} DA</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {printDoc.lignes.length > 0 && Math.abs(Math.round(totalLignes) - fac.montantHT) > 1 && (
                      <div style={{ marginTop: '10px', fontSize: '10px', color: '#b45309' }}>
                        Note : le total des lignes reconstituées ({Math.round(totalLignes).toLocaleString()} DA) diffère du montant HT enregistré
                        sur la facture ({fac.montantHT.toLocaleString()} DA). Le montant de la facture fait foi.
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <table style={{ borderCollapse: 'collapse', fontSize: '12px', minWidth: '320px' }}>
                        <tbody>
                          <tr><td style={{ padding: '6px 10px' }}>Total HT</td><td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{fac.montantHT.toLocaleString()} DA</td></tr>
                          <tr><td style={{ padding: '6px 10px' }}>TVA {fac.tauxTVA ? `${Math.round(fac.tauxTVA * 100)} %` : ''}</td><td style={{ padding: '6px 10px', textAlign: 'right' }}>{fac.montantTVA.toLocaleString()} DA</td></tr>
                          {!!fac.timbreAlgerien && <tr><td style={{ padding: '6px 10px' }}>Timbre fiscal</td><td style={{ padding: '6px 10px', textAlign: 'right' }}>{fac.timbreAlgerien.toLocaleString()} DA</td></tr>}
                          {!!fac.fraisPort && <tr><td style={{ padding: '6px 10px' }}>Frais de port</td><td style={{ padding: '6px 10px', textAlign: 'right' }}>{fac.fraisPort.toLocaleString()} DA</td></tr>}
                          <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>Total TTC</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>{fac.montantTTC.toLocaleString()} DA</td>
                          </tr>
                          <tr><td style={{ padding: '6px 10px' }}>Déjà réglé</td><td style={{ padding: '6px 10px', textAlign: 'right' }}>{totalRegle.toLocaleString()} DA</td></tr>
                          <tr>
                            <td style={{ padding: '6px 10px', fontWeight: 'bold' }}>Solde restant</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold', color: fac.soldeRestant > 0 ? '#b91c1c' : '#15803d' }}>{fac.soldeRestant.toLocaleString()} DA</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: '25px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#0f172a' }}>Règlements imputés</div>
                      {printDoc.reglements.length === 0 ? (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Aucun règlement lettré sur cette facture.</div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                              <th style={{ padding: '6px 8px' }}>Code</th>
                              <th style={{ padding: '6px 8px' }}>Date</th>
                              <th style={{ padding: '6px 8px' }}>Mode</th>
                              <th style={{ padding: '6px 8px' }}>Réf. transaction</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Montant</th>
                            </tr>
                          </thead>
                          <tbody>
                            {printDoc.reglements.map(p => (
                              <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '6px 8px' }}><code>{p.code}</code></td>
                                <td style={{ padding: '6px 8px' }}>{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                                <td style={{ padding: '6px 8px' }}>{p.mode}</td>
                                <td style={{ padding: '6px 8px' }}>{p.referenceTransaction || '—'}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{p.montant.toLocaleString()} DA</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '40px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Comptabilité</div>
                        <div>________________________</div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Direction</div>
                        <div>________________________</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* FICHE DE STOCK PRINT TEMPLATE — historique des entrées / sorties d'un article */}
              {printDoc.type === 'fiche_stock' && (() => {
                const art = printDoc.article;
                const movs = printDoc.mouvements;
                const typeLabels: Record<string, string> = {
                  ENTREE_ACHAT: 'Réception achat',
                  ENTREE_TRANSFERT: 'Entrée transfert',
                  SORTIE_AFFECTATION: 'Sortie affectation',
                  SORTIE_TRANSFERT: 'Sortie transfert',
                  RETOUR_AFFECTATION: 'Retour affectation',
                  CORRECTION_INVENTAIRE: 'Régularisation inventaire',
                  ENTREE_INVENTAIRE: 'Entrée inventaire',
                  SORTIE_INVENTAIRE: 'Sortie inventaire',
                  SORTIE_CONSOMMATION: 'Sortie consommation'
                };
                const totalEntrees = movs.filter(m => m.quantite > 0).reduce((s, m) => s + m.quantite, 0);
                const totalSorties = movs.filter(m => m.quantite < 0).reduce((s, m) => s + Math.abs(m.quantite), 0);
                let cumul = 0;
                return (
                  <div>
                    <div style={{ background: '#f8fafc', padding: '12px 15px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '12px', lineHeight: 1.7 }}>
                      <div><strong>Article :</strong> {art.designation} ({art.reference})</div>
                      <div>
                        <strong>Dépôt :</strong> {printDoc.magasinNom} &nbsp;|&nbsp;
                        <strong>Unité :</strong> {art.unite} &nbsp;|&nbsp;
                        <strong>Seuil d'alerte :</strong> {art.stockMinimum}
                      </div>
                      <div>
                        <strong>Stock actuel :</strong> {printDoc.stockActuel} {art.unite} &nbsp;|&nbsp;
                        <strong>PMP :</strong> {(art.prixMoyen || 0).toLocaleString()} DA &nbsp;|&nbsp;
                        <strong>Valeur du stock :</strong> {(printDoc.stockActuel * (art.prixMoyen || 0)).toLocaleString()} DA
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                          <th style={{ padding: '7px 8px', width: '75px' }}>Date</th>
                          <th style={{ padding: '7px 8px' }}>Type de mouvement</th>
                          <th style={{ padding: '7px 8px' }}>Document</th>
                          <th style={{ padding: '7px 8px' }}>Dépôt</th>
                          <th style={{ padding: '7px 8px', width: '65px', textAlign: 'right' }}>Entrée</th>
                          <th style={{ padding: '7px 8px', width: '65px', textAlign: 'right' }}>Sortie</th>
                          <th style={{ padding: '7px 8px', width: '70px', textAlign: 'right' }}>Solde</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movs.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '14px 8px', textAlign: 'center', color: '#64748b' }}>
                              Aucun mouvement enregistré pour cet article.
                            </td>
                          </tr>
                        ) : (
                          movs.map(mov => {
                            cumul += mov.quantite;
                            const isEntree = mov.quantite > 0;
                            return (
                              <tr key={mov.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '7px 8px' }}>{new Date(mov.dateMouvement).toLocaleDateString('fr-FR')}</td>
                                <td style={{ padding: '7px 8px', color: isEntree ? '#15803d' : '#b91c1c' }}>{typeLabels[mov.type] || mov.type}</td>
                                <td style={{ padding: '7px 8px' }}><code>{mov.referenceDoc}</code></td>
                                <td style={{ padding: '7px 8px' }}>{mov.magasinNom}</td>
                                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 'bold', color: '#15803d' }}>{isEntree ? mov.quantite : ''}</td>
                                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 'bold', color: '#b91c1c' }}>{isEntree ? '' : Math.abs(mov.quantite)}</td>
                                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 'bold' }}>{cumul}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 'bold' }}>
                          <td colSpan={4} style={{ padding: '8px' }}>Totaux</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>{totalEntrees}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#b91c1c' }}>{totalSorties}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{cumul}</td>
                        </tr>
                      </tfoot>
                    </table>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '40px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Responsable Stock / Magasinier</div>
                        <div>________________________</div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Direction Logistique</div>
                        <div>________________________</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* INVENTAIRES PRINT TEMPLATE */}
              {printDoc.type === 'inventaire' && (() => {
                const inv = printDoc.data;
                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px', background: '#f8fafc', padding: '12px 15px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                      <div><strong>Code Inventaire :</strong> <code style={{ fontWeight: 'bold' }}>{inv.code}</code></div>
                      <div><strong>Dépôt Physique :</strong> <strong>{inv.magasinNom}</strong></div>
                      <div><strong>Date de la Session :</strong> {new Date(inv.dateInventaire).toLocaleDateString('fr-FR')}</div>
                      <div><strong>Créé Par :</strong> {inv.creeParNom}</div>
                      <div><strong>Validé Par :</strong> {inv.valideParNom || '—'}</div>
                      <div><strong>Statut Session :</strong> <span style={{ fontWeight: 'bold', color: inv.statut === 'Validé' ? '#16a34a' : '#d97706' }}>{inv.statut}</span></div>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📊 Comptage Physique &amp; Régularisations des Écarts
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px', width: '40px' }}>#</th>
                            <th style={{ padding: '8px 10px' }}>Désignation Article</th>
                            <th style={{ padding: '8px 10px', width: '120px', textAlign: 'right' }}>Stock Théorique</th>
                            <th style={{ padding: '8px 10px', width: '120px', textAlign: 'right' }}>Stock Réel Compté</th>
                            <th style={{ padding: '8px 10px', width: '120px', textAlign: 'right' }}>Écart Régularisé</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printDoc.lines.map((ligne, idx) => {
                            const ecart = (ligne.quantiteReelle || 0) - (ligne.quantiteTheorique || 0);
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>{ligne.designation}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>{ligne.quantiteTheorique} u</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontSize: '13px' }}>{ligne.quantiteReelle} u</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: ecart === 0 ? '#475569' : ecart > 0 ? '#16a34a' : '#dc2626' }}>
                                  {ecart > 0 ? `+${ecart}` : ecart} u
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '40px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Magasinier / Agent Saisie</div>
                        <div>________________________</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{inv.creeParNom}</div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Responsable Audit &amp; Inventaire</div>
                        <div>________________________</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{inv.valideParNom || '—'}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {printDoc.type === 'commande' && (() => {
                const cmd = printDoc.data as BonCommande;
                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Bon de Commande</div>
                        <div><strong>Code :</strong> <code>{cmd.code}</code></div>
                        <div><strong>Date :</strong> {new Date(cmd.dateCommande).toLocaleDateString('fr-FR')}</div>
                        <div><strong>Statut :</strong> {cmd.statut}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div><strong>Fournisseur :</strong> {cmd.fournisseurNom || '—'}</div>
                        <div><strong>Destination :</strong> {magasins.find(m => m.id === cmd.magasinDestinationId)?.nom || '—'}</div>
                        <div><strong>Créé par :</strong> {cmd.createdByNom}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px', width: '40px' }}>#</th>
                            <th style={{ padding: '8px 10px' }}>Article</th>
                            <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>Quantité</th>
                            <th style={{ padding: '8px 10px', width: '110px', textAlign: 'right' }}>Prix Unitaire</th>
                            <th style={{ padding: '8px 10px', width: '120px', textAlign: 'right' }}>Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cmd.lignes.map((ligne, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>{ligne.designation}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{ligne.quantite}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{ligne.prixUnitaire.toLocaleString()} DA</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>{(ligne.quantite * ligne.prixUnitaire).toLocaleString()} DA</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', fontSize: '12px', marginTop: '10px' }}>
                      <div><strong>Total HT :</strong> {cmd.totalHT.toLocaleString()} DA</div>
                      <div><strong>TVA :</strong> {(cmd.totalTTC - cmd.totalHT).toLocaleString()} DA</div>
                      <div><strong>Total TTC :</strong> {cmd.totalTTC.toLocaleString()} DA</div>
                    </div>
                  </div>
                );
              })()}

              {printDoc.type === 'reception' && (() => {
                const rec = printDoc.data as Reception;
                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Bon de Réception</div>
                        <div><strong>Code :</strong> <code>{rec.code}</code></div>
                        <div><strong>Date :</strong> {new Date(rec.dateReception).toLocaleDateString('fr-FR')}</div>
                        {rec.commandeCode ? (
                          <div><strong>Commande liée :</strong> <code>{rec.commandeCode}</code></div>
                        ) : (
                          <div><strong>Origine :</strong> Réception directe (sans demande d'achat)</div>
                        )}
                        {rec.fournisseurNom && <div><strong>Fournisseur :</strong> {rec.fournisseurNom}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div><strong>Magasin :</strong> {rec.magasinNom}</div>
                        <div><strong>BL :</strong> {rec.bonLivraisonRef}</div>
                        <div><strong>Facture :</strong> {rec.factureFournisseurRef || '—'}</div>
                        <div><strong>Magasinier :</strong> {rec.magasinierNom}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px', width: '40px' }}>#</th>
                            <th style={{ padding: '8px 10px' }}>Article</th>
                            <th style={{ padding: '8px 10px', width: '80px', textAlign: 'right' }}>Demandé</th>
                            <th style={{ padding: '8px 10px', width: '80px', textAlign: 'right' }}>Reçu</th>
                            <th style={{ padding: '8px 10px', width: '100px', textAlign: 'right' }}>Prix U. HT</th>
                            <th style={{ padding: '8px 10px', width: '110px', textAlign: 'right' }}>Total HT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rec.lignes.map((ligne, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>{ligne.designation}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{ligne.quantiteDemandee}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{ligne.quantiteRecue}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                {(ligne.quantiteRecue ? getLigneValeurHT(ligne) / ligne.quantiteRecue : 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                                {getLigneValeurHT(ligne).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid #cbd5e1' }}>
                            <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL HT RÉCEPTIONNÉ</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                              {rec.lignes.reduce((sum, ligne) => sum + getLigneValeurHT(ligne), 0).toLocaleString()} DA
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '10px' }}>
                      <div><strong>Statut :</strong> {rec.statut || 'Brouillon'}</div>
                      <div><strong>Total reçu :</strong> {rec.lignes.reduce((sum, ligne) => sum + ligne.quantiteRecue, 0)} articles</div>
                    </div>
                  </div>
                );
              })()}

              {/* Trajet & Détails si Affectation */}
              {printDoc.type === 'affectation' && (() => {
                const aff = printDoc.data as Affectation;
                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', background: '#f8fafc', padding: '12px 15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>📍 DÉPÔT ÉMETTEUR</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>{aff.magasinNom}</div>
                        <div style={{ fontSize: '11px', color: '#334155', marginTop: '6px' }}>
                          <strong>Magasinier :</strong> {aff.magasinierNom}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>🏗️ DESTINATION (CHANTIER)</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb', marginTop: '2px' }}>{aff.chantierNom || aff.magasinDestNom || '—'}</div>
                        <div style={{ fontSize: '11px', color: '#334155', marginTop: '6px' }}>
                          <strong>Responsable Signataire :</strong> {aff.employeNom}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px', fontSize: '11px', color: '#334155' }}>
                      {aff.chauffeur && <div><strong>Chauffeur :</strong> {aff.chauffeur}</div>}
                      {aff.vehicule && <div><strong>Véhicule / Matricule :</strong> {aff.vehicule}</div>}
                      <div><strong>Statut du Bon :</strong> <span style={{ fontWeight: 'bold', color: aff.statut === 'Validé' ? '#16a34a' : '#d97706' }}>{aff.statut || 'En attente'}</span></div>
                      {aff.motif && <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}><strong>Motif / Usage :</strong> {aff.motif}</div>}
                    </div>

                    {/* Tableau des Produits Affectés */}
                    <div style={{ marginBottom: '25px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📋 Produits &amp; Matériaux Sortis du Dépôt
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px', width: '40px' }}>#</th>
                            <th style={{ padding: '8px 10px' }}>Désignation Produit / Matériau</th>
                            <th style={{ padding: '8px 10px', width: '140px', textAlign: 'right' }}>Quantité Sortie</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(aff.lignes && aff.lignes.length > 0) ? (
                            aff.lignes.map((ligne, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>{ligne.designation}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#2563eb', fontSize: '13px' }}>
                                  {ligne.quantite} u
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>1</td>
                              <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>{aff.articleDesignation || 'Article'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#2563eb', fontSize: '13px' }}>
                                {aff.quantite || 1} u
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Bloc Signatures */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '40px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Magasinier Émetteur</div>
                        <div>________________________</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{aff.magasinierNom}</div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Transporteur / Chauffeur</div>
                        <div>________________________</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{aff.chauffeur || '—'}</div>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '35px' }}>Visa Responsable Récepteur</div>
                        <div>________________________</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{aff.employeNom}</div>
                      </div>
                    </div>

                  </div>
                );
              })()}

            </div>

            <div className="modal-footer no-print" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setPrintDoc(null)}>Fermer</button>
              <button type="button" className="btn btn-primary" style={{ padding: '8px 16px', fontWeight: 'bold' }} onClick={() => window.print()}>
                🖨️ Imprimer la Fiche Officielle
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

