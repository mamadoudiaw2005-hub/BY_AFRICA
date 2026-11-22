# Guide de Déploiement BY_AFRIKA (React / Next.js + Supabase) 🚀

La plateforme **BY_AFRIKA** a été entièrement modernisée avec **Next.js 14 (App Router) + React 18 + Supabase**.

Cette architecture est la plus performante au monde pour le déploiement sur **Vercel** :
- **Zéro configuration requise** (Vercel est le créateur de Next.js et détecte automatiquement l'application).
- **Temps de chargement instantané** grâce au SSR et au CDN mondial Edge de Vercel.
- **Base de données Cloud Supabase temps réel** avec chiffrement SSL.

---

## ⚡ Étape 1 : Pousser le code sur votre GitHub

Dans votre terminal (ou depuis VS Code) :

```bash
git add .
git commit -m "Migration Next.js 14 & Supabase pour BY_AFRIKA"
git push origin main
```

*(Si vous venez de créer votre dépôt GitHub)* :
```bash
git init
git add .
git commit -m "BY_AFRIKA v1.0.0"
git branch -M main
git remote add origin https://github.com/VOTRE_NOM_UTILISATEUR/BY_AFRIKA.git
git push -u origin main
```

---

## 🚀 Étape 2 : Déploiement en 1 Clic sur Vercel

1. Rendez-vous sur votre compte **[Vercel](https://vercel.com)**.
2. Cliquez sur le bouton bleu **"Add New..."** ➔ **"Project"**.
3. Sélectionnez votre dépôt GitHub **`BY_AFRIKA`** et cliquez sur **Import**.
4. Dans le formulaire :
   - **Framework Preset** : Détecté automatiquement sur `Next.js` !
   - **Root Directory** : `./` (laissez par défaut).
5. Déroulez la section **"Environment Variables"** et ajoutez ces deux variables :
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://vgaifljtaocvnifiyrsg.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_7oHChmVbT7XB7A4FxJNWOA_69FN41xh`
6. Cliquez sur le bouton **"Deploy"** !

🎉 En **40 secondes**, votre boutique BY_AFRIKA est en ligne avec un lien HTTPS mondial ultra-rapide (ex: `https://by-afrika.vercel.app`).

---

## 🌐 Étape 3 : Ajouter votre Nom de Domaine Personnalisé

Sur Vercel, vous pouvez lier un nom de domaine en quelques clics :
1. Sur votre projet Vercel, allez dans **Settings** ➔ **Domains**.
2. Entrez votre nom de domaine (ex: `byafrika.com` ou `diawshoop.com` si vous le possédez).
3. Vercel vous donnera les enregistrements DNS à copier chez votre registrar (GoDaddy, Namecheap, Google Domains/Squarespace, etc.).
4. Le certificat SSL HTTPS est généré et renouvelé **gratuitement à vie**.

---

## 💻 Exécution en Local (Développement)

Pour continuer à développer ou tester sur votre machine :
```bash
npm run dev
```
Ouvrez ensuite [http://localhost:5050](http://localhost:5050) dans votre navigateur.
