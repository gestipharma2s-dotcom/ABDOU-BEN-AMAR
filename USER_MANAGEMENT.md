# 📋 Gestion Complète des Utilisateurs - Documentation

## 📌 Vue d'ensemble
La gestion des utilisateurs a été implémentée de manière complète dans l'application BG Maçonnerie. Cette fonctionnalité est **réservée à la Direction Générale** et accessible via le menu latéral sous **"Administration > Gestion des Profils Utilisateurs"**.

---

## 🎯 Fonctionnalités Implémentées

### 1. ✅ Liste des Utilisateurs
**Localisation :** Onglet `Utilisateurs` (réservé Direction)
**Affichage :**
- Avatar/Initiales de l'utilisateur
- Nom complet
- Adresse e-mail (lien de contact)
- Numéro de téléphone
- Rôle/Profil d'accès (badge coloré)
- Magasins autorisés (badges multicolores)
- Statut (Actif 🟢 / Suspendu 🔴)

**Statistiques Affichées :**
- Total utilisateurs
- Nombre d'utilisateurs actifs
- Nombre de comptes suspendus
- Nombre d'administrateurs (Direction)

**Recherche/Filtrage :**
- Recherche en temps réel par : nom, email, téléphone
- Compteur de résultats filtrés

---

### 2. ➕ Créer un Nouvel Utilisateur

**Accès :** Bouton "➕ Créer Nouvel Utilisateur" (bas de la liste)

**Formulaire - Informations Obligatoires :**
- **Nom Complet** : Prénom + Nom (ex: Jean Dupont)
- **Email** : Adresse e-mail unique (ex: jean@benamar.dz)
  - ⚠️ Validation : L'email doit être unique, un doublon génère une erreur
- **Mot de passe initial** : Mot de passe d'accès initial (ex: pass2026)
- **Rôle/Profil d'accès** : Sélecteur parmi 5 rôles disponibles

**Formulaire - Informations Optionnelles :**
- **Téléphone** : Contact direct (ex: 0551 12 34 56)
- **URL Photo d'Avatar** : Lien vers une image de profil

**Rôles Disponibles :**
1. **👑 Direction Générale (Admin)** 
   - Accès complet à tous les modules
   - Accès automatique à tous les magasins
   - Seul rôle pouvant gérer les utilisateurs

2. **📦 Magasinier (Opérateur Dépôt)** 
   - Gestion des stocks et réceptions
   - Affectation de matériel
   - **Obligation** : Dépôt physique principal doit être assigné
   - Peut avoir accès à plusieurs magasins en lecture/exécution

3. **🛒 Service Achats** 
   - Création et gestion des bons de commande
   - Accès aux fournisseurs
   - Accès à plusieurs magasins

4. **💰 Comptabilité & Finances** 
   - Gestion des factures d'achat
   - Enregistrement des paiements/règlements
   - Lettrage des factures

5. **👷 Chef de Chantier** 
   - Suivi des chantiers
   - Gestion des employés
   - Suivi des affectations

**Attribution des Droits d'Accès Magasins :**
- **Direction** : Tous les magasins (automatique)
- **Autres rôles** : Sélection par checkboxes
  - Le magasin principal (pour magasinniers) est obligatoire et toujours coché
  - Autres magasins sont optionnels (multi-sélection)

---

### 3. ✏️ Modifier un Utilisateur

**Accès :** Bouton "Modifier" dans la ligne de l'utilisateur

