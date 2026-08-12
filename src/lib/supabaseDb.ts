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
  TransfertStatus,
  Paiement,
  ModePaiement,
  AuditLog,
  Facture,
  Inventaire,
  InventaireLigne,
  Societe
} from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const resolvedSupabaseKey = supabaseAnonKey;

if (!supabaseUrl || !resolvedSupabaseKey) {
  console.error('Supabase configuration missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, resolvedSupabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Optional server-side service client (requires VITE_SUPABASE_SERVICE_ROLE_KEY set)
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
export const supabaseService: SupabaseClient | null = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const sanitizeId = (id: any): string | null => {
  if (typeof id === 'string' && id.trim() !== '' && id !== '[object Object]') return id;
  if (id && typeof id === 'object' && typeof id.id === 'string' && id.id.trim() !== '' && id.id !== '[object Object]') return id.id;
  return null;
};

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

const DEMO_USERS: UserProfile[] = [
  { id: 'usr-dir', name: 'Karim Benamar', role: 'direction', email: 'directeur@benamar.dz', password: 'dir2026', actif: true, createdAt: new Date().toISOString() },
  { id: 'usr-mag', name: 'Rachid Magasiner', role: 'magasinier', email: 'rachid.alg@benamar.dz', password: 'mag2026', actif: true, createdAt: new Date().toISOString() },
  { id: 'usr-ach', name: 'Kamel Achat', role: 'achat', email: 'kamel.achats@benamar.dz', password: 'ach2026', actif: true, createdAt: new Date().toISOString() },
  { id: 'usr-fin', name: 'Amine Finance', role: 'comptabilite', email: 'amine.compta@benamar.dz', password: 'fin2026', actif: true, createdAt: new Date().toISOString() },
  { id: 'usr-chant', name: 'Omar Chef Chantier', role: 'chef_chantier', email: 'omar.chef@benamar.dz', password: 'chef2026', actif: true, createdAt: new Date().toISOString() }
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

// Les colonnes monétaires de la base déployée sont des ENTIERS
// (factures.montantHT/montantTVA/montantTTC/soldeRestant/timbreAlgerien/fraisPort,
//  fournisseurs.solde, paiements.montant — seul tauxTVA accepte les décimales).
// Toute valeur envoyée doit donc être arrondie au dinar, sinon PostgREST rejette
// la requête avec « invalid input syntax for type integer ».
const roundDA = (v: number): number => Math.round(Number(v) || 0);

// Statuts de transfert : le workflow est Demande → Validé → Reçu (ou Refusé à la validation).
// La base contient encore des lignes aux anciens libellés : 'Demandé' (ancien insert) et
// 'Expédié' (ancienne étape de sortie du dépôt départ, devenue « Validé »). On les ramène
// au vocabulaire courant à la lecture ET dans les garde-fous de transition, sans réécrire les données.
const normalizeTransfertStatut = (statut: any): TransfertStatus => {
  const s = String(statut || 'Demande');
  if (s === 'Demandé') return 'Demande';
  if (s === 'Expédié') return 'Validé';
  return s as TransfertStatus;
};

function camelToSnake(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    converted[snakeKey] = camelToSnake(value);
  }
  return converted;
}

export class SupabaseDatabase {
  private static currentUser: UserProfile | null = null;

  // Static Cache for Synchronous KPIs calculation
  private static magasinsCache: Magasin[] = [];
  private static articlesCache: Article[] = [];
  private static stocksCache: StockItem[] = [];
  private static fournisseursCache: Fournisseur[] = [];
  private static commandesCache: BonCommande[] = [];
  private static inventairesCache: Inventaire[] = [];
  private static isInventairesAvailable: boolean | null = null;

  // ============================================
  // AUTHENTICATION
  // ============================================

  static async authenticateUser(email: string, password: string): Promise<boolean> {
    try {
      const demoUser = DEMO_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (demoUser) {
        this.currentUser = demoUser;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        return true;
      }
      // Try Supabase auth to create a session (so RLS sees an authenticated role)
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          console.warn('Supabase sign-in failed:', signInError.message);
        } else if (signInData && signInData.user) {
          // Fetch user profile from users table if available
          try {
            const { data: profile, error: profileError } = await this.selectFrom('users').eq('email', email).maybeSingle();
            if (!profileError && profile) {
              this.currentUser = mapUserFromDb(profile);
            } else {
              // Fallback to basic user info from session
              this.currentUser = {
                id: signInData.user.id,
                name: signInData.user.user_metadata?.name || signInData.user.email || 'Utilisateur',
                email: signInData.user.email || '',
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
            }
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            return true;
          } catch (err) {
            console.warn('Failed to fetch user profile after sign-in:', err);
            return false;
          }
        }
      } catch (authErr) {
        console.warn('Supabase auth error:', authErr);
      }

      // Legacy fallback: attempt direct users table lookup (not recommended)
      const { data, error } = await this.selectFrom('users').eq('email', email).eq('password_hash', password).maybeSingle();

      if (error) {
        console.warn('Supabase auth lookup failed, falling back to local auth:', error.message);
        return false;
      }

      if (!data) return false;

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

  // Helper to standardize select calls from Supabase client.
  // Use `SupabaseDatabase.selectFrom('table', 'col1, col2')` to ensure consistent usage.
  static selectFrom(table: string, cols?: string, opts?: any) {
    return supabase.from(table).select(cols || '*', opts || undefined);
  }

  static async hasSession(): Promise<boolean> {
    try {
      const { data } = await supabase.auth.getSession();
      return !!(data && data.session && data.session.user);
    } catch (e) {
      return false;
    }
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
      const list = (data || []).map((m: any) => ({
        ...m,
        createdAt: m.createdAt || m.created_at
      }));
      this.magasinsCache = list;
      return list;
    } catch (err) {
      console.error('Error fetching magasins from Supabase BDD:', err);
      return [];
    }
  }

  static async saveMagasin(magasin: Partial<Magasin>): Promise<Magasin | null> {
    try {
      const cleanId = magasin.id ? sanitizeId(magasin.id) : null;
      if (cleanId) {
        const updateFields: Record<string, any> = {};
        if (magasin.code !== undefined) updateFields.code = magasin.code;
        if (magasin.nom !== undefined) updateFields.nom = magasin.nom;
        if (magasin.ville !== undefined) updateFields.ville = magasin.ville;
        if (magasin.wilaya !== undefined) updateFields.wilaya = magasin.wilaya;
        if (magasin.responsable !== undefined) updateFields.responsable = magasin.responsable;
        if (magasin.telephone !== undefined) updateFields.telephone = magasin.telephone;
        if (magasin.actif !== undefined) updateFields.actif = magasin.actif;

        const { data, error } = await supabase
          .from('magasins')
          .update(updateFields)
          .eq('id', cleanId)
          .select();

        if (error) throw error;

        const updated = (data && data.length > 0) ? data[0] : { ...magasin, id: cleanId };
        await this.logAction('magasins', 'update', cleanId, null, updated);

        const idx = this.magasinsCache.findIndex(m => m.id === cleanId);
        if (idx !== -1) {
          this.magasinsCache[idx] = { ...this.magasinsCache[idx], ...updated };
        }
        return updated as Magasin;
      }

      const newMagasin = {
        code: magasin.code || `MAG-${Date.now().toString().slice(-4)}`,
        nom: magasin.nom || 'Nouveau Magasin',
        ville: magasin.ville || '',
        wilaya: magasin.wilaya || '',
        responsable: magasin.responsable || '',
        telephone: magasin.telephone || '',
        actif: magasin.actif ?? true,
        createdAt: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('magasins')
        .insert([newMagasin])
        .select();

      if (error) throw error;
      const created = (data && data.length > 0) ? data[0] : { ...newMagasin, id: `mag-${Date.now()}` };
      await this.logAction('magasins', 'create', created.id, null, created);
      this.magasinsCache.push(created as Magasin);
      return created as Magasin;
    } catch (err: any) {
      console.error('Error saving magasin:', err);
      if (err?.message) alert('Erreur Supabase (saveMagasin): ' + err.message);
      return null;
    }
  }

  static async deleteMagasin(id: string | any): Promise<boolean> {
    try {
      const cleanId = sanitizeId(id);
      if (!cleanId) {
        console.error('Error deleting magasin: Invalid ID provided', id);
        return false;
      }
      
      const { error: updateError } = await supabase
        .from('magasins')
        .update({ actif: false })
        .eq('id', cleanId);

      if (updateError) {
        console.warn('Soft delete failed, attempting delete:', updateError);
        const { error: deleteError } = await supabase
          .from('magasins')
          .delete()
          .eq('id', cleanId);
        if (deleteError) throw deleteError;
      }

      await this.logAction('magasins', 'delete', cleanId, null, null);
      this.magasinsCache = this.magasinsCache.filter(m => m.id !== cleanId);
      return true;
    } catch (err: any) {
      console.error('Error deleting magasin:', err);
      if (err?.message) alert('Erreur Supabase (deleteMagasin): ' + err.message);
      return false;
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
      console.error('Error fetching articles from Supabase BDD:', err);
      return [];
    }
  }

  static async saveArticle(article: Partial<Article>): Promise<Article | null> {
    try {
      const cleanId = article.id ? sanitizeId(article.id) : null;
      if (cleanId) {
        // Update
        const dbArticle: Record<string, any> = {
          reference: article.reference,
          designation: article.designation,
          categorie: article.categorie
        };
        if (article.unite !== undefined) dbArticle.unite = article.unite;
        if (article.photoUrl !== undefined) dbArticle.photoUrl = article.photoUrl;
        if (article.stockMinimum !== undefined) dbArticle.stockMinimum = article.stockMinimum;
        if (article.prixMoyen !== undefined) dbArticle.prixMoyen = article.prixMoyen;

        const { data, error } = await supabase
          .from('articles')
          .update(dbArticle)
          .eq('id', cleanId)
          .select();

        if (error) {
          console.error('Error updating article:', error);
          alert('Erreur Supabase (saveArticle): ' + error.message);
          throw error;
        }

        const updated = (data && data.length > 0) ? data[0] : { ...article, id: cleanId };
        await this.logAction('articles', 'update', cleanId, null, updated);
        const idx = this.articlesCache.findIndex(a => a.id === cleanId);
        if (idx !== -1) {
          this.articlesCache[idx] = { ...this.articlesCache[idx], ...updated };
        }
        return updated as Article;
      } else {
        // Create - do NOT include 'actif' because column does not exist in DB schema
        const newArticle: any = {
          reference: article.reference || `ART-${Date.now().toString().slice(-4)}`,
          designation: article.designation || 'Nouveau Matériau',
          categorie: article.categorie || 'Outillage',
          unite: article.unite || 'U',
          stockMinimum: article.stockMinimum || 0,
          prixMoyen: article.prixMoyen || 0,
          photoUrl: article.photoUrl || null,
          qrCode: article.qrCode || null
        };
        // Remove undefined keys
        Object.keys(newArticle).forEach(key => newArticle[key] === undefined && delete newArticle[key]);

        const { data, error } = await supabase
          .from('articles')
          .insert([newArticle])
          .select();

        if (error) {
          console.error('Error creating article:', error);
          alert('Erreur Supabase (createArticle): ' + error.message);
          throw error;
        }

        const created = (data && data.length > 0) ? data[0] : { ...newArticle, id: `art-${Date.now()}` };
        await this.logAction('articles', 'create', created.id, null, created);
        this.articlesCache.push(created as Article);
        return created as Article;
      }
    } catch (err: any) {
      console.error('Error saving article:', err);
      return null;
    }
  }

  static async deleteArticle(id: string | any): Promise<boolean> {
    try {
      const cleanId = sanitizeId(id);
      if (!cleanId) {
        console.error('Error deleting article: Invalid ID provided', id);
        return false;
      }
      // Hard delete from DB (articles table has no 'actif' column)
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', cleanId);

      if (error) {
        console.error('Error deleting article:', error);
        alert('Erreur Supabase (deleteArticle): ' + error.message);
        throw error;
      }
      await this.logAction('articles', 'delete', cleanId, null, null);
      this.articlesCache = this.articlesCache.filter(a => a.id !== cleanId);
      return true;
    } catch (err) {
      console.error('Error deleting article:', err);
      return false;
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
      console.error('Error fetching fournisseurs from Supabase BDD:', err);
      return [];
    }
  }

  static async saveFournisseur(fournisseur: Partial<Fournisseur>): Promise<Fournisseur | null> {
    try {
      if (fournisseur.id) {
        const { data, error } = await supabase
          .from('fournisseurs')
          .update(fournisseur)
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
          .insert([newFournisseur])
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

  static async deleteFournisseur(id: string | any): Promise<boolean> {
    try {
      const cleanId = sanitizeId(id);
      if (!cleanId) {
        console.error('Error deleting fournisseur: Invalid ID provided', id);
        return false;
      }
      const { error } = await supabase
        .from('fournisseurs')
        .delete()
        .eq('id', cleanId);

      if (error) throw error;
      await this.logAction('fournisseurs', 'delete', cleanId, null, null);
      return true;
    } catch (err) {
      console.error('Error deleting fournisseur:', err);
      return false;
    }
  }

  // ============================================
  // STOCKS
  // ============================================

  static async updateStock(magasinId: string, articleId: string, quantite: number): Promise<boolean> {
    try {
      const currentStocks = await this.getStocks();
      const existing = currentStocks.find(
        (s: any) => (s.magasinId === magasinId || s.magasin_id === magasinId) &&
                    (s.articleId === articleId || s.article_id === articleId)
      );

      if (existing && existing.id) {
        await supabase
          .from('stocks')
          .update({ quantite })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('stocks')
          .insert([{ magasinId, articleId, quantite }]);
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
          .update(commande)
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
          .insert([newCommande])
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
        .select('*');

      if (error) throw error;
      const list = (data || []).map((c: any) => {
        let lines = c.lignes;
        if (typeof lines === 'string') {
          try { lines = JSON.parse(lines); } catch { lines = []; }
        }
        if (!Array.isArray(lines)) lines = [];
        return {
          ...c,
          id: String(c.id),
          code: String(c.code || ''),
          fournisseurId: String(c.fournisseurId || c.fournisseur_id || ''),
          fournisseurNom: String(c.fournisseurNom || c.fournisseur_nom || ''),
          magasinDestinationId: String(c.magasinDestinationId || c.magasin_destination_id || c.magasinId || c.magasin_id || ''),
          statut: c.statut || 'Brouillon',
          dateCommande: c.dateCommande || c.date_commande || c.created_at || new Date().toISOString(),
          lignes: lines,
          totalHT: typeof c.totalHT === 'number' ? c.totalHT : Number(c.total_ht || 0),
          tva: typeof c.tva === 'number' ? c.tva : Number(c.tva || 0),
          totalTTC: typeof c.totalTTC === 'number' ? c.totalTTC : Number(c.total_ttc || 0),
          createdById: String(c.createdById || c.created_by_id || ''),
          createdByNom: String(c.createdByNom || c.created_by_nom || '')
        };
      }).sort((x: any, y: any) => new Date(y.dateCommande).getTime() - new Date(x.dateCommande).getTime());

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
        .insert([newReception])
        .select()
        .single();

      if (error) throw error;
      return reception;
    } catch (err) {
      console.error('Error creating draft reception:', err);
      return null;
    }
  }

  // Réception directe : entrée de marchandise SANS bon de commande / demande d'achat
  // (achat comptoir, dépannage chantier, don, régularisation d'un BL non commandé).
  // Le fournisseur est porté par la réception elle-même, pas par une commande.
  static async createReceptionDirecte(payload: {
    fournisseurId: string;
    fournisseurNom?: string;
    magasinId: string;
    magasinNom?: string;
    bonLivraisonRef: string;
    factureFournisseurRef?: string;
    dateReception?: string;
    lignes: { articleId: string; designation?: string; quantiteRecue: number; prixUnitaire?: number }[];
  }): Promise<Reception | null> {
    try {
      const currentUser = this.getCurrentUser();
      const lignesSaisies = (payload.lignes || []).filter(l => l.articleId && (l.quantiteRecue || 0) > 0);

      if (!payload.fournisseurId || !payload.magasinId) {
        throw new Error('Fournisseur et magasin de destination obligatoires.');
      }
      if (lignesSaisies.length === 0) {
        throw new Error('Ajoutez au moins un article avec une quantité positive.');
      }

      // Même génération de code que receiveGoods : max existant + 1 (évite les collisions après suppression)
      const { data: existingCodes } = await supabase
        .from('receptions')
        .select('code')
        .like('code', 'BR-2026-%');
      let maxNum = 0;
      (existingCodes || []).forEach((r: { code?: string | null }) => {
        const match = (r.code || '').match(/BR-2026-(\d+)/);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
      });
      const code = `BR-2026-${String(maxNum + 1).padStart(3, '0')}`;

      let magasinNom = payload.magasinNom;
      if (!magasinNom) {
        const { data: magasin } = await supabase.from('magasins').select('nom').eq('id', payload.magasinId).maybeSingle();
        magasinNom = magasin?.nom || 'Magasin';
      }

      let fournisseurNom = payload.fournisseurNom;
      if (!fournisseurNom) {
        const { data: four } = await supabase.from('fournisseurs').select('nomSociete').eq('id', payload.fournisseurId).maybeSingle();
        fournisseurNom = four?.nomSociete || 'Fournisseur';
      }

      const articles = await this.getArticles();
      const receptionLignes = lignesSaisies.map(l => {
        const art = articles.find(a => a.id === l.articleId);
        return {
          articleId: l.articleId,
          designation: l.designation || art?.designation || '',
          quantiteDemandee: l.quantiteRecue, // Pas de DA : la quantité demandée est la quantité livrée
          quantiteRecue: l.quantiteRecue,
          prixUnitaire: l.prixUnitaire !== undefined && l.prixUnitaire !== null ? l.prixUnitaire : (art?.prixMoyen || 0)
        };
      });

      const receptionData: Record<string, unknown> = {
        code,
        commandeId: null,
        commandeCode: '',
        fournisseurId: payload.fournisseurId,
        fournisseurNom,
        magasinId: payload.magasinId,
        magasinNom,
        dateReception: payload.dateReception || new Date().toISOString(),
        bonLivraisonRef: payload.bonLivraisonRef || '',
        factureFournisseurRef: payload.factureFournisseurRef || '',
        lignes: receptionLignes,
        magasinierId: currentUser.id,
        magasinierNom: currentUser.name,
        statut: 'Validée'
      };

      const { data: reception, error } = await supabase
        .from('receptions')
        .insert([receptionData])
        .select()
        .single();

      if (error) throw error;

      // Entrée en stock + traçabilité des mouvements
      for (const rl of receptionLignes) {
        const allStocks = await this.getStocks() as (StockItem & { magasin_id?: string; article_id?: string })[];
        const existingStock = allStocks.find(
          s => (s.magasinId === payload.magasinId || s.magasin_id === payload.magasinId) &&
               (s.articleId === rl.articleId || s.article_id === rl.articleId)
        );
        const currentQty = existingStock ? (existingStock.quantite || 0) : 0;
        await this.updateStock(payload.magasinId, rl.articleId, currentQty + rl.quantiteRecue);

        const mouvementData = {
          magasinId: payload.magasinId,
          magasinNom,
          articleId: rl.articleId,
          articleDesignation: rl.designation,
          type: 'ENTREE_ACHAT',
          quantite: rl.quantiteRecue,
          referenceDoc: code,
          utilisateurNom: currentUser.name,
          dateMouvement: new Date().toISOString(),
          note: `Réception directe sans DA via ${code}`
        };
        await supabase.from('mouvements_stock').insert([mouvementData]);
      }

      // Dette fournisseur : valorisée au prix unitaire saisi (à défaut le PMP de l'article)
      const receptionHT = receptionLignes.reduce((sum, l) => sum + (l.prixUnitaire || 0) * l.quantiteRecue, 0);
      if (receptionHT > 0) {
        const { data: four } = await supabase
          .from('fournisseurs').select('solde').eq('id', payload.fournisseurId).maybeSingle();
        if (four !== null) {
          await supabase.from('fournisseurs')
            .update({ solde: roundDA((four?.solde || 0) + receptionHT) })
            .eq('id', payload.fournisseurId);
        }
      }

      await this.logAction('receptions', 'create_directe', reception.id, null, reception);
      return reception;
    } catch (err) {
      console.error('Error creating direct reception:', err);
      throw err;
    }
  }

  static async getReceptions(): Promise<Reception[]> {
    try {
      const { data, error } = await supabase
        .from('receptions')
        .select('*');

      if (error) throw error;
      const list = (data || []).map((r: any) => {
        let lines = r.lignes;
        if (typeof lines === 'string') {
          try { lines = JSON.parse(lines); } catch { lines = []; }
        }
        if (!Array.isArray(lines)) lines = [];
        return {
          ...r,
          id: String(r.id),
          code: String(r.code || ''),
          commandeId: String(r.commandeId || r.commande_id || ''),
          commandeCode: String(r.commandeCode || r.commande_code || ''),
          fournisseurId: String(r.fournisseurId || r.fournisseur_id || ''),
          fournisseurNom: String(r.fournisseurNom || r.fournisseur_nom || ''),
          magasinId: String(r.magasinId || r.magasin_id || ''),
          magasinNom: String(r.magasinNom || r.magasin_nom || ''),
          dateReception: r.dateReception || r.date_reception || r.created_at || new Date().toISOString(),
          bonLivraisonRef: String(r.bonLivraisonRef || r.bon_livraison_ref || ''),
          factureFournisseurRef: String(r.factureFournisseurRef || r.facture_fournisseur_ref || ''),
          lignes: lines,
          magasinierId: String(r.magasinierId || r.magasinier_id || ''),
          magasinierNom: String(r.magasinierNom || r.magasinier_nom || ''),
          statut: r.statut || 'Validée'
        };
      }).sort((a: any, b: any) => new Date(b.dateReception).getTime() - new Date(a.dateReception).getTime());

      return list;
    } catch (err) {
      console.error('Error fetching receptions:', err);
      return [];
    }
  }

  // Valide une réception en brouillon : entrée en stock, mise à jour de la commande liée,
  // statut 'Validée' et incrément du solde fournisseur.
  // La création de facture reste MANUELLE (via createFactureFromReceptions).
  static async validateReceptionStatutOnly(receptionId: string): Promise<boolean> {
    type LigneReception = {
      articleId?: string;
      article_id?: string;
      designation?: string;
      quantite?: number;
      quantiteRecue?: number;
      quantite_recue?: number;
      prixUnitaire?: number | null;
    };

    try {
      const { data: reception } = await supabase
        .from('receptions')
        .select('*')
        .eq('id', receptionId)
        .maybeSingle();

      if (!reception) return false;

      // Idempotence : un BL déjà validé a déjà mouvementé le stock et la dette fournisseur.
      // Sans ce garde-fou, un double clic doublerait les quantités et le solde.
      if (reception.statut === 'Validée') return true;

      // Réception directe : pas de commande liée
      const commandeIdLiee = reception.commandeId || reception.commande_id || null;
      const commande = commandeIdLiee
        ? (await supabase.from('commandes').select('*').eq('id', commandeIdLiee).maybeSingle()).data
        : null;

      // Calculer la valeur de la réception (pour le solde fournisseur)
      const rawLignes = reception.lignes;
      const lignes: LigneReception[] = Array.isArray(rawLignes)
        ? rawLignes
        : (typeof rawLignes === 'string' ? (JSON.parse(rawLignes) as LigneReception[]) : []);
      const getQte = (l: LigneReception) => l.quantiteRecue || l.quantite_recue || 0;

      // Un BL sans aucune quantité reçue ne doit pas être validé : il deviendrait
      // non supprimable tout en n'ayant rien mis en stock.
      if (!lignes.some(l => getQte(l) > 0)) return false;

      let receptionHT = 0;
      const articles = await this.getArticles();
      lignes.forEach(line => {
        const art = articles.find(a => a.id === (line.articleId || line.article_id));
        const prix = line.prixUnitaire !== undefined && line.prixUnitaire !== null ? line.prixUnitaire : (art?.prixMoyen || 0);
        receptionHT += prix * getQte(line);
      });

      // Entrée physique en stock + traçabilité des mouvements.
      // (receiveGoods et createReceptionDirecte créent des BL déjà 'Validée' :
      //  ils ne repassent donc jamais ici, aucun risque de double comptage.)
      const currentUser = this.getCurrentUser();
      const magId = reception.magasinId || reception.magasin_id;
      for (const line of lignes) {
        const artId = line.articleId || line.article_id;
        const qte = getQte(line);
        if (!artId || qte <= 0 || !magId) continue;

        const allStocks = await this.getStocks() as (StockItem & { magasin_id?: string; article_id?: string })[];
        const existingStock = allStocks.find(
          s => (s.magasinId === magId || s.magasin_id === magId) &&
               (s.articleId === artId || s.article_id === artId)
        );
        await this.updateStock(magId, artId, (existingStock?.quantite || 0) + qte);

        const art = articles.find(a => a.id === artId);
        const mouvementData = {
          magasinId: magId,
          magasinNom: reception.magasinNom || reception.magasin_nom || 'Magasin',
          articleId: artId,
          articleDesignation: line.designation || art?.designation || '',
          type: 'ENTREE_ACHAT',
          quantite: qte,
          referenceDoc: reception.code,
          utilisateurNom: currentUser.name,
          dateMouvement: new Date().toISOString(),
          note: `Validation réception ${reception.code}`
        };
        await supabase.from('mouvements_stock').insert([mouvementData]);
      }

      // Reporter les quantités reçues sur la commande liée et faire évoluer son statut
      if (commande && commandeIdLiee) {
        const lignesCommande: LigneReception[] = Array.isArray(commande.lignes) ? commande.lignes : [];
        const updatedLignes = lignesCommande.map(pl => {
          const match = lignes.find(l => (l.articleId || l.article_id) === (pl.articleId || pl.article_id));
          return { ...pl, quantiteRecue: (pl.quantiteRecue || 0) + (match ? getQte(match) : 0) };
        });
        const allReceived = updatedLignes.length > 0 && updatedLignes.every(l => (l.quantiteRecue || 0) >= (l.quantite || 0));
        const partiallyReceived = updatedLignes.some(l => (l.quantiteRecue || 0) > 0);

        await supabase
          .from('commandes')
          .update({
            lignes: updatedLignes,
            statut: allReceived ? 'Reçu totalement' : (partiallyReceived ? 'Reçu partiellement' : commande.statut)
          })
          .eq('id', commandeIdLiee);
      }

      // Incrémenter le solde fournisseur (dette basée sur les réceptions).
      // Réception directe : le fournisseur est porté par la réception, pas par une commande.
      const fournisseurIdCible = commande?.fournisseurId || reception.fournisseurId || reception.fournisseur_id;
      if (fournisseurIdCible && receptionHT > 0) {
        const { data: four } = await supabase
          .from('fournisseurs')
          .select('solde')
          .eq('id', fournisseurIdCible)
          .maybeSingle();
        if (four !== null) {
          await supabase
            .from('fournisseurs')
            .update({ solde: roundDA((four?.solde || 0) + receptionHT) })
            .eq('id', fournisseurIdCible);
        }
      }

      await supabase
        .from('receptions')
        .update({ statut: 'Validée' })
        .eq('id', receptionId);

      await this.logAction('receptions', 'validate', receptionId, null, { statut: 'Validée' });
      return true;
    } catch (err) {
      console.error('Error validating reception:', err);
      return false;
    }
  }

  static async deleteReception(receptionId: string): Promise<boolean> {
    const cleanId = sanitizeId(receptionId);
    if (!cleanId) {
      console.error('deleteReception: invalid id', receptionId);
      return false;
    }
    try {
      // 1. Fetch the reception before deleting it (we need commandeId and lignes)
      const { data: reception } = await supabase
        .from('receptions')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (!reception) return false;

      const lignes: any[] = Array.isArray(reception.lignes) ? reception.lignes :
        (typeof reception.lignes === 'string' ? JSON.parse(reception.lignes) : []);

      // 2. Reverse the stock entries that this reception created (subtract quantities)
      for (const line of lignes) {
        const artId = line.articleId || line.article_id;
        const qtyRecue = line.quantiteRecue || line.quantite_recue || 0;
        if (!artId || !(qtyRecue > 0)) continue;
        const magId = reception.magasinId || reception.magasin_id;
        // Use updateStock helper which handles camelCase column names correctly
        const currentStocks = await this.getStocks();
        const existingStock = currentStocks.find(
          (s: any) => (s.magasinId === magId || s.magasin_id === magId) &&
                      (s.articleId === artId || s.article_id === artId)
        );
        if (existingStock) {
          const newQty = Math.max(0, (existingStock.quantite || 0) - qtyRecue);
          await this.updateStock(magId, artId, newQty);
        }
        // Delete the matching mouvement_stock entry
        await supabase
          .from('mouvements_stock')
          .delete()
          .eq('referenceDoc', reception.code)
          .eq('articleId', artId);
      }

      // 3. Reset the linked commande status to 'Validé' so a new reception can be created
      if (reception.commandeId || reception.commande_id) {
        const cmdId = reception.commandeId || reception.commande_id;
        // Also reset quantiteRecue on commande lignes back to 0
        const { data: commande } = await supabase
          .from('commandes')
          .select('*')
          .eq('id', cmdId)
          .maybeSingle();
        if (commande) {
          const resetLignes = (commande.lignes || []).map((l: any) => ({ ...l, quantiteRecue: 0 }));
          await supabase
            .from('commandes')
            .update({ statut: 'Validé', lignes: resetLignes })
            .eq('id', cmdId);
        }
      }

      // 4. Delete the reception row
      const { error } = await supabase
        .from('receptions')
        .delete()
        .eq('id', cleanId);
      if (error) throw error;

      await this.logAction('receptions', 'delete', cleanId, null, null);
      return true;
    } catch (err) {
      console.error('Error deleting reception:', err);
      return false;
    }
  }

  // ============================================
  // AFFECTATIONS
  // ============================================

  static async getAffectations(): Promise<Affectation[]> {
    try {
      const { data, error } = await supabase
        .from('affectations')
        .select('*');

      if (error) throw error;
      const list = (data || []).map((a: any) => {
        let lines = a.lignes;
        if (typeof lines === 'string') {
          try { lines = JSON.parse(lines); } catch { lines = []; }
        }
        if (!Array.isArray(lines)) lines = [];
        return {
          ...a,
          id: String(a.id),
          code: String(a.code || ''),
          employeId: String(a.employeId || a.employe_id || ''),
          employeNom: String(a.employeNom || a.employe_nom || ''),
          chantierId: a.chantierId || a.chantier_id || null,
          chantierNom: a.chantierNom || a.chantier_nom || null,
          magasinId: String(a.magasinId || a.magasin_id || ''),
          magasinNom: String(a.magasinNom || a.magasin_nom || ''),
          magasinDestId: a.magasinDestId || a.magasin_dest_id || null,
          magasinDestNom: a.magasinDestNom || a.magasin_dest_nom || null,
          lignes: lines,
          motif: a.motif,
          chauffeur: a.chauffeur,
          vehicule: a.vehicule,
          statut: a.statut || 'Affecté',
          magasinierNom: String(a.magasinierNom || a.magasinier_nom || ''),
          dateAffectation: a.dateAffectation || a.date_affectation || a.created_at || new Date().toISOString()
        };
      }).sort((x: any, y: any) => new Date(y.dateAffectation).getTime() - new Date(x.dateAffectation).getTime());

      return list;
    } catch (err) {
      console.error('Error fetching affectations:', err);
      return [];
    }
  }

  static async createAffectation(affectation: Partial<Affectation>): Promise<Affectation | null> {
    try {
      const currentUser = this.getCurrentUser();
      const { magasinId, employeId, chantierId, magasinDestId, lignes, motif, chauffeur, vehicule } = affectation;

      if (!magasinId || !employeId || !lignes || lignes.length === 0) {
        throw new Error('Missing required fields for affectation');
      }
      
      if (!chantierId && !magasinDestId) {
        throw new Error('Destination (Chantier ou Magasin) requise');
      }

      // Check stock for all lines using getStocks() to avoid column name mismatch
      const allStocks = await this.getStocks();
      for (const ligne of lignes) {
        const stock = allStocks.find(
          (s: any) => (s.magasinId === magasinId || s.magasin_id === magasinId) &&
                      (s.articleId === ligne.articleId || s.article_id === ligne.articleId)
        );
        if (!stock || (stock.quantite || 0) < ligne.quantite) {
          throw new Error(`Stock insuffisant pour l'article ${ligne.designation} (Demandé: ${ligne.quantite}, Dispo: ${stock?.quantite || 0})`);
        }
      }

      const employes = await this.getEmployes();
      const emp = employes.find((e) => e.id === employeId);

      const chantiers = await this.getChantiers();
      const cha = chantiers.find((c) => c.id === chantierId);
      const chantierNom = cha?.nom || 'Chantier inconnu';

      const magasins = await this.getMagasins();
      const mag = magasins.find((m) => m.id === magasinId);

      let magasinDestNom = '';
      if (magasinDestId) {
        const mDest = magasins.find((m) => m.id === magasinDestId);
        magasinDestNom = mDest?.nom || 'Magasin de destination inconnu';
      }

      // Use MAX code to avoid duplicates after deletions
      const { data: existingBSCodes } = await supabase
        .from('affectations')
        .select('code')
        .like('code', 'BS-2026-%');
      let maxBSNum = 0;
      (existingBSCodes || []).forEach((a: any) => {
        const match = (a.code || '').match(/BS-2026-(\d+)/);
        if (match) maxBSNum = Math.max(maxBSNum, parseInt(match[1], 10));
      });
      const code = `BS-2026-${String(maxBSNum + 1).padStart(3, '0')}`;

      const fullAffectation = {
        code,
        employeId,
        employeNom: emp?.nom || 'Employé inconnu',
        chantierId: chantierId || null,
        chantierNom: chantierId ? chantierNom : null,
        magasinId,
        magasinNom: mag?.nom || 'Magasin inconnu',
        magasinDestId: magasinDestId || null,
        magasinDestNom: magasinDestId ? magasinDestNom : null,
        lignes,
        motif,
        chauffeur,
        vehicule,
        statut: 'En attente',
        magasinierNom: currentUser.name
      };

      // Process stock deductions and movements using getStocks() + updateStock()
      const freshStocks = await this.getStocks();
      for (const ligne of lignes) {
        // 1. Deduct from source magasin
        const srcStock = freshStocks.find(
          (s: any) => (s.magasinId === magasinId || s.magasin_id === magasinId) &&
                      (s.articleId === ligne.articleId || s.article_id === ligne.articleId)
        );
        const currentSrcQty = srcStock?.quantite || 0;
        const newSrcQty = currentSrcQty - ligne.quantite;
        await this.updateStock(magasinId, ligne.articleId, newSrcQty);

        const mouvementOut = {
          magasinId,
          magasinNom: mag?.nom || 'Magasin inconnu',
          articleId: ligne.articleId,
          articleDesignation: ligne.designation,
          type: 'SORTIE_AFFECTATION',
          quantite: -ligne.quantite,
          referenceDoc: code,
          utilisateurNom: currentUser.name,
          dateMouvement: new Date().toISOString(),
          note: `BS vers ${chantierId ? chantierNom : magasinDestNom}`
        };
        await supabase.from('mouvements_stock').insert([mouvementOut]);

        // 2. Add to destination if it's a Magasin
        if (magasinDestId) {
          const destStock = freshStocks.find(
            (s: any) => (s.magasinId === magasinDestId || s.magasin_id === magasinDestId) &&
                        (s.articleId === ligne.articleId || s.article_id === ligne.articleId)
          );
          const currentDestQty = destStock?.quantite || 0;
          await this.updateStock(magasinDestId, ligne.articleId, currentDestQty + ligne.quantite);

          const mouvementIn = {
            magasinId: magasinDestId,
            magasinNom: magasinDestNom,
            articleId: ligne.articleId,
            articleDesignation: ligne.designation,
            type: 'ENTREE_TRANSFERT',
            quantite: ligne.quantite,
            referenceDoc: code,
            utilisateurNom: currentUser.name,
            dateMouvement: new Date().toISOString(),
            note: `Entrée via BS de ${mag?.nom || 'Magasin inconnu'}`
          };
          await supabase.from('mouvements_stock').insert([mouvementIn]);
        }
      }

      // Remove null/undefined/empty-string fields to avoid NOT NULL + UUID constraint violations
      // (e.g. chantierId when destination is a magasin, or magasinDestId when destination is a chantier)
      const cleanAffectation = Object.fromEntries(
        Object.entries(fullAffectation).filter(([, v]) => v !== null && v !== undefined && v !== '')
      );

      const { data, error } = await supabase
        .from('affectations')
        .insert([cleanAffectation])
        .select()
        .single();

      if (error) throw error;
      await this.logAction('affectations', 'create', data.id, null, data);
      return data;
    } catch (err) {
      console.error('Error creating affectation:', err);
      throw err;
    }
  }

  // Retour d'affectation : réintègre AU MAGASIN D'ORIGINE la totalité des lignes.
  // L'ancienne version ne traitait que `aff.articleId` (champ mono-article hérité) :
  // le stock d'une affectation multi-lignes n'était jamais restauré.
  static async returnAffectation(affectationId: string): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();

      const { data: aff } = await supabase
        .from('affectations')
        .select('*')
        .eq('id', affectationId)
        .maybeSingle();

      if (!aff) return false;

      // IDEMPOTENCE : un retour déjà enregistré ne doit pas réintégrer le stock deux fois
      if (aff.statut === 'Retourné') {
        alert('⛔ Retour impossible\n\nCe bon d\'affectation a déjà été retourné.');
        return false;
      }

      // Lignes de l'affectation, avec repli sur les champs mono-article hérités
      let lignes: { articleId: string; designation?: string; quantite: number }[] =
        Array.isArray(aff.lignes) ? aff.lignes : [];
      if (lignes.length === 0 && aff.articleId && (aff.quantite || 0) > 0) {
        lignes = [{ articleId: aff.articleId, designation: aff.articleDesignation, quantite: aff.quantite }];
      }
      if (lignes.length === 0) {
        alert('⛔ Retour impossible\n\nAucune ligne d\'article sur ce bon d\'affectation.');
        return false;
      }

      // Le matériel revient au magasin émetteur, ou au magasin destinataire si le bon
      // était un transfert vers un autre dépôt.
      const magasinRetourId = aff.magasinId;
      const dateRetour = new Date().toISOString();

      for (const ligne of lignes) {
        const artId = ligne.articleId;
        const qte = ligne.quantite || 0;
        if (!artId || qte <= 0) continue;

        const allStocks = await this.getStocks() as (StockItem & { magasin_id?: string; article_id?: string })[];
        const stock = allStocks.find(
          s => (s.magasinId === magasinRetourId || s.magasin_id === magasinRetourId) &&
               (s.articleId === artId || s.article_id === artId)
        );
        await this.updateStock(magasinRetourId, artId, (stock?.quantite || 0) + qte);

        await supabase.from('mouvements_stock').insert([{
          magasinId: magasinRetourId,
          magasinNom: aff.magasinNom,
          articleId: artId,
          articleDesignation: ligne.designation || aff.articleDesignation || '',
          type: 'RETOUR_AFFECTATION',
          quantite: qte,
          referenceDoc: aff.code,
          utilisateurNom: currentUser.name,
          dateMouvement: dateRetour,
          note: `Retour d'affectation ${aff.code}`
        }]);
      }

      // Le statut n'était jamais écrit en base : l'affectation restait « Affecté »
      const { error } = await supabase
        .from('affectations')
        .update({ statut: 'Retourné', dateRetour })
        .eq('id', affectationId);
      if (error) throw error;

      await this.logAction('affectations', 'return', affectationId, null, { statut: 'Retourné', dateRetour });
      return true;
    } catch (err) {
      console.error('Error returning affectation:', err);
      return false;
    }
  }

  static async validateAffectation(affectationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('affectations')
        .update({ statut: 'Validé' })
        .eq('id', affectationId);

      if (error) throw error;
      await this.logAction('affectations', 'validate', affectationId, null, { statut: 'Validé' });
      return true;
    } catch (err) {
      console.error('Error validating affectation:', err);
      return false;
    }
  }

  static async deleteAffectation(affectationId: string): Promise<boolean> {
    try {
      let { data: aff, error: fetchErr } = await supabase
        .from('affectations')
        .select('*')
        .eq('id', affectationId)
        .maybeSingle();

      if (!aff) {
        aff = null;
      }

      if (!aff) {
        const { error: directErr } = await supabase.from('affectations').delete().eq('id', affectationId);
        if (!directErr) return true;
        console.error('Affectation introuvable:', fetchErr || directErr);
        alert('Erreur: Bon d\'affectation introuvable.');
        return false;
      }

      // Protection stricte : Un bon d'affectation validé ne peut PLUS être supprimé
      if (aff.statut === 'Validé' || aff.statut === 'Validée') {
        alert('⛔ Suppression impossible\n\nCe Bon d\'Affectation est validé. Les bons d\'affectation validés ne peuvent plus être supprimés.');
        return false;
      }

      const currentUser = this.getCurrentUser();

      const magId = aff.magasinId || aff.magasin_id;
      const magNom = aff.magasinNom || aff.magasin_nom || 'Magasin';
      const magDestId = aff.magasinDestId || aff.magasin_dest_id;
      const codeBS = aff.code || '';

      // Restituer le stock réservé/déduit
      let lignes: { articleId: string; designation: string; quantite: number }[] = [];
      if (Array.isArray(aff.lignes)) {
        lignes = aff.lignes;
      } else if (typeof aff.lignes === 'string') {
        try { lignes = JSON.parse(aff.lignes); } catch { lignes = []; }
      }
      if (lignes.length === 0 && (aff.articleId || aff.article_id) && (aff.quantite)) {
        const artId = aff.articleId || aff.article_id;
        const artDes = aff.articleDesignation || aff.article_designation || '';
        lignes = [{ articleId: artId, designation: artDes, quantite: aff.quantite }];
      }

      const freshStocks = await this.getStocks();
      for (const ligne of lignes) {
        const artId = ligne.articleId || (ligne as any).article_id;
        const qty = Number(ligne.quantite) || 0;

        if (magId && artId) {
          // 1. Remettre le stock au magasin de départ
          const srcStock = freshStocks.find(
            (s: any) => (s.magasinId === magId || s.magasin_id === magId) &&
                        (s.articleId === artId || s.article_id === artId)
          );
          const currentSrcQty = srcStock?.quantite || 0;
          await this.updateStock(magId, artId, currentSrcQty + qty);

          const mouvementAnnul = {
            magasinId: magId,
            magasinNom: magNom,
            articleId: artId,
            articleDesignation: ligne.designation || 'Article',
            type: 'ANNULATION_AFFECTATION',
            quantite: qty,
            referenceDoc: codeBS,
            utilisateurNom: currentUser.name,
            dateMouvement: new Date().toISOString(),
            note: `Annulation du BS ${codeBS}`
          };
          await supabase.from('mouvements_stock').insert([mouvementAnnul]);
        }

        if (magDestId && artId) {
          // 2. Retirer le stock du magasin destinataire si c'était un transfert vers un magasin
          const destStock = freshStocks.find(
            (s: any) => (s.magasinId === magDestId || s.magasin_id === magDestId) &&
                        (s.articleId === artId || s.article_id === artId)
          );
          const currentDestQty = destStock?.quantite || 0;
          await this.updateStock(magDestId, artId, Math.max(0, currentDestQty - qty));
        }
      }

      const { error: delErr } = await supabase
        .from('affectations')
        .delete()
        .eq('id', affectationId);

      if (delErr) {
        console.error('Error executing delete on affectations:', delErr);
        throw delErr;
      }

      await this.logAction('affectations', 'delete', affectationId, aff, null);
      return true;
    } catch (err) {
      console.error('Error deleting affectation:', err);
      return false;
    }
  }

  static async updateAffectation(affectationId: string, affectationData: Partial<Affectation>): Promise<Affectation | null> {
    try {
      const { data: oldAff, error: fetchErr } = await supabase
        .from('affectations')
        .select('*')
        .eq('id', affectationId)
        .maybeSingle();

      if (fetchErr || !oldAff) {
        throw new Error('Bon d\'affectation introuvable');
      }

      if (oldAff.statut === 'Validé' || oldAff.statut === 'Validée') {
        throw new Error('⛔ Modification impossible : Ce bon d\'affectation est déjà validé.');
      }

      const currentUser = this.getCurrentUser();
      const employes = await this.getEmployes();
      const emp = employes.find(e => e.id === (affectationData.employeId || oldAff.employeId));

      const chantiers = await this.getChantiers();
      const chantierId = affectationData.chantierId || oldAff.chantierId;
      const chantierNom = chantiers.find(c => c.id === chantierId)?.nom || oldAff.chantierNom;

      const magasins = await this.getMagasins();
      const magasinId = affectationData.magasinId || oldAff.magasinId;
      const mag = magasins.find(m => m.id === magasinId);

      const newLignes = affectationData.lignes || oldAff.lignes || [];

      // 1. Restituer temporairement l'ancien stock déduit
      let oldLignes: { articleId: string; designation: string; quantite: number }[] = [];
      if (Array.isArray(oldAff.lignes)) {
        oldLignes = oldAff.lignes;
      } else if (typeof oldAff.lignes === 'string') {
        try { oldLignes = JSON.parse(oldAff.lignes); } catch { oldLignes = []; }
      }
      if (oldLignes.length === 0 && oldAff.articleId && oldAff.quantite) {
        oldLignes = [{ articleId: oldAff.articleId, designation: oldAff.articleDesignation || '', quantite: oldAff.quantite }];
      }

      let freshStocks = await this.getStocks();
      for (const ol of oldLignes) {
        const stockItem = freshStocks.find(
          (s: any) => (s.magasinId === oldAff.magasinId || s.magasin_id === oldAff.magasinId) &&
                      (s.articleId === ol.articleId || s.article_id === ol.articleId)
        );
        const curQty = stockItem?.quantite || 0;
        await this.updateStock(oldAff.magasinId, ol.articleId, curQty + ol.quantite);
      }

      // 2. Vérifier si le stock est suffisant pour les nouvelles lignes
      freshStocks = await this.getStocks();
      for (const nl of newLignes) {
        const stockItem = freshStocks.find(
          (s: any) => (s.magasinId === magasinId || s.magasin_id === magasinId) &&
                      (s.articleId === nl.articleId || s.article_id === nl.articleId)
        );
        const availQty = stockItem?.quantite || 0;
        if (availQty < nl.quantite) {
          // Re-déduire l'ancien stock pour remettre dans l'état initial
          for (const ol of oldLignes) {
            const curStock = freshStocks.find(
              (s: any) => (s.magasinId === oldAff.magasinId || s.magasin_id === oldAff.magasinId) &&
                          (s.articleId === ol.articleId || s.article_id === ol.articleId)
            );
            await this.updateStock(oldAff.magasinId, ol.articleId, (curStock?.quantite || 0) - ol.quantite);
          }
          throw new Error(`Stock insuffisant pour l'article ${nl.designation} (Demandé: ${nl.quantite}, Dispo: ${availQty})`);
        }
      }

      // 3. Déduire les nouvelles quantités
      for (const nl of newLignes) {
        const stockItem = freshStocks.find(
          (s: any) => (s.magasinId === magasinId || s.magasin_id === magasinId) &&
                      (s.articleId === nl.articleId || s.article_id === nl.articleId)
        );
        const curQty = stockItem?.quantite || 0;
        await this.updateStock(magasinId, nl.articleId, curQty - nl.quantite);

        const mvt = {
          magasinId,
          magasinNom: mag?.nom || 'Magasin',
          articleId: nl.articleId,
          articleDesignation: nl.designation,
          type: 'MODIFICATION_AFFECTATION',
          quantite: -nl.quantite,
          referenceDoc: oldAff.code,
          utilisateurNom: currentUser.name,
          dateMouvement: new Date().toISOString(),
          note: `Modification du BS ${oldAff.code}`
        };
        await supabase.from('mouvements_stock').insert([mvt]);
      }

      const updatePayload = {
        employeId: affectationData.employeId || oldAff.employeId,
        employeNom: emp?.nom || oldAff.employeNom,
        chantierId: chantierId || null,
        chantierNom: chantierNom || null,
        magasinId,
        magasinNom: mag?.nom || oldAff.magasinNom,
        lignes: newLignes,
        motif: affectationData.motif !== undefined ? affectationData.motif : oldAff.motif,
        chauffeur: affectationData.chauffeur !== undefined ? affectationData.chauffeur : oldAff.chauffeur,
        vehicule: affectationData.vehicule !== undefined ? affectationData.vehicule : oldAff.vehicule,
        magasinierNom: currentUser.name
      };

      const cleanPayload = Object.fromEntries(
        Object.entries(updatePayload).filter(([, v]) => v !== null && v !== undefined && v !== '')
      );

      const { data: updated, error: updateErr } = await supabase
        .from('affectations')
        .update(cleanPayload)
        .eq('id', affectationId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      await this.logAction('affectations', 'update', affectationId, oldAff, updated);
      return updated;
    } catch (err) {
      console.error('Error updating affectation:', err);
      throw err;
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

      if (error) throw error;
      const list = (data || []).map((t: any) => {
        let lines = t.lignes;
        if (typeof lines === 'string') {
          try { lines = JSON.parse(lines); } catch { lines = []; }
        }
        if (!Array.isArray(lines)) lines = [];
        return {
          ...t,
          id: String(t.id),
          code: String(t.code || ''),
          magasinDepartId: String(t.magasinDepartId || t.magasin_depart_id || ''),
          magasinDepartNom: String(t.magasinDepartNom || t.magasin_depart_nom || ''),
          magasinDestId: String(t.magasinDestId || t.magasin_dest_id || ''),
          magasinDestNom: String(t.magasinDestNom || t.magasin_dest_nom || ''),
          lignes: lines,
          motif: t.motif,
          // Workflow : Demande → Validé → Reçu (ou Refusé à la validation).
          // Normalisation des statuts historiques : 'Demandé' (ancien libellé d'insert) et
          // 'Expédié' (ancien libellé de l'étape de sortie, désormais « Validé »).
          statut: normalizeTransfertStatut(t.statut),
          demandeurNom: String(t.demandeurNom || t.demandeur_nom || ''),
          dateDemande: t.dateDemande || t.date_demande || t.created_at || new Date().toISOString()
        };
      }).sort((x: any, y: any) => new Date(y.dateDemande).getTime() - new Date(x.dateDemande).getTime());

      return list;
    } catch (err) {
      console.error('Error fetching transferts:', err);
      return [];
    }
  }

  static async createTransfert(transfert: Partial<Transfert>): Promise<Transfert | null> {
    try {
      const currentUser = this.getCurrentUser();
      const { magasinDepartId, magasinDestId, lignes, motif } = transfert;

      if (!magasinDepartId || !magasinDestId || !lignes || lignes.length === 0) {
        throw new Error('Champs requis manquants pour le transfert');
      }

      const magasins = await this.getMagasins();
      const magDep = magasins.find((m) => m.id === magasinDepartId);
      const magDest = magasins.find((m) => m.id === magasinDestId);

      const { data: existingTCodes } = await supabase
        .from('transferts')
        .select('code')
        .like('code', 'TR-2026-%');
      let maxTNum = 0;
      (existingTCodes || []).forEach((t: any) => {
        const match = (t.code || '').match(/TR-2026-(\d+)/);
        if (match) maxTNum = Math.max(maxTNum, parseInt(match[1], 10));
      });
      const code = `TR-2026-${String(maxTNum + 1).padStart(3, '0')}`;

      const fullTransfert = {
        code,
        magasinDepartId,
        magasinDepartNom: magDep?.nom || 'Dépôt Départ',
        magasinDestId,
        magasinDestNom: magDest?.nom || 'Dépôt Arrivée',
        lignes,
        motif,
        statut: 'Demande',
        demandeurNom: currentUser.name,
        dateDemande: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('transferts')
        .insert([fullTransfert])
        .select()
        .single();

      if (error) throw error;
      await this.logAction('transferts', 'create', data.id, null, data);
      return data;
    } catch (err) {
      console.error('Error creating transfert:', err);
      return null;
    }
  }

  // ÉTAPE 2 du workflow transfert (Demande → Validé → Reçu) : la validation approuve la demande
  // ET sort la marchandise du dépôt départ. L'entrée au dépôt destination se fait à la réception.
  static async validerTransfert(transfertId: string): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();

      const { data: tr } = await supabase
        .from('transferts')
        .select('*')
        .eq('id', transfertId)
        .maybeSingle();

      if (!tr) throw new Error('Transfert not found');

      // IDEMPOTENCE : ne valider qu'une demande en attente. Sans ce garde-fou,
      // un second clic sortirait une deuxième fois la marchandise du stock.
      if (normalizeTransfertStatut(tr.statut) !== 'Demande') {
        alert(`⛔ Validation impossible\n\nCe transfert est déjà au statut « ${normalizeTransfertStatut(tr.statut)} ».`);
        return false;
      }

      const lines = tr.lignes || [];
      const currentStocks = await this.getStocks();

      // CONTRÔLE PRÉALABLE : stock suffisant sur TOUTES les lignes avant d'écrire quoi que
      // ce soit, sinon une expédition partielle laisserait du stock négatif au départ.
      const insuffisants: string[] = [];
      for (const line of lines) {
        const stock = currentStocks.find(
          (s: any) => (s.magasinId === tr.magasinDepartId || s.magasin_id === tr.magasinDepartId) &&
                      (s.articleId === line.articleId || s.article_id === line.articleId)
        );
        const dispo = stock ? (stock.quantite || 0) : 0;
        if (dispo < line.quantite) {
          insuffisants.push(`${line.designation} — demandé ${line.quantite}, disponible ${dispo}`);
        }
      }
      if (insuffisants.length > 0) {
        alert(
          `⛔ Stock insuffisant au départ (${tr.magasinDepartNom})\n\n• ${insuffisants.join('\n• ')}` +
          '\n\nAucune sortie n\'a été effectuée.'
        );
        return false;
      }

      for (const line of lines) {
        const stock = currentStocks.find(
          (s: any) => (s.magasinId === tr.magasinDepartId || s.magasin_id === tr.magasinDepartId) &&
                      (s.articleId === line.articleId || s.article_id === line.articleId)
        );

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
          note: `Validation transfert — sortie vers ${tr.magasinDestNom}`
        };

        await supabase
          .from('mouvements_stock')
          .insert([mouvementTransfert]);
      }

      // La base n'a pas de colonne dateValidation : "dateExpedition" porte la date de validation,
      // qui est aussi la date de sortie effective du dépôt départ.
      const { error } = await supabase
        .from('transferts')
        .update({
          statut: 'Validé',
          dateExpedition: new Date().toISOString(),
          valideurNom: currentUser.name
        })
        .eq('id', transfertId);

      if (error) throw error;
      await this.logAction('transferts', 'valider', transfertId, null, { statut: 'Validé' });
      return true;
    } catch (err) {
      console.error('Error validating transfert:', err);
      return false;
    }
  }

  // Refus de la demande à l'étape de validation : aucun mouvement de stock, la demande est clôturée.
  static async refuserTransfert(transfertId: string, motifRefus?: string): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();

      const { data: tr } = await supabase
        .from('transferts')
        .select('*')
        .eq('id', transfertId)
        .maybeSingle();

      if (!tr) throw new Error('Transfert non trouvé');

      if (normalizeTransfertStatut(tr.statut) !== 'Demande') {
        alert(`⛔ Refus impossible\n\nCe transfert est au statut « ${normalizeTransfertStatut(tr.statut)} » : seule une demande en attente peut être refusée.`);
        return false;
      }

      const { error } = await supabase
        .from('transferts')
        .update({
          statut: 'Refusé',
          valideurNom: currentUser.name,
          motif: motifRefus ? `${tr.motif || ''}${tr.motif ? ' | ' : ''}Refus : ${motifRefus}` : tr.motif
        })
        .eq('id', transfertId);

      if (error) throw error;
      await this.logAction('transferts', 'refuser', transfertId, null, { statut: 'Refusé' });
      return true;
    } catch (err) {
      console.error('Error refusing transfert:', err);
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

      // ÉTAPE 3 du workflow : n'entrer en stock qu'un transfert validé (ou 'Expédié', ancien libellé).
      // Sans ce garde-fou, un second clic ferait entrer la marchandise une deuxième fois.
      const statutCourant = normalizeTransfertStatut(tr.statut);
      if (statutCourant !== 'Validé') {
        alert(
          statutCourant === 'Reçu'
            ? '⛔ Réception impossible\n\nCe transfert a déjà été reçu.'
            : `⛔ Réception impossible\n\nCe transfert est au statut « ${statutCourant} » : il doit d'abord être validé.`
        );
        return false;
      }

      const lines = tr.lignes || [];
      const currentStocks = await this.getStocks();
      for (const line of lines) {
        const stock = currentStocks.find(
          (s: any) => (s.magasinId === tr.magasinDestId || s.magasin_id === tr.magasinDestId) &&
                      (s.articleId === line.articleId || s.article_id === line.articleId)
        );

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
          .insert([mouvementEntree]);
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
      const { data, error } = await this.selectFrom('paiements').order('datePaiement', { ascending: false });

      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        id: String(p.id),
        fournisseurId: p.fournisseurId || p.fournisseur_id,
        fournisseurNom: p.fournisseurNom || p.fournisseur_nom,
        factureId: p.factureId || p.facture_id,
        factureRef: p.factureRef || p.facture_ref,
        receptionIds: p.receptionIds || p.reception_ids,
        datePaiement: p.datePaiement || p.date_paiement,
        referenceTransaction: p.referenceTransaction || p.reference_transaction,
        comptableNom: p.comptableNom || p.comptable_nom,
        lettre: p.lettre,
        montant: Number(p.montant || 0),
        mode: p.mode,
        note: p.note
      }));
    } catch (err) {
      console.error('Error fetching paiements:', err);
      return [];
    }
  }

  static async recordPayment(paiement: Partial<Paiement>): Promise<Paiement | null> {
    try {
      const amount = paiement.montant || 0;

      // Allow demo/local users to create payments without a Supabase session by using MockDatabase.
      const currentUser = this.getCurrentUser();
      let sessionData: any = null;
      try {
        const s = await supabase.auth.getSession();
        sessionData = s?.data || null;
      } catch (err) {
        sessionData = null;
      }

      const isAuthenticatedSession = !!(sessionData && sessionData.session && sessionData.session.user);
      const isPrivilegedUser = Boolean(
        currentUser && (
          Array.isArray((currentUser as any).privileges) && (currentUser as any).privileges.includes('allow_unauthed_payments')
          || ['direction', 'comptabilite'].includes(currentUser.role)
        )
      );

      if (!isAuthenticatedSession && isPrivilegedUser) {
        // Use service role client to perform the insert when user has privilege but no session.
        if (!supabaseService) {
          throw new Error('Service role key manquant. Impossible d\'effectuer un paiement privilégié sans authentification.');
        }
        // Use service client as dbClient for subsequent operations
      }

      if (!isAuthenticatedSession && !isPrivilegedUser) {
        throw new Error('Utilisateur non authentifié. Veuillez vous connecter avant d\'effectuer un paiement.');
      }

      // Choose database client: authenticated session uses `supabase`, privileged unauthenticated uses `supabaseService`.
      const dbClient: SupabaseClient = isAuthenticatedSession ? supabase : (supabaseService as SupabaseClient);

      // Lecture préalable du fournisseur et de la facture. AUCUNE écriture avant l'insertion
      // du paiement : si l'insert échoue (RLS par exemple), le solde ne doit pas déjà être amputé.
      let supplier: any = null;
      if (paiement.fournisseurId) {
        const supplierRes = await dbClient.from('fournisseurs').select('solde, nomSociete').eq('id', paiement.fournisseurId).maybeSingle();
        supplier = (supplierRes as any).data;
      }
      const fournisseurNomVal = supplier?.nomSociete;

      let invoiceRef = paiement.factureRef;
      let facture: any = null;
      if (paiement.factureId) {
        const factureRes = await dbClient.from('factures').select('*').eq('id', paiement.factureId).maybeSingle();
        facture = (factureRes as any).data;
        if (facture) invoiceRef = facture.code;
      }

      // Ensure required fields have sensible defaults to satisfy NOT NULL constraints
      const dbPayment: any = {
        fournisseurId: paiement.fournisseurId,
        fournisseurNom: fournisseurNomVal || 'Fournisseur',
        montant: roundDA(typeof paiement.montant === 'number' ? paiement.montant : Number(paiement.montant || 0)),
        mode: paiement.mode || 'Virement',
        referenceTransaction: paiement.referenceTransaction || `REF-${Date.now()}`,
        note: paiement.note || null,
        factureId: paiement.factureId || null,
        datePaiement: paiement.datePaiement || new Date().toISOString(),
        code: paiement.code || `REG-${String(Date.now()).slice(-6)}`,
        comptableNom: paiement.comptableNom || currentUser?.name || 'Comptable',
        lettre: paiement.lettre || false,
        factureRef: invoiceRef || null
      };

      // Insertion via dbClient (et non `supabase`) : sans session, l'anon est bloqué par la RLS
      const { data, error } = await dbClient
        .from('paiements')
        .insert([dbPayment])
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Paiement non créé dans la base.');

      // Le paiement existe : on peut maintenant impacter le solde fournisseur et la facture
      if (supplier && paiement.fournisseurId) {
        await dbClient.from('fournisseurs')
          .update({ solde: roundDA(Math.max(0, (supplier.solde || 0) - amount)) })
          .eq('id', paiement.fournisseurId);
      }
      if (facture && paiement.factureId) {
        const soldeActuel = facture.soldeRestant ?? facture.solde_restant ?? 0;
        const newSoldeRestant = Math.max(0, soldeActuel - amount);
        await dbClient.from('factures')
          .update({ soldeRestant: roundDA(newSoldeRestant), statut: newSoldeRestant === 0 ? 'Payée' : 'Partiellement payée' })
          .eq('id', paiement.factureId);
      }

      await this.logAction('paiements', 'create', data.id, null, data);
      return {
        id: String(data.id),
        code: data.code,
        fournisseurId: data.fournisseurId || data.fournisseur_id,
        montant: Number(data.montant || 0),
        mode: data.mode,
        referenceTransaction: data.referenceTransaction || data.reference_transaction,
        note: data.note,
        factureId: data.factureId || data.facture_id,
        receptionIds: data.receptionIds || data.reception_ids || [],
        datePaiement: data.datePaiement || data.date_paiement,
        comptableNom: data.comptableNom || data.comptable_nom,
        lettre: data.lettre,
        factureRef: data.factureRef || data.facture_ref
      } as Paiement;
    } catch (err) {
      console.error('Error recording payment:', err);
      throw err;
    }
  }

  // Règlement fournisseur AVEC lettrage : le montant est ventilé sur une ou plusieurs
  // factures ouvertes. Chaque imputation donne une ligne de règlement lettrée sur sa
  // facture (le modèle ne permet qu'une facture par ligne de paiement), toutes reliées
  // par la même référence de transaction. Le solde fournisseur est décrémenté une fois.
  static async recordPaymentAvecLettrage(payload: {
    fournisseurId: string;
    mode: ModePaiement;
    referenceTransaction: string;
    datePaiement?: string;
    note?: string;
    imputations: { factureId: string; montant: number }[];
  }): Promise<Paiement[]> {
    const currentUser = this.getCurrentUser();

    const imputations = (payload.imputations || []).filter(i => i.factureId && i.montant > 0);
    if (!payload.fournisseurId) throw new Error('Fournisseur obligatoire.');
    if (!payload.referenceTransaction) throw new Error('Référence de transaction obligatoire.');
    if (imputations.length === 0) throw new Error('Aucune facture imputée. Renseignez au moins un montant.');

    // Une session authentifiée est requise (RLS), sauf privilège explicite
    let sessionData: { session?: { user?: unknown } | null } | null = null;
    try {
      const s = await supabase.auth.getSession();
      sessionData = s?.data || null;
    } catch {
      sessionData = null;
    }
    const isAuthenticatedSession = !!(sessionData && sessionData.session && sessionData.session.user);
    const isPrivilegedUser = Boolean(
      currentUser && (
        (Array.isArray(currentUser.privileges) && currentUser.privileges.includes('allow_unauthed_payments'))
        || ['direction', 'comptabilite'].includes(currentUser.role)
      )
    );
    if (!isAuthenticatedSession && !isPrivilegedUser) {
      throw new Error('Utilisateur non authentifié. Veuillez vous connecter avant d\'effectuer un règlement.');
    }
    if (!isAuthenticatedSession && !supabaseService) {
      throw new Error('Service role key manquant. Impossible d\'effectuer un règlement privilégié sans authentification.');
    }
    const dbClient: SupabaseClient = isAuthenticatedSession ? supabase : (supabaseService as SupabaseClient);

    // Contrôle : aucune imputation ne peut dépasser le restant dû de sa facture
    const factureIds = imputations.map(i => i.factureId);
    const { data: facturesData } = await dbClient.from('factures').select('*').in('id', factureIds);
    const factures = facturesData || [];

    for (const imp of imputations) {
      const fac = factures.find((f: { id: string }) => String(f.id) === String(imp.factureId));
      if (!fac) throw new Error('Facture introuvable pour une des imputations.');
      const restant = fac.soldeRestant ?? fac.solde_restant ?? 0;
      if (imp.montant > restant + 0.01) {
        throw new Error(`Imputation supérieure au restant dû sur la facture ${fac.code} (${restant.toLocaleString()} DA).`);
      }
    }

    const { data: fourRow } = await dbClient
      .from('fournisseurs').select('solde, nomSociete').eq('id', payload.fournisseurId).maybeSingle();
    const fournisseurNom = fourRow?.nomSociete || 'Fournisseur';

    const total = imputations.reduce((s, i) => s + i.montant, 0);
    const datePaiement = payload.datePaiement || new Date().toISOString();
    const baseCode = `REG-${String(Date.now()).slice(-6)}`;
    const creees: Paiement[] = [];

    for (let i = 0; i < imputations.length; i++) {
      const imp = imputations[i];
      const fac = factures.find((f: { id: string }) => String(f.id) === String(imp.factureId));
      const restant = fac.soldeRestant ?? fac.solde_restant ?? 0;
      const nouveauRestant = Math.max(0, restant - imp.montant);

      const dbPayment = {
        fournisseurId: payload.fournisseurId,
        fournisseurNom,
        montant: roundDA(imp.montant),
        mode: payload.mode || 'Virement',
        referenceTransaction: payload.referenceTransaction,
        note: payload.note || null,
        factureId: imp.factureId,
        factureRef: fac.code,
        datePaiement,
        // Suffixe seulement si le règlement est ventilé sur plusieurs factures
        code: imputations.length > 1 ? `${baseCode}/${i + 1}` : baseCode,
        comptableNom: currentUser?.name || 'Comptable',
        lettre: true
      };

      const { data: created, error } = await dbClient.from('paiements').insert([dbPayment]).select('*').single();
      if (error) throw error;

      await dbClient.from('factures').update({
        soldeRestant: roundDA(nouveauRestant),
        statut: nouveauRestant === 0 ? 'Payée' : 'Partiellement payée'
      }).eq('id', imp.factureId);

      await this.logAction('paiements', 'create_lettre', created.id, null, created);
      creees.push({ ...created, id: String(created.id), montant: Number(created.montant || 0) } as Paiement);
    }

    // Décrémenter le solde fournisseur une seule fois, du total réglé
    if (fourRow) {
      await dbClient.from('fournisseurs')
        .update({ solde: roundDA(Math.max(0, (fourRow.solde || 0) - total)) })
        .eq('id', payload.fournisseurId);
    }

    return creees;
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
      const soldeActuel = facture.soldeRestant ?? facture.solde_restant ?? 0;
      const newSoldeRestant = Math.max(0, soldeActuel - amount);
      const newInvoiceStatus = newSoldeRestant === 0 ? 'Payée' : 'Partiellement payée';

      await supabase
        .from('paiements')
        .update({
          factureId: factureId,
          factureRef: facture.code,
          lettre: true
        })
        .eq('id', paiementId);

      await supabase
        .from('factures')
        .update({
          soldeRestant: roundDA(newSoldeRestant),
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

      const paymentFactureId = payment?.factureId || payment?.facture_id;
      if (!payment || !paymentFactureId) return false;

      const { data: facture } = await supabase
        .from('factures')
        .select('*')
        .eq('id', paymentFactureId)
        .maybeSingle();


      if (facture) {
        const amount = payment.montant || 0;
        const soldeActuel = facture.soldeRestant ?? facture.solde_restant ?? 0;
        const montantTTC = facture.montantTTC ?? facture.montant_ttc ?? 0;
        const newSoldeRestant = soldeActuel + amount;
        const newInvoiceStatus = newSoldeRestant >= montantTTC ? 'Non payée' : 'Partiellement payée';

        await supabase
          .from('factures')
          .update({
            soldeRestant: roundDA(newSoldeRestant),
            statut: newInvoiceStatus
          })
          .eq('id', paymentFactureId);
      }

      await supabase
        .from('paiements')
        .update({
          factureId: null,
          factureRef: null,
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
        .update(facture)
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('factures')
        .insert([facture])

        if (error) throw error;
        // Note: les factures sont informatives, le solde est géré par les réceptions
        return data;
      }
    } catch (err) {
      console.error('Error saving facture:', err);
      return null;
    }
  }

  // Création manuelle d'une facture depuis une ou plusieurs réceptions
  static async createFactureFromReceptions(
    fournisseurId: string,
    fournisseurNom: string,
    receptionIds: string[],
    lignes: { articleId: string; designation: string; quantite: number; prixUnitaire: number }[],
    options: { tauxTVA: number; timbre: number; fraisPort: number; note?: string }
  ): Promise<Facture | null> {
    try {
      // Récupérer les réceptions ciblées : leurs codes servent au garde-fou anti-doublon
      const recsRes0 = await supabase.from('receptions').select('id, code').in('id', receptionIds);
      const codesRecs: string[] = (recsRes0.data || [])
        .map(r => String(r.code || ''))
        .filter(c => c !== '');

      // Garde-fou anti double-facturation (double clic, double onglet) : refuser si l'une
      // des réceptions figure déjà sur une facture existante.
      const { data: facturesExistantes } = await supabase.from('factures').select('code, receptionCode');
      for (const fac of (facturesExistantes || []) as { code: string; receptionCode?: string | null }[]) {
        const dejaFacturees = (fac.receptionCode || '').split(',').map(c => c.trim()).filter(Boolean);
        const collision = codesRecs.find(c => dejaFacturees.includes(c));
        if (collision) {
          alert(`⛔ Facturation impossible\n\nLa réception ${collision} figure déjà sur la facture ${fac.code}.`);
          return null;
        }
      }

      // Numérotation : max existant + 1 (le comptage seul redonne le même numéro
      // quand une facture a été supprimée ou quand deux créations se chevauchent)
      const { data: codesExistants } = await supabase.from('factures').select('code').like('code', 'FAC-2026-%');
      let maxNum = 0;
      (codesExistants || []).forEach((r: { code?: string }) => {
        const m = (r.code || '').match(/^FAC-2026-(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      });
      const code = `FAC-2026-${String(maxNum + 1).padStart(3, '0')}`;

      // Chaque composant est arrondi au dinar AVANT sommation, pour que la facture reste
      // cohérente en base (TTC = HT + TVA + timbre + port sur des colonnes entières).
      const montantHT = roundDA(lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0));
      const montantTVA = roundDA(montantHT * (options.tauxTVA || 0));
      const timbre = roundDA(options.timbre || 0);
      const fraisPort = roundDA(options.fraisPort || 0);
      const montantTTC = montantHT + montantTVA + timbre + fraisPort;

      // Récupérer les infos des réceptions sélectionnées
      const recsRes = await this.selectFrom('receptions').in('id', receptionIds);
      const recs: any[] = recsRes.data || [];
      const firstRec: any = recs?.[0];

      const factureData = {
        code,
        fournisseurId: fournisseurId,
        fournisseurNom: fournisseurNom,
        commandeId: firstRec?.commandeId || firstRec?.commande_id || null,
        commandeCode: firstRec?.commandeCode || firstRec?.commande_code || null,
        receptionId: receptionIds[0] || null,
        receptionCode: recs?.map((r: any) => r.code).join(', ') || null,
        dateFacture: new Date().toISOString(),
        montantHT: roundDA(montantHT),
        tauxTVA: options.tauxTVA,
        montantTVA: roundDA(montantTVA),
        timbreAlgerien: timbre,
        fraisPort: fraisPort,
        montantTTC: roundDA(montantTTC),
        soldeRestant: roundDA(montantTTC),
        statut: 'Non payée'
        // 'lignes' and 'note' omitted because they don't exist in the factures table schema
      };

      const { data, error } = await supabase.from('factures').insert([factureData]).select().single();
      if (error) throw error;

      await this.logAction('factures', 'create', data.id, null, { code, fournisseurId, montantTTC });
      return data;
    } catch (err) {
      console.error('Error creating facture from receptions:', err);
      return null;
    }
  }

  // Suppression d'une facture d'achat, avec tous les contrôles d'intégrité.
  // Rappel du modèle : la DETTE fournisseur provient des RÉCEPTIONS, jamais des factures.
  // Supprimer une facture ne doit donc JAMAIS modifier `fournisseurs.solde`.
  static async deleteFacture(factureId: string): Promise<{ success: boolean; raison?: string; receptionsLiberees?: string[] }> {
    const cleanId = sanitizeId(factureId);
    if (!cleanId) return { success: false, raison: 'Identifiant de facture invalide.' };

    try {
      const { data: facture } = await supabase.from('factures').select('*').eq('id', cleanId).maybeSingle();
      if (!facture) return { success: false, raison: 'Facture introuvable (déjà supprimée ?).' };

      // CONTRÔLE 1 — règlements rattachés par identifiant
      const { data: paysParId } = await supabase.from('paiements').select('code, montant').eq('factureId', cleanId);
      if (paysParId && paysParId.length > 0) {
        const total = paysParId.reduce((s, p) => s + (p.montant || 0), 0);
        return {
          success: false,
          raison: `Facture ${facture.code} lettrée à ${paysParId.length} règlement(s) : ${paysParId.map(p => p.code).join(', ')} `
            + `(${total.toLocaleString()} DA).\n\nDélettrez ces règlements avant de supprimer la facture.`
        };
      }

      // CONTRÔLE 2 — règlements rattachés par référence seule (lettrage orphelin)
      const { data: paysParRef } = await supabase.from('paiements').select('code').eq('factureRef', facture.code);
      if (paysParRef && paysParRef.length > 0) {
        return {
          success: false,
          raison: `Des règlements portent encore la référence ${facture.code} : ${paysParRef.map(p => p.code).join(', ')}.\n\n`
            + 'Dissociez-les avant de supprimer la facture.'
        };
      }

      // CONTRÔLE 3 — cohérence du restant dû. Sans règlement rattaché, un restant dû
      // inférieur au TTC signale un lettrage passé dont le règlement a disparu :
      // la suppression reste possible, mais on la trace.
      const montantTTC = facture.montantTTC ?? facture.montant_ttc ?? 0;
      const soldeRestant = facture.soldeRestant ?? facture.solde_restant ?? 0;
      const incoherent = soldeRestant !== montantTTC;

      // CONTRÔLE 4 — réceptions associées : le lien est porté par la facture
      // (`receptionCode`), donc la suppression les rend automatiquement re-facturables.
      // Aucune écriture nécessaire côté réceptions, on renvoie la liste pour information.
      const receptionsLiberees = String(facture.receptionCode || '')
        .split(',').map(c => c.trim()).filter(Boolean);

      const { error } = await supabase.from('factures').delete().eq('id', cleanId);
      if (error) throw error;

      await this.logAction('factures', 'delete', cleanId, {
        code: facture.code, montantTTC, soldeRestant, receptionsLiberees, incoherent
      }, null);

      return { success: true, receptionsLiberees };
    } catch (err) {
      console.error('Error deleting facture:', err);
      return { success: false, raison: err instanceof Error ? err.message : 'Erreur inconnue lors de la suppression.' };
    }
  }

  // Recalcule le solde de tous les fournisseurs depuis les réceptions validées (non soldées)
  static async reconcileFournisseurSoldes(): Promise<void> {
    try {
      // Le solde = somme valeur des réceptions validées - somme des paiements
      const { data: receptions } = await supabase
        .from('receptions')
        .select('*')
        .eq('statut', 'Validée');
      const { data: paiements } = await this.selectFrom('paiements');
      const articles = await this.getArticles();

      const soldesByFournisseur: Record<string, number> = {};

      // Additionner la valeur des réceptions validées par fournisseur
      for (const rec of (receptions || [])) {
        // Fournisseur porté par la réception (réception directe), sinon via la commande
        let fid: string | null = rec.fournisseurId || rec.fournisseur_id || null;
        const cmdId = rec.commandeId || rec.commande_id || null;
        if (!fid && cmdId) {
          const { data: cmd } = await supabase
            .from('commandes').select('fournisseurId').eq('id', cmdId).maybeSingle();
          fid = cmd?.fournisseurId || null;
        }
        if (!fid) continue;

        const lignes = rec.lignes || [];
        let ht = 0;
        lignes.forEach((l: { articleId?: string; quantiteRecue?: number; prixUnitaire?: number | null }) => {
          const art = articles.find(a => a.id === l.articleId);
          // Même valorisation qu'à l'enregistrement : prix du BL, sinon PMP
          const prix = l.prixUnitaire !== undefined && l.prixUnitaire !== null && l.prixUnitaire > 0
            ? l.prixUnitaire
            : (art?.prixMoyen || 0);
          ht += prix * (l.quantiteRecue || 0);
        });
        soldesByFournisseur[fid] = (soldesByFournisseur[fid] || 0) + ht;
      }

      // Soustraire les paiements
      for (const pay of (paiements || []) as any[]) {
        const fid = pay.fournisseurId || pay.fournisseur_id;
        if (!fid) continue;
        const montant = pay.montant || 0;
        soldesByFournisseur[fid] = (soldesByFournisseur[fid] || 0) - montant;
      }

      // Mettre à jour tous les fournisseurs
      const allFoursRes = await this.selectFrom('fournisseurs', 'id');
      const allFours: any[] = allFoursRes.data || [];
      for (const f of allFours) {
        const solde = Math.max(0, soldesByFournisseur[f.id] || 0);
        await supabase.from('fournisseurs').update({ solde }).eq('id', f.id);
      }
    } catch (err) {
      console.warn('Error reconciling fournisseur soldes:', err);
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
      
      // Helper to check if string is valid UUID
      const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      const auditData: Record<string, any> = {
        action,
        table: table,
        dateAction: new Date().toISOString()
      };

      // Only add fields if they have valid values
      if (isValidUUID(currentUser.id)) auditData.userId = currentUser.id;
      if (currentUser.name) auditData.userNom = currentUser.name;
      if (currentUser.role) auditData.userRole = currentUser.role;
      
      // Only add recordId if it's a valid UUID
      if (isValidUUID(recordId)) auditData.recordId = recordId;
      
      // Only add values if they exist
      if (beforeValue) auditData.ancienneValeur = JSON.stringify(beforeValue);
      if (afterValue) auditData.nouvelleValeur = JSON.stringify(afterValue);

      const convertedData = camelToSnake(auditData);
      console.log('Audit data (local only, remote disabled):', convertedData);

      // Disable remote insert due to RLS policies blocking anon inserts
      // await supabase
      //   .from('audit_logs')
      //   .insert([convertedData])
      //   .select();
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
      const list = (data || []).map((s: any) => ({
        id: String(s.id),
        magasinId: String(s.magasinId || s.magasin_id || ''),
        articleId: String(s.articleId || s.article_id || ''),
        quantite: typeof s.quantite === 'number' ? s.quantite : Number(s.quantite || 0)
      }));
      this.stocksCache = list;
      return list;
    } catch (err) {
      console.error('Error fetching stocks from Supabase BDD:', err);
      return [];
    }
  }

  static async getMouvementsStock(): Promise<MouvementStock[]> {
    try {
      const { data, error } = await supabase
        .from('mouvements_stock')
        .select('*');

      if (error) throw error;
      const list = (data || []).map((m: any) => ({
        id: String(m.id),
        magasinId: String(m.magasinId || m.magasin_id || ''),
        magasinNom: String(m.magasinNom || m.magasin_nom || 'Magasin'),
        articleId: String(m.articleId || m.article_id || ''),
        articleDesignation: String(m.articleDesignation || m.article_designation || ''),
        type: m.type,
        quantite: typeof m.quantite === 'number' ? m.quantite : Number(m.quantite || 0),
        referenceDoc: String(m.referenceDoc || m.reference_doc || ''),
        dateMouvement: m.dateMouvement || m.date_mouvement || new Date().toISOString(),
        note: m.note,
        utilisateurNom: String(m.utilisateurNom || m.utilisateur_nom || '')
      })).sort((a: any, b: any) => new Date(b.dateMouvement).getTime() - new Date(a.dateMouvement).getTime());

      return list;
    } catch (err) {
      console.error('Error fetching mouvements stock from Supabase BDD:', err);
      return [];
    }
  }

  // ============================================
  // USERS - Additional Methods
  // ============================================

  static logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    try {
      // clear supabase auth session
      supabase.auth.signOut().catch(() => {});
    } catch (e) {
      // ignore
    }
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
        .update(updates)
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

  // `lines[].prixUnitaire` : prix facturé sur le BL. À défaut, le prix de la commande,
  // puis le PMP de l'article. C'est ce prix qui valorise la dette fournisseur.
  static async receiveGoods(commandeId: string, deliveryRef: string, invoiceRef: string | undefined, lines: { articleId: string; quantiteRecue: number; prixUnitaire?: number }[], scanDetails?: string): Promise<Reception | null> {
    try {
      const currentUser = this.getCurrentUser();
      
      const { data: commande } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', commandeId)
        .single();
        
      if (!commande) throw new Error('Commande non trouvée');

      // Generate a unique code: use max existing number + 1 to avoid collisions after deletions
      const { data: existingCodes } = await supabase
        .from('receptions')
        .select('code')
        .like('code', 'BR-2026-%');
      let maxNum = 0;
      (existingCodes || []).forEach((r: any) => {
        const match = (r.code || '').match(/BR-2026-(\d+)/);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
      });
      const code = `BR-2026-${String(maxNum + 1).padStart(3, '0')}`;

      const receptionLignes: any[] = [];
      const updatedCommandeLines = (commande.lignes || []).map((poLine: any) => {
        const match = lines.find(l => l.articleId === poLine.articleId);
        const qtyRecueThisTime = match ? match.quantiteRecue : 0;

        if (qtyRecueThisTime > 0) {
          const prixSaisi = match?.prixUnitaire;
          receptionLignes.push({
            articleId: poLine.articleId,
            designation: poLine.designation,
            quantiteDemandee: poLine.quantite,
            quantiteRecue: qtyRecueThisTime,
            // Prix retenu pour la dette : saisi sur le BL, sinon prix commandé
            prixUnitaire: prixSaisi !== undefined && prixSaisi !== null ? prixSaisi : (poLine.prixUnitaire || 0)
          });
        }

        return {
          ...poLine,
          quantiteRecue: (poLine.quantiteRecue || 0) + qtyRecueThisTime
        };
      });

      for (const rl of receptionLignes) {
        const magId = commande.magasinDestinationId || commande.magasin_destination_id;
        const allStocks = await this.getStocks();
        const existingStock = allStocks.find(
          (s: any) => (s.magasinId === magId || s.magasin_id === magId) &&
                      (s.articleId === rl.articleId || s.article_id === rl.articleId)
        );

        const currentQty = existingStock ? (existingStock.quantite || 0) : 0;
        await this.updateStock(magId, rl.articleId, currentQty + rl.quantiteRecue);

        const mouvementData = {
          magasinId: magId,
          magasinNom: 'Magasin',
          articleId: rl.articleId,
          articleDesignation: rl.designation,
          type: 'ENTREE_ACHAT',
          quantite: rl.quantiteRecue,
          referenceDoc: code,
          utilisateurNom: currentUser.name,
          dateMouvement: new Date().toISOString(),
          note: `Réception Marchandise via ${code}`
        };

        await supabase.from('mouvements_stock').insert([mouvementData]);
      }

      const allReceived = updatedCommandeLines.every((l: any) => l.quantiteRecue >= l.quantite);
      const partiallyReceived = updatedCommandeLines.some((l: any) => l.quantiteRecue > 0);
      const newStatus = allReceived ? 'Reçu totalement' : (partiallyReceived ? 'Reçu partiellement' : 'Commandé');

      await supabase
        .from('commandes')
        .update({ lignes: updatedCommandeLines, statut: newStatus })
        .eq('id', commandeId);

      const receptionData: Partial<Reception> = {
        code,
        commandeId,
        commandeCode: commande.code,
        magasinId: commande.magasinDestinationId || commande.magasin_destination_id,
        magasinNom: 'Magasin',
        dateReception: new Date().toISOString(),
        bonLivraisonRef: deliveryRef,
        factureFournisseurRef: invoiceRef,
        lignes: receptionLignes,
        scanDetails,
        magasinierId: currentUser.id,
        magasinierNom: currentUser.name,
        statut: 'Validée'
      };

      const { data: reception, error: recError } = await supabase
        .from('receptions')
        .insert([receptionData])
        .select()
        .single();
        
      if (recError) throw recError;

      // Incrémenter le solde fournisseur basé sur la valeur réelle des articles reçus
      // (prix du BL / de la commande, avec repli sur le PMP si aucun prix n'est connu)
      let receptionHT = 0;
      const articles = await this.getArticles();
      for (const rl of receptionLignes) {
        const art = articles.find(a => a.id === rl.articleId);
        const prix = rl.prixUnitaire !== undefined && rl.prixUnitaire !== null && rl.prixUnitaire > 0
          ? rl.prixUnitaire
          : (art?.prixMoyen || 0);
        receptionHT += prix * rl.quantiteRecue;
      }
      if (commande.fournisseurId && receptionHT > 0) {
        const { data: four } = await supabase
          .from('fournisseurs').select('solde').eq('id', commande.fournisseurId).maybeSingle();
        if (four !== null) {
          await supabase.from('fournisseurs')
            .update({ solde: roundDA((four?.solde || 0) + receptionHT) })
            .eq('id', commande.fournisseurId);
        }
      }

      await this.logAction('receptions', 'create', reception.id, null, reception);
      return reception;
    } catch (err) {
      console.error('Error receiving goods:', err);
      throw err;
    }
  }


  // ============================================
  // INVENTAIRES
  // ============================================

  static async getInventaires(): Promise<Inventaire[]> {
    if (this.isInventairesAvailable === false) {
      return this.inventairesCache;
    }
    try {
      const { data, error } = await supabase
        .from('inventaires')
        .select('*')
        .order('date_inventaire', { ascending: false });

      if (error) {
        this.isInventairesAvailable = false;
        return this.inventairesCache;
      }
      this.isInventairesAvailable = true;
      const list = (data || []).map((inv: any) => {
        let lignes = inv.lignes;
        if (typeof lignes === 'string') {
          try { lignes = JSON.parse(lignes); } catch { lignes = []; }
        }
        if (!Array.isArray(lignes)) lignes = [];
        return {
          ...inv,
          lignes,
          magasinId: inv.magasin_id,
          magasinNom: inv.magasin_nom,
          dateInventaire: inv.date_inventaire,
          creeParNom: inv.created_by_nom,
          valideParNom: inv.validated_at ? inv.created_by_nom : undefined
        };
      });
      this.inventairesCache = list;
      return list;
    } catch {
      this.isInventairesAvailable = false;
      return this.inventairesCache;
    }
  }

  static async createInventaire(magasinId: string, note?: string): Promise<Inventaire> {
    const currentUser = this.getCurrentUser();
    const magasins = await this.getMagasins();
    const magasin = magasins.find(m => m.id === magasinId);
    const articles = await this.getArticles();
    const stocks = (await this.getStocks()).filter(s => s.magasinId === magasinId);

    const count = this.inventairesCache.length + 1;
    const code = `INV-2026-${String(count).padStart(3, '0')}`;

    const lignes: InventaireLigne[] = articles.map(art => {
      const stk = stocks.find(s => s.articleId === art.id);
      const quantiteTheorique = stk ? stk.quantite : 0;
      return {
        articleId: art.id,
        designation: art.designation,
        quantiteTheorique,
        quantiteReelle: quantiteTheorique,
        ecart: 0
      };
    });

    const inv: Inventaire = {
      id: `inv-${Date.now()}`,
      code,
      magasinId,
      magasinNom: magasin?.nom || 'Dépôt Central',
      dateInventaire: new Date().toISOString(),
      statut: 'Brouillon',
      lignes,
      creeParNom: currentUser.name,
      note
    };

    const dbInv = {
      code,
      magasin_id: magasinId,
      magasin_nom: inv.magasinNom,
      date_inventaire: inv.dateInventaire,
      statut: 'Brouillon',
      lignes,
      created_by_nom: currentUser.name,
      note
    };

    try {
      const { data, error } = await supabase
        .from('inventaires')
        .insert([dbInv])
        .select()
        .single();

      if (error) throw error;
      
      const created = {
        ...data,
        magasinId: data.magasin_id,
        magasinNom: data.magasin_nom,
        dateInventaire: data.date_inventaire,
        creeParNom: data.created_by_nom
      };
      
      this.inventairesCache.unshift(created);
      return created;
    } catch (e) {
      console.warn('Inventaires insert error, keeping in cache:', e);
    }
    return inv;
  }

  static async validateInventaire(inventaireId: string, updatedLignes: InventaireLigne[]): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    const inventaires = await this.getInventaires();
    const inv = inventaires.find(i => i.id === inventaireId);
    if (!inv) return false;

    for (const line of updatedLignes) {
      const ecart = line.quantiteReelle - line.quantiteTheorique;
      line.ecart = ecart;

      if (ecart !== 0) {
        await this.updateStock(inv.magasinId, line.articleId, line.quantiteReelle);

        const mouvementData = {
          magasinId: inv.magasinId,
          magasinNom: inv.magasinNom,
          articleId: line.articleId,
          articleDesignation: line.designation,
          type: ecart > 0 ? 'ENTREE_INVENTAIRE' : 'SORTIE_INVENTAIRE',
          quantite: Math.abs(ecart),
          referenceDoc: inv.code,
          utilisateurNom: currentUser.name,
          dateMouvement: new Date().toISOString(),
          note: `Régularisation d'inventaire (${ecart > 0 ? '+' : ''}${ecart})`
        };

        try {
          await supabase.from('mouvements_stock').insert([mouvementData]);
        } catch (e) {
          console.warn('Error saving inventaire movement:', e);
        }
      }
    }

    inv.lignes = updatedLignes;
    inv.statut = 'Validé';
    inv.valideParNom = currentUser.name;

    try {
      await supabase
        .from('inventaires')
        .update({ 
          lignes: updatedLignes, 
          statut: 'Validé', 
          validated_at: new Date().toISOString() 
        })
        .eq('id', inventaireId);
    } catch (e) {
      console.warn('Error updating inventaire in DB:', e);
    }

    return true;
  }

  static async deleteInventaire(id: string | any): Promise<boolean> {
    try {
      const cleanId = sanitizeId(id);
      if (!cleanId) {
        console.error('Error deleting inventaire: Invalid ID provided', id);
        return false;
      }
      const { error } = await supabase.from('inventaires').delete().eq('id', cleanId);
      if (error) throw error;
      this.inventairesCache = this.inventairesCache.filter(inv => inv.id !== cleanId);
      return true;
    } catch (e) {
      console.warn('Error deleting inventaire:', e);
      return false;
    }
  }

  // ============================================
  // EMPLOYÉS & CHANTIERS
  // ============================================
  // Les tables `employes` / `chantiers` peuvent être absentes d'un déploiement : comme
  // pour `inventaires` et `societe`, l'absence est détectée et exposée à l'UI, qui bascule
  // alors en lecture seule sur les listes codées en dur (DEFAULT_EMPLOYES / DEFAULT_CHANTIERS).
  // Script de création : db/create_employes_chantiers.sql
  //
  // Identifiants en TEXT ('emp-…' / 'cha-…') et non UUID : les affectations déjà émises
  // référencent les valeurs codées en dur, qu'on doit pouvoir continuer à résoudre.
  static isEmployesAvailable = true;
  static isChantiersAvailable = true;
  static employesCache: Employe[] = DEFAULT_EMPLOYES;
  static chantiersCache: Chantier[] = DEFAULT_CHANTIERS;

  // PGRST205 = table introuvable dans le cache de schéma PostgREST
  private static isMissingTableError(error: any): boolean {
    return error?.code === 'PGRST205' || /schema cache|does not exist/i.test(error?.message || '');
  }

  private static mapEmployeFromDb(row: any): Employe {
    return {
      id: String(row.id),
      nom: String(row.nom || ''),
      fonction: row.fonction || '',
      service: row.service || '',
      telephone: row.telephone || '',
      chantierId: row.chantierId || row.chantier_id || undefined,
      chantierNom: row.chantierNom || row.chantier_nom || undefined,
      actif: row.actif ?? true
    };
  }

  private static mapChantierFromDb(row: any): Chantier {
    return {
      id: String(row.id),
      nom: String(row.nom || ''),
      wilaya: row.wilaya || '',
      chefNom: row.chefNom || row.chef_nom || '',
      actif: row.actif ?? true
    };
  }

  // Comparaison de libellés pour le contrôle d'unicité : sans casse, sans accent,
  // espaces normalisés (« Mustapha  LOUCIF » et « mustapha loucif » sont un doublon).
  private static normalizeLibelle(valeur: string): string {
    return (valeur || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  static async getEmployes(): Promise<Employe[]> {
    try {
      const { data, error } = await supabase.from('employes').select('*').order('nom');

      if (error) {
        if (this.isMissingTableError(error)) {
          this.isEmployesAvailable = false;
          this.employesCache = DEFAULT_EMPLOYES;
          return DEFAULT_EMPLOYES;
        }
        throw error;
      }

      this.isEmployesAvailable = true;
      const list = (data || []).map(row => this.mapEmployeFromDb(row));
      this.employesCache = list;
      return list;
    } catch (err) {
      console.error('Error fetching employes:', err);
      this.employesCache = DEFAULT_EMPLOYES;
      return DEFAULT_EMPLOYES;
    }
  }

  static async getChantiers(): Promise<Chantier[]> {
    try {
      const { data, error } = await supabase.from('chantiers').select('*').order('nom');

      if (error) {
        if (this.isMissingTableError(error)) {
          this.isChantiersAvailable = false;
          this.chantiersCache = DEFAULT_CHANTIERS;
          return DEFAULT_CHANTIERS;
        }
        throw error;
      }

      this.isChantiersAvailable = true;
      const list = (data || []).map(row => this.mapChantierFromDb(row));
      this.chantiersCache = list;
      return list;
    } catch (err) {
      console.error('Error fetching chantiers:', err);
      this.chantiersCache = DEFAULT_CHANTIERS;
      return DEFAULT_CHANTIERS;
    }
  }

  // Création ou mise à jour d'un employé. Les contrôles bloquants (champs obligatoires,
  // unicité du nom, chantier livré) lèvent une Error dont le message est affiché tel quel.
  static async saveEmploye(employe: Partial<Employe>): Promise<Employe> {
    if (!this.isEmployesAvailable) {
      throw new Error('Table « employes » absente de la base. Exécutez db/create_employes_chantiers.sql dans l\'éditeur SQL Supabase.');
    }

    const cleanId = employe.id ? sanitizeId(employe.id) : null;
    const nom = (employe.nom || '').trim();
    if (nom.length < 3) throw new Error('Le nom de l\'employé est obligatoire (3 caractères minimum).');
    if (!(employe.fonction || '').trim()) throw new Error('La fonction de l\'employé est obligatoire.');
    if (!(employe.service || '').trim()) throw new Error('Le service / département est obligatoire.');

    // Unicité du nom (hors lui-même en modification) : contrôle applicatif doublé
    // d'un index unique sur lower(nom) en base.
    const doublon = this.employesCache.find(
      e => e.id !== cleanId && this.normalizeLibelle(e.nom) === this.normalizeLibelle(nom)
    );
    if (doublon) throw new Error(`Un employé nommé « ${doublon.nom} » existe déjà.`);

    // Un employé ne peut pas être affecté à un chantier livré (inactif). Le contrôle ne
    // porte que sur une NOUVELLE affectation : sinon un employé rattaché à un chantier
    // livré deviendrait impossible à modifier (ne serait-ce que pour le désactiver).
    const ancien = cleanId ? this.employesCache.find(e => e.id === cleanId) : null;
    let chantierNom = '';
    if (employe.chantierId) {
      const chantier = this.chantiersCache.find(c => c.id === employe.chantierId);
      if (!chantier) throw new Error('Le chantier sélectionné est introuvable.');
      if (!chantier.actif && ancien?.chantierId !== employe.chantierId) {
        throw new Error(`Le chantier « ${chantier.nom} » est livré (inactif) : impossible d'y affecter un employé.`);
      }
      chantierNom = chantier.nom;
    }

    const row: Record<string, any> = {
      nom,
      fonction: (employe.fonction || '').trim(),
      service: (employe.service || '').trim(),
      telephone: (employe.telephone || '').trim(),
      chantierId: employe.chantierId || null,
      chantierNom: employe.chantierId ? chantierNom : null,
      actif: employe.actif ?? true,
      updated_at: new Date().toISOString()
    };

    try {
      if (cleanId) {
        const { data, error } = await supabase.from('employes').update(row).eq('id', cleanId).select().single();
        if (error) throw error;
        await this.logAction('employes', 'update', cleanId, null, row);
        const updated = this.mapEmployeFromDb(data);
        const idx = this.employesCache.findIndex(e => e.id === cleanId);
        if (idx !== -1) this.employesCache[idx] = updated;
        return updated;
      }

      const nouveau = { ...row, id: `emp-${Date.now().toString(36)}`, created_at: new Date().toISOString() };
      const { data, error } = await supabase.from('employes').insert([nouveau]).select().single();
      if (error) throw error;
      await this.logAction('employes', 'create', nouveau.id, null, nouveau);
      const cree = this.mapEmployeFromDb(data);
      this.employesCache = [...this.employesCache, cree];
      return cree;
    } catch (err: any) {
      // 23505 = violation de l'index unique sur lower(nom)
      if (err?.code === '23505') throw new Error(`Un employé nommé « ${nom} » existe déjà en base.`, { cause: err });
      console.error('Error saving employe:', err);
      throw new Error(err?.message || 'Erreur lors de l\'enregistrement de l\'employé.', { cause: err });
    }
  }

  // Suppression d'un employé, refusée s'il est référencé par un bon de sortie.
  static async deleteEmploye(id: string | any): Promise<{ success: boolean; raison?: string }> {
    const cleanId = sanitizeId(id);
    if (!cleanId) return { success: false, raison: 'Identifiant employé invalide.' };
    if (!this.isEmployesAvailable) {
      return { success: false, raison: 'Table « employes » absente de la base. Exécutez db/create_employes_chantiers.sql.' };
    }

    try {
      // Contrôle côté serveur : les affectations sont la seule pièce qui référence un employé.
      const { data: liees, error: errAff } = await supabase
        .from('affectations')
        .select('code')
        .eq('employeId', cleanId)
        .limit(5);

      if (!errAff && liees && liees.length > 0) {
        const codes = liees.map((a: any) => a.code).filter(Boolean).join(', ');
        return {
          success: false,
          raison: `Cet employé est référencé par ${liees.length >= 5 ? 'au moins 5' : liees.length} bon(s) de sortie${codes ? ` (${codes})` : ''}.\n\n` +
                  'Désactivez-le (sortie des effectifs) plutôt que de le supprimer : l\'historique des bons reste ainsi lisible.'
        };
      }

      const { error } = await supabase.from('employes').delete().eq('id', cleanId);
      if (error) throw error;

      await this.logAction('employes', 'delete', cleanId, null, null);
      this.employesCache = this.employesCache.filter(e => e.id !== cleanId);
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting employe:', err);
      return { success: false, raison: err?.message || 'Erreur lors de la suppression de l\'employé.' };
    }
  }

  static async saveChantier(chantier: Partial<Chantier>): Promise<Chantier> {
    if (!this.isChantiersAvailable) {
      throw new Error('Table « chantiers » absente de la base. Exécutez db/create_employes_chantiers.sql dans l\'éditeur SQL Supabase.');
    }

    const cleanId = chantier.id ? sanitizeId(chantier.id) : null;
    const nom = (chantier.nom || '').trim();
    if (nom.length < 3) throw new Error('La désignation du chantier est obligatoire (3 caractères minimum).');
    if (!(chantier.wilaya || '').trim()) throw new Error('La wilaya du chantier est obligatoire.');
    if (!(chantier.chefNom || '').trim()) throw new Error('Le conducteur de travaux est obligatoire.');

    const doublon = this.chantiersCache.find(
      c => c.id !== cleanId && this.normalizeLibelle(c.nom) === this.normalizeLibelle(nom)
    );
    if (doublon) throw new Error(`Un chantier nommé « ${doublon.nom} » existe déjà.`);

    const row: Record<string, any> = {
      nom,
      wilaya: (chantier.wilaya || '').trim(),
      chefNom: (chantier.chefNom || '').trim(),
      actif: chantier.actif ?? true,
      updated_at: new Date().toISOString()
    };

    try {
      if (cleanId) {
        const ancien = this.chantiersCache.find(c => c.id === cleanId);
        const { data, error } = await supabase.from('chantiers').update(row).eq('id', cleanId).select().single();
        if (error) throw error;
        await this.logAction('chantiers', 'update', cleanId, ancien, row);

        const updated = this.mapChantierFromDb(data);
        const idx = this.chantiersCache.findIndex(c => c.id === cleanId);
        if (idx !== -1) this.chantiersCache[idx] = updated;

        // `chantierNom` est dénormalisé sur les employés : un renommage doit être répercuté,
        // sinon la colonne « Chantier Affecté » affiche l'ancien libellé.
        if (ancien && ancien.nom !== updated.nom) {
          await supabase.from('employes').update({ chantierNom: updated.nom }).eq('chantierId', cleanId);
          this.employesCache = this.employesCache.map(e =>
            e.chantierId === cleanId ? { ...e, chantierNom: updated.nom } : e
          );
        }
        return updated;
      }

      const nouveau = { ...row, id: `cha-${Date.now().toString(36)}`, created_at: new Date().toISOString() };
      const { data, error } = await supabase.from('chantiers').insert([nouveau]).select().single();
      if (error) throw error;
      await this.logAction('chantiers', 'create', nouveau.id, null, nouveau);
      const cree = this.mapChantierFromDb(data);
      this.chantiersCache = [...this.chantiersCache, cree];
      return cree;
    } catch (err: any) {
      if (err?.code === '23505') throw new Error(`Un chantier nommé « ${nom} » existe déjà en base.`, { cause: err });
      console.error('Error saving chantier:', err);
      throw new Error(err?.message || 'Erreur lors de l\'enregistrement du chantier.', { cause: err });
    }
  }

  // Suppression d'un chantier, refusée s'il porte des employés ou des bons de sortie.
  static async deleteChantier(id: string | any): Promise<{ success: boolean; raison?: string }> {
    const cleanId = sanitizeId(id);
    if (!cleanId) return { success: false, raison: 'Identifiant chantier invalide.' };
    if (!this.isChantiersAvailable) {
      return { success: false, raison: 'Table « chantiers » absente de la base. Exécutez db/create_employes_chantiers.sql.' };
    }

    try {
      const motifs: string[] = [];

      const { data: empLies, error: errEmp } = await supabase
        .from('employes')
        .select('nom')
        .eq('chantierId', cleanId)
        .limit(10);
      if (!errEmp && empLies && empLies.length > 0) {
        motifs.push(`• ${empLies.length} employé(s) affecté(s) : ${empLies.map((e: any) => e.nom).join(', ')}`);
      }

      const { data: affLiees, error: errAff } = await supabase
        .from('affectations')
        .select('code')
        .eq('chantierId', cleanId)
        .limit(5);
      if (!errAff && affLiees && affLiees.length > 0) {
        motifs.push(`• Bon(s) de sortie matériel : ${affLiees.map((a: any) => a.code).filter(Boolean).join(', ')}`);
      }

      if (motifs.length > 0) {
        return {
          success: false,
          raison: 'Ce chantier est encore référencé par :\n\n' + motifs.join('\n') +
                  '\n\nRéaffectez les employés et conservez les bons émis : marquez plutôt le chantier comme « Livré » (décochez « Chantier actif »).'
        };
      }

      const { error } = await supabase.from('chantiers').delete().eq('id', cleanId);
      if (error) throw error;

      await this.logAction('chantiers', 'delete', cleanId, null, null);
      this.chantiersCache = this.chantiersCache.filter(c => c.id !== cleanId);
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting chantier:', err);
      return { success: false, raison: err?.message || 'Erreur lors de la suppression du chantier.' };
    }
  }

  // ============================================
  // SAUVEGARDE DE LA BASE (export brut)
  // ============================================
  // L'export copie les lignes TELLES QU'ELLES SONT en base : aucun mappage
  // camelCase / snake_case, aucun repli sur les valeurs par défaut. Le fichier doit
  // pouvoir être relu et réinjecté sans transformation, y compris pour les tables
  // dont la casse des colonnes diverge (users, inventaires en snake_case).
  static readonly TABLES_SAUVEGARDE: string[] = [
    'societe',
    'magasins',
    'articles',
    'fournisseurs',
    'chantiers',
    'employes',
    'users',
    'stocks',
    'mouvements_stock',
    'commandes',
    'commande_lignes',
    'receptions',
    'reception_lignes',
    'affectations',
    'transferts',
    'transfert_lignes',
    'inventaires',
    'factures',
    'paiements',
    'audit_logs'
  ];

  // PostgREST plafonne une réponse à 1000 lignes : sans pagination, une sauvegarde
  // de `mouvements_stock` serait silencieusement tronquée.
  private static async lireTableComplete(table: string): Promise<any[]> {
    const TAILLE_LOT = 1000;
    const lignes: any[] = [];
    for (let debut = 0; ; debut += TAILLE_LOT) {
      const { data, error } = await supabase.from(table).select('*').range(debut, debut + TAILLE_LOT - 1);
      if (error) throw error;
      const lot = data || [];
      lignes.push(...lot);
      if (lot.length < TAILLE_LOT) break;
    }
    return lignes;
  }

  static async exporterSauvegarde(options?: {
    inclureMotsDePasse?: boolean;
    onProgress?: (table: string, index: number, total: number) => void;
  }): Promise<{
    meta: Record<string, any>;
    tables: Record<string, any[]>;
    statistiques: Record<string, number>;
    tablesAbsentes: string[];
    erreurs: { table: string; message: string }[];
  }> {
    const tables: Record<string, any[]> = {};
    const statistiques: Record<string, number> = {};
    const tablesAbsentes: string[] = [];
    const erreurs: { table: string; message: string }[] = [];
    const total = this.TABLES_SAUVEGARDE.length;

    for (let i = 0; i < total; i++) {
      const table = this.TABLES_SAUVEGARDE[i];
      options?.onProgress?.(table, i, total);
      try {
        let lignes = await this.lireTableComplete(table);

        // Les mots de passe sont stockés en clair dans users.password_hash : par défaut
        // ils sont masqués pour qu'une sauvegarde égarée ne livre pas tous les comptes.
        if (table === 'users' && !options?.inclureMotsDePasse) {
          lignes = lignes.map(u => ({ ...u, password_hash: u.password_hash ? '***MASQUE***' : u.password_hash }));
        }

        tables[table] = lignes;
        statistiques[table] = lignes.length;
      } catch (err: any) {
        if (this.isMissingTableError(err)) {
          tablesAbsentes.push(table);
        } else {
          erreurs.push({ table, message: err?.message || String(err) });
        }
      }
    }
    options?.onProgress?.('', total, total);

    const utilisateur = this.getCurrentUser();
    return {
      meta: {
        application: 'BG Maçonnerie / BGM Central',
        formatVersion: 1,
        genereLe: new Date().toISOString(),
        genereParNom: utilisateur?.name || '',
        genereParRole: utilisateur?.role || '',
        projetSupabase: supabaseUrl,
        motsDePasseInclus: !!options?.inclureMotsDePasse,
        tablesExportees: Object.keys(tables),
        nombreLignesTotal: Object.values(statistiques).reduce((somme, n) => somme + n, 0)
      },
      tables,
      statistiques,
      tablesAbsentes,
      erreurs
    };
  }

  // Variante restaurable de la sauvegarde : un script SQL rejouable dans l'éditeur
  // SQL Supabase, sans aucun outil installé ni mot de passe de base.
  //
  // Chaque table est réinjectée via `jsonb_populate_recordset(NULL::public.<table>, …)` :
  // c'est le type de ligne de la table qui pilote les conversions, donc les colonnes
  // JSONB (`commandes.lignes`), les tableaux (`users.magasins_ids`) et les dates sont
  // restaurés correctement, là où des INSERT à valeurs formatées à la main casseraient.
  //
  // Attention : ce script ne contient QUE les données, pas le schéma, et seulement ce
  // que la RLS laisse lire à l'utilisateur connecté. La sauvegarde complète
  // (schéma + contraintes + policies + données) reste `npm run backup-db` (pg_dump).
  static async exporterSauvegardeSQL(options?: {
    inclureMotsDePasse?: boolean;
    onProgress?: (table: string, index: number, total: number) => void;
  }): Promise<{ sql: string; statistiques: Record<string, number>; tablesAbsentes: string[]; erreurs: { table: string; message: string }[]; meta: Record<string, any> }> {
    const sauvegarde = await this.exporterSauvegarde(options);

    const echapper = (texte: string) => texte.replace(/'/g, "''");
    const tablesRemplies = Object.entries(sauvegarde.tables).filter(([, lignes]) => lignes.length > 0);

    const morceaux: string[] = [];
    morceaux.push('-- ============================================================');
    morceaux.push('-- Sauvegarde des DONNEES — BG Maconnerie / BGM Central');
    morceaux.push(`-- Genere le ${new Date().toLocaleString('fr-FR')} par ${sauvegarde.meta.genereParNom || 'inconnu'}`);
    morceaux.push(`-- Projet : ${supabaseUrl}`);
    morceaux.push(`-- ${sauvegarde.meta.nombreLignesTotal} ligne(s) sur ${tablesRemplies.length} table(s)`);
    morceaux.push('--');
    morceaux.push('-- RESTAURATION : coller ce script dans l\'editeur SQL Supabase et l\'executer.');
    morceaux.push('-- Le schema doit deja exister (db/supabase_init.sql, db/create_*.sql).');
    morceaux.push('-- Les lignes deja presentes ne sont PAS ecrasees (ON CONFLICT DO NOTHING).');
    morceaux.push('-- Pour un remplacement complet, decommenter le bloc TRUNCATE ci-dessous.');
    if (!sauvegarde.meta.motsDePasseInclus) {
      morceaux.push('--');
      morceaux.push('-- ATTENTION : les mots de passe sont masques (***MASQUE***) dans cette sauvegarde.');
      morceaux.push('-- Ils devront etre redefinis apres restauration de la table users.');
    }
    morceaux.push('-- ============================================================');
    morceaux.push('');
    morceaux.push('BEGIN;');
    morceaux.push('');
    morceaux.push('-- Remplacement complet : vider les tables avant reinjection.');
    morceaux.push('-- TRUNCATE ' + tablesRemplies.map(([t]) => `public.${t}`).join(', ') + ' CASCADE;');
    morceaux.push('');

    for (const [table, lignes] of Object.entries(sauvegarde.tables)) {
      if (lignes.length === 0) {
        morceaux.push(`-- ${table} : aucune ligne`);
        morceaux.push('');
        continue;
      }
      morceaux.push(`-- ${table} : ${lignes.length} ligne(s)`);
      morceaux.push(`INSERT INTO public.${table}`);
      morceaux.push(`SELECT * FROM jsonb_populate_recordset(NULL::public.${table}, '${echapper(JSON.stringify(lignes))}'::jsonb)`);
      morceaux.push('ON CONFLICT DO NOTHING;');
      morceaux.push('');
    }

    morceaux.push('COMMIT;');
    morceaux.push('');
    for (const [table, nb] of Object.entries(sauvegarde.statistiques)) {
      morceaux.push(`-- attendu apres restauration : ${table} >= ${nb} ligne(s)`);
    }

    return {
      sql: morceaux.join('\n'),
      statistiques: sauvegarde.statistiques,
      tablesAbsentes: sauvegarde.tablesAbsentes,
      erreurs: sauvegarde.erreurs,
      meta: sauvegarde.meta
    };
  }

  // ============================================
  // PLACEHOLDER METHODS
  // ============================================

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

  // ============================================
  // SOCIÉTÉ (identité + coordonnées de l'entreprise)
  // ============================================
  // La table `societe` peut être absente d'un déploiement : comme pour `inventaires`,
  // l'absence est détectée et exposée à l'UI plutôt que de faire échouer le chargement.
  // Script de création : db/create_societe.sql
  static isSocieteAvailable = true;
  static societeCache: Societe | null = null;

  static async getSociete(): Promise<Societe | null> {
    try {
      const { data, error } = await supabase
        .from('societe')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        // PGRST205 = table introuvable dans le cache de schéma PostgREST
        if (error.code === 'PGRST205' || /schema cache|does not exist/i.test(error.message || '')) {
          this.isSocieteAvailable = false;
          return null;
        }
        throw error;
      }

      this.isSocieteAvailable = true;
      if (!data) {
        this.societeCache = null;
        return null;
      }

      const societe: Societe = {
        id: String(data.id),
        raisonSociale: String(data.raisonSociale || data.raison_sociale || ''),
        formeJuridique: data.formeJuridique || data.forme_juridique || '',
        activite: data.activite || '',
        rc: data.rc || '',
        nif: data.nif || '',
        nis: data.nis || '',
        ai: data.ai || '',
        capitalSocial: Number(data.capitalSocial || data.capital_social || 0),
        adresse: data.adresse || '',
        ville: data.ville || '',
        wilaya: data.wilaya || '',
        codePostal: data.codePostal || data.code_postal || '',
        telephone: data.telephone || '',
        telephone2: data.telephone2 || '',
        fax: data.fax || '',
        email: data.email || '',
        siteWeb: data.siteWeb || data.site_web || '',
        banque: data.banque || '',
        rib: data.rib || '',
        logoUrl: data.logoUrl || data.logo_url || '',
        note: data.note || ''
      };
      this.societeCache = societe;
      return societe;
    } catch (err) {
      console.error('Error fetching societe:', err);
      return null;
    }
  }

  // Enregistre la ligne unique de la table : mise à jour si elle existe, insertion sinon.
  static async saveSociete(societe: Partial<Societe>): Promise<Societe | null> {
    try {
      // capitalSocial est un entier en base : arrondir comme toute écriture monétaire.
      const row: any = {
        raisonSociale: societe.raisonSociale || '',
        formeJuridique: societe.formeJuridique || '',
        activite: societe.activite || '',
        rc: societe.rc || '',
        nif: societe.nif || '',
        nis: societe.nis || '',
        ai: societe.ai || '',
        capitalSocial: roundDA(societe.capitalSocial || 0),
        adresse: societe.adresse || '',
        ville: societe.ville || '',
        wilaya: societe.wilaya || '',
        codePostal: societe.codePostal || '',
        telephone: societe.telephone || '',
        telephone2: societe.telephone2 || '',
        fax: societe.fax || '',
        email: societe.email || '',
        siteWeb: societe.siteWeb || '',
        banque: societe.banque || '',
        rib: societe.rib || '',
        logoUrl: societe.logoUrl || '',
        note: societe.note || '',
        updated_at: new Date().toISOString()
      };

      const existant = societe.id ? { id: societe.id } : (await this.getSociete());

      let data: any;
      if (existant?.id) {
        const res = await supabase.from('societe').update(row).eq('id', existant.id).select().single();
        if (res.error) throw res.error;
        data = res.data;
        await this.logAction('societe', 'update', existant.id, null, row);
      } else {
        const res = await supabase.from('societe').insert([row]).select().single();
        if (res.error) throw res.error;
        data = res.data;
        await this.logAction('societe', 'create', data.id, null, row);
      }

      this.societeCache = { ...(row as Societe), id: String(data.id) };
      return this.societeCache;
    } catch (err) {
      console.error('Error saving societe:', err);
      throw err;
    }
  }

  static async createTransfertRequest(transfert: Partial<any>): Promise<any> {
    try {
      const currentUser = this.getCurrentUser();
      const { magasinDepartId, magasinDestId, lignes, motif } = transfert;

      if (!magasinDepartId || !magasinDestId || !lignes || lignes.length === 0) {
        throw new Error('Champs requis manquants pour le transfert');
      }

      const magasins = await this.getMagasins();
      const magDepart = magasins.find(m => m.id === magasinDepartId);
      const magDest = magasins.find(m => m.id === magasinDestId);

      // Generate unique code
      const { data: existingCodes } = await supabase
        .from('transferts')
        .select('code')
        .like('code', 'TR-2026-%');
      let maxNum = 0;
      (existingCodes || []).forEach((t: any) => {
        const match = (t.code || '').match(/TR-2026-(\d+)/);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
      });
      const code = `TR-2026-${String(maxNum + 1).padStart(3, '0')}`;

      const row = {
        code,
        magasinDepartId,
        magasinDepartNom: magDepart?.nom || 'Dépôt départ',
        magasinDestId,
        magasinDestNom: magDest?.nom || 'Dépôt destination',
        lignes,
        motif: motif || '',
        statut: 'Demande',
        dateDemande: new Date().toISOString(),
        demandeurNom: currentUser.name
      };

      const { data, error } = await supabase
        .from('transferts')
        .insert([row])
        .select()
        .single();


      if (error) throw error;
      await this.logAction('transferts', 'create', data.id, null, data);
      return data;
    } catch (err) {
      console.error('Error creating transfert:', err);
      throw err;
    }
  }

  static async deleteTransfert(transfertId: string): Promise<boolean> {
    try {
      const cleanId = sanitizeId(transfertId);
      if (!cleanId) return false;

      let { data: tr, error: fetchErr } = await supabase
        .from('transferts')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (!tr) {
        const { error: directErr } = await supabase.from('transferts').delete().eq('id', cleanId);
        if (!directErr) return true;
        console.error('Transfert introuvable:', fetchErr || directErr);
        return false;
      }

      const statutTr = normalizeTransfertStatut(tr.statut);
      if (statutTr === 'Validé' || statutTr === 'Reçu') {
        alert('⛔ Suppression impossible\n\nCe bon de transfert a déjà été validé ou reçu. Seules les demandes de transfert en attente peuvent être supprimées.');
        return false;
      }

      const { error: delErr } = await supabase
        .from('transferts')
        .delete()
        .eq('id', cleanId);

      if (delErr) {
        console.error('Error executing delete on transferts:', delErr);
        throw delErr;
      }

      await this.logAction('transferts', 'delete', cleanId, tr, null);
      return true;
    } catch (err) {
      console.error('Error deleting transfert:', err);
      return false;
    }
  }
}

