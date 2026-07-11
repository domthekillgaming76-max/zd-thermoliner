# Installation — Z&D Thermoliner ERP

Guide pas à pas pour installer et lancer l'ERP sur Windows.

---

## Étape 1 — Installer Node.js

1. Téléchargez **Node.js 20 LTS** : [https://nodejs.org](https://nodejs.org)
2. Lancez l'installateur → Suivant → cocher **"Automatically install necessary tools"** si proposé
3. Redémarrez le PC si demandé
4. Vérifiez dans **Invite de commandes** :

```cmd
node -v
npm -v
```

Vous devez voir `v20.x.x` ou supérieur.

---

## Étape 2 — Configurer Supabase

L'ERP utilise **Supabase** comme base de données (cloud).

1. Créez un projet sur [https://supabase.com](https://supabase.com)
2. Allez dans **Project Settings → API**
3. Notez :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** (secret !) → `SUPABASE_SERVICE_ROLE_KEY`

4. Appliquez les migrations SQL du dossier `supabase/migrations/` (si vous avez le code source complet)  
   Ou demandez à l'administrateur d'avoir déjà poussé les migrations.

---

## Étape 3 — Configuration `.env`

1. Copiez le fichier modèle :

```cmd
copy .env.example .env
```

2. Ouvrez `.env` avec le Bloc-notes et remplissez :

```env
VITE_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_URL=https://VOTRE_PROJET.supabase.co
SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
PORT=3000
```

> **Important** : ne partagez jamais la clé `service_role` publiquement.

---

## Étape 4 — Installation

**Double-cliquez** sur `install.bat`

Ou en ligne de commande :

```cmd
install.bat
```

Le script :
- vérifie Node.js
- installe les dépendances (`npm install --omit=dev` si `dist/` existe déjà)
- ou compile l'interface (`npm run build`) si nécessaire

---

## Étape 5 — Lancer l'ERP

**Double-cliquez** sur `start.bat`

Ou :

```cmd
start.bat
```

Ouvrez votre navigateur : **http://localhost:3000**

### Connexion par défaut

Utilisez le compte créé sur Supabase / dans l'application.  
Le propriétaire **DOM76** est protégé en administrateur.

---

## Utilisation quotidienne

| Action | Comment |
|--------|---------|
| Démarrer | Double-clic `start.bat` |
| Arrêter | Fermer la fenêtre noire (Ctrl+C) |
| Changer le port | Modifier `PORT=3000` dans `.env` |

### Astuces performance

- Fermez les onglets ERP inutilisés
- Un seul onglet ouvert = moins de RAM
- Laissez la fenêtre `start.bat` ouverte pendant l'utilisation
- PC lent : évitez d'ouvrir Dispatch + Tracking + Statistiques en même temps

---

## Dépannage

### « Node n'est pas reconnu »
→ Réinstallez Node.js et redémarrez le PC.

### Page blanche / erreur Supabase
→ Vérifiez `.env` (URL et clés sans espaces).

### Port 3000 déjà utilisé
→ Changez `PORT=3001` dans `.env` et ouvrez `http://localhost:3001`

### Erreur `SUPABASE_SERVICE_ROLE_KEY manquante`
→ Ajoutez la clé service_role dans `.env` (Settings → API Supabase).

### Vérifier que l'API fonctionne
→ Ouvrez `http://localhost:3000/api/health` — doit afficher `"ok": true`

---

## Mise à jour

1. Remplacez le dossier par la nouvelle version (gardez votre `.env`)
2. Relancez `install.bat`
3. Relancez `start.bat`

---

## Partager ce dossier

Pour distribuer à votre équipe :

1. Copiez tout le dossier `Z&D-Thermoliner-ERP`
2. **Retirez** le fichier `.env` (contient des secrets)
3. Incluez `.env.example` pour que chacun configure sa copie
4. Chaque utilisateur peut pointer vers le **même projet Supabase** (recommandé)

---

*Z&D Thermoliner — Installation simplifiée*
