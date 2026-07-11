# Déploiement Z&D Thermoliner ERP

## Architecture

| Composant | Où | URL |
|-----------|-----|-----|
| **Interface + API** | Coolify (VPS Hostinger) | https://erp.zd-thermoliner.fr |
| **Base de données + Auth** | Supabase | fctdderxnjfoeyfwdndv.supabase.co |

---

## Coolify — redéployer

1. Coolify → projet **zd-thermoliner**
2. **Redeploy** (+ **Force rebuild** si écran noir)
3. Attendre la fin du build (`npm run build` dans les logs)
4. Tester : https://erp.zd-thermoliner.fr → **Ctrl+F5**

Variables d'environnement Coolify :

```env
VITE_SUPABASE_URL=https://fctdderxnjfoeyfwdndv.supabase.co
VITE_SUPABASE_ANON_KEY=...
SUPABASE_URL=https://fctdderxnjfoeyfwdndv.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PORT=3000
NODE_ENV=production
```

---

## Supabase — migrations SQL

Dashboard → **SQL Editor** → coller le contenu des fichiers dans `supabase/migrations/` (pas le chemin Windows).

Auth → **URL Configuration** :

- Site URL : `https://erp.zd-thermoliner.fr`
- Redirect URLs : `https://erp.zd-thermoliner.fr/**`

---

## Utilisation locale (admin / dev)

| Fichier | Usage |
|---------|--------|
| `LANCER-ERP.bat` | Ouvre l'ERP en ligne (recommandé) |
| `LANCER-ERP-LOCAL.bat` | Serveur localhost (dev uniquement) |

Pack chauffeurs Windows : `npm run pack:release`

---

## Vérifications

```bash
npm run typecheck
npm run build
```

- Health : https://erp.zd-thermoliner.fr/api/health
