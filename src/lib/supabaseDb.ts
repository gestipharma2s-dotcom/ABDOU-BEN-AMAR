import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  UserProfile,
  Magasin,
  Article,
  Fournisseur,
  BonCommande,
  Reception,
  StockItem,
  MouvementStock,
  Affectation,
  Employe,
  Chantier,
  Transfert,
  Paiement,
  AuditLog,
  Facture
} from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// ============================================
// HARDCODED DEFAULTS (For tables not in DB)
// ============================================

export const DEFAULT_EMPLOYES: Employe[] = [
  { id: 'emp-1', nom: 'Mustapha Loucif', fonction: 'Maçon Qualifié', service: 'Production Gros Œuvre', telephone: '0555 12 34 56', chantierId: 'cha-100log', chantierNom: '100 Logements LPP' },
  { id: 'emp-2', nom: 'Yacine Mezouar', fonction: 'Chef d\'Équipe Électricien', service: 'Second Œuvre', telephone: '0661 98 76 54', chantierId: 'cha-100log', chantierNom: '100 Logements LPP' },
  { id: 'emp-3', nom: 'Mourad Khelifi', fonction: 'Ferrailleur', service: 'Production Gros Œuvre', telephone: '0770 44 55 66', chantierId: 'cha-aeroport', chantierNom: 'Extension Aérogare Oran' },
  { id: 'emp-4', nom: 'Salim Tebboune', fonction: 'Peintre Applicateur', service: 'Finition', telephone: '0550 33 22 11', chantierId: 'cha-aeroport', chantierNom: 'Extension Aérogare Oran' },
  { id: 'emp-5', nom: 'Sid Ahmed Ziani', fonction: 'Magasinier Assistant', service: 'Logistique', telephone: '0658 99 88 77', chantierId: 'cha-viaduc', chantierNom: 'Viaduc Transrhumel Constantine' }
];

export const DEFAULT_CHANTIERS: Chantier[] = [
  { id: 'cha-100log', nom: 'Chantier 100 Logements LPP - Alger (Reghaïa)', wilaya: 'Alger (16)', chefNom: 'Omar Chef', actif: true },
  { id: 'cha-aeroport', nom: 'Chantier Extension Aérogare Ouest - Oran', wilaya: 'Oran (31)', chefNom: 'Mourad Ziri', actif: true },
  { id: 'cha-viaduc', nom: 'Chantier Viaduc Transrhumel - Constantine', wilaya: 'Constantine (25)', chefNom: 'Sofiane Bati', actif: true },
  { id: 'cha-stade', nom: 'Chantier Nouveau Stade - Tizi Ouzou', wilaya: 'Tizi Ouzou (15)', chefNom: 'Lounes Khelil', actif: false }
];

// ============================================
// MAPPING UTILITIES FOR USERS TABLE (snake_case)
// ============================================

function mapUserFromDb(data: any): UserProfile {
  if (!data) return {} as UserProfile;
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    magasinId: data.magasin_id,
    magasinsIds: data.magasins_ids || [],
    email: data.email,
    telephone: data.telephone,
    password: data.password_hash || '',
    actif: data.actif,
    avatar: data.avatar,
    createdAt: data.created_at || new Date().toISOString(),
    createdBy: data.created_by
  };
}

function mapUserToDb(user: Partial<UserProfile>): any {
  const dbUser: any = {};
  if (user.id !== undefined) dbUser.id = user.id;
  if (user.name !== undefined) dbUser.name = user.name;
  if (user.role !== undefined) dbUser.role = user.role;
  if (user.magasinId !== undefined) dbUser.magasin_id = user.magasinId;
  if (user.magasinsIds !== undefined) dbUser.magasins_ids = user.magasinsIds;
  if (user.email !== undefined) dbUser.email = user.email;
  if (user.telephone !== undefined) dbUser.telephone = user.telephone;
  if (user.password !== undefined) dbUser.password_hash = user.password;
  if (user.actif !== undefined) dbUser.actif = user.actif;
  if (user.avatar !== undefined) dbUser.avatar = user.avatar;
  if (user.createdAt !== undefined) dbUser.created_at = user.createdAt;
  if (user.createdBy !== undefined) dbUser.created_by = user.createdBy;
  return dbUser;
}

// ============================================
// CONVERSION UTILITIES FOR SNAKE_CASE
// ============================================

function camelToSnake(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => camelToSnake(item));
  
  return Object.keys(obj).reduce((acc: any, key: string) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const val = obj[key];
    acc[snakeKey] = val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) 
      ? camelToSnake(val) 
      : val;
    return acc;
  }, {});
}

export class SupabaseDatabase {
  private static currentUser: UserProfile | null = null;

  // Static Cache for Synchronous KPIs calculation
  private static magasinsCache: Magasin[] = [];
  private static articlesCache: Article[] = [];
  private static stocksCache: StockItem[] = [];
  private static fournisseursCache: Fournisseur[] = [];
  private static commandesCache: BonCommande[] = [];

  // ============================================
  // AUTHENTICATION
  // ============================================

