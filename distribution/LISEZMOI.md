# Z&D Thermoliner — ERP VTC (ETS2 / ATS)

**Plateforme de gestion communautaire** pour votre entreprise virtuelle de transport.

## Présentation

Z&D Thermoliner est un ERP léger conçu pour tourner sur un **PC modeste** tout en gérant :

- **Flotte** — camions, garages, maintenance
- **Chauffeurs** — profils, dossiers RH, salaires RP
- **Dispatch** — missions, feuilles de route, marché fret
- **Finance** — banque, comptabilité, factures
- **Communauté** — mur, événements, recrutement
- **Télémétrie** — synchronisation ETS2/ATS via le client Windows (optionnel)

### Rôles simplifiés

| Rôle | Accès |
|------|--------|
| **Visiteur** | Mur, recrutement, profil |
| **Flotte** | Opérations (dispatch, fret, chauffeurs…) |
| **Administrateur** | Tout + finance + administration |

### Consommation optimisée (mode éco)

- Pages chargées **à la demande** (moins de RAM au démarrage)
- Polling réseau **espacé** (15–60 s selon les modules)
- Cache navigateur + fichiers statiques compressés
- Realtime Supabase conservé uniquement où c'est utile

### Prérequis

- **Windows 10/11** (64 bits)
- **Node.js 20 LTS** — [https://nodejs.org](https://nodejs.org)
- Compte **Supabase** (base de données cloud — gratuit possible)
- Connexion Internet

### Contenu du dossier

```
Z&D-Thermoliner-ERP/
├── LISEZMOI.md          ← Ce fichier
├── INSTALLATION.md      ← Tutoriel pas à pas
├── install.bat          ← Installation automatique
├── start.bat            ← Lancer l'ERP
├── .env.example         ← Modèle de configuration
├── dist/                ← Interface web (build)
├── server/              ← API locale
└── package.json
```

### Support

Projet maintenu par **Z&D Thermoliner**.  
En cas de problème : vérifiez `INSTALLATION.md` section Dépannage.

---

*Version ERP 2.6 — Optimisée ressources PC*