**Possibilités de Modification :**
- Nom complet
- Email (validation de l'unicité appliquée)
- Mot de passe
- Téléphone
- Rôle/Profil d'accès (changement possible)
- Magasins autorisés
- Avatar

**Traçabilité :**
- Date de création affichée dans le formulaire
- Créateur du compte affiché
- Toutes les modifications sont enregistrées dans le **Journal d'Audit**

---

### 4. 🔐 Réinitialiser le Mot de Passe

**Accès :** Bouton "Réinit. mdp" dans la ligne de l'utilisateur

**Fonctionnement :**
1. Génération automatique d'un **mot de passe temporaire** aléatoire
2. Le mot de passe temporaire s'affiche en popup pour être transmis à l'utilisateur
3. Format du mot de passe temporaire : `tmp-[8 caractères aléatoires]`
4. L'utilisateur pourra le changer à sa prochaine connexion (à implémenter)

**Sécurité :**
- L'administrateur ne peut pas réinitialiser son propre mot de passe via cette fonction
- L'action est enregistrée dans le **Journal d'Audit** (sans affichage du mot de passe)
- Notification : Une notification de réinitialisation est créée

---

### 5. 🟢/🔴 Activer / Suspendre un Utilisateur

**Accès :** Bouton "🟢 Actif" / "🔴 Suspendu" dans le tableau

**Comportement :**
- Un clic sur le bouton inverse l'état (Actif ↔ Suspendu)
- Les utilisateurs **suspendus ne peuvent pas se connecter**
- L'authentification vérifie `u.actif === true`

**Protections :**
- ⚠️ Impossible de suspendre le **dernier administrateur Direction actif**
- ⚠️ Impossible de suspendre **l'utilisateur actuellement connecté**

**Notifications :**
- Message d'activation/désactivation dans les notifications système

---

### 6. 🗑️ Supprimer un Utilisateur

**Accès :** Bouton "Supprimer" dans la ligne de l'utilisateur

**Confirmation :**
- Popup de confirmation : "Supprimer définitivement l'utilisateur [Nom] ?"

**Protections :**
- ⚠️ Impossible de supprimer le **dernier administrateur Direction**
- ⚠️ Impossible de supprimer **l'utilisateur actuellement connecté**
- ⚠️ Suppression définitive (pas de corbeille)

**Traçabilité :**
- L'action est enregistrée dans le **Journal d'Audit**
- L'utilisateur est complètement supprimé de la base

---

## 🏗️ Architecture Technique

### Fichiers Modifiés / Créés

#### 1. `src/lib/mockDb.ts`
**Nouvelles méthodes :**
- `getUsers(): UserProfile[]` - Récupère tous les utilisateurs
- `saveUser(user: Partial<UserProfile>): UserProfile` - Crée ou modifie un utilisateur
- `toggleUserActif(userId: string): UserProfile` - Active/désactive un utilisateur
- `deleteUser(userId: string): void` - Supprime un utilisateur
- `resetUserPassword(userId: string, newPassword?: string): string` - Réinitialise le mot de passe
- `authenticateUser(email: string, password: string): UserProfile | null` - Authentification
- `getCurrentUser(): UserProfile` - Utilisateur actuellement connecté
- `isAuthenticated(): boolean` - Vérification du statut d'authentification
- `logout(): void` - Déconnexion

**Validations Implémentées :**
- Email unique (pas de doublon possible)
- Magasin obligatoire pour les magasiniers
- Pas plus d'un administrateur ne peut être suspendu
- Pas de suppression du dernier administrateur
- Pas d'auto-suspension / auto-suppression

**Audit & Notifications :**
- Chaque action est enregistrée dans `AuditLog`
- Notifications générées pour certaines actions critiques

#### 2. `src/App.tsx`
**Modifications :**
- Ajout d'un état `users` pour gérer la liste locale
- Onglet `Utilisateurs` dans le menu Navigation (Administration)
- Table complète avec tous les boutons d'action
- Modal de création/édition avec validation
- Statistiques en cartes (total, actifs, suspendus, admins)

**Composants Modifiés :**
- **Navigation latérale** : Ajout du lien "Gestion des Profils Utilisateurs" sous Administration
- **Ribbon toolbar** : Activé pour l'onglet Utilisateurs
- **Modal utilisateur** : Formulaire complet avec assignation de droits magasins

#### 3. `src/lib/types.ts`
**Type `UserProfile` :**
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  password: string;
  telephone?: string;
  role: UserRole; // 'direction' | 'magasinier' | 'achat' | 'comptabilite' | 'chef_chantier'
  magasinId?: string; // Magasin principal (pour magasiniers)
  magasinsIds?: string[]; // Magasins autorisés (multi-select)
  actif: boolean;
  avatar?: string;
  createdAt: string;
  createdBy: string;
}

type UserRole = 'direction' | 'magasinier' | 'achat' | 'comptabilite' | 'chef_chantier';
```

---

## 🔄 Flux de Données

```
App.tsx (Page Utilisateurs)
       ↓
  MockDatabase
       ↓
  localStorage (bgm_users)
       ↓
  Affichage + Actions CRUD