  static async authenticateUser(email: string, password: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password_hash', password)
        .maybeSingle();

      if (error || !data) return false;

      this.currentUser = mapUserFromDb(data);
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      return true;
    } catch (err) {
      console.error('Auth error:', err);
      return false;
    }
  }

  static getCurrentUser(): UserProfile {
    if (this.currentUser) return this.currentUser;

    const stored = localStorage.getItem('currentUser');
    if (stored) {
      this.currentUser = JSON.parse(stored) as UserProfile;
      return this.currentUser;
    }

    // Default demo user for testing
    this.currentUser = {
      id: '1',
      name: 'Demo User',
      email: 'demo@test.com',
      role: 'direction',
      magasinId: undefined,
      magasinsIds: [],
      telephone: '',
      password: '',
      actif: true,
      avatar: undefined,
      createdAt: new Date().toISOString(),
      createdBy: undefined
    };
    return this.currentUser;
  }

  // ============================================
  // USERS
  // ============================================

  static async getUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('actif', true);

      if (error) throw error;
      return (data || []).map(mapUserFromDb);
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  }

  static async saveUser(user: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const dbUser = mapUserToDb(user);
      if (user.id) {
        const { data, error } = await supabase
          .from('users')
          .update(dbUser)
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        await this.logAction('users', 'update', user.id, null, user);
        return mapUserFromDb(data);
      } else {
        const { data, error } = await supabase
          .from('users')
          .insert([dbUser])
          .select()
          .single();

        if (error) throw error;
        await this.logAction('users', 'create', data.id, null, user);
        return mapUserFromDb(data);
      }
    } catch (err) {
      console.error('Error saving user:', err);
      return null;
    }
  }

  static async toggleUserActif(userId: string, actif: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ actif })
        .eq('id', userId);

      if (error) throw error;
      await this.logAction('users', 'toggle', userId, null, { actif });
      return true;
    } catch (err) {
      console.error('Error toggling user:', err);
      return false;
    }
  }

  // ============================================
  // MAGASINS
  // ============================================

  static async getMagasins(): Promise<Magasin[]> {
    try {
      const { data, error } = await supabase
        .from('magasins')
        .select('*');

      if (error) throw error;
      const list = data || [];
      this.magasinsCache = list;
      return list;
    } catch (err) {
      console.error('Error fetching magasins:', err);
      return [];
    }
  }

  static async saveMagasin(magasin: Partial<Magasin>): Promise<Magasin | null> {
    try {
      if (magasin.id) {
        const { data, error } = await supabase
          .from('magasins')
          .update(camelToSnake(magasin))
          .eq('id', magasin.id)
          .select()
          .single();

        if (error) throw error;
        await this.logAction('magasins', 'update', magasin.id, null, magasin);
        return data;
      } else {
        const newMagasin = {
          ...magasin,
          actif: true
        };
        const { data, error } = await supabase
          .from('magasins')
          .insert([camelToSnake(newMagasin)])
          .select()
          .single();

        if (error) throw error;
        await this.logAction('magasins', 'create', data.id, null, data);
        return data;
      }
    } catch (err) {
      console.error('Error saving magasin:', err);
      return null;
    }
  }

  // ============================================
  // ARTICLES
  // ============================================

  static async getArticles(): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*');

      if (error) throw error;
      const list = data || [];
      this.articlesCache = list;
      return list;
    } catch (err) {
      console.error('Error fetching articles:', err);
      return [];
    }
  }

  static async saveArticle(article: Partial<Article>): Promise<Article | null> {
    try {
      if (article.id) {
        const { data, error } = await supabase
          .from('articles')
          .update(camelToSnake(article))
          .eq('id', article.id)
          .select()
          .single();

        if (error) throw error;
        await this.logAction('articles', 'update', article.id, null, article);
        return data;
      } else {
        // Build object with available fields - exclude fields that don't exist in schema
        const newArticle: Record<string, any> = {
          reference: article.reference,
          designation: article.designation,
          categorie: article.categorie || 'Gros Œuvre'
        };
        
        // Add optional fields if provided
        if (article.unite) newArticle.unite = article.unite;
        if (article.photoUrl) newArticle.photo_url = article.photoUrl;
        
        // Note: excluding prix_moyen, stock_minimum, qr_code, created_at as they may not exist in Supabase schema

        const { data, error } = await supabase
          .from('articles')
          .insert([newArticle])
          .select()
          .single();

        if (error) throw error;
        await this.logAction('articles', 'create', data.id, null, data);
        return data;
      }
    } catch (err) {
      console.error('Error saving article:', err);
      return null;
    }
  }

  // ============================================
  // FOURNISSEURS
  // ============================================

  static async getFournisseurs(): Promise<Fournisseur[]> {
    try {
      const { data, error } = await supabase
        .from('fournisseurs')
        .select('*');

      if (error) throw error;
      const list = data || [];
      this.fournisseursCache = list;
      return list;
    } catch (err) {
      console.error('Error fetching fournisseurs:', err);
      return [];
    }
  }

  static async saveFournisseur(fournisseur: Partial<Fournisseur>): Promise<Fournisseur | null> {
    try {
      if (fournisseur.id) {
        const { data, error } = await supabase
          .from('fournisseurs')
          .update(camelToSnake(fournisseur))
          .eq('id', fournisseur.id)
          .select()
          .single();

        if (error) throw error;
        await this.logAction('fournisseurs', 'update', fournisseur.id, null, fournisseur);
        return data;
      } else {
        const newFournisseur = {
          ...fournisseur,
          solde: 0
        };
        const { data, error } = await supabase
          .from('fournisseurs')
          .insert([camelToSnake(newFournisseur)])
          .select()
          .single();

        if (error) throw error;
        await this.logAction('fournisseurs', 'create', data.id, null, data);
        return data;
      }
    } catch (err) {
      console.error('Error saving fournisseur:', err);
      return null;
    }
  }

  // ============================================
  // STOCKS
  // ============================================

  static async updateStock(magasinId: string, articleId: string, quantite: number): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('stocks')
        .select('id')
        .eq('magasinId', magasinId)
        .eq('articleId', articleId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('stocks')
          .update({ quantite })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('stocks')
          .insert([camelToSnake({ magasinId, articleId, quantite })]);
      }

      return true;
    } catch (err) {
      console.error('Error updating stock:', err);
      return false;
    }
  }

  // ============================================
  // BONS DE COMMANDE
  // ============================================

  static async saveCommande(commande: Partial<BonCommande>): Promise<BonCommande | null> {
    try {
      const currentUser = this.getCurrentUser();
      if (!commande.fournisseurId) return null;

      const lines = commande.lignes || [];
      let totalHT = 0;
      lines.forEach(line => {
        totalHT += (line.prixUnitaire || 0) * (line.quantite || 0);
      });

      const tva = totalHT * 0.19;
      const totalTTC = totalHT + tva;

      if (commande.id) {
        const { data, error } = await supabase
          .from('commandes')
          .update(camelToSnake(commande))
          .eq('id', commande.id)
          .select()
          .single();

        if (error) throw error;
        await this.logAction('commandes', 'update', commande.id, null, commande);
        return data;
      } else {
        const { count } = await supabase
          .from('commandes')
          .select('*', { count: 'exact', head: true });
        const code = `BC-2026-${String((count || 0) + 1).padStart(3, '0')}`;

        const { data: fou } = await supabase
          .from('fournisseurs')
          .select('nomSociete')
          .eq('id', commande.fournisseurId)
          .maybeSingle();

        const newCommande = {
          ...commande,
          code,
          fournisseurNom: fou?.nomSociete || 'Fournisseur inconnu',
          statut: 'Brouillon',
          dateCommande: new Date().toISOString(),
          createdById: currentUser.id,
          createdByNom: currentUser.name,
          totalHT,
          tva,
          totalTTC,
          lignes: lines.map(l => ({ ...l, quantiteRecue: 0 }))
        };

        const { data, error } = await supabase
          .from('commandes')
          .insert([camelToSnake(newCommande)])
          .select()
          .single();

        if (error) throw error;
        await this.logAction('commandes', 'create', data.id, null, data);
        return data;
      }
    } catch (err) {
      console.error('Error saving commande:', err);
      return null;
    }
  }

  static async getCommandes(): Promise<BonCommande[]> {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select('*')
        .order('dateCommande', { ascending: false });

      if (error) throw error;
      const list = data || [];
      this.commandesCache = list;
      return list;
    } catch (err) {
      console.error('Error fetching commandes:', err);
      return [];
    }
  }

  static async transitionCommandeStatut(commandeId: string, newStatus: string): Promise<boolean> {
    try {
      const { data: cmd } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', commandeId)
        .maybeSingle();

      if (!cmd) return false;

      const { error } = await supabase
        .from('commandes')
        .update({ statut: newStatus })
        .eq('id', commandeId);

      if (error) throw error;

      if (newStatus === 'Commandé') {
        await this.createDraftReception(commandeId);
      }

      await this.logAction('commandes', 'statut_change', commandeId, { statut: cmd.statut }, { statut: newStatus });
      return true;
    } catch (err) {
      console.error('Error transitioning statut:', err);
      return false;
    }
  }

  // ============================================
  // RECEPTIONS
  // ============================================

  static async createDraftReception(commandeId: string): Promise<Reception | null> {
    try {
      const currentUser = this.getCurrentUser();
      const { data: commande } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', commandeId)
        .maybeSingle();

      if (!commande) return null;

      const { count } = await supabase
        .from('receptions')
        .select('*', { count: 'exact', head: true });
      const receptionCode = `BR-2026-${String((count || 0) + 1).padStart(3, '0')}`;

      const { data: magasin } = await supabase
        .from('magasins')
        .select('nom')
        .eq('id', commande.magasinDestinationId)
        .maybeSingle();

      const newReception = {
        code: receptionCode,
        commandeId: commandeId,
        commandeCode: commande.code,
        magasinId: commande.magasinDestinationId,
        magasinNom: magasin?.nom || 'Magasin inconnu',
        dateReception: new Date().toISOString(),
        bonLivraisonRef: '',
        factureFournisseurRef: '',
        magasinierId: '',
        magasinierNom: currentUser.name || '',
        statut: 'Brouillon',
        lignes: (commande.lignes || []).map((line: any) => ({
          articleId: line.articleId,
          designation: line.designation,
          quantiteDemandee: line.quantite,
          quantiteRecue: 0
        }))
      };

      const { data: reception, error } = await supabase
        .from('receptions')
        .insert([camelToSnake(newReception)])
        .select()
        .single();

      if (error) throw error;
      return reception;
    } catch (err) {
      console.error('Error creating draft reception:', err);
      return null;
    }
  }

  static async getReceptions(): Promise<Reception[]> {
    try {
      const { data, error } = await supabase
        .from('receptions')
        .select('*')
        .order('dateReception', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching receptions:', err);
      return [];
    }
  }

  static async validateReception(receptionId: string, options?: { tauxTVA?: number; timbre?: number; fraisPort?: number; factureCode?: string }): Promise<Facture | null> {
    try {
      const currentUser = this.getCurrentUser();

      const { data: reception } = await supabase
        .from('receptions')
        .select('*')
        .eq('id', receptionId)
        .maybeSingle();

      if (!reception) return null;

      const { data: commande } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', reception.commandeId)
        .maybeSingle();

      if (!commande) return null;

      const lignes = reception.lignes || [];
      let receptionHT = 0;
      const articles = await this.getArticles();

      lignes.forEach((line: any) => {
        const art = articles.find(a => a.id === line.articleId);
        if (art) {
          receptionHT += (art.prixMoyen || 0) * (line.quantiteRecue || 0);
        }
      });

      const tauxTVA = options?.tauxTVA || 0.19;
      const montantTVA = receptionHT * tauxTVA;
      const timbre = options?.timbre ?? 500;
      const fraisPort = options?.fraisPort || 0;
      const montantTTC = receptionHT + montantTVA + timbre + fraisPort;

      const { count: facCount } = await supabase
        .from('factures')
        .select('*', { count: 'exact', head: true });

      const factureCode = options?.factureCode || `FAC-2026-${String((facCount || 0) + 1).padStart(3, '0')}`;

      const factureData = {
        code: factureCode,
        fournisseurId: commande?.fournisseurId || '',
        fournisseurNom: commande?.fournisseurNom || 'Fournisseur inconnu',
        commandeId: commande?.id,
        commandeCode: commande?.code,
        receptionId: receptionId,
        receptionCode: reception.code,
        dateFacture: new Date().toISOString(),
        montantHT: receptionHT,
        tauxTVA,
        montantTVA,
        timbreAlgerien: timbre,
        fraisPort,
        montantTTC,
        soldeRestant: montantTTC,
        statut: 'Non payée',
        receptionValideId: receptionId
      };

      await supabase
        .from('factures')
        .insert([camelToSnake(factureData)]);

      for (const line of lignes) {
        const qtyReceived = line.quantiteRecue || 0;
        if (qtyReceived > 0) {
          const { data: existingStock } = await supabase
            .from('stocks')
            .select('*')
            .eq('magasinId', reception.magasinId)
            .eq('articleId', line.articleId)
            .maybeSingle();

          const currentQty = existingStock ? (existingStock.quantite || 0) : 0;
          await this.updateStock(reception.magasinId, line.articleId, currentQty + qtyReceived);

          const art = articles.find(a => a.id === line.articleId);

          const mouvementData = {
            magasinId: reception.magasinId,
            magasinNom: reception.magasinNom,
            articleId: line.articleId,
            articleDesignation: art ? art.designation : 'Article inconnu',
            type: 'ENTREE_ACHAT',
            quantite: qtyReceived,
            referenceDoc: reception.code,
            utilisateurNom: currentUser.name,
            dateMouvement: new Date().toISOString(),
            note: 'Auto-generated from reception validation'
          };

          await supabase
            .from('mouvements_stock')
            .insert([camelToSnake(mouvementData)]);
        }
      }

      await supabase
        .from('receptions')
        .update({ statut: 'Validée' })
        .eq('id', receptionId);

      await this.logAction('receptions', 'validate', receptionId, null, { statut: 'Validée' });

      const { data: facture } = await supabase
        .from('factures')
        .select('*')
        .eq('code', factureCode)
        .maybeSingle();

      return facture || null;
    } catch (err) {
      console.error('Error validating reception:', err);
      return null;
    }
  }

  // ============================================
  // AFFECTATIONS
  // ============================================

  static async getAffectations(): Promise<Affectation[]> {
    try {
      const { data, error } = await supabase
        .from('affectations')
        .select('*')
        .order('dateAffectation', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching affectations:', err);
      return [];
    }
  }

  static async createAffectation(affectation: Partial<Affectation>): Promise<Affectation | null> {
    try {
      const currentUser = this.getCurrentUser();
      const { magasinId, articleId, quantite, employeId, chantierId } = affectation;

      if (!magasinId || !articleId || !quantite || !employeId || !chantierId) {
        throw new Error('Missing required fields for affectation');
      }

      const { data: stock } = await supabase
        .from('stocks')
        .select('quantite')
        .eq('magasinId', magasinId)
        .eq('articleId', articleId)
        .maybeSingle();

      if (!stock || (stock.quantite || 0) < quantite) {
        throw new Error('Insufficient stock');
      }

      const { data: emp } = await supabase
        .from('affectations')
        .select('nom')
        .eq('id', employeId)
        .maybeSingle();

      const { data: cha } = await supabase
        .from('transferts')
        .select('nom')
        .eq('id', chantierId)
        .maybeSingle();

      const { data: art } = await supabase
        .from('articles')
        .select('designation')
        .eq('id', articleId)
        .maybeSingle();

      const { data: mag } = await supabase
        .from('magasins')
        .select('nom')
        .eq('id', magasinId)
        .maybeSingle();

      const { count } = await supabase
        .from('affectations')
        .select('*', { count: 'exact', head: true });
      const code = `BS-2026-${String((count || 0) + 1).padStart(3, '0')}`;

      const fullAffectation = {
        ...affectation,
        code,
        employeNom: emp?.nom || 'Employé inconnu',
        chantierNom: cha?.nom || 'Chantier inconnu',
        magasinNom: mag?.nom || 'Magasin inconnu',
        articleDesignation: art?.designation || 'Article inconnu',
        magasinierNom: currentUser.name
      };

      const newQty = stock.quantite - quantite;
      await this.updateStock(magasinId, articleId, newQty);

      const mouvementAffectation = {
        magasinId,
        magasinNom: mag?.nom || 'Magasin inconnu',
        articleId,
        articleDesignation: art?.designation || 'Article inconnu',
        type: 'SORTIE_AFFECTATION',
        quantite: -quantite,
        referenceDoc: code,
        utilisateurNom: currentUser.name,
        dateMouvement: new Date().toISOString(),
        note: `Affectation à ${emp?.nom || 'Employé'} (${cha?.nom || 'Chantier'})`
      };

      await supabase
        .from('mouvements_stock')
        .insert([camelToSnake(mouvementAffectation)]);

      const { data, error } = await supabase
        .from('affectations')
        .insert([camelToSnake(fullAffectation)])
        .select()
        .single();

      if (error) throw error;
      await this.logAction('affectations', 'create', data.id, null, data);
      return data;
    } catch (err) {
      console.error('Error creating affectation:', err);
      return null;
    }
  }

  static async returnAffectation(affectationId: string, quantite: number): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();

      const { data: aff } = await supabase
        .from('affectations')
        .select('*')
        .eq('id', affectationId)
        .maybeSingle();

      if (!aff) return false;

      const { data: stock } = await supabase
        .from('stocks')
        .select('quantite')
        .eq('magasinId', aff.magasinId)
        .eq('articleId', aff.articleId)
        .maybeSingle();

      const currentQty = stock ? (stock.quantite || 0) : 0;
      await this.updateStock(aff.magasinId, aff.articleId, currentQty + quantite);

      const mouvementRetour = {
        magasinId: aff.magasinId,
        magasinNom: aff.magasinNom,
        articleId: aff.articleId,
        articleDesignation: aff.articleDesignation,
        type: 'CORRECTION_INVENTAIRE',
        quantite: quantite,
        referenceDoc: aff.code,
        utilisateurNom: currentUser.name,
        dateMouvement: new Date().toISOString(),
        note: `Retour de matériel par ${aff.employeNom}`
      };

      await supabase
        .from('mouvements_stock')
        .insert([camelToSnake(mouvementRetour)]);

      await this.logAction('affectations', 'return', affectationId, null, { statut: 'Retourné', dateRetour: new Date().toISOString() });
      return true;
    } catch (err) {
      console.error('Error returning affectation:', err);
      return false;
    }
  }

  // ============================================
  // TRANSFERTS
  // ============================================

  static async getTransferts(): Promise<Transfert[]> {
    try {
      const { data, error } = await supabase
        .from('transferts')
        .select('*');

      // Table may not exist yet or columns missing - return empty array
      if (error) {
        if (error.code === '42703' || error.code === '42P01' || error.message.includes('not found')) {
          console.warn('⚠️ Transferts table not found or schema incomplete. Run the SQL migration.');
        } else {
          console.warn('⚠️ Error fetching transferts:', error.message);
        }
        return [];
      }

      // Sort in memory since order might fail if column doesn't exist
      if (data) {
        return data.sort((a: any, b: any) => {
          const dateA = a.date_demande ? new Date(a.date_demande).getTime() : 0;
          const dateB = b.date_demande ? new Date(b.date_demande).getTime() : 0;
          return dateB - dateA; // descending
        });
      }
      return [];
    } catch (err) {
      console.error('Error fetching transferts:', err);
      return [];
    }
  }

  static async createTransfertRequest(transfert: Partial<Transfert>): Promise<Transfert | null> {
    try {
      const currentUser = this.getCurrentUser();

      const { data: dep } = await supabase
        .from('magasins')
        .select('nom')
        .eq('id', transfert.magasinDepartId)
        .maybeSingle();

      const { data: dest } = await supabase
        .from('magasins')
        .select('nom')
        .eq('id', transfert.magasinDestId)
        .maybeSingle();

      let count = 0;
      try {
        const result = await supabase
          .from('transferts')
          .select('*', { count: 'exact', head: true });
        count = result.count || 0;
      } catch (err) {
        // Table doesn't exist yet
        count = 0;
      }

      const code = `TR-2026-${String((count || 0) + 1).padStart(3, '0')}`;

      const fullTransfert = {
        ...transfert,
        code,
        magasinDepartNom: dep?.nom || 'Magasin Départ',
        magasinDestNom: dest?.nom || 'Magasin Destination',
        demandeurNom: currentUser.name
      };

      const { data, error } = await supabase
        .from('transferts')
        .insert([camelToSnake(fullTransfert)])
        .select()
        .single();

      if (error && error.code === '42703') {
        console.warn('⚠️ Transferts table not yet created. Run the SQL migration first.');
        return null;
      }

      if (error) throw error;
      await this.logAction('transferts', 'create', data.id, null, data);
      return data;
    } catch (err) {
      console.error('Error creating transfert request:', err);
      return null;
    }
  }

  static async expierTransfert(transfertId: string): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();

      const { data: tr } = await supabase
        .from('transferts')
        .select('*')
        .eq('id', transfertId)
        .maybeSingle();

      if (!tr) throw new Error('Transfert not found');

      const lines = tr.lignes || [];
      for (const line of lines) {
        const { data: stock } = await supabase
          .from('stocks')
          .select('quantite')
          .eq('magasinId', tr.magasinDepartId)
          .eq('articleId', line.articleId)
          .maybeSingle();

        const currentQty = stock ? (stock.quantite || 0) : 0;
        await this.updateStock(tr.magasinDepartId, line.articleId, currentQty - line.quantite);

        const mouvementTransfert = {
          magasinId: tr.magasinDepartId,
          magasinNom: tr.magasinDepartNom,
          articleId: line.articleId,
          articleDesignation: line.designation,
          type: 'SORTIE_TRANSFERT',
          quantite: -line.quantite,
          referenceDoc: tr.code,
          utilisateurNom: currentUser.name,
          dateMouvement: new Date().toISOString(),
          note: `Expédition transfert vers ${tr.magasinDestNom}`
        };

        await supabase
          .from('mouvements_stock')
          .insert([camelToSnake(mouvementTransfert)]);
      }

      const { error } = await supabase
        .from('transferts')
        .update({
          statut: 'Expédié',
          dateExpedition: new Date().toISOString(),
          valideurNom: currentUser.name
        })
        .eq('id', transfertId);

      if (error) throw error;
      await this.logAction('transferts', 'expedier', transfertId, null, { statut: 'Expédié' });
      return true;
    } catch (err) {
      console.error('Error expediting transfert:', err);
      return false;
    }
  }

  static async recevoirTransfert(transfertId: string): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();

      const { data: tr } = await supabase
        .from('transferts')
        .select('*')
        .eq('id', transfertId)
        .maybeSingle();

      if (!tr) throw new Error('Transfert non trouvé');

      const lines = tr.lignes || [];
      for (const line of lines) {
        const { data: stock } = await supabase
          .from('stocks')
          .select('quantite')
          .eq('magasinId', tr.magasinDestId)
          .eq('articleId', line.articleId)
          .maybeSingle();

        const currentQty = stock ? (stock.quantite || 0) : 0;
        await this.updateStock(tr.magasinDestId, line.articleId, currentQty + line.quantite);

        const mouvementEntree = {
          magasinId: tr.magasinDestId,
          magasinNom: tr.magasinDestNom,
          articleId: line.articleId,
          articleDesignation: line.designation,
          type: 'ENTREE_TRANSFERT',
          quantite: line.quantite,
          referenceDoc: tr.code,
          utilisateurNom: currentUser.name,
          dateMouvement: new Date().toISOString(),
          note: `Réception transfert depuis ${tr.magasinDepartNom}`
        };

        await supabase
          .from('mouvements_stock')
          .insert([camelToSnake(mouvementEntree)]);
      }

      const { error } = await supabase
        .from('transferts')
        .update({
          statut: 'Reçu',
          dateReception: new Date().toISOString(),
          receveurNom: currentUser.name
        })
        .eq('id', transfertId);

      if (error) throw error;
      await this.logAction('transferts', 'recevoir', transfertId, null, { statut: 'Reçu' });
      return true;
    } catch (err) {
      console.error('Error receiving transfert:', err);
      return false;
    }
  }

  // ============================================
  // PAIEMENTS
  // ============================================

  static async getPaiements(): Promise<Paiement[]> {
    try {
      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .order('datePaiement', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching paiements:', err);
      return [];
    }
  }

  static async recordPayment(paiement: Partial<Paiement>): Promise<Paiement | null> {
    try {
      const amount = paiement.montant || 0;

      if (paiement.fournisseurId) {
        const { data: supplier } = await supabase
          .from('fournisseurs')
          .select('solde')
          .eq('id', paiement.fournisseurId)
          .maybeSingle();

        if (supplier) {
          const newSolde = Math.max(0, (supplier.solde || 0) - amount);
          await supabase
            .from('fournisseurs')
            .update({ solde: newSolde })
            .eq('id', paiement.fournisseurId);
        }
      }

      let invoiceRef = paiement.factureRef;
      if (paiement.factureId) {
        const { data: facture } = await supabase
          .from('factures')
          .select('*')
          .eq('id', paiement.factureId)
          .maybeSingle();

        if (facture) {
          invoiceRef = facture.code;
          const newSoldeRestant = Math.max(0, (facture.solde_restant || 0) - amount);
          const newInvoiceStatus = newSoldeRestant === 0 ? 'Payée' : 'Partiellement payée';

          await supabase
            .from('factures')
            .update({
              solde_restant: newSoldeRestant,
              statut: newInvoiceStatus
            })
            .eq('id', paiement.factureId);
        }
      }

      const dbPayment = {
        fournisseur_id: paiement.fournisseurId,
        montant: paiement.montant,
        mode: paiement.mode,
        reference_transaction: paiement.referenceTransaction,
        note: paiement.note,
        facture_id: paiement.factureId || null,
        date_paiement: paiement.datePaiement,
        code: paiement.code,
        comptable_nom: paiement.comptableNom,
        lettre: paiement.lettre || false,
        facture_ref: invoiceRef
      };

      const { data, error } = await supabase
        .from('paiements')
        .insert([dbPayment])
        .select()
        .single();

      if (error) throw error;
      await this.logAction('paiements', 'create', data.id, null, data);
      return data;
    } catch (err) {
      console.error('Error recording payment:', err);
      return null;
    }
  }

  static async lettrerPaiement(paiementId: string, factureId: string): Promise<boolean> {
    try {
      const { data: payment } = await supabase
        .from('paiements')
        .select('*')
        .eq('id', paiementId)
        .maybeSingle();

      if (!payment || payment.lettre) return false;

      const { data: facture } = await supabase
        .from('factures')
        .select('*')
        .eq('id', factureId)
        .maybeSingle();

      if (!facture) return false;

      const amount = payment.montant || 0;
      const newSoldeRestant = Math.max(0, (facture.solde_restant || 0) - amount);
      const newInvoiceStatus = newSoldeRestant === 0 ? 'Payée' : 'Partiellement payée';

      await supabase
        .from('paiements')
        .update({
          facture_id: factureId,
          facture_ref: facture.code,
          lettre: true
        })
        .eq('id', paiementId);

      await supabase
        .from('factures')
        .update({
          solde_restant: newSoldeRestant,
          statut: newInvoiceStatus
        })
        .eq('id', factureId);

      await this.logAction('paiements', 'lettrer', paiementId, null, { factureId });
      return true;
    } catch (err) {
      console.error('Error lettering payment:', err);
      return false;
    }
  }

  static async delettrerPaiement(paiementId: string): Promise<boolean> {
    try {
      const { data: payment } = await supabase
        .from('paiements')
        .select('*')
        .eq('id', paiementId)
        .maybeSingle();

      if (!payment || !payment.facture_id) return false;

      const { data: facture } = await supabase
        .from('factures')
        .select('*')
        .eq('id', payment.facture_id)
        .maybeSingle();

      if (facture) {
        const amount = payment.montant || 0;
        const newSoldeRestant = (facture.solde_restant || 0) + amount;
        const newInvoiceStatus = newSoldeRestant >= facture.montant_ttc ? 'Non payée' : 'Partiellement payée';

        await supabase
          .from('factures')
          .update({
            solde_restant: newSoldeRestant,
            statut: newInvoiceStatus
          })
          .eq('id', payment.facture_id);
      }

      await supabase
        .from('paiements')
        .update({
          facture_id: null,
          facture_ref: null,
          lettre: false
        })
        .eq('id', paiementId);

      await this.logAction('paiements', 'delettrer', paiementId, null, { factureId: null });
      return true;
    } catch (err) {
      console.error('Error unlettering payment:', err);
      return false;
    }
  }

  // ============================================
  // FACTURES
  // ============================================

  static async getFactures(): Promise<Facture[]> {
    try {
      const { data, error } = await supabase
        .from('factures')
        .select('*')
        .order('dateFacture', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching factures:', err);
      return [];
    }
  }

  static async saveFacture(facture: Partial<Facture>): Promise<Facture | null> {
    try {
      if (facture.id) {
        const { data, error } = await supabase
          .from('factures')
          .update(camelToSnake(facture))
          .eq('id', facture.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('factures')
          .insert([camelToSnake(facture)])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (err) {
      console.error('Error saving facture:', err);
      return null;
    }
  }

  // ============================================
  // AUDIT & LOGGING
  // ============================================

  static async logAction(
    table: string,
    action: string,
    recordId: string,
    beforeValue: any,
    afterValue: any
  ): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      const auditData = {
        userId: currentUser.id,
        userNom: currentUser.name,
        userRole: currentUser.role,
        action,
        table,
        recordId: recordId,
        ancienneValeur: beforeValue ? JSON.stringify(beforeValue) : null,
        nouvelleValeur: afterValue ? JSON.stringify(afterValue) : null,
        dateAction: new Date().toISOString()
      };

      await supabase
        .from('audit_logs')
        .insert([camelToSnake(auditData)]);
    } catch (err) {
      console.error('Error logging action:', err);
    }
  }

  static async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('dateAction', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      return [];
    }
  }

  // ============================================
  // STOCKS & MOUVEMENTS
  // ============================================

  static async getStocks(): Promise<StockItem[]> {
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('*');

      if (error) throw error;
      const list = data || [];
      this.stocksCache = list;
      return list;
    } catch (err) {
      console.error('Error fetching stocks:', err);
      return [];
    }
  }

  static async getMouvementsStock(): Promise<MouvementStock[]> {
    try {
      const { data, error } = await supabase
        .from('mouvements_stock')
        .select('*')
        .order('dateMouvement', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching mouvements stock:', err);
      return [];
    }
  }

  // ============================================
  // USERS - Additional Methods
  // ============================================

  static logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  static async deleteUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await this.logAction('users', 'delete', userId, null, { deleted: true });
      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      return false;
    }
  }

  // ============================================
  // RECEPTIONS - Update Method
  // ============================================

  static async updateDraftReception(receptionId: string, bonLivraisonRef: string, factureFournisseurRef: string, lignes: any[]): Promise<Reception | null> {
    try {
      const updates = {
        bonLivraisonRef,
        factureFournisseurRef,
        lignes
      };

      const { data, error } = await supabase
        .from('receptions')
        .update(camelToSnake(updates))
        .eq('id', receptionId)
        .select()
        .single();

      if (error) throw error;
      await this.logAction('receptions', 'update', receptionId, null, updates);
      return data;
    } catch (err) {
      console.error('Error updating reception:', err);
      return null;
    }
  }

  static async receiveGoods(receptionId: string, lineUpdates: any): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();

      const { data: reception } = await supabase
        .from('receptions')
        .select('*')
        .eq('id', receptionId)
        .maybeSingle();

      if (!reception) return false;

      const updatedLignes = (reception.lignes || []).map((line: any) => {
        const update = lineUpdates[line.articleId];
        return update ? { ...line, ...update } : line;
      });

      for (const line of updatedLignes) {
        const qtyReceived = line.quantiteRecue || 0;
        if (qtyReceived > 0) {
          const { data: existingStock } = await supabase
            .from('stocks')
            .select('*')
            .eq('magasinId', reception.magasinId)
            .eq('articleId', line.articleId)
            .maybeSingle();

          const currentQty = existingStock ? (existingStock.quantite || 0) : 0;
          await this.updateStock(reception.magasinId, line.articleId, currentQty + qtyReceived);

          const mouvementData = {
            magasinId: reception.magasinId,
            magasinNom: reception.magasinNom,
            articleId: line.articleId,
            articleDesignation: line.designation,
            type: 'ENTREE_ACHAT',
            quantite: qtyReceived,
            referenceDoc: reception.code,
            utilisateurNom: currentUser.name,
            dateMouvement: new Date().toISOString(),
            note: 'Reception of goods'
          };

          await supabase
            .from('mouvements_stock')
            .insert([camelToSnake(mouvementData)]);
        }
      }

      await this.updateDraftReception(receptionId, '', '', updatedLignes);
      return true;
    } catch (err) {
      console.error('Error receiving goods:', err);
      return false;
    }
  }

  // ============================================
  // TRANSFERTS - Fix Method Name Alias
  // ============================================

  static async expedierTransfert(transfertId: string): Promise<boolean> {
    return this.expierTransfert(transfertId);
  }

  // ============================================
  // PLACEHOLDER METHODS
  // ============================================

  static getEmployes(): Promise<Employe[]> {
    return Promise.resolve(DEFAULT_EMPLOYES);
  }

  static getChantiers(): Promise<Chantier[]> {
    return Promise.resolve(DEFAULT_CHANTIERS);
  }

  static getDashboardKPIs(authorizedStoreIds?: string[]): any {
    let magasins = this.magasinsCache.filter(m => m.actif);
    if (authorizedStoreIds) {
      magasins = magasins.filter(m => authorizedStoreIds.includes(m.id));
    }
    const articles = this.articlesCache;
    let stocks = this.stocksCache;
    if (authorizedStoreIds) {
      stocks = stocks.filter(s => authorizedStoreIds.includes(s.magasinId));
    }
    let commandes = this.commandesCache;
    if (authorizedStoreIds) {
      commandes = commandes.filter(cmd => authorizedStoreIds.includes(cmd.magasinDestinationId));
    }
    const fournisseurs = this.fournisseursCache;

    let valTotalStock = 0;
    stocks.forEach(stk => {
      const art = articles.find(a => a.id === stk.articleId);
      if (art) {
        valTotalStock += stk.quantite * (art.prixMoyen || 0);
      }
    });

    let achatsMensuels = 0;
    commandes.forEach(cmd => {
      if (cmd.statut !== 'Brouillon') {
        achatsMensuels += cmd.totalTTC || 0;
      }
    });

    const dettesFournisseurs = fournisseurs.reduce((sum, f) => sum + (f.solde || 0), 0);

    let articlesCritiquesCount = 0;
    stocks.forEach(stk => {
      const art = articles.find(a => a.id === stk.articleId);
      if (art && stk.quantite < (art.stockMinimum || 0)) {
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

  static async resetUserPassword(userId: string, newPassword?: string): Promise<string> {
    const tmpPass = newPassword || Math.random().toString(36).slice(-8);
    const { error } = await supabase
      .from('users')
      .update({ password_hash: tmpPass })
      .eq('id', userId);
    
    if (error) throw error;
    return tmpPass;
  }
}
