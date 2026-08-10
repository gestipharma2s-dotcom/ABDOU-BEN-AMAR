Testing: Login → Create payment → Verify

Prerequisites
- Start the app: `npm run dev` (Vite) or build + serve production.
- Ensure your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY point to the correct Supabase project in `.env`.
- Make sure RLS policies for `paiements` are applied (see `db/policies/paiements_rls.sql`).

Steps
1. Open the app in the browser (default: http://localhost:5173).
2. Log in using a real Supabase account (or one of the demo accounts shown on the login page).
   - Use the login form (or the modal if prompted by an action).
3. Go to `Fournisseurs` tab and open a supplier row.
4. Click `Payer` to open the payment modal.
5. Fill `Montant`, `Mode`, `Référence` and optionally `Note`, then submit.
6. Observe UI: the modal should close and the `Règlements Fournisseurs` journal (Finances tab) should update.

Verification
- In the app: Go to `Finances` → `Règlements Fournisseurs`; the new payment should appear.
- In Supabase SQL editor: run `select * from paiements order by "datePaiement" desc limit 5;` to confirm the inserted row.

Troubleshooting
- If you receive `42501` or `permission denied` on insert, ensure you are logged-in (authenticated), or apply the `paiements` RLS policy.
- If a test script uses `SUPABASE_SERVICE_ROLE_KEY`, remove it from repo and use it only locally.

Optional automated test
- Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in `.env` and run:

```bash
node scripts/test_insert_paiement_authenticated.mjs
```

This attempts an authenticated insert to validate RLS and client flow.

Server (privileged insert) helper
- To run the privileged payments proxy (uses service role key):

```bash
export SUPABASE_SERVICE_ROLE_KEY="<your service role key>"
export SUPABASE_URL="https://your-project.supabase.co"
npm run start-server
```

The server listens on port 8787 by default and exposes `POST /api/payments`.
Send requests with header `Authorization: Bearer <user_access_token>` and body matching the paiement payload. The server will verify the token, check the user's role/privileges, then use the service role key to write to the DB.