```

---

## 📊 Scénarios de Test

### Scénario 1 : Créer un Nouvel Utilisateur
1. Connecté en tant que **Direction** (karim@benamar.dz / dir2026)
2. Aller à **Administration > Gestion des Profils Utilisateurs**
3. Cliquer sur **"➕ Créer Nouvel Utilisateur"**
4. Remplir :
   - Nom : "Ali Farouk"
   - Email : "ali.farouk@benamar.dz"
   - Mot de passe : "ali2026"
   - Rôle : "Magasinier"
   - Dépôt principal : "Magasin Central - Alger"
5. Cliquer **"➕ Créer l'utilisateur"**
6. ✅ Vérifier : Utilisateur apparaît dans la liste
7. ✅ Vérifier : Journal d'audit enregistre la création

### Scénario 2 : Modifier un Utilisateur
1. Dans la liste, cliquer **"Modifier"** pour un utilisateur existant
2. Changer : Email + Téléphone
3. Cliquer **"💾 Mettre à jour"**
4. ✅ Vérifier : Modifications appliquées
5. ✅ Vérifier : Journal d'audit enregistre la modification

### Scénario 3 : Réinitialiser Mot de Passe
1. Cliquer **"Réinit. mdp"** pour un utilisateur
2. Confirmer la popup
3. ✅ Affiche : Nouveau mot de passe temporaire (ex: `tmp-a7x9k2m5`)
4. ✅ Transmettre le mot de passe à l'utilisateur
5. ✅ Vérifier : Journal d'audit enregistre l'action

### Scénario 4 : Suspendre/Activer
1. Cliquer le bouton statut (**🟢 Actif** ou **🔴 Suspendu**)
2. ✅ Vérifier : Le bouton bascule d'état
3. ✅ Essayer de se connecter avec cet utilisateur
4. ✅ Vérifier : Connexion bloquée si suspendu

### Scénario 5 : Supprimer un Utilisateur
1. Cliquer **"Supprimer"** pour un utilisateur
2. Confirmer la popup
3. ✅ Vérifier : Utilisateur disparaît de la liste
4. ✅ Vérifier : Journal d'audit enregistre la suppression

### Scénario 6 : Recherche/Filtrage
1. Taper dans la **barre de recherche** (haut du tableau) : "ali"
2. ✅ Vérifier : Seuls les utilisateurs contenant "ali" apparaissent
3. ✅ Vérifier : Le compteur met à jour le nombre de résultats

---

## 🚀 Démarrer l'Application

### Installation
```bash
npm install
```

### Développement
```bash
npm run dev
```
Accès : http://localhost:5173

### Production
```bash
npm run build
npm run preview
```

### Identifiants de Test
| Rôle | Email | Mot de passe |
|------|-------|---------|
| Direction | directeur@benamar.dz | dir2026 |
| Magasinier Alger | rachid.alg@benamar.dz | mag2026 |
| Achats | kamel.achats@benamar.dz | ach2026 |
| Comptabilité | amine.compta@benamar.dz | fin2026 |
| Chef Chantier | omar.chef@benamar.dz | chef2026 |

---

## 🔒 Sécurité & Bonnes Pratiques

### ✅ Implémentées
- ✅ Validation des emails uniques
- ✅ Protections contre auto-suppression
- ✅ Protections contre suppression du dernier admin
- ✅ Enregistrement d'audit complet
- ✅ Statut d'activité (blocage des suspendus)
- ✅ Rôles avec permissions (seulement Direction peut gérer)

### ⚠️ À Améliorer (Futur)
- [ ] Chiffrement des mots de passe (bcrypt/argon2)
- [ ] Forcer le changement de mot de passe à la première connexion
- [ ] Validation de la force du mot de passe
- [ ] Historique de modifications détaillé
- [ ] Gestion de 2FA (authentification double)
- [ ] Expiration des sessions
- [ ] Logs de connexion/déconnexion détaillés
- [ ] Récupération de mot de passe oubli par email

---

## 📝 Notes de Développement

### Localisation des Fichiers Clés
- **API Utilisateurs** : [src/lib/mockDb.ts](src/lib/mockDb.ts#L348-L445)
- **Interface Utilisateurs** : [src/App.tsx](src/App.tsx#L2308-L2465)
- **Modal Utilisateur** : [src/App.tsx](src/App.tsx#L3616-L3780)
- **Types** : [src/lib/types.ts](src/lib/types.ts)

### Enregistrement Audit
Chaque action utilisateur génère une entrée audit :
```
ID: aud-XXXXX
Utilisateur: Jean Dupont (direction)
Action: "Création de l'utilisateur Ali Farouk (magasinier)"
Module: users
Date: 2026-05-22T10:30:45Z
```

### Notifications Système
Certaines actions génèrent une notification :
- ✅ Création utilisateur → Notification
- ✅ Changement statut → Notification
- ✅ Réinit. mot de passe → Notification
- ❌ Modification → Pas de notification

---

## 📞 Support & Contacts

Pour toute question ou amélioration :
- Développement : [src/App.tsx](src/App.tsx)
- Backend Mock : [src/lib/mockDb.ts](src/lib/mockDb.ts)
- Types : [src/lib/types.ts](src/lib/types.ts)

---

**Dernière mise à jour** : 22 mai 2026
**Version** : 1.0 - Gestion Utilisateurs Complète
