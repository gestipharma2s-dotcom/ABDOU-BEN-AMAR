import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8787;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper: verify access token by calling Supabase Auth endpoint
async function verifyAccessToken(token) {
  if (!token) return null;
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    return user; // contains id, email, etc.
  } catch (err) {
    console.error('Error verifying token:', err);
    return null;
  }
}

app.post('/api/payments', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').split(' ')[1];
    const user = await verifyAccessToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid or missing access token' });

    // Check user's role/privileges in users table
    const { data: profile, error: profileErr } = await supabaseService
      .from('users')
      .select('id, role, privileges')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.warn('Profile lookup error:', profileErr);
      return res.status(500).json({ error: 'Profile lookup failed' });
    }

    const allowedRoles = ['direction', 'comptabilite'];
    const hasPrivilege = Array.isArray(profile?.privileges) && profile.privileges.includes('allow_unauthed_payments');
    if (!profile || (!allowedRoles.includes(profile.role) && !hasPrivilege)) {
      return res.status(403).json({ error: 'Insufficient privileges to perform privileged payment' });
    }

    const payload = req.body || {};
    const montant = Number(payload.montant || 0);
    const fournisseurId = payload.fournisseurId;
    const factureId = payload.factureId || null;

    if (!fournisseurId || montant <= 0) return res.status(400).json({ error: 'Missing fournisseurId or montant' });

    // Update fournisseur solde
    const { data: fournisseurRes } = await supabaseService.from('fournisseurs').select('solde, nomSociete').eq('id', fournisseurId).maybeSingle();
    const fournisseur: any = fournisseurRes || null;
    if (!fournisseur) return res.status(400).json({ error: 'Fournisseur not found' });

    const newSolde = Math.max(0, (fournisseur.solde || 0) - montant);
    await supabaseService.from('fournisseurs').update({ solde: newSolde }).eq('id', fournisseurId);

    // Update facture if present
    let factureRef = payload.factureRef || null;
    if (factureId) {
      const { data: facture } = await supabaseService.from('factures').select('*').eq('id', factureId).maybeSingle();
      if (facture) {
        factureRef = facture.code;
        const newSoldeRestant = Math.max(0, (facture.solde_restant || 0) - montant);
        const newInvoiceStatus = newSoldeRestant === 0 ? 'Payée' : 'Partiellement payée';
        await supabaseService.from('factures').update({ solde_restant: newSoldeRestant, statut: newInvoiceStatus }).eq('id', factureId);
      }
    }

    // Insert paiement
    const dbPayment = {
      fournisseurId,
      fournisseurNom: fournisseur.nomSociete || 'Fournisseur',
      montant,
      mode: payload.mode || 'Virement',
      referenceTransaction: payload.referenceTransaction || `REF-${Date.now()}`,
      note: payload.note || null,
      factureId: factureId,
      datePaiement: payload.datePaiement || new Date().toISOString(),
      code: payload.code || `REG-${String(Date.now()).slice(-6)}`,
      comptableNom: payload.comptableNom || profile?.role || 'Comptable',
      lettre: payload.lettre || false,
      factureRef: factureRef || null
    };

    const { data: created, error: insertErr } = await supabaseService.from('paiements').insert([dbPayment]).select().single();
    if (insertErr) {
      console.error('Insert paiement error:', insertErr);
      return res.status(500).json({ error: 'Failed to insert paiement', details: insertErr });
    }

    // Optionally log action
    try {
      await supabaseService.from('audit_logs').insert([{ userId: profile.id, userNom: profile.id, userRole: profile.role, action: 'create_paiement', table: 'paiements', recordId: created.id, dateAction: new Date().toISOString() }]);
    } catch (e) {
      console.warn('Failed to log audit action:', e);
    }

    return res.json({ paiement: created });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => console.log(`Privileged payments proxy listening on http://localhost:${PORT}`));
