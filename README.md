# 🌍 BY_AFRIKA — Boutique Officielle

> **"Portez vos origines avec confiance"**  
> Marque de prêt-à-porter moderne pour homme & femme, célébrant l'élégance et la fierté africaine.  
> Fondée par **Adama Dioume** à Dakar, Sénégal.  
> Conçu & Développé par **Mamadou Diaw**.

---

## 🚀 Fonctionnalités Principales

- **Boutique E-commerce Responsive** : Navigation fluide, optimisée pour mobile, tablette et desktop.
- **Thème Sombre & Or Épuré** : Design moderne, luxueux et minimaliste.
- **Catalogue Homme & Femme** : T-shirts, chemises, pantalons, robes, sweats avec gestion dynamique des tailles et couleurs.
- **Paiement à la livraison ("Arriver Payer")** : Modèle de confiance sans paiement en ligne obligatoire. Commande rapide avec reçu téléchargeable.
- **Tableau de Bord Administrateur** :
  - Statistiques en temps réel (commandes, chiffre d'affaires, catalogue, gestion des stocks).
  - Gestion des commandes (statuts : *Reçue*, *En préparation*, *En livraison*, *Livrée*, *Annulée*).
  - Gestion des réclamations clients et support direct WhatsApp.
  - Gestion des rôles et des autorisations d'équipe.
- **Espace Client Personnel** :
  - Profil utilisateur et historique des commandes passées.
- **Synchronisation Cloud & Sécurité** :
  - Synchronisation temps réel avec base de données cloud PostgreSQL / Supabase.
  - Protection contre les failles XSS et contrôle strict des données.
  - Bannière de consentement aux cookies conforme aux standards internationaux.

---

## 🛠️ Démarrage Rapide

### 1. Prérequis
- Node.js 18+ ou 20+
- npm (inclus avec Node.js)

### 2. Installation & Lancement en local
```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement local
npm run dev
```
Ouvrez ensuite [http://localhost:5050](http://localhost:5050) dans votre navigateur.

### 3. Compilation pour la Production
```bash
npm run build
npm start
```

---

## 🚀 Déploiement Cloud (Next.js & Vercel)
Consultez le guide détaillé dans [DEPLOYMENT.md](file:///c:/Users/mamad/OneDrive/Desktop/BY_Africa/DEPLOYMENT.md).

1. Poussez votre projet sur votre dépôt GitHub :
   ```bash
   git push origin main
   ```
2. Connectez le dépôt à votre plateforme d'hébergement (détection automatique de Next.js).
3. Ajoutez vos variables d'environnement Cloud dans les paramètres de déploiement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Déployez en un clic !

---

## 📁 Architecture du Projet

```
BY_AFRIKA/
├── app/
│   ├── layout.jsx        # Structure racine, polices et métadonnées SEO
│   ├── globals.css       # Styles globaux (responsive, thème épuré)
│   └── page.jsx          # Composant principal (Boutique, Panier, Admin)
├── lib/
│   ├── supabase.js       # Client Supabase Cloud
│   └── initialData.js    # Données et catalogue par défaut
├── public/               # Images et assets statiques
├── DEPLOYMENT.md         # Guide de déploiement
└── package.json          # Configuration et scripts Next.js
```

---

&copy; 2026 BY_AFRIKA. Tous droits réservés.
