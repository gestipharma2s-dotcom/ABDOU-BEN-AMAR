import React, { useState, useEffect } from 'react';
import { 
  Building2, Package, Truck, ShoppingCart, ShieldCheck, 
  Users, RefreshCw, Landmark, BarChart3, Search, 
  Plus, Edit, Trash, Printer, QrCode, ClipboardList,
  ChevronRight, ChevronDown, Info, Moon, Sun,
  Folder, FileText, CheckSquare, LogOut, Lock, Mail, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import { SupabaseDatabase } from './lib/supabaseDb';
import { MockDatabase } from './lib/mockDb'; // For non-critical features until fully migrated
import type { 
  UserProfile, Magasin, Article, Fournisseur, BonCommande, 
  Reception, StockItem, MouvementStock, Affectation, 
  Employe, Chantier, Transfert, Paiement, AuditLog, ModePaiement, Facture
} from './lib/types';

export default function App() {
  // --- Auth States ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>({} as UserProfile);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // --- States (initialized empty, loaded from Supabase) ---
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMagasinFilter, setSelectedMagasinFilter] = useState<string | null>(null);
  
  // Lists - all start empty and load from Supabase
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  
  // UI States & Selections
  const [theme, setTheme] = useState<string>('light');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [treeFilter, setTreeFilter] = useState<string>('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
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
  
  const [fournisseurModalOpen, setFournisseurModalOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Partial<Fournisseur> | null>(null);

  const [commandeModalOpen, setCommandeModalOpen] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<Partial<BonCommande> | null>(null);
  const [commandeLines, setCommandeLines] = useState<{ articleId: string; quantite: number; prixUnitaire: number }[]>([]);

  const [receptionModalOpen, setReceptionModalOpen] = useState(false);
  const [receptionCommandeId, setReceptionCommandeId] = useState<string>('');
  const [receptionLines, setReceptionLines] = useState<{ articleId: string; quantiteRecue: number }[]>([]);
  const [receptionBL, setReceptionBL] = useState('');
  const [receptionFacture, setReceptionFacture] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  
  const [affectationModalOpen, setAffectationModalOpen] = useState(false);
  const [affectationEmpId, setAffectationEmpId] = useState('');
  const [affectationChaId, setAffectationChaId] = useState('');
  const [affectationArtId, setAffectationArtId] = useState('');
  const [affectationQty, setAffectationQty] = useState<number>(1);
  const [affectationMotif, setAffectationMotif] = useState('');
  const [affectationMagasinId, setAffectationMagasinId] = useState('');

  const [transfertModalOpen, setTransfertModalOpen] = useState(false);
  const [transfertDepartId, setTransfertDepartId] = useState('');
  const [transfertDestId, setTransfertDestId] = useState('');
  const [transfertLines, setTransfertLines] = useState<{ articleId: string; quantite: number }[]>([]);
  const [transfertMotif, setTransfertMotif] = useState('');

  const [paiementModalOpen, setPaiementModalOpen] = useState(false);
  const [payFournisseurId, setPayFournisseurId] = useState('');
  const [payMontant, setPayMontant] = useState<number>(0);
  const [payMode, setPayMode] = useState<ModePaiement>('Virement');
  const [payRefTrans, setPayRefTrans] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payInvoiceId, setPayInvoiceId] = useState('');

  // Print Preview Overlay
  const [printDoc, setPrintDoc] = useState<{ type: 'commande'; data: BonCommande } | { type: 'reception'; data: Reception } | { type: 'affectation'; data: Affectation } | null>(null);

  // --- Load data from Supabase on mount ---
  const reloadData = async () => {
    try {
      const [usersData, magasinsData, articlesData, fournisseursData, employesData, chantiersData, 
              stocksData, mouvementsData, commandesData, receptionsData, affectationsData, 
              transfertsData, paiementsData, auditLogsData, facturesData] = await Promise.all([
        SupabaseDatabase.getUsers(),
        SupabaseDatabase.getMagasins(),
        SupabaseDatabase.getArticles(),
        SupabaseDatabase.getFournisseurs(),
        SupabaseDatabase.getEmployes(),
        SupabaseDatabase.getChantiers(),
        SupabaseDatabase.getStocks(),
        SupabaseDatabase.getMouvementsStock(),
        SupabaseDatabase.getCommandes(),
        SupabaseDatabase.getReceptions(),
        SupabaseDatabase.getAffectations(),
        SupabaseDatabase.getTransferts(),
        SupabaseDatabase.getPaiements(),
        SupabaseDatabase.getAuditLogs(),
        SupabaseDatabase.getFactures()
      ]);
      
      setUsers(usersData);
      setMagasins(magasinsData);
      setArticles(articlesData);
      setFournisseurs(fournisseursData);
      setEmployes(employesData);
      setChantiers(chantiersData);
      setStocks(stocksData);
      setMouvements(mouvementsData);
      setCommandes(commandesData);
      setReceptions(receptionsData);
      setAffectations(affectationsData);
      setTransferts(transfertsData);
      setPaiements(paiementsData);
      setAuditLogs(auditLogsData);
      setFactures(facturesData);
    } catch (err) {
      console.error('Error loading data from Supabase:', err);
    }
  };

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
        // Load data after successful login
        const [usersData, magasinsData, articlesData, fournisseursData, employesData, chantiersData, 
                stocksData, mouvementsData, commandesData, receptionsData, affectationsData, 
                transfertsData, paiementsData, auditLogsData, facturesData] = await Promise.all([
          SupabaseDatabase.getUsers(),
          SupabaseDatabase.getMagasins(),
          SupabaseDatabase.getArticles(),
          SupabaseDatabase.getFournisseurs(),
          SupabaseDatabase.getEmployes(),
          SupabaseDatabase.getChantiers(),
          SupabaseDatabase.getStocks(),
          SupabaseDatabase.getMouvementsStock(),
          SupabaseDatabase.getCommandes(),
          SupabaseDatabase.getReceptions(),
          SupabaseDatabase.getAffectations(),
          SupabaseDatabase.getTransferts(),
          SupabaseDatabase.getPaiements(),
          SupabaseDatabase.getAuditLogs(),
          SupabaseDatabase.getFactures()
        ]);
        
        setUsers(usersData);
        setMagasins(magasinsData);
        setArticles(articlesData);
        setFournisseurs(fournisseursData);
        setEmployes(employesData);
        setChantiers(chantiersData);
        setStocks(stocksData);
        setMouvements(mouvementsData);
        setCommandes(commandesData);
        setReceptions(receptionsData);
        setAffectations(affectationsData);
        setTransferts(transfertsData);
        setPaiements(paiementsData);
        setAuditLogs(auditLogsData);
        setFactures(facturesData);

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

  const handleProcessReception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receptionCommandeId && receptionBL) {
      const validLines = receptionLines.filter(l => l.quantiteRecue > 0);
      if (validLines.length === 0) {
        alert('Veuillez réceptionner au least un article avec une quantité positive.');
        return;
      }
      
      try {
        await SupabaseDatabase.receiveGoods(receptionCommandeId, validLines);
        setReceptionModalOpen(false);
        setReceptionCommandeId('');
        setReceptionLines([]);
        setReceptionBL('');
        setReceptionFacture('');
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    }
  };

  const handleProcessAffectation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (affectationEmpId && affectationChaId && affectationArtId && affectationQty > 0) {
      try {
        const aff: Partial<Affectation> = {
          employeId: affectationEmpId,
          chantierId: affectationChaId,
          magasinId: affectationMagasinId || currentUser.magasinId || 'mag-alg',
          articleId: affectationArtId,
          quantite: affectationQty,
          motif: affectationMotif
        };
        await SupabaseDatabase.createAffectation(aff);
        setAffectationModalOpen(false);
        setAffectationEmpId('');
        setAffectationChaId('');
        setAffectationArtId('');
        setAffectationQty(1);
        setAffectationMotif('');
        setAffectationMagasinId('');
        await reloadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    }
  };

  const handleProcessTransfert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transfertDepartId && transfertDestId && transfertLines.length > 0) {
      if (transfertDepartId === transfertDestId) {
        alert('Les magasins de départ et de destination doivent être différents.');
        return;
      }
      
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
      }
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payFournisseurId && payMontant > 0 && payRefTrans) {
      try {
        const pay: Partial<Paiement> = {
          fournisseurId: payFournisseurId,
          montant: payMontant,
          mode: payMode,
          referenceTransaction: payRefTrans,
          factureRef: payInvoiceId || undefined
        };
        await SupabaseDatabase.recordPayment(pay);
        setPaiementModalOpen(false);
        setPayFournisseurId('');
        setPayMontant(0);
        setPayRefTrans('');
        setPayNote('');
        setPayInvoiceId('');
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
      setAffectationEmpId('');
      setAffectationChaId('');
      setAffectationArtId('');
      setAffectationQty(1);
      setAffectationMotif('');
      setAffectationMagasinId(currentUser.magasinId || authorized[0]?.id || '');
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
      setPayFournisseurId(fournisseurs[0]?.id || '');
      setPayMontant(10000);
      setPayRefTrans('');
      setPayNote('');
      setPayInvoiceId('');
      setPaiementModalOpen(true);
    } else if (activeTab === 'users') {
      setSelectedUser({ role: 'magasinier', actif: true, magasinsIds: [] });
      setUserModalOpen(true);
    } else {
      alert(`L'ajout n'est pas configuré pour le module actif : ${activeTab}`);
    }
  };

  const handleRibbonEdit = () => {
    if (!selectedRowId) {
      alert('Veuillez d\'abord sélectionner une ligne dans le tableau.');
      return;
    }
    if (activeTab === 'articles') {
      const item = articles.find(a => a.id === selectedRowId);
      if (item) {
        setSelectedArticle(item);
        setArticleModalOpen(true);
      }
    } else if (activeTab === 'magasins') {
      const item = magasins.find(m => m.id === selectedRowId);
      if (item) {
        setSelectedMagasin(item);
        setMagasinModalOpen(true);
      }
    } else if (activeTab === 'fournisseurs') {
      const item = fournisseurs.find(f => f.id === selectedRowId);
      if (item) {
        setSelectedFournisseur(item);
        setFournisseurModalOpen(true);
      }
    } else if (activeTab === 'users') {
      const item = MockDatabase.getUsers().find(u => u.id === selectedRowId);
      if (item) {
        setSelectedUser(item);
        setUserModalOpen(true);
      }
    } else if (activeTab === 'achats') {
      alert('La modification directe d\'un bon de commande validé n\'est pas autorisée.');
    } else {
      alert('La modification n\'est pas disponible pour ce module.');
    }
  };

  const handleRibbonDelete = () => {
    if (!selectedRowId) {
      alert('Veuillez sélectionner un élément à supprimer.');
      return;
    }

    // ── 1. ARTICLES ────────────────────────────────────────────────────────────
    if (activeTab === 'articles') {
      const hasBC  = commandes.some(c => c.lignes.some(l => l.articleId === selectedRowId));
      const hasRec = receptions.some(r => r.lignes.some(l => l.articleId === selectedRowId));
      const hasStock = stocks.some(s => s.articleId === selectedRowId && s.quantite > 0);
      const hasAff = affectations.some(a => a.articleId === selectedRowId);
      const hasTr  = transferts.some(t => t.lignes.some(l => l.articleId === selectedRowId));
      const hasMov = mouvements.some(m => m.articleId === selectedRowId);

      if (hasBC || hasRec || hasStock || hasAff || hasTr || hasMov) {
        const details: string[] = [];
        if (hasBC)    details.push('• Bons de Commande (BC)');
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
      const hasBC  = commandes.some(c => c.magasinDestinationId === selectedRowId);
      const hasRec = receptions.some(r => r.magasinId === selectedRowId);
      const hasStock = stocks.some(s => s.magasinId === selectedRowId && s.quantite > 0);
      const hasAff = affectations.some(a => a.magasinId === selectedRowId);
      const hasTr  = transferts.some(t => t.magasinDepartId === selectedRowId || t.magasinDestId === selectedRowId);
      const hasMov = mouvements.some(m => m.magasinId === selectedRowId);

      if (hasBC || hasRec || hasStock || hasAff || hasTr || hasMov) {
        const details: string[] = [];
        if (hasBC)    details.push('• Bons de Commande destinés à ce magasin');
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
      const hasBC  = commandes.some(c => c.fournisseurId === selectedRowId);
      const hasFac = factures.some(f => f.fournisseurId === selectedRowId);
      const hasPay = paiements.some(p => p.fournisseurId === selectedRowId);

      if (hasBC || hasFac || hasPay) {
        const details: string[] = [];
        if (hasBC)  details.push('• Bons de Commande (BC) émis à ce fournisseur');
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

    // ── 4. BONS DE COMMANDE (BC) ────────────────────────────────────────────
    else if (activeTab === 'achats') {
      const hasRec = receptions.some(r => r.commandeId === selectedRowId);
      const hasFac = factures.some(f => f.commandeId === selectedRowId);

      if (hasRec || hasFac) {
        const details: string[] = [];
        if (hasRec) details.push('• Bon(s) de Réception (BL) liés à cette commande');
        if (hasFac) details.push('• Facture(s) d\'achat associées à cette commande');
        alert(
          '⛔ Suppression impossible — Bon de Commande associé\n\n' +
          'Ce Bon de Commande ne peut pas être supprimé car il est référencé dans :\n\n' +
          details.join('\n') +
          '\n\nVeuillez d\'abord supprimer les réceptions et factures liées.'
        );
        return;
      }
    }

    // ── 5. RÉCEPTIONS (BL) ──────────────────────────────────────────────────
    else if (activeTab === 'receptions') {
      const hasFac = factures.some(f => f.receptionId === selectedRowId);

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
      const linkedPays = paiements.filter(p => p.factureId === selectedRowId);

      if (linkedPays.length > 0) {
        const refs = linkedPays.map(p => p.code).join(', ');
        alert(
          '⛔ Suppression impossible — Facture lettrée\n\n' +
          'Cette Facture ne peut pas être supprimée car elle est lettrée (associée) aux règlements suivants :\n\n' +
          '• ' + refs +
          '\n\nVeuillez d\'abord délettrer (dissocier) les règlements concernés avant de supprimer la facture.'
        );
        return;
      }
    }

    // ── 7. PAIEMENTS / RÈGLEMENTS (FINANCES) ────────────────────────────────
    else if (activeTab === 'finances') {
      const pay = paiements.find(p => p.id === selectedRowId);
      if (pay && pay.lettre) {
        alert(
          '⛔ Suppression impossible — Règlement lettré\n\n' +
          'Ce règlement (réf. ' + pay.code + ') est lettré et associé à la facture ' + (pay.factureRef || pay.factureId) + '.\n\n' +
          'Veuillez d\'abord dissocier ce règlement de la facture avant de le supprimer.'
        );
        return;
      }
    }

    // ── CONFIRMATION ET SUPPRESSION EFFECTIVE ──────────────────────────────
    if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cet élément ?\n\nCette action est irréversible.')) {
      if (activeTab === 'articles') {
        const updated = articles.filter(a => a.id !== selectedRowId);
        localStorage.setItem('bgm_articles', JSON.stringify(updated));
      } else if (activeTab === 'magasins') {
        const updated = magasins.filter(m => m.id !== selectedRowId);
        localStorage.setItem('bgm_magasins', JSON.stringify(updated));
      } else if (activeTab === 'fournisseurs') {
        const updated = fournisseurs.filter(f => f.id !== selectedRowId);
        localStorage.setItem('bgm_fournisseurs', JSON.stringify(updated));
      } else if (activeTab === 'achats') {
        const updated = commandes.filter(c => c.id !== selectedRowId);
        localStorage.setItem('bgm_commandes', JSON.stringify(updated));
      } else if (activeTab === 'receptions') {
        const updated = receptions.filter(r => r.id !== selectedRowId);
        localStorage.setItem('bgm_receptions', JSON.stringify(updated));
      } else if (activeTab === 'factures') {
        const updated = factures.filter(f => f.id !== selectedRowId);
        localStorage.setItem('bgm_factures', JSON.stringify(updated));
      } else if (activeTab === 'affectations') {
        const updated = affectations.filter(a => a.id !== selectedRowId);
        localStorage.setItem('bgm_affectations', JSON.stringify(updated));
      } else if (activeTab === 'transferts') {
        const updated = transferts.filter(t => t.id !== selectedRowId);
        localStorage.setItem('bgm_transferts', JSON.stringify(updated));
      } else if (activeTab === 'finances') {
        const updated = paiements.filter(p => p.id !== selectedRowId);
        localStorage.setItem('bgm_paiements', JSON.stringify(updated));
      }
      setSelectedRowId(null);
      reloadData();
    }
  };

  const handleRibbonPrint = () => {
    if (!selectedRowId) {
      alert('Veuillez sélectionner une ligne d\'un document imprimable (Bons de commande, Réceptions, ou Affectations).');
      return;
    }
    if (activeTab === 'achats') {
      const doc = commandes.find(c => c.id === selectedRowId);
      if (doc) setPrintDoc({ type: 'commande', data: doc });
    } else if (activeTab === 'receptions') {
      const doc = receptions.find(r => r.id === selectedRowId);
      if (doc) setPrintDoc({ type: 'reception', data: doc });
    } else if (activeTab === 'affectations') {
      const doc = affectations.find(a => a.id === selectedRowId);
      if (doc) setPrintDoc({ type: 'affectation', data: doc });
    } else {
      alert('Seuls les Bons d\'achats, de Réceptions et d\'Affectations de matériel possèdent un modèle d\'impression officiel.');
    }
  };

  const handleGenericExport = () => {
    // Basic CSV helper to export current filter items
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `bgm_export_${activeTab}.csv`;

    if (activeTab === 'articles') {
      headers = ['Référence', 'Désignation', 'Catégorie', 'Unité', 'Stock Min', 'Prix Moyen'];
      rows = getFilteredArticles().map(a => [a.reference, a.designation, a.categorie, a.unite, String(a.stockMinimum), String(a.prixMoyen)]);
    } else if (activeTab === 'magasins') {
      headers = ['Code', 'Nom', 'Ville', 'Wilaya', 'Responsable', 'Téléphone', 'Statut'];
      rows = magasins.map(m => [m.code, m.nom, m.ville, m.wilaya, m.responsable, m.telephone, m.actif ? 'Actif' : 'Inactif']);
    } else if (activeTab === 'fournisseurs') {
      headers = ['Société', 'RC/NIF', 'Contact', 'Téléphone', 'Adresse', 'Solde'];
      rows = fournisseurs.map(f => [f.nomSociete, f.rcNif, f.contactNom, f.telephone, f.adresse, String(f.solde)]);
    } else if (activeTab === 'achats') {
      headers = ['Code', 'Date', 'Fournisseur', 'Total TTC', 'Statut'];
      rows = getFilteredCommandes().map(c => [c.code, c.dateCommande, c.fournisseurNom, String(c.totalTTC), c.statut]);
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

  const dashboardKPIs = MockDatabase.getDashboardKPIs(
    currentUser.role === 'direction' 
      ? undefined 
      : getAuthorizedMagasins().map(m => m.id)
  );

  // Filter lists based on search
  const getFilteredArticles = () => {
    return articles.filter(art => 
      art.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.categorie.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getFilteredStocks = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return stocks.filter(stk => {
      if (!authIds.includes(stk.magasinId)) return false;
      if (selectedMagasinFilter && stk.magasinId !== selectedMagasinFilter) return false;
      
      const art = articles.find(a => a.id === stk.articleId);
      const mag = magasins.find(m => m.id === stk.magasinId);
      if (!art || !mag) return false;
      return art.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
             art.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
             mag.nom.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const getFilteredCommandes = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return commandes.filter(cmd => {
      if (!authIds.includes(cmd.magasinDestinationId)) return false;
      if (selectedMagasinFilter && cmd.magasinDestinationId !== selectedMagasinFilter) return false;
      
      return cmd.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
             cmd.fournisseurNom.toLowerCase().includes(searchQuery.toLowerCase()) ||
             cmd.statut.toLowerCase().includes(searchQuery.toLowerCase());
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
      return tr.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
             tr.magasinDepartNom.toLowerCase().includes(searchQuery.toLowerCase()) ||
             tr.magasinDestNom.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const getFilteredAffectations = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return affectations.filter(aff => {
      if (!authIds.includes(aff.magasinId)) return false;
      if (selectedMagasinFilter && aff.magasinId !== selectedMagasinFilter) return false;
      
      return aff.employeNom.toLowerCase().includes(searchQuery.toLowerCase()) ||
             aff.chantierNom.toLowerCase().includes(searchQuery.toLowerCase()) ||
             aff.articleDesignation.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const getFilteredReceptions = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return receptions.filter(rec => {
      if (!authIds.includes(rec.magasinId)) return false;
      if (selectedMagasinFilter && rec.magasinId !== selectedMagasinFilter) return false;
      
      return rec.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (rec.bonLivraisonRef && rec.bonLivraisonRef.toLowerCase().includes(searchQuery.toLowerCase())) ||
             rec.commandeCode.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const getFilteredMouvements = () => {
    const authIds = getAuthorizedMagasins().map(m => m.id);
    return mouvements.filter(mov => {
      if (!authIds.includes(mov.magasinId)) return false;
      if (selectedMagasinFilter && mov.magasinId !== selectedMagasinFilter) return false;
      
      return mov.articleDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
             mov.referenceDoc.toLowerCase().includes(searchQuery.toLowerCase());
    });
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
      case 'achats': return 'Bons de Commande';
      case 'receptions': return 'Réceptions BL';
      case 'stocks': return 'Niveaux de Stocks';
      case 'affectations': return 'Affectations Matériel';
      case 'employes': return 'Employés & Chantiers';
      case 'transferts': return 'Transferts Inter-Mag';
      case 'factures': return 'Factures d\'Achats';
      case 'finances': return 'Paiements / Règlements';
      case 'audit': return 'Journal d\'Audit';
      case 'rapports': return 'Analyses & Graphiques';
      case 'users': return 'Utilisateurs & Droits';
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
              <h1 className="login-brand-title">BGM CENTRAL</h1>
              <p className="login-brand-subtitle">iCom — Gestion Multi-Magasins</p>
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

            <div className="login-help">
              <p className="login-help-title">Comptes de démonstration :</p>
              <div className="login-accounts-grid">
                <div className="login-account-chip" onClick={() => { setLoginEmail('directeur@benamar.dz'); setLoginPassword('dir2026'); setLoginError(''); }}>
                  <span className="chip-role">Direction</span>
                  <span className="chip-email">directeur@benamar.dz</span>
                </div>
                <div className="login-account-chip" onClick={() => { setLoginEmail('rachid.alg@benamar.dz'); setLoginPassword('mag2026'); setLoginError(''); }}>
                  <span className="chip-role">Magasinier</span>
                  <span className="chip-email">rachid.alg@benamar.dz</span>
                </div>
                <div className="login-account-chip" onClick={() => { setLoginEmail('kamel.achats@benamar.dz'); setLoginPassword('ach2026'); setLoginError(''); }}>
                  <span className="chip-role">Achats</span>
                  <span className="chip-email">kamel.achats@benamar.dz</span>
                </div>
                <div className="login-account-chip" onClick={() => { setLoginEmail('amine.compta@benamar.dz'); setLoginPassword('fin2026'); setLoginError(''); }}>
                  <span className="chip-role">Comptabilité</span>
                  <span className="chip-email">amine.compta@benamar.dz</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <span>© 2026 BGM Central iCom — Benamar Group Management</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // MAIN APPLICATION (shown when authenticated)
  // ═══════════════════════════════════════════════════════
  return (
    <div className="app-container">
      {/* --- Modern App Header --- */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo-container">
            <Building2 className="header-logo" size={24} />
          </div>
          <div className="header-titles">
            <h1>BGM CENTRAL iCom</h1>
            <span className="header-badge">{getTabLabel(activeTab)}</span>
          </div>
        </div>
        
        <div className="header-search">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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

      {/* --- Modern Action Toolbar --- */}
      <div className="app-toolbar">
        <div className="toolbar-group">
          <button className="btn-action primary" onClick={handleRibbonAdd} disabled={activeTab === 'dashboard' || activeTab === 'rapports' || activeTab === 'audit' || activeTab === 'receptions'}>
            <Plus size={16} /> <span>Ajouter</span>
          </button>
          <button className="btn-action" onClick={handleRibbonEdit} disabled={!selectedRowId || activeTab === 'dashboard' || activeTab === 'rapports' || activeTab === 'audit' || activeTab === 'receptions'}>
            <Edit size={16} /> <span>Modifier</span>
          </button>
          <button className="btn-action danger" onClick={handleRibbonDelete} disabled={!selectedRowId || activeTab === 'dashboard' || activeTab === 'rapports'}>
            <Trash size={16} /> <span>Supprimer</span>
          </button>
        </div>
        
        <div className="toolbar-group">
          <button className="btn-action" onClick={() => { reloadData(); alert('Actualisé.'); }}>
            <RefreshCw size={16} /> <span>Actualiser</span>
          </button>
          <button className="btn-action" onClick={handleRibbonPrint} disabled={!selectedRowId || (activeTab !== 'achats' && activeTab !== 'receptions' && activeTab !== 'affectations')}>
            <Printer size={16} /> <span>Imprimer</span>
          </button>
          <button className="btn-action" onClick={handleGenericExport} disabled={activeTab === 'dashboard' || activeTab === 'rapports'}>
            <FileText size={16} /> <span>Exporter</span>
          </button>
        </div>
      </div>

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
            {(!treeFilter || 'stock'.includes(treeFilter.toLowerCase()) || 'produits'.includes(treeFilter.toLowerCase()) || 'magasins'.includes(treeFilter.toLowerCase()) || 'stocks'.includes(treeFilter.toLowerCase())) && (
              <div className="tree-group">
                <div className="tree-group-header" onClick={() => toggleNode('stock')}>
                  {expandedNodes.stock ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} style={{ color: '#ffc107' }} />
                  <span>Stock</span>
                </div>
                {expandedNodes.stock && (
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
                  </div>
                )}
              </div>
            )}

            {/* Group 2: Comptoir / Achats */}
            {(!treeFilter || 'achats'.includes(treeFilter.toLowerCase()) || 'commandes'.includes(treeFilter.toLowerCase()) || 'receptions'.includes(treeFilter.toLowerCase()) || 'fournisseurs'.includes(treeFilter.toLowerCase())) && (
              <div className="tree-group">
                <div className="tree-group-header" onClick={() => toggleNode('achats')}>
                  {expandedNodes.achats ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} style={{ color: '#ffc107' }} />
                  <span>Comptoir / Achats</span>
                </div>
                {expandedNodes.achats && (
                  <div className="tree-group-nodes">
                    {(currentUser.role === 'direction' || currentUser.role === 'achat' || currentUser.role === 'magasinier') && (
                      <div className={`tree-node ${activeTab === 'achats' ? 'active' : ''}`} onClick={() => switchTab('achats')}>
                        <ShoppingCart size={12} style={{ color: '#e91e63' }} />
                        <span>Bons de commande</span>
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
            {(!treeFilter || 'logistique'.includes(treeFilter.toLowerCase()) || 'affectations'.includes(treeFilter.toLowerCase()) || 'employes'.includes(treeFilter.toLowerCase()) || 'transferts'.includes(treeFilter.toLowerCase())) && (
              <div className="tree-group">
                <div className="tree-group-header" onClick={() => toggleNode('chantiers')}>
                  {expandedNodes.chantiers ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} style={{ color: '#ffc107' }} />
                  <span>Chantiers & Logistique</span>
                </div>
                {expandedNodes.chantiers && (
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
            {(!treeFilter || 'audit'.includes(treeFilter.toLowerCase()) || 'finances'.includes(treeFilter.toLowerCase()) || 'comptabilite'.includes(treeFilter.toLowerCase()) || 'rapports'.includes(treeFilter.toLowerCase())) && (
              <div className="tree-group">
                <div className="tree-group-header" onClick={() => toggleNode('compta')}>
                  {expandedNodes.compta ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} style={{ color: '#ffc107' }} />
                  <span>Comptabilité & Analyses</span>
                </div>
                {expandedNodes.compta && (
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
                    {(currentUser.role === 'direction' || currentUser.role === 'comptabilite') && (
                      <div className={`tree-node ${activeTab === 'rapports' ? 'active' : ''}`} onClick={() => switchTab('rapports')}>
                        <BarChart3 size={12} style={{ color: '#ff5722' }} />
                        <span>Rapports & Graphiques</span>
                      </div>
                    )}
                    {currentUser.role === 'direction' && (
                      <div className={`tree-node ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => switchTab('audit')}>
                        <ShieldCheck size={12} style={{ color: '#607d8b' }} />
                        <span>Journal d'Audit</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Group 5: Administration */}
            {currentUser.role === 'direction' && (!treeFilter || 'administration'.includes(treeFilter.toLowerCase()) || 'utilisateurs'.includes(treeFilter.toLowerCase()) || 'droits'.includes(treeFilter.toLowerCase()) || 'audit'.includes(treeFilter.toLowerCase())) && (
              <div className="tree-group">
                <div className="tree-group-header" onClick={() => toggleNode('admin')}>
                  {expandedNodes.admin ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Folder size={12} style={{ color: '#ffc107' }} />
                  <span>Administration</span>
                </div>
                {expandedNodes.admin && (
                  <div className="tree-group-nodes">
                    <div className={`tree-node ${activeTab === 'users' ? 'active' : ''}`} onClick={() => switchTab('users')}>
                      <Users size={12} style={{ color: '#6366f1' }} />
                      <span>Utilisateurs & Droits</span>
                    </div>
                    <div className={`tree-node ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => switchTab('audit')}>
                      <ShieldCheck size={12} style={{ color: '#607d8b' }} />
                      <span>Journal d'Audit</span>
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
            {/* PRINT OVERLAY DIALOG */}
            {printDoc && (
              <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '750px' }}>
                  <div className="modal-header">
                    <span>🖨️ Impression de Document ERP</span>
                    <button className="win-tab-close" onClick={() => setPrintDoc(null)}>×</button>
                  </div>
                  <div className="modal-body" style={{ backgroundColor: '#fff', color: '#000' }}>
                    <div className="printable-area">
                      <div className="printable-header">
                        <h2>GROUPE BENAMAR CONSTRUCTION SpA</h2>
                        <p>Direction Logistique et Approvisionnements - Algérie</p>
                        <p><strong>Alger, le {new Date().toLocaleDateString('fr-FR')}</strong></p>
                      </div>

                      {printDoc.type === 'commande' && (
                        <>
                          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <h3>BON DE COMMANDE DE MATÉRIAUX</h3>
                            <h4>Code : {printDoc.data.code}</h4>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '10px' }}>
                            <div>
                              <p><strong>Fournisseur :</strong></p>
                              <p>{printDoc.data.fournisseurNom}</p>
                            </div>
                            <div>
                              <p><strong>Lieu de livraison :</strong></p>
                              <p>Magasin Central (Dossier : {printDoc.data.magasinDestinationId})</p>
                            </div>
                          </div>
                          <table className="printable-table">
                            <thead>
                              <tr>
                                <th>Désignation Article</th>
                                <th>Quantité</th>
                                <th>P.U (DA)</th>
                                <th>Total HT (DA)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {printDoc.data.lignes.map((l, i) => (
                                <tr key={i}>
                                  <td>{l.designation}</td>
                                  <td>{l.quantite}</td>
                                  <td>{l.prixUnitaire.toLocaleString()}</td>
                                  <td>{(l.quantite * l.prixUnitaire).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ textAlign: 'right', marginTop: '15px', fontSize: '11px', fontWeight: 'bold' }}>
                            <p>Total HT : {printDoc.data.totalHT.toLocaleString()} DA</p>
                            <p>TVA (19%) : {printDoc.data.tva.toLocaleString()} DA</p>
                            <p>TOTAL TTC : {printDoc.data.totalTTC.toLocaleString()} DA</p>
                          </div>
                        </>
                      )}

                      {printDoc.type === 'reception' && (
                        <>
                          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <h3>BON DE RÉCEPTION MARCHANDISE</h3>
                            <h4>Code : {printDoc.data.code}</h4>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '10px' }}>
                            <div>
                              <p><strong>BL Référence :</strong> {printDoc.data.bonLivraisonRef}</p>
                              <p><strong>Commande Associée :</strong> {printDoc.data.commandeCode}</p>
                            </div>
                            <div>
                              <p><strong>Magasin Réceptionnaire :</strong> {printDoc.data.magasinNom}</p>
                              <p><strong>Réceptionnaire :</strong> {printDoc.data.magasinierNom}</p>
                            </div>
                          </div>
                          <table className="printable-table">
                            <thead>
                              <tr>
                                <th>Désignation Article</th>
                                <th>Qté Commandée</th>
                                <th>Qté Livrée / Reçue</th>
                                <th>Conformité</th>
                              </tr>
                            </thead>
                            <tbody>
                              {printDoc.data.lignes.map((l, i) => (
                                <tr key={i}>
                                  <td>{l.designation}</td>
                                  <td>{l.quantiteDemandee}</td>
                                  <td>{l.quantiteRecue}</td>
                                  <td>{l.quantiteRecue >= l.quantiteDemandee ? 'Conforme' : 'Partielle'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}

                      {printDoc.type === 'affectation' && (
                        <>
                          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <h3>BON DE SORTIE DE STOCK / AFFECTATION</h3>
                            <h4>Code : {printDoc.data.code}</h4>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '10px' }}>
                            <div>
                              <p><strong>Bénéficiaire :</strong> {printDoc.data.employeNom}</p>
                              <p><strong>Chantier :</strong> {printDoc.data.chantierNom}</p>
                            </div>
                            <div>
                              <p><strong>Magasin Émetteur :</strong> {printDoc.data.magasinNom}</p>
                              <p><strong>Opérateur :</strong> {printDoc.data.magasinierNom}</p>
                            </div>
                          </div>
                          <table className="printable-table">
                            <thead>
                              <tr>
                                <th>Matériau Affecté</th>
                                <th>Quantité</th>
                                <th>Motif / Phase du chantier</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>{printDoc.data.articleDesignation}</td>
                                <td>{printDoc.data.quantite}</td>
                                <td>{printDoc.data.motif}</td>
                              </tr>
                            </tbody>
                          </table>
                        </>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '10px' }}>
                        <div>
                          <p><strong>L'Opérateur / Magasinier</strong></p>
                          <br /><br />
                          <p>............................</p>
                        </div>
                        <div>
                          <p><strong>Le Directeur / Bénéficiaire</strong></p>
                          <br /><br />
                          <p>............................</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setPrintDoc(null)}>Annuler</button>
                    <button className="btn btn-primary" onClick={() => window.print()}>Imprimer en PDF / Papier</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div>
                {/* KPIs Row */}
                <div className="kpi-grid">
                  <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: '#e3effa', color: 'var(--win-blue-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <span className="kpi-label">Magasins Actifs</span>
                      <h4 className="kpi-val">{dashboardKPIs.activeStores}</h4>
                    </div>
                  </div>

                  <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={18} />
                    </div>
                    <div>
                      <span className="kpi-label">Valeur du Stock</span>
                      <h4 className="kpi-val">{dashboardKPIs.valTotalStock.toLocaleString()} DA</h4>
                    </div>
                  </div>

                  <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: '#e0f7fa', color: '#00838f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShoppingCart size={18} />
                    </div>
                    <div>
                      <span className="kpi-label">Achats Mensuels</span>
                      <h4 className="kpi-val">{dashboardKPIs.achatsMensuels.toLocaleString()} DA</h4>
                    </div>
                  </div>

                  <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: '#ffebee', color: '#c62828', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Landmark size={18} />
                    </div>
                    <div>
                      <span className="kpi-label">Dettes Fournisseurs</span>
                      <h4 className="kpi-val">{dashboardKPIs.dettesFournisseurs.toLocaleString()} DA</h4>
                    </div>
                  </div>
                </div>

                <div className="dashboard-layouts">
                  {/* Chart and stocks alerts */}
                  <div className="card">
                    <div className="card-title">
                      <span>📊 Investissements Achats par Wilaya</span>
                      <span className="badge badge-success">Exercice 2026</span>
                    </div>
                    <div className="chart-sim-container">
                      <div className="chart-bar-group">
                        <div className="chart-bar" style={{ height: '75%' }}></div>
                        <span className="chart-label">Alger</span>
                      </div>
                      <div className="chart-bar-group">
                        <div className="chart-bar" style={{ height: '45%' }}></div>
                        <span className="chart-label">Oran</span>
                      </div>
                      <div className="chart-bar-group">
                        <div className="chart-bar" style={{ height: '30%' }}></div>
                        <span className="chart-label">Constantine</span>
                      </div>
                      <div className="chart-bar-group">
                        <div className="chart-bar" style={{ height: '10%' }}></div>
                        <span className="chart-label">Autres</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title">
                      <span>⚠️ Stocks sous le Seuil d'Alerte ({dashboardKPIs.articlesCritiquesCount})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                      {stocks.filter(s => {
                        const art = articles.find(a => a.id === s.articleId);
                        return art && s.quantite < art.stockMinimum;
                      }).map(stk => {
                        const art = articles.find(a => a.id === stk.articleId);
                        const mag = magasins.find(m => m.id === stk.magasinId);
                        if (!art || !mag) return null;
                        return (
                          <div key={stk.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: '#ffebee', borderLeft: '3px solid #c62828' }}>
                            <div>
                              <strong>{art.designation}</strong>
                              <div style={{ fontSize: '9px', color: '#555' }}>{mag.nom}</div>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#c62828' }}>
                              {stk.quantite} / {art.stockMinimum} {art.unite}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent activity grid */}
                <div className="card">
                  <div className="card-title">⏱️ Journal Récent des Mouvements Physiques</div>
                  <div className="win-grid-container">
                    <table className="win-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Magasin</th>
                          <th>Article</th>
                          <th>Opération</th>
                          <th>Quantité</th>
                          <th>Référence</th>
                          <th>Opérateur Nom</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredMouvements().slice(0, 8).map(mov => (
                          <tr key={mov.id}>
                            <td>{new Date(mov.dateMouvement).toLocaleDateString('fr-FR')}</td>
                            <td>{mov.magasinNom}</td>
                            <td>{mov.articleDesignation}</td>
                            <td>
                              <span className={`badge ${mov.type.startsWith('ENTREE') ? 'badge-success' : 'badge-danger'}`}>
                                {mov.type}
                              </span>
                            </td>
                            <td style={{ fontWeight: 'bold' }}>{mov.quantite > 0 ? `+${mov.quantite}` : mov.quantite}</td>
                            <td><code>{mov.referenceDoc}</code></td>
                            <td>{mov.utilisateurNom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ARTICLES */}
            {activeTab === 'articles' && (
              <div>
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
                        <th>QR / Code-barres</th>
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
                          <td><span style={{ fontSize: '9px', fontStyle: 'italic' }}>🔍 {art.qrCode}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <button className="win-summary-btn" onClick={handleRibbonAdd}>Nouveau</button>
                  <button className="win-summary-btn" onClick={handleRibbonEdit} disabled={!selectedRowId}>Modifier</button>
                  <button className="win-summary-btn" onClick={handleRibbonDelete} disabled={!selectedRowId}>Supprimer</button>
                  <span style={{ fontSize: '10px', color: '#555', marginLeft: 'auto' }}>Total : {getFilteredArticles().length} articles</span>
                </div>
              </div>
            )}

            {/* TAB: MAGASINS */}
            {activeTab === 'magasins' && (
              <div>
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
                      {magasins.map(mag => (
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
                  <button className="win-summary-btn" onClick={handleRibbonAdd}>Nouveau Magasin</button>
                  <button className="win-summary-btn" onClick={handleRibbonEdit} disabled={!selectedRowId}>Modifier</button>
                  <button className="win-summary-btn" onClick={handleRibbonDelete} disabled={!selectedRowId}>Supprimer</button>
                </div>
              </div>
            )}

            {/* TAB: FOURNISSEURS */}
            {activeTab === 'fournisseurs' && (
              <div>
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
                      {fournisseurs.filter(f => f.nomSociete.toLowerCase().includes(searchQuery.toLowerCase())).map(four => (
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
                          <td style={{ fontWeight: 'bold', color: four.solde > 0 ? '#c62828' : '#2e7d32' }}>
                            {four.solde.toLocaleString()} DA
                          </td>
                          <td>
                            {(currentUser.role === 'direction' || currentUser.role === 'comptabilite') && four.solde > 0 && (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '1px 6px', fontSize: '9px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPayFournisseurId(four.id);
                                  setPayMontant(four.solde);
                                  setPayRefTrans('');
                                  setPayNote('');
                                  setPayInvoiceId('');
                                  setPaiementModalOpen(true);
                                }}
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
                <div className="win-grid-summary-footer">
                  <button className="win-summary-btn" onClick={handleRibbonAdd}>Créer Fiche Fournisseur</button>
                  <button className="win-summary-btn" onClick={handleRibbonEdit} disabled={!selectedRowId}>Modifier</button>
                </div>
              </div>
            )}

            {/* TAB: ACHATS */}
            {activeTab === 'achats' && (
              <div>
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
                      {getFilteredCommandes().map(cmd => (
                        <tr 
                          key={cmd.id}
                          className={selectedRowId === cmd.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(cmd.id)}
                        >
                          <td><code>{cmd.code}</code></td>
                          <td>{new Date(cmd.dateCommande).toLocaleDateString('fr-FR')}</td>
                          <td><strong>{cmd.fournisseurNom}</strong></td>
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
                                  style={{ padding: '1px 4px', fontSize: '9px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    MockDatabase.transitionCommandeStatut(cmd.id, 'Validé');
                                    reloadData();
                                  }}
                                >
                                  Valider
                                </button>
                              )}
                              {currentUser.role === 'achat' && cmd.statut === 'Validé' && (
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '1px 4px', fontSize: '9px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    MockDatabase.transitionCommandeStatut(cmd.id, 'Commandé');
                                    reloadData();
                                  }}
                                >
                                  Envoyer
                                </button>
                              )}
                              {currentUser.role === 'magasinier' && cmd.statut === 'Commandé' && cmd.magasinDestinationId === currentUser.magasinId && (
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '1px 4px', fontSize: '9px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReceptionCommandeId(cmd.id);
                                    setReceptionLines(cmd.lignes.map(l => ({ articleId: l.articleId, quantiteRecue: l.quantite - l.quantiteRecue })));
                                    setReceptionBL('');
                                    setReceptionFacture('');
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
                  <button className="win-summary-btn" onClick={handleRibbonAdd}>Créer Bon Commande</button>
                  <button className="win-summary-btn" onClick={handleRibbonPrint} disabled={!selectedRowId}>Imprimer</button>
                </div>
              </div>
            )}

            {/* TAB: RECEPTIONS */}
            {activeTab === 'receptions' && (
              <div>
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
                        <th>Magasinier Signataire</th>
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
                          <td><code>{rec.commandeCode}</code></td>
                          <td>{rec.magasinNom}</td>
                          <td>{rec.bonLivraisonRef}</td>
                          <td>{rec.factureFournisseurRef || '-'}</td>
                          <td>{rec.magasinierNom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <button className="win-summary-btn" onClick={handleRibbonPrint} disabled={!selectedRowId}>Visualiser / Imprimer</button>
                </div>
              </div>
            )}

            {/* TAB: STOCKS & MOUVEMENTS */}
            {activeTab === 'stocks' && (
              <div className="split-view" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
                <div className="card" style={{ padding: '4px' }}>
                  <div className="win-panel-header">📋 Stock Physique Consolidé</div>
                  <div className="win-grid-container" style={{ border: 'none' }}>
                    <table className="win-table">
                      <thead>
                        <tr>
                          <th>Magasin</th>
                          <th>Article Matériau</th>
                          <th>Stock Réel</th>
                          <th>Seuil Alerte</th>
                          <th>État</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredStocks().map(stk => {
                          const art = articles.find(a => a.id === stk.articleId);
                          const mag = magasins.find(m => m.id === stk.magasinId);
                          if (!art || !mag) return null;
                          const isLow = stk.quantite < art.stockMinimum;
                          return (
                            <tr key={stk.id} style={isLow ? { backgroundColor: '#ffebee' } : {}}>
                              <td>{mag.nom}</td>
                              <td><strong>{art.designation}</strong></td>
                              <td style={{ fontWeight: 'bold', fontSize: '12px' }}>{stk.quantite} {art.unite}</td>
                              <td>{art.stockMinimum}</td>
                              <td>
                                <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                                  {isLow ? 'Alerte' : 'Conforme'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card" style={{ padding: '4px' }}>
                  <div className="win-panel-header">⏱️ Flux d'Entrées/Sorties</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '420px', overflowY: 'auto', padding: '4px' }}>
                    {getFilteredMouvements().map(mov => (
                      <div key={mov.id} style={{ border: '1px solid #ccc', padding: '6px', backgroundColor: '#fff', fontSize: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span style={{ color: mov.quantite > 0 ? '#2e7d32' : '#c62828' }}>{mov.type}</span>
                          <span>{new Date(mov.dateMouvement).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div style={{ fontWeight: 'bold', marginTop: '2px' }}>{mov.articleDesignation}</div>
                        <div>Dépôt: {mov.magasinNom}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span>Réf: <code>{mov.referenceDoc}</code></span>
                          <strong style={{ fontSize: '11px', color: mov.quantite > 0 ? '#2e7d32' : '#c62828' }}>
                            {mov.quantite > 0 ? `+${mov.quantite}` : mov.quantite}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AFFECTATIONS */}
            {activeTab === 'affectations' && (
              <div>
                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Bon Sortie</th>
                        <th>Date d'affectation</th>
                        <th>Bénéficiaire / Compagnon</th>
                        <th>Chantier Principal</th>
                        <th>Matériau/Outil</th>
                        <th>Qté Émise</th>
                        <th>Motif d'usage</th>
                        <th>Statut</th>
                        <th>Magasinier</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredAffectations().map(aff => (
                        <tr 
                          key={aff.id}
                          className={selectedRowId === aff.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(aff.id)}
                        >
                          <td><code>{aff.code}</code></td>
                          <td>{new Date(aff.dateAffectation).toLocaleDateString('fr-FR')}</td>
                          <td><strong>{aff.employeNom}</strong></td>
                          <td>{aff.chantierNom}</td>
                          <td>{aff.articleDesignation}</td>
                          <td style={{ fontWeight: 'bold' }}>{aff.quantite}</td>
                          <td>{aff.motif}</td>
                          <td>
                            <span className={`badge ${aff.statut === 'Affecté' ? 'badge-warning' : 'badge-success'}`}>
                              {aff.statut}
                            </span>
                          </td>
                          <td>{aff.magasinierNom}</td>
                          <td>
                            {currentUser.role === 'magasinier' && aff.statut === 'Affecté' && (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '1px 6px', fontSize: '9px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  MockDatabase.returnAffectation(aff.id, aff.quantite);
                                  reloadData();
                                }}
                              >
                                Retour
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <button className="win-summary-btn" onClick={handleRibbonAdd}>Nouvelle Affectation</button>
                  <button className="win-summary-btn" onClick={handleRibbonPrint} disabled={!selectedRowId}>Imprimer</button>
                </div>
              </div>
            )}

            {/* TAB: EMPLOYES & CHANTIERS */}
            {activeTab === 'employes' && (
              <div className="split-view">
                <div className="card" style={{ padding: '4px' }}>
                  <div className="win-panel-header">👷 Liste Nominative des Employés</div>
                  <div className="win-grid-container" style={{ border: 'none' }}>
                    <table className="win-table">
                      <thead>
                        <tr>
                          <th>Nom & Prénom</th>
                          <th>Fonction</th>
                          <th>Département</th>
                          <th>Téléphone</th>
                          <th>Chantier Affecté</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employes.map(emp => (
                          <tr key={emp.id}>
                            <td><strong>{emp.nom}</strong></td>
                            <td>{emp.fonction}</td>
                            <td>{emp.service}</td>
                            <td>{emp.telephone}</td>
                            <td><span className="badge badge-info">{emp.chantierNom || 'Non assigné'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card" style={{ padding: '4px' }}>
                  <div className="win-panel-header">🏗️ Suivi des Chantiers du Groupe</div>
                  <div className="win-grid-container" style={{ border: 'none' }}>
                    <table className="win-table">
                      <thead>
                        <tr>
                          <th>Désignation Chantier</th>
                          <th>Wilaya</th>
                          <th>Conducteur de travaux</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chantiers.map(chan => (
                          <tr key={chan.id}>
                            <td><strong>{chan.nom}</strong></td>
                            <td>{chan.wilaya}</td>
                            <td>{chan.chefNom}</td>
                            <td>
                              <span className={`badge ${chan.actif ? 'badge-success' : 'badge-danger'}`}>
                                {chan.actif ? 'Actif' : 'Livré'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TRANSFERTS INTER-MAGASINS */}
            {activeTab === 'transferts' && (
              <div>
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
                              tr.statut === 'Expédié' ? 'badge-warning' :
                              'badge-success'
                            }`}>
                              {tr.statut}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {currentUser.role === 'magasinier' && tr.statut === 'Demande' && tr.magasinDepartId === currentUser.magasinId && (
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '1px 6px', fontSize: '9px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    MockDatabase.expedierTransfert(tr.id);
                                    reloadData();
                                  }}
                                >
                                  Expédier
                                </button>
                              )}
                              {currentUser.role === 'magasinier' && tr.statut === 'Expédié' && tr.magasinDestId === currentUser.magasinId && (
                                <button 
                                  className="btn btn-success" 
                                  style={{ padding: '1px 6px', fontSize: '9px', color: '#fff', backgroundColor: '#2e7d32' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    MockDatabase.recevoirTransfert(tr.id);
                                    reloadData();
                                  }}
                                >
                                  Confirmer Réception
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
                  <button className="win-summary-btn" onClick={handleRibbonAdd}>Demander Transfert Matériel</button>
                </div>
              </div>
            )}

            {/* TAB: FACTURES */}
            {activeTab === 'factures' && (
              <div>
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
                      </tr>
                    </thead>
                    <tbody>
                      {factures.filter(f => f.code.toLowerCase().includes(searchQuery.toLowerCase()) || f.fournisseurNom.toLowerCase().includes(searchQuery.toLowerCase())).map(fac => {
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
                            <td style={{ fontWeight: 'bold', color: fac.soldeRestant > 0 ? '#c62828' : '#2e7d32' }}>
                              {fac.soldeRestant.toLocaleString()} DA
                            </td>
                            <td>
                              {matchedPays.length === 0 ? (
                                <span style={{ fontStyle: 'italic', color: '#888', fontSize: '10px' }}>Non lettrée</span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                  {matchedPays.map(p => (
                                    <span key={p.id} className="badge" style={{ fontSize: '9px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', padding: '1px 4px', borderRadius: '4px' }}>
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
                                background: fac.statut === 'Payée' ? '#e8f5e9' : fac.statut === 'Partiellement payée' ? '#fff3e0' : '#ffebee',
                                color: fac.statut === 'Payée' ? '#2e7d32' : fac.statut === 'Partiellement payée' ? '#ef6c00' : '#c62828',
                                border: `1px solid ${fac.statut === 'Payée' ? '#c8e6c9' : fac.statut === 'Partiellement payée' ? '#ffe0b2' : '#ffcdd2'}`
                              }}>
                                {fac.statut}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Total facturé : {factures.reduce((acc, f) => acc + f.montantTTC, 0).toLocaleString()} DA | Reste à payer : {factures.reduce((acc, f) => acc + f.soldeRestant, 0).toLocaleString()} DA
                  </span>
                </div>
              </div>
            )}

            {/* TAB: FINANCES */}
            {activeTab === 'finances' && (
              <div>
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
                        <th>Association / Facture</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paiements.map(pay => (
                        <tr 
                          key={pay.id}
                          className={selectedRowId === pay.id ? 'selected' : ''}
                          onClick={() => setSelectedRowId(pay.id)}
                        >
                          <td>{new Date(pay.datePaiement).toLocaleString('fr-FR')}</td>
                          <td><code>{pay.code}</code></td>
                          <td><strong>{pay.fournisseurNom}</strong></td>
                          <td style={{ fontWeight: 'bold', color: '#2e7d32' }}>{pay.montant.toLocaleString()} DA</td>
                          <td>{pay.mode}</td>
                          <td><code>{pay.referenceTransaction}</code></td>
                          <td>{pay.comptableNom}</td>
                          <td>
                            {pay.lettre ? (
                              <span className="badge" style={{ fontSize: '9px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', padding: '1px 4px', borderRadius: '4px' }}>
                                Lettré : {pay.factureRef}
                              </span>
                            ) : (
                              <span style={{ fontStyle: 'italic', color: '#888', fontSize: '10px' }}>Non lettré</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="win-grid-summary-footer">
                  <button className="win-summary-btn" onClick={handleRibbonAdd}>Enregistrer Nouveau Paiement</button>
                </div>
              </div>
            )}

            {/* TAB: AUDIT LOG */}
            {activeTab === 'audit' && (
              <div>
                <div className="win-grid-container">
                  <table className="win-table">
                    <thead>
                      <tr>
                        <th>Horodatage Système</th>
                        <th>Opérateur Nom</th>
                        <th>Rôle Simulé</th>
                        <th>Action Réalisée</th>
                        <th>Module Cible</th>
                        <th>Identifiant unique</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => (
                        <tr key={log.id}>
                          <td><code>{new Date(log.dateAction).toISOString()}</code></td>
                          <td><strong>{log.userNom}</strong></td>
                          <td><span className="badge badge-info">{log.userRole}</span></td>
                          <td>{log.action}</td>
                          <td><code>{log.table}</code></td>
                          <td><code>{log.recordId}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: USERS */}
            {activeTab === 'users' && currentUser.role === 'direction' && (
              <div>
                {/* Stats cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: 'var(--primary-light)', borderLeft: '3px solid var(--primary)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{users.length}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total Utilisateurs</div>
                  </div>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: '#e8f5e9', borderLeft: '3px solid #4caf50' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2e7d32' }}>{users.filter(u => u.actif).length}</div>
                    <div style={{ fontSize: '10px', color: '#558b2f' }}>Actifs</div>
                  </div>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: '#ffebee', borderLeft: '3px solid #f44336' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#c62828' }}>{users.filter(u => !u.actif).length}</div>
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
                      {users.filter(u => 
                        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (u.telephone && u.telephone.includes(searchQuery))
                      ).map(usr => (
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
                                <span style={{ fontSize: '9px', color: '#c62828', fontWeight: 'bold' }}>Aucun accès</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button 
                              className={`btn ${usr.actif ? 'btn-secondary' : 'btn-primary'}`}
                              style={{ padding: '2px 8px', fontSize: '9px', width: '90px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  MockDatabase.toggleUserActif(usr.id);
                                  reloadData();
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : 'Erreur');
                                }
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
                                  try {
                                    if (window.confirm(`Réinitialiser le mot de passe de ${usr.name} et générer un mot de passe temporaire ?`)) {
                                      const tmp = MockDatabase.resetUserPassword(usr.id);
                                      reloadData();
                                      alert(`Mot de passe temporaire généré : ${tmp}\nInformez l'utilisateur de le changer à la prochaine connexion.`);
                                    }
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : 'Erreur');
                                  }
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
                                    try {
                                      MockDatabase.deleteUser(usr.id);
                                      reloadData();
                                    } catch (err) {
                                      alert(err instanceof Error ? err.message : 'Erreur');
                                    }
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
                  <button className="win-summary-btn" onClick={() => { setSelectedUser({ role: 'magasinier', actif: true, magasinsIds: [] }); setUserModalOpen(true); }}>+ Créer Nouvel Utilisateur</button>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{users.filter(u => 
                    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (u.telephone && u.telephone.includes(searchQuery))
                  ).length} sur {users.length} utilisateurs</span>
                </div>
              </div>
            )}

            {/* TAB: RAPPORT ANALYTIQUE */}
            {activeTab === 'rapports' && (() => {
              // Stock value per warehouse
              const stockParMagasin = magasins.filter(m => m.actif).map(mag => {
                const val = stocks
                  .filter(s => s.magasinId === mag.id)
                  .reduce((acc, s) => {
                    const art = articles.find(a => a.id === s.articleId);
                    return acc + s.quantite * (art?.prixMoyen ?? 0);
                  }, 0);
                return { nom: mag.nom.replace('Magasin ', ''), val };
              });
              const maxStockVal = Math.max(...stockParMagasin.map(x => x.val), 1);

              // Top articles by value
              const topArticles = articles.map(art => {
                const totalQty = stocks.filter(s => s.articleId === art.id).reduce((a, s) => a + s.quantite, 0);
                return { designation: art.designation, val: totalQty * art.prixMoyen };
              }).sort((a, b) => b.val - a.val).slice(0, 5);
              const maxArtVal = Math.max(...topArticles.map(x => x.val), 1);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="dashboard-layouts">
                    {/* Value per Warehouse */}
                    <div className="card">
                      <div className="card-title">📦 Valeur Globale des Stocks par Entrepôt (DA)</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        {stockParMagasin.map((item, i) => (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                              <span>{item.nom}</span>
                              <strong>{item.val.toLocaleString()} DA</strong>
                            </div>
                            <div style={{ backgroundColor: '#e2e8f0', height: '8px', width: '100%', marginTop: '2px' }}>
                              <div style={{ backgroundColor: '#3b5e94', height: '100%', width: `${(item.val / maxStockVal) * 100}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top articles by stock value */}
                    <div className="card">
                      <div className="card-title">🏆 Top Articles par Valeur Stockée (DA)</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        {topArticles.map((item, i) => (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '60%' }}>{item.designation}</span>
                              <strong>{item.val.toLocaleString()} DA</strong>
                            </div>
                            <div style={{ backgroundColor: '#e2e8f0', height: '8px', width: '100%', marginTop: '2px' }}>
                              <div style={{ backgroundColor: '#00bcd4', height: '100%', width: `${(item.val / maxArtVal) * 100}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title">📥 Exporter l'intégralité des modules de la base</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={() => { setActiveTab('articles'); handleGenericExport(); }}>Exporter Articles (CSV)</button>
                      <button className="btn btn-primary" onClick={() => { setActiveTab('magasins'); handleGenericExport(); }}>Exporter Magasins (CSV)</button>
                      <button className="btn btn-primary" onClick={() => { setActiveTab('fournisseurs'); handleGenericExport(); }}>Exporter Fournisseurs (CSV)</button>
                      <button className="btn btn-primary" onClick={() => { setActiveTab('achats'); handleGenericExport(); }}>Exporter Commandes (CSV)</button>
                      <button className="btn btn-primary" onClick={() => { setActiveTab('stocks'); handleGenericExport(); }}>Exporter Inventaire Stock (CSV)</button>
                    </div>
                  </div>
                </div>
              );
            })()}
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
                    <div style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>
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
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <strong style={{ fontSize: '12px' }}>{four.nomSociete}</strong>
                            <p><strong>Registre Commerce (RC) / NIF :</strong> <code>{four.rcNif}</code></p>
                            <p><strong>Contact commercial :</strong> {four.contactNom}</p>
                            <p><strong>Téléphone :</strong> {four.telephone}</p>
                            <p><strong>Adresse siège :</strong> {four.adresse}</p>
                            <div style={{ border: '1px solid #c62828', background: '#ffebee', padding: '8px', marginTop: '6px' }}>
                              <p style={{ fontWeight: 'bold', color: '#c62828' }}>Encours de dettes de facturation :</p>
                              <strong style={{ fontSize: '14px', color: '#c62828' }}>{four.solde.toLocaleString()} DA</strong>
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
                                <p style={{ color: '#666', fontStyle: 'italic', marginTop: '2px' }}>Aucun règlement associé.</p>
                              ) : (
                                <ul style={{ paddingLeft: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {linkedPays.map(p => (
                                    <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span>{p.code} ({p.montant.toLocaleString()} DA)</span>
                                      <button 
                                        onClick={() => {
                                          try {
                                            MockDatabase.delettrerPaiement(p.id);
                                            reloadData();
                                          } catch (err) {
                                            alert(err instanceof Error ? err.message : 'Erreur');
                                          }
                                        }}
                                        style={{ marginLeft: '6px', background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: '9px', padding: 0 }}
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
                                  <p style={{ color: '#666', fontStyle: 'italic', fontSize: '9px', marginTop: '2px' }}>Aucun règlement non-lettré disponible pour ce fournisseur.</p>
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
                                          try {
                                            MockDatabase.lettrerPaiement(selectEl.value, fac.id);
                                            reloadData();
                                          } catch (err) {
                                            alert(err instanceof Error ? err.message : 'Erreur');
                                          }
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
                                    try {
                                      MockDatabase.delettrerPaiement(pay.id);
                                      reloadData();
                                    } catch (err) {
                                      alert(err instanceof Error ? err.message : 'Erreur');
                                    }
                                  }}
                                >
                                  Délettrer (Dissocier règlement)
                                </button>
                              </div>
                            ) : (
                              <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                                <strong>Associer à une facture :</strong>
                                {unpaidFacs.length === 0 ? (
                                  <p style={{ color: '#666', fontStyle: 'italic', fontSize: '9px', marginTop: '2px' }}>Aucune facture impayée disponible pour ce fournisseur.</p>
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
                                          try {
                                            MockDatabase.lettrerPaiement(pay.id, selectEl.value);
                                            reloadData();
                                          } catch (err) {
                                            alert(err instanceof Error ? err.message : 'Erreur');
                                          }
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
                        <div style={{ textAlign: 'center', marginTop: '40px', color: '#666' }}>
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
                <span>Créer un Bon de Commande Approvisionnement</span>
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
                                style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer' }}
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
                <span>Enregistrement de la Réception (BL)</span>
                <button type="button" className="win-tab-close" onClick={() => setReceptionModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
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
                      <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>Scan en cours ...</span>
                    ) : (
                      <span>[Cliquez ici pour simuler un Scan de code article]</span>
                    )}
                  </div>
                </div>

                <div className="split-view">
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
                <table className="win-table">
                  <thead>
                    <tr>
                      <th>Désignation Article</th>
                      <th>Quantité livrée</th>
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
                              className="form-input" 
                              style={{ width: '80px' }}
                              value={line.quantiteRecue}
                              onChange={(e) => {
                                const list = [...receptionLines];
                                list[idx].quantiteRecue = parseInt(e.target.value) || 0;
                                setReceptionLines(list);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setReceptionModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider Réception</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Affectation Modal */}
      {affectationModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleProcessAffectation}>
              <div className="modal-header">
                <span>Créer Bon de Sortie / Affectation Matériel</span>
                <button type="button" className="win-tab-close" onClick={() => setAffectationModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Dépôt émetteur</label>
                  <input type="text" className="form-input" disabled value={currentMagasinName} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bénéficiaire (Employé)</label>
                  <select 
                    className="form-select"
                    value={affectationEmpId}
                    onChange={(e) => setAffectationEmpId(e.target.value)}
                    required
                  >
                    <option value="">-- Sélectionnez un employé --</option>
                    {employes.map(e => (
                      <option key={e.id} value={e.id}>{e.nom} ({e.fonction})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Chantier Destination</label>
                  <select 
                    className="form-select"
                    value={affectationChaId}
                    onChange={(e) => setAffectationChaId(e.target.value)}
                    required
                  >
                    <option value="">-- Sélectionnez un chantier --</option>
                    {chantiers.filter(c => c.actif).map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="split-view">
                  <div className="form-group">
                    <label className="form-label">Matériau / Article</label>
                    <select 
                      className="form-select"
                      value={affectationArtId}
                      onChange={(e) => setAffectationArtId(e.target.value)}
                      required
                    >
                      <option value="">-- Sélectionnez l'article --</option>
                      {articles.map(art => (
                        <option key={art.id} value={art.id}>{art.designation} ({art.unite})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantité</label>
                    <input 
                      type="number" 
                      required
                      min={1}
                      className="form-input"
                      value={affectationQty}
                      onChange={(e) => setAffectationQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Motif ou note</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2}
                    required
                    value={affectationMotif}
                    onChange={(e) => setAffectationMotif(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAffectationModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider la Sortie</button>
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
                      {magasins.map(m => (
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
                      {magasins.map(m => (
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
                                style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer' }}
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
                <button type="submit" className="btn btn-primary">Valider Transfert</button>
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
                <span>💵 Enregistrer un Règlement de Facture Fournisseur</span>
                <button type="button" className="win-tab-close" onClick={() => setPaiementModalOpen(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Fournisseur</label>
                  <select 
                    className="form-select"
                    value={payFournisseurId}
                    onChange={(e) => {
                      setPayFournisseurId(e.target.value);
                      setPayInvoiceId('');
                    }}
                    required
                  >
                    {fournisseurs.map(f => (
                      <option key={f.id} value={f.id}>{f.nomSociete} (Dette : {f.solde.toLocaleString()} DA)</option>
                    ))}
                  </select>
                </div>
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
                </div>
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
                </div>
                <div className="form-group">
                  <label className="form-label">Facture à solder (Lettrage optionnel)</label>
                  <select 
                    className="form-select"
                    value={payInvoiceId}
                    onChange={(e) => setPayInvoiceId(e.target.value)}
                  >
                    <option value="">-- Aucun lettrage automatique --</option>
                    {factures.filter(f => f.fournisseurId === payFournisseurId && f.soldeRestant > 0).map(f => (
                      <option key={f.id} value={f.id}>
                        {f.code} (TTC: {f.montantTTC.toLocaleString()} DA | Reste: {f.soldeRestant.toLocaleString()} DA)
                      </option>
                    ))}
                  </select>
                </div>
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
                <button type="button" className="btn btn-secondary" onClick={() => setPaiementModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider Paiement</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
}
