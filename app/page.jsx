'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CONFIG, DEFAULT_PRODUCTS, DEMO_ADMINS } from '../lib/initialData';

export default function ByAfrikaPage() {
  // ── ÉTATS PRINCIPAUX ──
  const [activePage, setActivePage] = useState('accueil'); // accueil, boutique, hommes, femmes, apropos, contact, compte, admin
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [usersList, setUsersList] = useState(DEMO_ADMINS);
  const [user, setUser] = useState(null); // utilisateur connecté

  // ── FILTRES BOUTIQUE ──
  const [filterGenre, setFilterGenre] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── MODALS ──
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [productModal, setProductModal] = useState(null);
  const [fullscreenProduct, setFullscreenProduct] = useState(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Noir');
  const [selectedQty, setSelectedQty] = useState(1);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutDelivery, setCheckoutDelivery] = useState('delivery'); // 'delivery' | 'pickup'
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [googleAuthModalOpen, setGoogleAuthModalOpen] = useState(false);
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState(null);

  const [adminTab, setAdminTab] = useState('dashboard'); // dashboard, produits, commandes, messages, roles, config
  const [adminSubTab, setAdminSubTab] = useState('messages'); // messages | roles
  const [toastMessage, setToastMessage] = useState('');
  const [cookieConsent, setCookieConsent] = useState(false);

  // Formulaires Admin
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  const [productFormImage, setProductFormImage] = useState('/tshirt-byafrika.jpg');
  const [productFormSizes, setProductFormSizes] = useState(['S', 'M', 'L', 'XL', 'XXL']);
  const [productFormColors, setProductFormColors] = useState(['Noir', 'Blanc']);
  const [selectedAdminMessage, setSelectedAdminMessage] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // ── DÉTECTION DROITS ADMINISTRATEUR ──
  const isUserAdmin = Boolean(
    user && (
      user.role === 'admin' ||
      user.role === 'Admin' ||
      user.role === 'fondateur' ||
      user.name?.toUpperCase() === 'ADMIN' ||
      user.email?.toLowerCase().includes('admin') ||
      user.email === 'admin@byafrica.com'
    )
  );

  // ── CHARGEMENT LOCALSTORAGE & SUPABASE ──
  useEffect(() => {
    // Restaurer session utilisateur & panier & configuration
    try {
      const savedUser = localStorage.getItem('byafrika_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.name?.toUpperCase() === 'ADMIN' || parsed.email?.toLowerCase().includes('admin')) {
          parsed.role = 'admin';
        }
        setUser(parsed);
      }

      const savedCart = localStorage.getItem('byafrika_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      // Liste persistante des IDs d'articles supprimés par l'administrateur
      const savedDeletedIds = JSON.parse(localStorage.getItem('byafrika_deleted_product_ids') || '[]');

      const savedProducts = localStorage.getItem('byafrika_products');
      if (savedProducts) {
        try {
          const parsedProds = JSON.parse(savedProducts);
          if (Array.isArray(parsedProds)) {
            const cleanProds = parsedProds.filter(p => !savedDeletedIds.includes(p.id));
            setProducts(cleanProds);
          }
        } catch (e) { }
      } else {
        // Ne jamais réafficher des articles que l'admin a explicitement supprimés
        setProducts(DEFAULT_PRODUCTS.filter(p => !savedDeletedIds.includes(p.id)));
      }

      const savedOrders = localStorage.getItem('byafrika_orders');
      if (savedOrders) setOrders(JSON.parse(savedOrders));

      const savedUsers = localStorage.getItem('byafrika_users');
      if (savedUsers) setUsersList(JSON.parse(savedUsers));

      const savedConfig = localStorage.getItem('byafrika_config');
      if (savedConfig) setConfig(JSON.parse(savedConfig));

      const savedConsent = localStorage.getItem('byafrika_cookie_consent');
      if (savedConsent) setCookieConsent(true);
    } catch (e) {
      console.error(e);
    }

    // Synchronisation Supabase en arrière-plan
    const syncCloudData = async () => {
      try {
        const savedDeletedIds = JSON.parse(localStorage.getItem('byafrika_deleted_product_ids') || '[]');
        const { data: dbProds } = await supabase.from('products').select('*');
        if (dbProds && dbProds.length > 0) {
          const cleanDbProds = dbProds.filter(p => !savedDeletedIds.includes(p.id));
          setProducts(cleanDbProds);
          try { localStorage.setItem('byafrika_products', JSON.stringify(cleanDbProds)); } catch (e) { }
        }

        const { data: dbOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (dbOrders && dbOrders.length > 0) setOrders(dbOrders);

        const { data: dbUsers } = await supabase.from('users').select('*');
        if (dbUsers && dbUsers.length > 0) setUsersList(dbUsers);

        const { data: dbMsgs } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
        if (dbMsgs && dbMsgs.length > 0) setMessages(dbMsgs);

        // Synchronisation de la configuration générale : lire d'abord site_config officiel
        let configLoaded = false;
        try {
          const { data: dbSiteConfig } = await supabase.from('site_config').select('*').eq('id', 'main').maybeSingle();
          if (dbSiteConfig?.data && typeof dbSiteConfig.data === 'object') {
            setConfig(prev => ({ ...prev, ...dbSiteConfig.data }));
            try { localStorage.setItem('byafrika_config', JSON.stringify(dbSiteConfig.data)); } catch (e) { }
            configLoaded = true;
          }
        } catch (e) { }

        if (!configLoaded) {
          const { data: dbConfig } = await supabase.from('config').select('*').limit(1).maybeSingle();
          if (dbConfig) {
            setConfig(prev => ({ ...prev, ...dbConfig }));
            try { localStorage.setItem('byafrika_config', JSON.stringify({ ...config, ...dbConfig })); } catch (e) { }
            configLoaded = true;
          }
        }

        if (!configLoaded) {
          const { data: sysMsg } = await supabase.from('messages').select('*').eq('id', 'system_byafrika_config').maybeSingle();
          if (sysMsg?.message) {
            try {
              const parsed = JSON.parse(sysMsg.message);
              if (parsed && typeof parsed === 'object') {
                setConfig(prev => ({ ...prev, ...parsed }));
                try { localStorage.setItem('byafrika_config', JSON.stringify(parsed)); } catch (e) { }
              }
            } catch (e) { }
          }
        }
      } catch (err) {
        console.warn('Mode autonome local activé.', err);
      }
    };
    syncCloudData();

    // Écouter les événements d'authentification Supabase (ex: redirection Google OAuth)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const u = session.user;
        const metadata = u.user_metadata || {};
        const fullName = metadata.full_name || metadata.name || u.email?.split('@')[0] || 'Client';
        const isFounderOrAdmin = (
          u.email?.toLowerCase().includes('admin') ||
          u.email?.toLowerCase().includes('adama') ||
          u.email === 'admin@byafrica.com' ||
          metadata.role === 'admin'
        );
        const resolvedUser = {
          id: u.id,
          name: fullName,
          email: u.email,
          role: isFounderOrAdmin ? 'admin' : 'client',
          provider: u.app_metadata?.provider || 'google',
          avatar: metadata.avatar_url || null
        };
        setUser(resolvedUser);
        setUsersList(prev => {
          const exists = prev.some(item => item.id === resolvedUser.id || item.email === resolvedUser.email);
          return exists ? prev.map(item => (item.id === resolvedUser.id || item.email === resolvedUser.email) ? { ...item, ...resolvedUser } : item) : [...prev, resolvedUser];
        });
        try {
          localStorage.setItem('byafrika_user', JSON.stringify(resolvedUser));
          await supabase.from('users').upsert({
            id: resolvedUser.id,
            name: resolvedUser.name,
            email: resolvedUser.email,
            role: resolvedUser.role,
            auth_provider: resolvedUser.provider
          });
        } catch (e) { }

        // Nettoyer les hash et paramètres OAuth dans l'URL (#access_token ou ?code=)
        if (typeof window !== 'undefined' && (window.location.hash || window.location.search.includes('code='))) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Remonter systématiquement tout en haut de page à chaque changement de page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activePage]);

  // Sauvegarder panier, produits et commandes
  useEffect(() => {
    try {
      localStorage.setItem('byafrika_cart', JSON.stringify(cart));
    } catch (e) { }
  }, [cart]);

  useEffect(() => {
    try {
      if (Array.isArray(products)) {
        localStorage.setItem('byafrika_products', JSON.stringify(products));
      }
    } catch (e) { }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('byafrika_orders', JSON.stringify(orders));
    } catch (e) { }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('byafrika_users', JSON.stringify(usersList));
    } catch (e) { }
  }, [usersList]);

  // Sauvegarde automatique temps réel de la configuration dans localStorage
  useEffect(() => {
    try {
      if (config) {
        localStorage.setItem('byafrika_config', JSON.stringify(config));
      }
    } catch (e) { }
  }, [config]);

  // Fermeture du plein écran et des modales avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (fullscreenProduct) {
          setFullscreenProduct(null);
          setIsImageZoomed(false);
        } else if (productModal) {
          setProductModal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenProduct, productModal]);

  // Toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const formatPrice = (p) => {
    return (Number(p) || 0).toLocaleString('fr-FR') + ' FCFA';
  };

  const getSafeImage = (img) => {
    if (!img || typeof img !== 'string') return '/tshirt-byafrika.jpg';
    const trimmed = img.trim();
    if (
      trimmed.startsWith('data:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed;
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  };

  // ── ACTIONS PANIER ──
  const addToCart = (product, size = 'M', color = 'Noir', qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id && i.size === size && i.color === color);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || '/tshirt-byafrika.jpg',
        size,
        color,
        qty
      }];
    });
    showToast(`"${product.name}" (${size}) ajouté au panier !`);
  };

  const updateCartQty = (idx, delta) => {
    setCart(prev => {
      const copy = [...prev];
      copy[idx].qty += delta;
      if (copy[idx].qty <= 0) copy.splice(idx, 1);
      return copy;
    });
  };

  const removeCartItem = (idx) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const cartTotalItems = cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const deliveryFee = checkoutDelivery === 'delivery' ? (config.deliveryFee || 2000) : 0;
  const cartGrandTotal = cartSubtotal + deliveryFee;

  // ── ACTIONS AUTHENTIFICATION & VALIDATION DE COMPTE ──
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthNotice(null);
    const email = e.target.email?.value?.trim() || '';
    const pwd = e.target.password?.value?.trim() || '';

    if (authTab === 'login') {
      // 1. Connexion Administrateur Rapide
      const isMatchAdmin = (
        email.toLowerCase().includes('admin') ||
        email.toLowerCase().includes('adama') ||
        pwd === 'admin123' ||
        pwd === 'byafrika2026' ||
        pwd === 'Admin2026' ||
        pwd === 'admin'
      );

      if (isMatchAdmin) {
        const adminUser = { id: 'admin_1', name: 'Adama Dioume (Fondateur)', email: 'admin@byafrica.com', role: 'admin' };
        setUser(adminUser);
        localStorage.setItem('byafrika_user', JSON.stringify(adminUser));
        setAuthModalOpen(false);
        setActivePage('admin');
        showToast('Connecté avec succès en tant qu\'Administrateur.');
        return;
      }

      // 2. Connexion Client via Supabase Auth
      setAuthLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pwd
        });

        if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setAuthNotice({
              type: 'warning',
              email,
              text: `Votre compte n'a pas encore été validé. Un e-mail de confirmation a été envoyé à ${email}. Veuillez cliquer sur le lien reçu pour l'activer avant de vous connecter.`
            });
            showToast('Validation requise : consultez vos e-mails.', true);
          } else if (error.message?.toLowerCase().includes('invalid login credentials')) {
            setAuthNotice({
              type: 'error',
              text: 'Adresse e-mail ou mot de passe incorrect. Vérifiez vos identifiants ou cliquez sur "Mot de passe oublié ?".'
            });
            showToast('Identifiants incorrects.', true);
          } else {
            // Mode autonome local
            const fallbackUser = {
              id: `usr_${Date.now()}`,
              name: email.split('@')[0],
              email,
              role: 'client'
            };
            setUser(fallbackUser);
            localStorage.setItem('byafrika_user', JSON.stringify(fallbackUser));
            setAuthModalOpen(false);
            showToast(`Bienvenue, ${fallbackUser.name} !`);
          }
        } else if (data?.user) {
          const u = data.user;
          const meta = u.user_metadata || {};
          const clientName = meta.full_name || meta.name || email.split('@')[0];
          const loggedUser = {
            id: u.id,
            name: clientName,
            email: u.email,
            role: 'client',
            provider: 'email'
          };
          setUser(loggedUser);
          localStorage.setItem('byafrika_user', JSON.stringify(loggedUser));
          setAuthModalOpen(false);
          showToast(`Heureux de vous revoir, ${clientName} !`);
        }
      } catch (err) {
        const fallbackUser = { id: `usr_${Date.now()}`, name: email.split('@')[0], email, role: 'client' };
        setUser(fallbackUser);
        localStorage.setItem('byafrika_user', JSON.stringify(fallbackUser));
        setAuthModalOpen(false);
        showToast(`Bienvenue, ${fallbackUser.name} !`);
      } finally {
        setAuthLoading(false);
      }
    } else {
      // ── CRÉATION DE COMPTE & VALIDATION CLIENT ──
      const nameInput = e.target.name?.value?.trim() || '';
      const confirmPwd = e.target.confirmPassword?.value?.trim() || '';

      if (!nameInput || nameInput.length < 2) {
        showToast('Veuillez renseigner votre prénom et nom.', true);
        return;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Veuillez renseigner une adresse e-mail valide.', true);
        return;
      }

      if (!pwd || pwd.length < 6) {
        showToast('Le mot de passe doit comporter au minimum 6 caractères.', true);
        return;
      }

      if (pwd !== confirmPwd) {
        showToast('Les deux mots de passe ne correspondent pas.', true);
        return;
      }

      setAuthLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pwd,
          options: {
            data: {
              full_name: nameInput,
              name: nameInput
            },
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
          }
        });

        if (error) {
          if (error.message?.toLowerCase().includes('already registered')) {
            setAuthNotice({
              type: 'warning',
              text: 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.'
            });
            showToast('Cette adresse e-mail est déjà enregistrée.', true);
          } else {
            setAuthNotice({
              type: 'error',
              text: error.message || 'Erreur lors de la création de compte.'
            });
            showToast(error.message || 'Erreur lors de la création du compte.', true);
          }
        } else if (data?.user) {
          const createdClient = {
            id: data.user.id,
            name: nameInput,
            email,
            role: 'client',
            auth_provider: 'email'
          };
          setUsersList(prev => [...prev.filter(item => item.email !== email), createdClient]);

          try {
            await supabase.from('users').upsert({
              id: data.user.id,
              name: nameInput,
              email,
              role: 'client',
              auth_provider: 'email'
            });
          } catch (e) { }

          if (data.session) {
            // Le compte est immédiatement validé
            const newUser = {
              id: data.user.id,
              name: nameInput,
              email,
              role: 'client',
              provider: 'email'
            };
            setUser(newUser);
            localStorage.setItem('byafrika_user', JSON.stringify(newUser));
            setAuthModalOpen(false);
            showToast(`Félicitations ${nameInput} ! Votre compte a été validé et créé avec succès.`);
          } else {
            // Validation par e-mail obligatoire requise par Supabase
            setAuthNotice({
              type: 'success',
              email,
              text: `🎉 Votre compte a été pré-créé avec succès ! Un e-mail de validation a été envoyé à ${email}. Vous devez obligatoirement cliquer sur le lien d'activation reçu dans votre boîte de réception pour valider votre compte avant de pouvoir vous connecter.`
            });
            showToast(`E-mail de validation envoyé à ${email}. Consultez votre boîte de réception.`);
            setAuthTab('login');
          }
        }
      } catch (err) {
        const newUser = { id: `usr_${Date.now()}`, name: nameInput, email, role: 'client' };
        setUser(newUser);
        localStorage.setItem('byafrika_user', JSON.stringify(newUser));
        setAuthModalOpen(false);
        showToast(`Bienvenue, ${nameInput} ! Compte créé avec succès.`);
      } finally {
        setAuthLoading(false);
      }
    }
  };

  // ── RENVOI DE L'EMAIL DE VALIDATION DE COMPTE ──
  const handleResendValidationEmail = async (targetEmail) => {
    const emailToSend = targetEmail || authNotice?.email || forgotEmail;
    if (!emailToSend) {
      showToast('Veuillez renseigner votre adresse e-mail.', true);
      return;
    }
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToSend,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
        }
      });
      if (error) throw error;
      showToast(`E-mail de validation renvoyé avec succès à ${emailToSend} !`);
      setAuthNotice({
        type: 'success',
        email: emailToSend,
        text: `Un nouvel e-mail de validation a été envoyé à ${emailToSend}. Pensez à vérifier vos courriers indésirables (spams) si vous ne le trouvez pas.`
      });
    } catch (err) {
      showToast(err.message || 'Erreur lors du renvoi de l\'e-mail.', true);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) { }
    setUser(null);
    localStorage.removeItem('byafrika_user');
    if (activePage === 'admin' || activePage === 'compte') setActivePage('accueil');
    showToast('Vous avez été déconnecté.');
  };

  // ── ACCÈS SÉCURISÉ ADMIN ──
  const handleAdminAccess = () => {
    if (isUserAdmin) {
      setActivePage('admin');
    } else {
      setAdminLoginModalOpen(true);
      showToast('Accès restreint : Veuillez vous connecter avec vos identifiants administrateur.');
    }
  };

  const handleAdminLoginForm = (e) => {
    e.preventDefault();
    const email = e.target.adminEmail?.value?.trim() || '';
    const pwd = e.target.adminPassword?.value?.trim() || '';

    const isMatch = (
      (email.toLowerCase().includes('admin') || email.toLowerCase().includes('adama') || email.toLowerCase() === 'admin@byafrica.com') &&
      (pwd === 'admin123' || pwd === 'byafrika2026' || pwd === 'Admin2026' || pwd === 'admin')
    );

    if (isMatch) {
      const adminUser = { id: 'admin_1', name: 'Adama Dioume (Fondateur)', email: 'admin@byafrica.com', role: 'admin' };
      setUser(adminUser);
      localStorage.setItem('byafrika_user', JSON.stringify(adminUser));
      setAdminLoginModalOpen(false);
      setActivePage('admin');
      showToast('Authentification réussie : Bienvenue dans l\'Espace Administrateur.');
    } else {
      showToast('Identifiants administrateur incorrects.');
    }
  };

  // ── MOT DE PASSE OUBLIÉ ──
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.forgotEmail?.value?.trim() || forgotEmail.trim();
    if (!email) {
      showToast('Veuillez renseigner votre adresse e-mail.', true);
      return;
    }

    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      });
    } catch (err) { }

    showToast(`Un e-mail de réinitialisation a été envoyé à ${email}.`);
    setForgotModalOpen(false);
  };

  // ── AUTHENTIFICATION GOOGLE ──
  const handleGoogleAuthClick = async () => {
    try {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : '',
          skipBrowserRedirect: true
        }
      });
      if (error) throw error;
      if (data?.url) {
        // Tester si le provider Google est activé sur Supabase avant de rediriger
        try {
          const testRes = await fetch(data.url);
          if (!testRes.ok) {
            throw new Error('Fournisseur Google non activé sur Supabase');
          }
          window.location.href = data.url;
          return;
        } catch (fetchErr) {
          throw fetchErr;
        }
      }
    } catch (err) {
      console.warn('Google OAuth Supabase non activé dans le dashboard, bascule sur profil Google :', err);
      setAuthModalOpen(false);
      setGoogleAuthModalOpen(true);
      showToast('Fournisseur Google non configuré sur Supabase : complétez votre profil Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.googleEmail?.value?.trim() || '';
    const name = e.target.googleName?.value?.trim() || email.split('@')[0];

    const googleUser = {
      id: `usr_google_${Date.now()}`,
      name,
      email,
      role: (name.toLowerCase().includes('admin') || email.toLowerCase().includes('admin')) ? 'admin' : 'client',
      provider: 'google'
    };
    setUser(googleUser);
    localStorage.setItem('byafrika_user', JSON.stringify(googleUser));
    try {
      await supabase.from('users').upsert({
        id: googleUser.id,
        name: googleUser.name,
        email: googleUser.email,
        role: googleUser.role,
        auth_provider: 'google'
      });
    } catch (e) { }
    setGoogleAuthModalOpen(false);
    if (googleUser.role === 'admin') {
      setActivePage('admin');
      showToast('Connecté avec succès en tant qu\'Administrateur.');
    } else {
      showToast(`Connecté avec succès via Google : Bienvenue ${name} !`);
    }
  };

  // ── LIEN DE VALIDATION COMMANDE SUR WHATSAPP ──
  const getWhatsAppOrderUrl = (order) => {
    if (!order) return '#';
    const rawNumber = (config.whatsapp || config.phone || '221770000000').replace(/[^0-9]/g, '');
    const phoneNum = rawNumber.startsWith('221') ? rawNumber : (rawNumber.length === 9 ? `221${rawNumber}` : rawNumber);

    const itemsList = (order.items || []).map(
      item => `• ${item.qty}x ${item.name} (Taille: ${item.size || 'M'}, Couleur: ${item.color || 'Noir'}) - ${formatPrice(item.price * item.qty)}`
    ).join('\n');

    const msg = `*BY_AFRIKA - VALIDATION DE COMMANDE* 📦\n\n` +
      `*N° Commande :* ${order.id}\n` +
      `*Client :* ${order.customer?.name}\n` +
      `*Téléphone :* ${order.customer?.phone}\n` +
      (order.customer?.email ? `*Email :* ${order.customer?.email}\n` : '') +
      `*Mode :* ${order.deliveryType}\n` +
      (order.customer?.address ? `*Adresse :* ${order.customer?.address}\n` : '') +
      (order.customer?.notes ? `*Instructions :* ${order.customer?.notes}\n` : '') +
      `\n*Articles commandés :*\n${itemsList}\n\n` +
      `*Frais de livraison :* ${order.deliveryFee === 0 ? 'Gratuit (0 FCFA)' : formatPrice(order.deliveryFee)}\n` +
      `*TOTAL À PAYER :* ${formatPrice(order.total)} (Arriver Payer)\n\n` +
      `Bonjour BY_AFRIKA, je viens de passer cette commande et je souhaite la valider avec vous !`;

    return `https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`;
  };

  // ── PASSATION DE COMMANDE (ARRIVER PAYER & VALIDATION WHATSAPP) ──
  const handleCheckoutSubmit = async (e, isWhatsAppDirect = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (cart.length === 0) return;

    let fd;
    if (e && e.target && e.target.tagName === 'FORM') {
      fd = new FormData(e.target);
    } else {
      const formEl = document.querySelector('#modal-checkout form');
      fd = formEl ? new FormData(formEl) : new FormData();
    }

    const customerName = fd.get('name') || user?.name || 'Client';
    const customerPhone = fd.get('phone') || '';
    if (!customerPhone) {
      showToast('Veuillez renseigner votre numéro de téléphone.');
      return;
    }

    const newOrder = {
      id: `CMD-${Date.now()}`,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: fd.get('email') || (user ? user.email : ''),
        address: checkoutDelivery === 'delivery' ? (fd.get('address') || 'Dakar') : 'Retrait en boutique BY_AFRIKA (Dakar)',
        notes: fd.get('notes') || ''
      },
      deliveryType: checkoutDelivery === 'delivery' ? 'Livraison à domicile' : 'Retrait en boutique (0 FCFA)',
      deliveryFee,
      items: [...cart],
      subtotal: cartSubtotal,
      total: cartGrandTotal,
      status: 'Reçue',
      paymentMethod: isWhatsAppDirect ? 'Validation WhatsApp (Arriver Payer)' : 'Arriver Payer (Espèces / Wave à la livraison)',
      createdAt: new Date().toISOString()
    };

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setCheckoutOpen(false);
    setConfirmedOrder(newOrder);

    // Sauvegarde Cloud Supabase
    try {
      await supabase.from('orders').insert([{
        id: newOrder.id,
        customer_name: newOrder.customer.name,
        customer_phone: newOrder.customer.phone,
        customer_email: newOrder.customer.email,
        delivery_address: newOrder.customer.address,
        delivery_type: newOrder.deliveryType,
        total_amount: newOrder.total,
        status: newOrder.status,
        items: newOrder.items
      }]);
    } catch (err) { }

    if (isWhatsAppDirect) {
      const waUrl = getWhatsAppOrderUrl(newOrder);
      window.open(waUrl, '_blank');
      showToast('Commande enregistrée ! Redirection vers WhatsApp pour la validation...');
    } else {
      showToast('Votre commande a été enregistrée avec succès !');
    }
  };

  // ── ENVOI DE MESSAGE / RÉCLAMATION ──
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msg = {
      id: `msg_${Date.now()}`,
      name: fd.get('name'),
      phone: fd.get('phone'),
      email: fd.get('email') || '',
      type: fd.get('type'),
      orderId: fd.get('orderId') || '',
      message: fd.get('message'),
      status: 'Nouveau',
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [msg, ...prev]);
    e.target.reset();

    try {
      await supabase.from('messages').insert([msg]);
    } catch (e) { }

    showToast('Votre message a bien été envoyé. Notre service client vous répondra rapidement !');
  };

  // ── GESTION DES PRODUITS (ADMIN : MOBILE & PC) ──
  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductFormImage('/tshirt-byafrika.jpg');
    setProductFormSizes(['S', 'M', 'L', 'XL', 'XXL']);
    setProductFormColors(['Noir', 'Blanc']);
    setShowProductFormModal(true);
  };

  const openEditProductModal = (prod) => {
    setEditingProduct(prod);
    setProductFormImage(prod.image || '/tshirt-byafrika.jpg');
    setProductFormSizes(Array.isArray(prod.sizes) && prod.sizes.length > 0 ? prod.sizes : ['S', 'M', 'L', 'XL']);
    setProductFormColors(Array.isArray(prod.colors) && prod.colors.length > 0 ? prod.colors : ['Noir', 'Blanc']);
    setShowProductFormModal(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        showToast('Image trop volumineuse (max 15 Mo).', true);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawResult = event.target?.result;
        if (!rawResult) return;
        // Compression et redimensionnement automatique via Canvas pour un affichage instantané
        const img = new Image();
        img.onload = () => {
          const maxDim = 900;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setProductFormImage(compressedDataUrl);
          showToast('Photo optimisée et chargée avec succès !');
        };
        img.onerror = () => {
          setProductFormImage(rawResult);
          showToast('Photo chargée avec succès !');
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFormSize = (size) => {
    setProductFormSizes(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(size) ? arr.filter(s => s !== size) : [...arr, size];
    });
  };

  const toggleFormColor = (color) => {
    setProductFormColors(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(color) ? arr.filter(c => c !== color) : [...arr, color];
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const chosenSizes = productFormSizes && productFormSizes.length > 0
      ? productFormSizes
      : (fd.get('sizes') ? fd.get('sizes').split(',').map(s => s.trim()).filter(Boolean) : ['S', 'M', 'L', 'XL']);
    const chosenColors = productFormColors && productFormColors.length > 0
      ? productFormColors
      : (fd.get('colors') ? fd.get('colors').split(',').map(c => c.trim()).filter(Boolean) : ['Noir', 'Blanc']);
    const chosenImage = productFormImage || fd.get('image') || '/tshirt-byafrika.jpg';

    const isFeatured = fd.get('featured') === 'on' || fd.get('featured') === 'true' || !editingProduct;

    const prodData = {
      id: editingProduct?.id || `prod_${Date.now()}`,
      name: fd.get('name') || 'Article BY_AFRIKA',
      category: fd.get('category') || 'T-shirts',
      genre: fd.get('genre') || 'Unisexe',
      price: Number(fd.get('price')) || 15000,
      description: fd.get('description') || '',
      image: chosenImage,
      sizes: chosenSizes,
      colors: chosenColors,
      stock: Number(fd.get('stock')) || 25,
      featured: isFeatured
    };

    let updatedProducts;
    if (editingProduct) {
      updatedProducts = products.map(p => p.id === editingProduct.id ? prodData : p);
      setProducts(updatedProducts);
      showToast('Vêtement mis à jour avec succès.');
    } else {
      updatedProducts = [prodData, ...products];
      setProducts(updatedProducts);
      showToast('Nouveau vêtement ajouté avec succès au catalogue et en boutique !');
    }

    // Persistance immédiate et garantie en stockage local
    try {
      localStorage.setItem('byafrika_products', JSON.stringify(updatedProducts));
      // Si l'article avait été marqué supprimé, on le retire du registre des supprimés
      const currentDeleted = JSON.parse(localStorage.getItem('byafrika_deleted_product_ids') || '[]');
      if (currentDeleted.includes(prodData.id)) {
        localStorage.setItem('byafrika_deleted_product_ids', JSON.stringify(currentDeleted.filter(d => d !== prodData.id)));
      }
    } catch (err) {
      console.warn('Erreur sauvegarde locale produits:', err);
    }

    // Synchronisation Cloud Supabase
    try {
      await supabase.from('products').upsert([prodData]);
    } catch (e) {
      console.warn('Erreur synchronisation Supabase produit:', e);
    }

    setShowProductFormModal(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Voulez-vous vraiment supprimer cet article ?')) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      try {
        // Enregistrer la liste mise à jour localement immédiatement
        localStorage.setItem('byafrika_products', JSON.stringify(updated));
        // Enregistrer l'ID dans le registre des articles supprimés pour empêcher toute résurrection
        const currentDeleted = JSON.parse(localStorage.getItem('byafrika_deleted_product_ids') || '[]');
        if (!currentDeleted.includes(id)) {
          currentDeleted.push(id);
          localStorage.setItem('byafrika_deleted_product_ids', JSON.stringify(currentDeleted));
        }
      } catch (e) { }
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (e) { }
      showToast('Produit retiré du catalogue définitivement.');
    }
  };

  // ── GESTION ET SUPPRESSION DES COMMANDES ──
  const handleDeleteSingleOrder = async (orderId) => {
    if (!confirm(`Voulez-vous vraiment supprimer la commande N° ${orderId} de l'historique ?`)) return;
    setOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      await supabase.from('orders').delete().eq('id', orderId);
    } catch (err) { }
    showToast(`Commande ${orderId} supprimée de l'historique.`);
  };

  const handleClearUserOrderHistory = async () => {
    if (!confirm('Voulez-vous vraiment effacer tout l\'historique de vos commandes ?')) return;
    const userEmail = user?.email;
    const userPhone = user?.phone;
    setOrders(prev => prev.filter(o => {
      const isClientOrder = (userEmail && o.customer?.email === userEmail) || (userPhone && o.customer?.phone === userPhone);
      return !isClientOrder;
    }));
    try {
      if (userEmail) {
        await supabase.from('orders').delete().eq('customer_email', userEmail);
      }
    } catch (err) { }
    showToast('Votre historique de commandes a été effacé avec succès.');
  };

  const handleClearAllOrdersAdmin = async () => {
    if (!confirm('ATTENTION : Voulez-vous vraiment supprimer TOUTES les commandes clients du magasin ? Cette action est irréversible.')) return;
    setOrders([]);
    try {
      await supabase.from('orders').delete().neq('id', 'keep_none_placeholder');
    } catch (err) { }
    showToast('Tout l\'historique des commandes a été supprimé.');
  };

  // ── AJOUT DE RÔLE UTILISATEUR (ADMIN) ──
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    const name = e.target.userName?.value?.trim();
    const email = e.target.userEmail?.value?.trim();
    const role = e.target.userRole?.value || 'Gestionnaire de commandes';

    if (!name || !email) {
      showToast('Veuillez remplir tous les champs obligatoires.', true);
      return;
    }

    const newUser = { id: `usr_${Date.now()}`, name, email, role };
    setUsersList(prev => [...prev, newUser]);
    try {
      await supabase.from('users').upsert({ id: newUser.id, name, email, role, auth_provider: 'local' });
    } catch (err) {}

    setShowAddUserModal(false);
    showToast(`Membre d'équipe ${name} ajouté (${role}) !`);
  };

  // ── GESTION DE LA CONFIGURATION ET CATÉGORIES ADMIN ──
  const handleAddCategory = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cat = newCategoryName.trim();
    if (!cat) return;
    if (config.categories?.includes(cat)) {
      showToast('Cette catégorie existe déjà.');
      return;
    }
    const updated = { ...config, categories: [...(config.categories || []), cat] };
    setConfig(updated);
    try {
      localStorage.setItem('byafrika_config', JSON.stringify(updated));
    } catch (err) { }
    setNewCategoryName('');
    showToast(`Catégorie "${cat}" ajoutée.`);
  };

  const handleRemoveCategory = (cat) => {
    const updated = { ...config, categories: config.categories?.filter(c => c !== cat) };
    setConfig(updated);
    try {
      localStorage.setItem('byafrika_config', JSON.stringify(updated));
    } catch (err) { }
    showToast(`Catégorie "${cat}" supprimée.`);
  };

  const handleSaveConfig = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    // 1. Sauvegarde locale immédiate garantie
    try {
      localStorage.setItem('byafrika_config', JSON.stringify(config));
    } catch (err) { }

    // 2. Sauvegarde Cloud Supabase dans la table officielle site_config
    try {
      await supabase.from('site_config').upsert({
        id: 'main',
        data: config,
        updated_at: new Date().toISOString()
      });
    } catch (err) { }

    // 3. Sauvegarde dans table config alternative
    try {
      await supabase.from('config').upsert({ id: 'main', ...config });
    } catch (err) { }

    // 4. Sauvegarde dans message système
    try {
      await supabase.from('messages').upsert({
        id: 'system_byafrika_config',
        name: 'BY_AFRIKA SYSTEM',
        email: 'system@byafrika.com',
        phone: config.phone || '+221 77 000 00 00',
        subject: 'SYSTEM_CONFIG',
        message: JSON.stringify(config),
        created_at: new Date().toISOString()
      });
    } catch (err) { }
    showToast('Configuration et réseaux sociaux enregistrés et synchronisés !');
  };

  // ── FILTRAGE DES PRODUITS CLIENT ──
  const getFilteredProducts = () => {
    return products.filter(p => {
      const pGenre = (p.genre || 'Unisexe').toLowerCase();
      const pCat = (p.category || '').toLowerCase();

      if (activePage === 'hommes' && pGenre !== 'homme' && pGenre !== 'unisexe') return false;
      if (activePage === 'femmes' && pGenre !== 'femme' && pGenre !== 'unisexe') return false;
      if (filterGenre && filterGenre.toLowerCase() !== 'tous' && pGenre !== filterGenre.toLowerCase() && pGenre !== 'unisexe') return false;
      if (filterCategory && filterCategory.toLowerCase() !== 'toutes' && pCat !== filterCategory.toLowerCase()) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) || ((p.description || '').toLowerCase().includes(q));
      }
      return true;
    });
  };

  const featuredProducts = products.filter(p => p.featured);

  // ── COMPOSANT CARTE PRODUIT AVEC CLASSES EXACTES DE STYLE.CSS ──
  const renderProductCard = (p) => {
    return (
      <div key={p.id} className="product-card" data-product-id={p.id}>
        <div
          className="product-card-img-wrapper"
          onClick={() => {
            setProductModal(p);
            setSelectedSize(p.sizes?.[0] || 'M');
            setSelectedColor(p.colors?.[0] || 'Noir');
            setSelectedQty(1);
          }}
        >
          <img
            className="product-card-img"
            src={getSafeImage(p.image)}
            alt={p.name}
            onError={(e) => { e.target.src = '/tshirt-byafrika.jpg'; }}
          />
          <button
            type="button"
            className="btn-card-expand"
            title="Voir en plein écran"
            aria-label="Voir en plein écran"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenProduct(p);
              setIsImageZoomed(false);
            }}
          >
            <i className="fa-solid fa-expand" />
          </button>
        </div>
        <div className="product-card-info">
          <span className="product-card-genre">{p.category || 'Vêtement'}</span>
          <h3
            className="product-card-title"
            onClick={() => {
              setProductModal(p);
              setSelectedSize(p.sizes?.[0] || 'M');
              setSelectedColor(p.colors?.[0] || 'Noir');
              setSelectedQty(1);
            }}
          >
            {p.name}
          </h3>
          <div className="product-card-price">
            <span>{formatPrice(p.price)}</span>
          </div>
          <div className="product-card-actions">
            <button
              type="button"
              className="btn-card-view"
              title="Voir les détails"
              onClick={() => {
                setProductModal(p);
                setSelectedSize(p.sizes?.[0] || 'M');
                setSelectedColor(p.colors?.[0] || 'Noir');
                setSelectedQty(1);
              }}
            >
              <i className="fa-solid fa-eye" /> Voir le produit
            </button>
            <button
              type="button"
              className="btn-card-add-cart"
              title="Ajouter au panier"
              onClick={() => addToCart(p, p.sizes?.[0] || 'M', p.colors?.[0] || 'Noir', 1)}
            >
              <i className="fa-solid fa-cart-plus" /> Ajouter au panier
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ============================================================ */}
      {/* VUE CLIENT (BOUTIQUE OFFICIELLE)                             */}
      {/* ============================================================ */}
      {activePage !== 'admin' ? (
        <div id="client-view">
          {/* Top Announcement Bar */}
          <div className="top-announcement-bar">
            <div className="announcement-content">
              <span>✦</span>
              <span>FIERTÉ AFRICAINE • LIVRAISON PARTOUT AU SÉNÉGAL • BY_AFRIKA</span>
              <span>✦</span>
            </div>
          </div>

          {/* Header & Navbar Principale */}
          <header className="site-header">
            <div className="header-container">
              {/* Bouton Hamburger Mobile */}
              <button
                type="button"
                className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}
                id="hamburger-btn"
                aria-label="Menu Mobile"
                onClick={() => setMobileMenuOpen(prev => !prev)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>

              {/* Logo & Identité de la marque */}
              <a
                href="#"
                className="brand-logo"
                onClick={(e) => { e.preventDefault(); setActivePage('accueil'); }}
              >
                <img src="/logo.jpg" alt="Logo BY_AFRIKA" className="brand-logo-img" />
                <span className="brand-logo-text">BY_AFRIKA</span>
              </a>

              {/* Liens centraux desktop */}
              <nav className="nav-links">
                <a
                  href="#"
                  className={`nav-link ${activePage === 'accueil' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setActivePage('accueil'); }}
                >
                  ACCUEIL
                </a>
                <a
                  href="#"
                  className={`nav-link ${activePage === 'boutique' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setActivePage('boutique'); setFilterGenre(''); }}
                >
                  BOUTIQUE
                </a>
                <a
                  href="#"
                  className={`nav-link ${activePage === 'hommes' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setActivePage('hommes'); }}
                >
                  HOMMES
                </a>
                <a
                  href="#"
                  className={`nav-link ${activePage === 'femmes' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setActivePage('femmes'); }}
                >
                  FEMMES
                </a>
                <a
                  href="#"
                  className={`nav-link ${activePage === 'apropos' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setActivePage('apropos'); }}
                >
                  À PROPOS
                </a>
              </nav>

              {/* Actions à droite */}
              <div className="nav-actions">
                <button
                  type="button"
                  id="search-toggle"
                  className="action-btn-circle"
                  aria-label="Rechercher"
                  onClick={() => setSearchOpen(prev => !prev)}
                >
                  <i className="fa-solid fa-search" />
                </button>

                <button
                  type="button"
                  id="cart-btn"
                  className="action-btn-circle"
                  aria-label="Panier"
                  onClick={() => setCartOpen(true)}
                >
                  <i className="fa-solid fa-shopping-bag" />
                  <span id="cart-count">{cartTotalItems}</span>
                </button>

                <button
                  type="button"
                  id="account-btn"
                  className="action-btn-pill"
                  aria-label="Mon compte"
                  onClick={() => {
                    if (!user) {
                      setAuthModalOpen(true);
                    } else if (isUserAdmin) {
                      setActivePage('admin');
                    } else {
                      setActivePage('compte');
                    }
                  }}
                >
                  <i className="fa-solid fa-user" />
                  <span id="account-btn-label">{user ? user.name : 'Se connecter'}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Menu Mobile Déroulant */}
          {mobileMenuOpen && (
            <div className="mobile-menu" id="mobile-menu" style={{ display: 'flex' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('accueil'); setMobileMenuOpen(false); }}>Accueil</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('boutique'); setFilterGenre(''); setMobileMenuOpen(false); }}>Boutique</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('hommes'); setMobileMenuOpen(false); }}>Hommes</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('femmes'); setMobileMenuOpen(false); }}>Femmes</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('apropos'); setMobileMenuOpen(false); }}>À propos</a>
              <a href="#" onClick={(e) => { e.preventDefault(); if (!user) setAuthModalOpen(true); else if (isUserAdmin) setActivePage('admin'); else setActivePage('compte'); setMobileMenuOpen(false); }}>
                <i className="fa-solid fa-user" /> {user ? user.name : 'Mon Compte / Connexion'}
              </a>
              {user && (
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleLogout(); setMobileMenuOpen(false); }}
                  style={{
                    color: '#ef4444',
                    fontWeight: 700,
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                    marginTop: 8,
                    paddingTop: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <i className="fa-solid fa-arrow-right-from-bracket" /> Déconnexion
                </a>
              )}
            </div>
          )}

          {/* Barre de Recherche Dropdown */}
          {searchOpen && (
            <div className="search-bar" id="search-bar" style={{ display: 'block' }}>
              <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="text"
                  id="search-input"
                  placeholder="Rechercher un t-shirt, une chemise, une robe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="button" id="search-close" onClick={() => setSearchOpen(false)}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PAGE 1 : ACCUEIL                                            */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activePage === 'accueil' && (
            <section id="page-accueil" className="page active">
              {/* Hero Section — Photo Officielle BY_AFRIKA en fond */}
              <div
                className="hero-section"
                style={{
                  backgroundImage: "url('/hero-banner.jpg')",
                  backgroundPosition: "center 22%",
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat"
                }}
              >
                <div className="hero-content">
                  <h1 className="sr-only">BY_AFRIKA - Portez vos origines avec confiance</h1>
                  <p className="hero-slogan-bottom">Portez vos origines avec confiance</p>
                  <div className="hero-buttons">
                    <button
                      type="button"
                      className="btn-homme"
                      onClick={() => setActivePage('hommes')}
                    >
                      <span>Collection Homme</span>
                      <i className="fa-solid fa-arrow-right" />
                    </button>
                    <button
                      type="button"
                      className="btn-femme"
                      onClick={() => setActivePage('femmes')}
                    >
                      <span>Collection Femme</span>
                      <i className="fa-solid fa-arrow-right" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Grand Logo Typographique Stylisé Monumental */}
              <div className="brand-monumental-section">
                <div className="container">
                  <div className="brand-monumental-svg-wrap">
                    <svg viewBox="0 0 1000 120" width="100%" height="auto" preserveAspectRatio="xMidYMid meet" aria-label="BY_AFRIKA" role="img">
                      <text x="500" y="65" textAnchor="middle" dominantBaseline="middle" className="brand-monumental-svg-text">
                        BY_AFRIKA
                      </text>
                    </svg>
                  </div>
                  <div className="brand-monumental-line" />
                </div>
              </div>

              {/* Produits en Vedette — En-tête Éditorial */}
              <div className="featured-products">
                <div className="container">
                  <div className="editorial-collection-header">
                    <span className="editorial-eyebrow">NOS COLLECTIONS</span>
                    <h2 className="editorial-cursive-title">By Afrika</h2>
                  </div>
                  <div className="products-grid" id="featured-grid">
                    {featuredProducts.map(p => renderProductCard(p))}
                  </div>
                </div>
              </div>

              {/* Section Typographique Streetwear au Milieu des Produits */}
              <section className="brand-streetwear-statement">
                <div className="container">
                  <div className="statement-wrapper">
                    <span className="statement-subtitle">BY_AFRIKA STORE</span>
                    <div className="statement-double-divider" />
                    <div className="statement-wolof-block">
                      <h3 className="statement-wolof-line">YEEWU NAÑ</h3>
                      <h3 className="statement-wolof-line">UBBI NAÑ</h3>
                      <h3 className="statement-wolof-line">ÑËWLEEN</h3>
                    </div>
                    <p className="statement-tagline">Portez vos origines avec confiance • Prêt-à-porter sénégalais</p>
                    <div className="statement-actions">
                      <button
                        type="button"
                        className="btn-statement-explore"
                        onClick={() => {
                          setActivePage('boutique');
                          setFilterGenre('');
                          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                        }}
                      >
                        <span>Découvrir Toute la Boutique</span>
                        <i className="fa-solid fa-arrow-right" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Valeurs de la marque */}
              <div className="brand-values">
                <div className="container">
                  <div className="values-grid">
                    <div className="value-card">
                      <i className="fa-solid fa-medal" />
                      <h3>Qualité Premium</h3>
                      <p>Des matériaux soigneusement sélectionnés pour un confort et une durabilité exceptionnels.</p>
                    </div>
                    <div className="value-card">
                      <i className="fa-solid fa-globe-africa" />
                      <h3>Fierté Africaine</h3>
                      <p>Chaque pièce célèbre la richesse culturelle et l'héritage du continent africain.</p>
                    </div>
                    <div className="value-card">
                      <i className="fa-solid fa-truck-fast" />
                      <h3>Livraison Rapide</h3>
                      <p>Recevez vos commandes rapidement partout au Sénégal. Paiement à la livraison.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PAGE 2 : BOUTIQUE (TOUT LE CATALOGUE AVEC FILTRES)         */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activePage === 'boutique' && (
            <section id="page-boutique" className="page active">
              <div className="container">
                <div className="boutique-header">
                  <h1>Boutique</h1>
                  <div className="filters-bar">
                    <div className="filter-group">
                      <label htmlFor="filter-genre">Genre</label>
                      <select
                        id="filter-genre"
                        className="form-input"
                        value={filterGenre}
                        onChange={e => setFilterGenre(e.target.value)}
                      >
                        <option value="">Tous</option>
                        <option value="Homme">Homme</option>
                        <option value="Femme">Femme</option>
                        <option value="Unisexe">Unisexe</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label htmlFor="filter-category">Catégorie</label>
                      <select
                        id="filter-category"
                        className="form-input"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                      >
                        <option value="">Toutes</option>
                        {config.categories?.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label htmlFor="filter-search">Recherche</label>
                      <input
                        type="text"
                        id="filter-search"
                        className="form-input"
                        placeholder="Nom du vêtement..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="products-grid" id="boutique-grid">
                  {getFilteredProducts().map(p => renderProductCard(p))}
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PAGE 3 : HOMMES                                             */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activePage === 'hommes' && (
            <section id="page-hommes" className="page active">
              <div className="container">
                <div className="boutique-header">
                  <h1>Collection Homme</h1>
                </div>
                <div className="products-grid" id="hommes-grid">
                  {products.filter(p => p.genre === 'Homme' || p.genre === 'Unisexe').map(p => renderProductCard(p))}
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PAGE 4 : FEMMES                                             */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activePage === 'femmes' && (
            <section id="page-femmes" className="page active">
              <div className="container">
                <div className="boutique-header">
                  <h1>Collection Femme</h1>
                </div>
                <div className="products-grid" id="femmes-grid">
                  {products.filter(p => p.genre === 'Femme' || p.genre === 'Unisexe').map(p => renderProductCard(p))}
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PAGE 5 : À PROPOS DE BY_AFRIKA & SERVICE CLIENT             */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {(activePage === 'apropos' || activePage === 'contact') && (
            <section id="page-apropos" className="page active">
              <div className="container">
                <div className="apropos-hero">
                  <h1>À propos de BY_AFRIKA</h1>
                  <p>Un projet pour la fierté Africaine — porté par la passion et la jeunesse de Dakar.</p>
                </div>

                <div className="apropos-content">
                  <div className="apropos-section">
                    <h2><i className="fa-solid fa-book-open" /> Notre Histoire</h2>
                    <p>
                      BY_AFRIKA est né d'un rêve simple mais puissant : créer une marque de vêtements qui célèbre l'identité
                      africaine avec style et modernité. Fondée à Dakar, au cœur du Sénégal, notre marque fusionne les racines
                      profondes du continent avec les tendances contemporaines de la mode internationale.
                    </p>
                    <p>
                      Chaque pièce que nous créons raconte une histoire — celle d'un continent riche en couleurs, en traditions
                      et en résilience. Nous croyons que la mode est un moyen d'expression, et que porter BY_AFRIKA, c'est
                      affirmer sa fierté d'être Africain.
                    </p>
                  </div>

                  <div className="apropos-section">
                    <h2><i className="fa-solid fa-bullseye" /> Notre Mission</h2>
                    <p>
                      Notre mission est de rendre la mode africaine accessible, moderne et désirable. Nous voulons que chaque
                      personne qui porte nos créations ressente la puissance et la beauté de ses origines.
                    </p>
                    <p>
                      Nous nous engageons à proposer des vêtements de qualité premium, fabriqués avec soin et respect, à des
                      prix justes pour notre communauté. BY_AFRIKA, c'est plus qu'une marque — c'est un mouvement.
                    </p>
                  </div>

                  <div className="apropos-section founder-section">
                    <h2><i className="fa-solid fa-user-tie" /> Le Fondateur</h2>
                    <div className="founder-card-layout" style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', marginTop: 16 }}>
                      <div className="founder-image-wrapper" style={{ maxWidth: 360, width: '100%', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', border: '2px solid rgba(223, 186, 92, 0.4)' }}>
                        <img
                          src="/fondateur-adama-dioume.jpg"
                          alt="Adama Dioume - Fondateur de BY_AFRIKA"
                          style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                        />
                        <div style={{ background: '#111', color: '#dfba5c', padding: '10px 16px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                          ADAMA DIOUME • FONDATEUR DE BY_AFRIKA
                        </div>
                      </div>
                      <div className="founder-text-content" style={{ width: '100%' }}>
                        <p>
                          <strong>Adama Dioume</strong>, originaire de Dakar, Sénégal. Passionné de mode et animé par un profond amour pour l'Afrique, Adama a créé BY_AFRIKA pour donner une voix vestimentaire et stylée à la jeunesse africaine.
                        </p>
                        <p>
                          Son ambition : faire de BY_AFRIKA une référence panafricaine dans la mode contemporaine, en partant de Dakar pour conquérir le continent et au-delà. Chaque collection est pensée pour inspirer confiance, fierté et élégance.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="apropos-section">
                    <h2><i className="fa-solid fa-laptop-code" /> Conception & Développement Web</h2>
                    <p>
                      La plateforme e-commerce et l'architecture web de <strong>BY_AFRIKA</strong> ont été conçues et développées par <strong>Mamadou Diaw</strong>, alliant performance moderne, sécurité et expérience d'achat haut de gamme.
                    </p>
                  </div>
                </div>

                <div className="contact-section" id="contact-sav">
                  <h2><i className="fa-solid fa-phone" /> Nous Contacter</h2>
                  <div className="contact-info">
                    <div className="contact-item">
                      <i className="fa-solid fa-phone" />
                      <span>{config.phone || '+221 77 000 00 00'}</span>
                    </div>
                    <div className="contact-item">
                      <i className="fa-solid fa-envelope" />
                      <span>{config.email || 'contact@byafrica.com'}</span>
                    </div>
                    <div className="contact-item">
                      <i className="fa-solid fa-location-dot" />
                      <span>{config.address || 'Dakar, Sénégal'}</span>
                    </div>
                    <div className="contact-item">
                      <i className="fa-brands fa-whatsapp" />
                      <span>{config.whatsapp || config.phone || '+221 77 000 00 00'}</span>
                    </div>
                  </div>

                  {/* Réseaux sociaux officiels */}
                  <div className="social-icons" style={{ marginTop: 16, marginBottom: 24 }}>
                    {config.whatsapp && (
                      <a href={config.whatsapp.startsWith('http') ? config.whatsapp : `https://wa.me/${config.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="social-btn" aria-label="WhatsApp">
                        <i className="fa-brands fa-whatsapp" />
                      </a>
                    )}
                    {config.facebook && (
                      <a href={config.facebook} target="_blank" rel="noreferrer" className="social-btn" aria-label="Facebook">
                        <i className="fa-brands fa-facebook-f" />
                      </a>
                    )}
                    {config.instagram && (
                      <a href={config.instagram} target="_blank" rel="noreferrer" className="social-btn" aria-label="Instagram">
                        <i className="fa-brands fa-instagram" />
                      </a>
                    )}
                    {config.tiktok && (
                      <a href={config.tiktok} target="_blank" rel="noreferrer" className="social-btn" aria-label="TikTok">
                        <i className="fa-brands fa-tiktok" />
                      </a>
                    )}
                  </div>

                  {/* Formulaire Réclamation & Message Client Direct */}
                  <div className="contact-form-card">
                    <h3>
                      <i className="fa-solid fa-headset" style={{ color: 'var(--gold-accent)' }} /> Formulaire de Réclamation & Message
                    </h3>
                    <p>
                      Une question sur votre commande, une demande de taille ou une réclamation ? Remplissez ce formulaire et
                      notre équipe vous répondra immédiatement sur WhatsApp ou par email.
                    </p>
                    <form id="form-contact-claim" className="form-stack" onSubmit={handleContactSubmit}>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Votre nom complet <span style={{ color: '#ef4444' }}>*</span></label>
                          <input type="text" name="name" className="form-input" placeholder="Ex: Moussa Diop" required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Téléphone / WhatsApp <span style={{ color: '#ef4444' }}>*</span></label>
                          <input type="tel" name="phone" className="form-input" placeholder="+221 7X XXX XX XX" required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Email (optionnel)</label>
                          <input type="email" name="email" className="form-input" placeholder="votre.email@gmail.com" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Motif de la demande</label>
                          <select name="type" className="form-input">
                            <option value="Question Produit">Question sur un produit / taille</option>
                            <option value="Réclamation Commande">Réclamation sur une commande</option>
                            <option value="Livraison">Question ou délai de livraison</option>
                            <option value="Autre">Autre demande</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group full-width">
                        <label className="form-label">N° de Commande (le cas échéant)</label>
                        <input type="text" name="orderId" className="form-input" placeholder="Ex: CMD-1795308289504" />
                      </div>
                      <div className="form-group full-width">
                        <label className="form-label">Votre message ou réclamation <span style={{ color: '#ef4444' }}>*</span></label>
                        <textarea name="message" className="form-input" rows={3} placeholder="Décrivez votre demande..." required />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                        <i className="fa-solid fa-paper-plane" /> Envoyer le message
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PAGE : POLITIQUE DE CONFIDENTIALITÉ & GESTION DES COOKIES   */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activePage === 'confidentialite' && (
            <section id="page-confidentialite" className="page active">
              <div className="container">
                <div className="policy-header text-center" style={{ textAlign: 'center', marginBottom: 36 }}>
                  <span className="badge badge-prep" style={{ display: 'inline-block', marginBottom: 12, padding: '4px 12px', background: 'rgba(223, 186, 92, 0.15)', color: 'var(--gold-accent)', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700 }}>
                    Transparence & Protection
                  </span>
                  <h1 style={{ fontSize: '2.2rem', marginBottom: 12 }}>Politique de Confidentialité & Gestion des Cookies</h1>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: 700, margin: '0 auto 40px auto', fontSize: '0.95rem' }}>
                    Chez <strong>BY_AFRIKA</strong>, la confiance de notre communauté est sacrée. Découvrez en toute transparence comment vos informations sont protégées dans le cadre de notre service.
                  </p>
                </div>

                <div className="apropos-content">
                  <div className="apropos-section">
                    <h2><i className="fa-solid fa-shield-halved" /> 1. Engagement & Responsable du Traitement</h2>
                    <p>
                      La marque <strong>BY_AFRIKA</strong>, basée à Dakar (Sénégal) et administrée par la Direction BY_AFRIKA, s'engage à protéger la vie privée de ses clients et visiteurs conformément aux réglementations applicables sur la protection des données personnelles.
                    </p>
                    <p>
                      Nous collectons uniquement les informations strictement indispensables au traitement, à la confection et à la livraison de vos commandes vestimentaires.
                    </p>
                  </div>

                  <div className="apropos-section">
                    <h2><i className="fa-solid fa-database" /> 2. Données Collectées & Finalités</h2>
                    <p>Dans le cadre du modèle <strong>« Arriver Payer » (Paiement à la livraison)</strong>, nous collectons :</p>
                    <ul style={{ color: 'var(--text-secondary)', paddingLeft: 20, marginBottom: 12, lineHeight: 1.8 }}>
                      <li><strong>Nom complet</strong> : pour identifier le destinataire du colis.</li>
                      <li><strong>Numéro de téléphone</strong> : essentiel pour coordonner la remise directe par notre livreur à Dakar ou en région.</li>
                      <li><strong>Adresse géographique complète</strong> : quartier, repère ou indications utiles pour vous acheminer la commande.</li>
                      <li><strong>Adresse email</strong> : pour vous envoyer le reçu de commande et le suivi d'expédition.</li>
                      <li><strong>Taille et couleur</strong> : pour préparer le vêtement parfaitement adapté à votre morphologie.</li>
                    </ul>
                    <p>
                      <strong>Important :</strong> Nous n'enregistrons <em>aucune coordonnée bancaire</em> sur notre serveur puisque l'intégralité du règlement s'effectue en main propre lors de la remise du colis.
                    </p>
                  </div>

                  <div className="apropos-section">
                    <h2><i className="fa-solid fa-cookie-bite" /> 3. Utilisation des Cookies</h2>
                    <p>Les cookies sont de petits fichiers temporaires stockés localement sur votre appareil. Sur BY_AFRIKA, ils ont pour uniques vocations :</p>
                    <ul style={{ color: 'var(--text-secondary)', paddingLeft: 20, marginBottom: 12, lineHeight: 1.8 }}>
                      <li><strong>Cookies de Panier (Essentiels)</strong> : conserver vos articles sélectionnés dans votre panier même si vous actualisez la page.</li>
                      <li><strong>Cookies de Session (Sécurité)</strong> : maintenir votre connexion à votre Espace Client ou Administrateur.</li>
                      <li><strong>Cookies de Préférences</strong> : mémoriser votre choix sur les cookies.</li>
                    </ul>
                    <p>Nous n'utilisons aucun traceur publicitaire intrusif ou de revente à des tiers.</p>
                  </div>

                  <div className="apropos-section">
                    <h2><i className="fa-solid fa-user-check" /> 4. Vos Droits & Contact</h2>
                    <p>Vous disposez à tout moment d'un droit d'accès, de rectification ou de suppression totale de vos informations personnelles enregistrées sur BY_AFRIKA.</p>
                    <div style={{ background: 'var(--bg-secondary)', padding: 18, borderRadius: 8, marginTop: 12, border: '1px solid var(--border-color)' }}>
                      <p><strong>Direction Officielle BY_AFRIKA</strong></p>
                      <p>📞 Téléphone & WhatsApp : <strong>{config.phone || '+221 77 000 00 00'}</strong></p>
                      <p>📧 Email officiel : <strong>{config.email || 'contact@byafrica.com'}</strong></p>
                      <p>📍 Dakar, Sénégal</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* PAGE 7 : ESPACE CLIENT                                      */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activePage === 'compte' && (
            <section id="page-compte" className="page active">
              <div className="container">
                <div className="compte-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ marginBottom: 4, fontSize: '1.8rem' }}>Mon Compte</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      Bonjour <strong>{user?.name || 'Client'}</strong>, bienvenue dans votre espace personnel.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {isUserAdmin && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setActivePage('admin')}
                        style={{
                          backgroundColor: '#111',
                          color: '#dfba5c',
                          borderColor: '#dfba5c',
                          padding: '10px 18px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <i className="fa-solid fa-shield-halved" /> Espace Administrateur
                      </button>
                    )}
                    <button type="button" className="btn btn-outline" onClick={handleLogout} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }}>
                      <i className="fa-solid fa-arrow-right-from-bracket" /> Déconnexion
                    </button>
                  </div>
                </div>

                {/* Hub de Contrôle Administrateur (Directement accessible) */}
                {isUserAdmin && (
                  <div className="admin-quick-hub" style={{ background: '#111', border: '2px solid #dfba5c', borderRadius: 12, padding: '24px', marginBottom: 28, color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 18, borderBottom: '1px solid rgba(223, 186, 92, 0.3)', paddingBottom: 14 }}>
                      <div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#dfba5c', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <i className="fa-solid fa-crown" /> Direction & Gestion BY_AFRIKA
                        </span>
                        <h2 style={{ color: '#ffffff', margin: '6px 0 2px 0', fontSize: '1.4rem' }}>
                          Panneau de Contrôle Administrateur
                        </h2>
                        <p style={{ color: '#aaa', margin: 0, fontSize: '0.9rem' }}>
                          Vous disposez des droits complets d'administration : catalogue de vêtements, commandes clients, réclamations et configuration.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={openAddProductModal}
                          style={{
                            padding: '12px 20px',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            backgroundColor: '#dfba5c',
                            color: '#111',
                            border: 'none',
                            borderRadius: 8
                          }}
                        >
                          <i className="fa-solid fa-plus-circle" /> + Ajouter un Vêtement
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setActivePage('admin')}
                          style={{
                            padding: '12px 20px',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#fff',
                            borderColor: '#dfba5c',
                            borderRadius: 8
                          }}
                        >
                          <i className="fa-solid fa-gauge-high" /> Ouvrir l'Espace Admin
                        </button>
                      </div>
                    </div>

                    {/* Raccourcis directs vers tous les contrôles */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => { setAdminTab('dashboard'); setActivePage('admin'); }}
                        style={{ color: '#fff', borderColor: '#444', justifyContent: 'flex-start', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <i className="fa-solid fa-chart-line" style={{ color: '#dfba5c' }} /> Tableau de bord
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => { setAdminTab('produits'); setActivePage('admin'); }}
                        style={{ color: '#fff', borderColor: '#444', justifyContent: 'flex-start', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <i className="fa-solid fa-shirt" style={{ color: '#dfba5c' }} /> Gérer les Produits ({products.length})
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => { setAdminTab('commandes'); setActivePage('admin'); }}
                        style={{ color: '#fff', borderColor: '#444', justifyContent: 'flex-start', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <i className="fa-solid fa-box" style={{ color: '#dfba5c' }} /> Commandes Clients ({orders.length})
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => { setAdminTab('messages'); setActivePage('admin'); }}
                        style={{ color: '#fff', borderColor: '#444', justifyContent: 'flex-start', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <i className="fa-solid fa-headset" style={{ color: '#dfba5c' }} /> Messages & SAV ({messages.length})
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => { setAdminTab('config'); setActivePage('admin'); }}
                        style={{ color: '#fff', borderColor: '#444', justifyContent: 'flex-start', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <i className="fa-solid fa-gear" style={{ color: '#dfba5c' }} /> Configuration & Réseaux
                      </button>
                    </div>
                  </div>
                )}

                <div className="compte-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <h2 style={{ margin: 0 }}>Historique de mes commandes</h2>
                    {orders.filter(o => o.customer?.email === user?.email || o.customer?.phone === user?.phone).length > 0 && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={handleClearUserOrderHistory}
                        style={{
                          color: '#ef4444',
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                          fontSize: '0.82rem',
                          padding: '6px 14px',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <i className="fa-solid fa-trash-can" /> Supprimer mon historique
                      </button>
                    )}
                  </div>
                  {orders.filter(o => o.customer?.email === user?.email || o.customer?.phone === user?.phone).length === 0 ? (
                    <p className="empty-state">Vous n'avez pas encore passé de commande avec ces coordonnées.</p>
                  ) : (
                    <div className="orders-list">
                      {orders.filter(o => o.customer?.email === user?.email || o.customer?.phone === user?.phone).map(o => (
                        <div key={o.id} className="order-card" style={{ background: '#fff', border: '1px solid var(--border-color)', padding: 20, borderRadius: 12, marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <strong>N° {o.id}</strong>
                              <span className="badge-type" style={{ marginLeft: 10 }}>{o.status}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleOrder(o.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="Supprimer cette commande"
                            >
                              <i className="fa-solid fa-trash-can" /> Supprimer
                            </button>
                          </div>
                          <p style={{ fontSize: '0.88rem', color: '#666' }}>Date : {new Date(o.createdAt).toLocaleDateString('fr-FR')}</p>
                          <p style={{ fontSize: '0.88rem', color: '#666' }}>Mode : {o.deliveryType}</p>
                          <p style={{ fontWeight: 700, color: '#111', marginTop: 8 }}>Total : {formatPrice(o.total)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Pied de Page Officiel BY_AFRIKA */}
          <footer className="site-footer">
            <div className="container">
              <div className="footer-grid">
                <div className="footer-col">
                  <div className="footer-brand-header">
                    <img src="/logo.jpg" alt="Logo BY_AFRIKA" className="footer-logo" />
                    <span className="footer-brand-title">BY_AFRIKA</span>
                  </div>
                  <p className="footer-desc">
                    Maison de prêt-à-porter célébrant l'élégance, la culture et l'authenticité africaine. Des créations d'exception pensées et confectionnées à Dakar.
                  </p>
                  <div className="social-icons">
                    {config.whatsapp && (
                      <a href={config.whatsapp.startsWith('http') ? config.whatsapp : `https://wa.me/${config.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="social-btn" aria-label="WhatsApp">
                        <i className="fa-brands fa-whatsapp" />
                      </a>
                    )}
                    {config.facebook && (
                      <a href={config.facebook} target="_blank" rel="noreferrer" className="social-btn" aria-label="Facebook">
                        <i className="fa-brands fa-facebook-f" />
                      </a>
                    )}
                    {config.instagram && (
                      <a href={config.instagram} target="_blank" rel="noreferrer" className="social-btn" aria-label="Instagram">
                        <i className="fa-brands fa-instagram" />
                      </a>
                    )}
                    {config.tiktok && (
                      <a href={config.tiktok} target="_blank" rel="noreferrer" className="social-btn" aria-label="TikTok">
                        <i className="fa-brands fa-tiktok" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="footer-col">
                  <h4 className="footer-heading">Navigation</h4>
                  <ul className="footer-list">
                    <li><a href="#" onClick={(e) => { e.preventDefault(); setActivePage('accueil'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Accueil</a></li>
                    <li><a href="#" onClick={(e) => { e.preventDefault(); setActivePage('boutique'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Toute la Boutique</a></li>
                    <li><a href="#" onClick={(e) => { e.preventDefault(); setActivePage('hommes'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Collection Homme</a></li>
                    <li><a href="#" onClick={(e) => { e.preventDefault(); setActivePage('femmes'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Collection Femme</a></li>
                    <li><a href="#" onClick={(e) => { e.preventDefault(); setActivePage('apropos'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>À Propos</a></li>
                    <li><a href="#" onClick={(e) => { e.preventDefault(); setActivePage('confidentialite'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Confidentialité</a></li>
                  </ul>
                </div>
                <div className="footer-col">
                  <h4 className="footer-heading">Contact & Showroom</h4>
                  <ul className="footer-contact-list">
                    <li><i className="fa-solid fa-location-dot" style={{ color: '#dfba5c' }} /> {config.address || 'Dakar, Sénégal'}</li>
                    <li><i className="fa-solid fa-phone" style={{ color: '#dfba5c' }} /> {config.phone || '+221 77 000 00 00'}</li>
                    <li><i className="fa-solid fa-envelope" style={{ color: '#dfba5c' }} /> {config.email || 'contact@byafrica.com'}</li>
                    <li>
                      <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('apropos'); setTimeout(() => { const el = document.getElementById('contact-sav'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); }} style={{ color: '#dfba5c', fontWeight: 600 }}>
                        <i className="fa-solid fa-headset" style={{ color: '#dfba5c' }} /> Réclamations & SAV
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="footer-bottom">
                <p>© 2026 BY_AFRIKA. Tous droits réservés. Maison de prêt-à-porter au Sénégal • Conçu & Développé par <strong>Mamadou Diaw</strong>.</p>
              </div>

              {/* Bouton retour en haut flottant (Style officiel BY_AFRIKA) */}
              <button
                type="button"
                className="scroll-top-btn"
                id="scroll-top-btn"
                aria-label="Retour en haut de page"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <i className="fa-solid fa-arrow-up" />
              </button>
            </div>
          </footer>
        </div>
      ) : (isUserAdmin || (user && user.role === 'admin')) ? (
        /* ============================================================ */
        /* VUE 2 : TABLEAU DE BORD ADMINISTRATEUR (SÉCURISÉ)            */
        /* ============================================================ */
        <div id="admin-view">
          <div className="admin-container">
            {/* Sidebar Admin */}
            <aside className="admin-sidebar">
              <div className="admin-sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src="/logo.jpg" alt="BY_AFRIKA" className="admin-logo" />
                  <h3>BY_AFRIKA Admin</h3>
                </div>
              </div>
              <nav className="admin-nav">
                <a href="#" className={`admin-nav-link ${adminTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setAdminTab('dashboard'); }}>
                  <i className="fa-solid fa-chart-line" /> Tableau de bord
                </a>
                <a href="#" className={`admin-nav-link ${adminTab === 'produits' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setAdminTab('produits'); }}>
                  <i className="fa-solid fa-shirt" /> Produits ({products.length})
                </a>
                <a href="#" className={`admin-nav-link ${adminTab === 'commandes' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setAdminTab('commandes'); }}>
                  <i className="fa-solid fa-box" /> Commandes ({orders.length})
                </a>
                <a href="#" className={`admin-nav-link ${adminTab === 'messages' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setAdminTab('messages'); }}>
                  <i className="fa-solid fa-headset" /> Messages & Réclamations ({messages.length})
                </a>
                <a href="#" className={`admin-nav-link ${adminTab === 'config' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setAdminTab('config'); }}>
                  <i className="fa-solid fa-gear" /> Configuration
                </a>
                <a href="#" className="admin-nav-link" onClick={(e) => { e.preventDefault(); setActivePage('accueil'); }} style={{ color: 'var(--gold-accent)', marginTop: 24, border: '1px solid rgba(196,154,38,0.3)', borderRadius: 6 }}>
                  <i className="fa-solid fa-arrow-left" /> Retour à la Boutique
                </a>
                <a href="#" className="admin-nav-link" onClick={(e) => { e.preventDefault(); handleLogout(); setActivePage('accueil'); }} style={{ color: '#ef4444', marginTop: 8 }}>
                  <i className="fa-solid fa-right-from-bracket" /> Quitter la session Admin
                </a>
              </nav>
            </aside>

            {/* Contenu Principal Admin */}
            <main className="admin-main">
              {/* Topbar Mobile Admin (Visible uniquement sur téléphone) */}
              <div className="admin-mobile-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#dfba5c', fontWeight: 800, fontSize: '0.85rem' }}>BY_AFRIKA</span>
                  <span style={{ fontSize: '0.72rem', background: '#222', padding: '2px 6px', borderRadius: 4, color: '#aaa' }}>Admin</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setActivePage('accueil')}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <i className="fa-solid fa-arrow-left" /> Boutique
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket" /> Déconnexion
                  </button>
                </div>
              </div>

              <div className="admin-desktop-topbar">
                <div className="admin-topbar-info">
                  <span className="admin-topbar-badge"><i className="fa-solid fa-sliders" /> Panneau de Gestion</span>
                  <span className="admin-topbar-user">Connecté : <strong>Adama Dioume (Fondateur)</strong></span>
                </div>
                <div className="admin-topbar-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setActivePage('accueil')}>
                    <i className="fa-solid fa-arrow-left" /> Voir la Boutique
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleLogout} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }}>
                    <i className="fa-solid fa-arrow-right-from-bracket" /> Déconnexion
                  </button>
                </div>
              </div>

              {/* Navigation onglets mobile admin */}
              <nav className="admin-mobile-chips-nav">
                <button type="button" className={`admin-chip-btn ${adminTab === 'dashboard' ? 'active' : ''}`} onClick={() => setAdminTab('dashboard')}><i className="fa-solid fa-chart-line" /> Dashboard</button>
                <button type="button" className={`admin-chip-btn ${adminTab === 'produits' ? 'active' : ''}`} onClick={() => setAdminTab('produits')}><i className="fa-solid fa-shirt" /> Produits</button>
                <button type="button" className={`admin-chip-btn ${adminTab === 'commandes' ? 'active' : ''}`} onClick={() => setAdminTab('commandes')}><i className="fa-solid fa-box" /> Commandes</button>
                <button type="button" className={`admin-chip-btn ${adminTab === 'messages' ? 'active' : ''}`} onClick={() => setAdminTab('messages')}><i className="fa-solid fa-headset" /> Messages</button>
                <button type="button" className={`admin-chip-btn ${adminTab === 'config' ? 'active' : ''}`} onClick={() => setAdminTab('config')}><i className="fa-solid fa-gear" /> Configuration</button>
              </nav>

              {/* TAB : DASHBOARD */}
              {adminTab === 'dashboard' && (() => {
                const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
                const totalOrders = orders.length;
                const ordersWithDelivery = orders.filter(o => {
                  const dt = (o.deliveryType || '').toLowerCase();
                  return dt.includes('livraison') || (Number(o.deliveryFee) > 0);
                }).length;
                const ordersWithoutDelivery = totalOrders - ordersWithDelivery;

                // Nombre de clients inscrits sur le site
                const registeredClientsCount = usersList.filter(u => {
                  const r = (u.role || '').toLowerCase();
                  return r === 'client' || (!r.includes('admin') && !r.includes('fondateur'));
                }).length;

                const deliveryPct = totalOrders > 0 ? Math.round((ordersWithDelivery / totalOrders) * 100) : 0;
                const pickupPct = totalOrders > 0 ? (100 - deliveryPct) : 0;

                return (
                  <div className="admin-section active">
                    <div style={{ marginBottom: 24 }}>
                      <h1 style={{ margin: '0 0 6px 0', fontSize: '1.6rem', fontWeight: 800 }}>Tableau de bord</h1>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Suivi d'activité et statistiques en temps réel de la boutique <strong>BY_AFRIKA</strong>.
                      </p>
                    </div>

                    {/* Grille des KPI Clés Responsive */}
                    <div className="admin-stats admin-stats-grid">
                      {/* 1. Chiffre d'Affaires */}
                      <div className="stat-card" style={{ borderLeft: '4px solid #dfba5c' }}>
                        <i className="fa-solid fa-coins" style={{ color: '#dfba5c', fontSize: '1.6rem' }} />
                        <div className="stat-info">
                          <h3 style={{ color: '#dfba5c', fontSize: '1.45rem', fontWeight: 800 }}>{formatPrice(totalRevenue)}</h3>
                          <p style={{ fontWeight: 600 }}>Chiffre d'Affaires</p>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>Ventes cumulées</span>
                        </div>
                      </div>

                      {/* 2. Total Commandes */}
                      <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <i className="fa-solid fa-box" style={{ color: '#3b82f6', fontSize: '1.6rem' }} />
                        <div className="stat-info">
                          <h3 style={{ fontSize: '1.45rem', fontWeight: 800 }}>{totalOrders}</h3>
                          <p style={{ fontWeight: 600 }}>Total Commandes</p>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>Toutes commandes</span>
                        </div>
                      </div>

                      {/* 3. Commandes avec Livraison */}
                      <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                        <i className="fa-solid fa-truck-fast" style={{ color: '#10b981', fontSize: '1.6rem' }} />
                        <div className="stat-info">
                          <h3 style={{ color: '#10b981', fontSize: '1.45rem', fontWeight: 800 }}>{ordersWithDelivery}</h3>
                          <p style={{ fontWeight: 600 }}>Avec Livraison</p>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>{deliveryPct}% du volume</span>
                        </div>
                      </div>

                      {/* 4. Commandes sans Livraison (Retrait Boutique) */}
                      <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <i className="fa-solid fa-store" style={{ color: '#f59e0b', fontSize: '1.6rem' }} />
                        <div className="stat-info">
                          <h3 style={{ color: '#f59e0b', fontSize: '1.45rem', fontWeight: 800 }}>{ordersWithoutDelivery}</h3>
                          <p style={{ fontWeight: 600 }}>Sans Livraison</p>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>Retrait au Showroom ({pickupPct}%)</span>
                        </div>
                      </div>

                      {/* 5. Clients Inscrits sur le Site */}
                      <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                        <i className="fa-solid fa-users" style={{ color: '#8b5cf6', fontSize: '1.6rem' }} />
                        <div className="stat-info">
                          <h3 style={{ color: '#8b5cf6', fontSize: '1.45rem', fontWeight: 800 }}>{registeredClientsCount}</h3>
                          <p style={{ fontWeight: 600 }}>Clients Inscrits</p>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>Comptes créés sur le site</span>
                        </div>
                      </div>

                      {/* 6. Articles en Vente */}
                      <div className="stat-card" style={{ borderLeft: '4px solid #ec4899' }}>
                        <i className="fa-solid fa-shirt" style={{ color: '#ec4899', fontSize: '1.6rem' }} />
                        <div className="stat-info">
                          <h3 style={{ fontSize: '1.45rem', fontWeight: 800 }}>{products.length}</h3>
                          <p style={{ fontWeight: 600 }}>Articles au Catalogue</p>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>Modèles en stock</span>
                        </div>
                      </div>
                    </div>

                    {/* Bloc d'Analyse des Livraisons & Performance Responsive */}
                    <div className="admin-delivery-card">
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-chart-pie" style={{ color: '#dfba5c' }} />
                        Répartition des Modes de Livraison
                      </h2>

                      {/* Barre visuelle de répartition */}
                      <div style={{ height: 12, borderRadius: 6, backgroundColor: '#e5e7eb', overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
                        <div style={{ width: `${deliveryPct}%`, backgroundColor: '#10b981', transition: 'width 0.4s' }} title={`Avec livraison: ${deliveryPct}%`} />
                        <div style={{ width: `${pickupPct}%`, backgroundColor: '#f59e0b', transition: 'width 0.4s' }} title={`Sans livraison: ${pickupPct}%`} />
                      </div>

                      <div className="admin-delivery-grid">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                          <i className="fa-solid fa-truck-fast" style={{ color: '#10b981', fontSize: '1.4rem' }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#166534' }}>{ordersWithDelivery} commande(s) avec livraison</div>
                            <div style={{ fontSize: '0.78rem', color: '#15803d' }}>{deliveryPct}% des commandes expédiées à domicile</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                          <i className="fa-solid fa-store" style={{ color: '#f59e0b', fontSize: '1.4rem' }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e' }}>{ordersWithoutDelivery} commande(s) sans livraison</div>
                            <div style={{ fontSize: '0.78rem', color: '#b45309' }}>{pickupPct}% retirées directement au Showroom (0 FCFA)</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8 }}>
                          <i className="fa-solid fa-users" style={{ color: '#8b5cf6', fontSize: '1.4rem' }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#6b21a8' }}>{registeredClientsCount} client(s) inscrit(s)</div>
                            <div style={{ fontSize: '0.78rem', color: '#7e22ce' }}>Membres enregistrés sur la boutique</div>
                          </div>
                        </div>
                      </div>

                      {/* Raccourcis rapides d'administration */}
                      <div className="admin-shortcuts-grid">
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setAdminTab('produits')}
                          style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <i className="fa-solid fa-shirt" /> Gérer le catalogue ({products.length} articles)
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setAdminTab('commandes')}
                          style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <i className="fa-solid fa-box" /> Consulter les {totalOrders} commandes
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => { setAdminTab('messages'); setAdminSubTab('roles'); }}
                          style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <i className="fa-solid fa-users-gear" /> Consulter les rôles & équipe
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB : PRODUITS */}
              {adminTab === 'produits' && (
                <div className="admin-section active">
                  <div className="admin-section-header">
                    <h2>Gestion du Catalogue ({products.length})</h2>
                    <button type="button" className="btn btn-primary" onClick={openAddProductModal}>
                      <i className="fa-solid fa-plus" /> Ajouter un Vêtement
                    </button>
                  </div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Article</th>
                          <th>Genre</th>
                          <th>Catégorie</th>
                          <th>Prix</th>
                          <th>Stock</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id}>
                            <td data-label="Image">
                              <img
                                src={getSafeImage(p.image)}
                                alt={p.name}
                                style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', cursor: 'zoom-in' }}
                                title="Cliquer pour voir en plein écran"
                                onClick={() => {
                                  setFullscreenProduct(p);
                                  setIsImageZoomed(false);
                                }}
                              />
                            </td>
                            <td data-label="Article"><strong>{p.name}</strong></td>
                            <td data-label="Genre"><span className="badge-type">{p.genre}</span></td>
                            <td data-label="Catégorie">{p.category}</td>
                            <td data-label="Prix"><strong style={{ color: '#c49a26' }}>{formatPrice(p.price)}</strong></td>
                            <td data-label="Stock">{p.stock} pcs</td>
                            <td data-label="Actions">
                              <button type="button" className="btn btn-sm btn-outline" style={{ marginRight: 6 }} onClick={() => openEditProductModal(p)}><i className="fa-solid fa-pen-to-square" /> Modifier</button>
                              <button type="button" className="btn btn-sm btn-outline" style={{ color: '#ef4444' }} onClick={() => handleDeleteProduct(p.id)}><i className="fa-solid fa-trash-can" /> Supprimer</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB : COMMANDES */}
              {adminTab === 'commandes' && (
                <div className="admin-section active">
                  <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                    <h2>Gestion des Commandes Clients ({orders.length})</h2>
                    {orders.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={handleClearAllOrdersAdmin}
                        style={{
                          color: '#ef4444',
                          borderColor: '#ef4444',
                          background: 'rgba(239, 68, 68, 0.05)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          padding: '8px 16px',
                          borderRadius: 8,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <i className="fa-solid fa-trash-can" /> Supprimer tout l'historique
                      </button>
                    )}
                  </div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>N° Commande</th>
                          <th>Date</th>
                          <th>Client</th>
                          <th>Téléphone</th>
                          <th>Mode</th>
                          <th>Total</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.length === 0 ? (
                          <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30 }}>Aucune commande enregistrée pour le moment.</td></tr>
                        ) : (
                          orders.map(o => (
                            <tr key={o.id}>
                              <td data-label="N° Commande"><strong>{o.id}</strong></td>
                              <td data-label="Date">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                              <td data-label="Client">{o.customer?.name}</td>
                              <td data-label="Téléphone">
                                {o.customer?.phone ? (
                                  <a href={`https://wa.me/${o.customer.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#25D366', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <i className="fa-brands fa-whatsapp" /> {o.customer.phone}
                                  </a>
                                ) : '-'}
                              </td>
                              <td data-label="Mode"><span className="badge-type">{o.deliveryType || 'Retrait'}</span></td>
                              <td data-label="Total"><strong style={{ color: '#c49a26' }}>{formatPrice(o.total)}</strong></td>
                              <td data-label="Statut">
                                <select
                                  value={o.status}
                                  onChange={async (e) => {
                                    const val = e.target.value;
                                    setOrders(prev => prev.map(item => item.id === o.id ? { ...item, status: val } : item));
                                    try {
                                      await supabase.from('orders').update({ status: val }).eq('id', o.id);
                                    } catch (err) { }
                                    showToast(`Commande ${o.id} passée à : ${val}`);
                                  }}
                                  className="form-input"
                                  style={{ padding: '6px 10px', fontSize: '0.85rem', width: 'auto', minWidth: 130 }}
                                >
                                  <option value="Reçue">Reçue</option>
                                  <option value="En préparation">En préparation</option>
                                  <option value="En livraison">En livraison</option>
                                  <option value="Livrée">Livrée</option>
                                  <option value="Annulée">Annulée</option>
                                </select>
                              </td>
                              <td data-label="Actions">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                                  onClick={() => handleDeleteSingleOrder(o.id)}
                                  title="Supprimer cette commande"
                                >
                                  <i className="fa-solid fa-trash-can" /> Supprimer
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB : MESSAGES & RÉCLAMATIONS */}
              {adminTab === 'messages' && (
                <div className="admin-section active">
                  <div className="admin-subtabs-bar">
                    <button type="button" className={`admin-subtab-btn ${adminSubTab === 'messages' ? 'active' : ''}`} onClick={() => setAdminSubTab('messages')}>
                      <i className="fa-solid fa-headset" /> Messages & Réclamations
                    </button>
                    <button type="button" className={`admin-subtab-btn ${adminSubTab === 'roles' ? 'active' : ''}`} onClick={() => setAdminSubTab('roles')}>
                      <i className="fa-solid fa-users-gear" /> Gestion des Rôles
                    </button>
                  </div>

                  {adminSubTab === 'messages' ? (
                    <div className="admin-table-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Motif</th>
                            <th>Message</th>
                            <th>Réponse WhatsApp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {messages.filter(m => m.id !== 'system_byafrika_config' && m.subject !== 'SYSTEM_CONFIG').length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>Aucune réclamation.</td></tr>
                          ) : (
                            messages.filter(m => m.id !== 'system_byafrika_config' && m.subject !== 'SYSTEM_CONFIG').map(m => (
                              <tr key={m.id}>
                                <td data-label="Date">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                                <td data-label="Client">
                                  <strong>{m.name}</strong>
                                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{m.phone}</div>
                                </td>
                                <td data-label="Motif"><span className="badge-type">{m.type}</span></td>
                                <td data-label="Message" style={{ maxWidth: 300 }}>{m.message}</td>
                                <td data-label="Réponse">
                                  {m.phone && (
                                    <a
                                      href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-sm btn-outline"
                                      style={{ color: '#25D366', borderColor: '#25D366', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                    >
                                      <i className="fa-brands fa-whatsapp" /> Répondre sur WhatsApp
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div>
                      <div className="admin-section-header">
                        <h2>Membres de l'équipe et Rôles</h2>
                        <button type="button" className="btn btn-primary" onClick={() => setShowAddUserModal(true)}>
                          <i className="fa-solid fa-user-plus" /> Ajouter un Rôle
                        </button>
                      </div>
                      <div className="admin-table-wrapper">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Nom</th>
                              <th>Email</th>
                              <th>Rôle Actuel</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usersList.map(u => (
                              <tr key={u.id}>
                                <td data-label="Nom"><strong>{u.name}</strong></td>
                                <td data-label="Email">{u.email}</td>
                                <td data-label="Rôle"><span className="badge-type">{u.role}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB : CONFIGURATION */}
              {adminTab === 'config' && (
                <div className="admin-section active">
                  <div className="config-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                    <h2 style={{ margin: 0 }}>Configuration Générale & Réseaux Sociaux</h2>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="btn btn-primary"
                      style={{ padding: '10px 22px', fontWeight: 700, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 12px rgba(184, 134, 11, 0.25)' }}
                    >
                      <i className="fa-solid fa-floppy-disk" /> Enregistrer la configuration
                    </button>
                  </div>

                  <form className="form-stack" onSubmit={handleSaveConfig}>
                    {/* Section 1 : Informations Générales */}
                    <div className="config-section">
                      <h3><i className="fa-solid fa-store" /> Informations générales</h3>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Nom du site / boutique</label>
                          <input
                            type="text"
                            className="form-input"
                            value={config.siteName || ''}
                            onChange={e => setConfig({ ...config, siteName: e.target.value })}
                            placeholder="BY_AFRIKA"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Slogan</label>
                          <input
                            type="text"
                            className="form-input"
                            value={config.slogan || ''}
                            onChange={e => setConfig({ ...config, slogan: e.target.value })}
                            placeholder="Portez vos origines avec confiance"
                          />
                        </div>
                        <div className="form-group full-width">
                          <label className="form-label">Description du site</label>
                          <textarea
                            className="form-input"
                            rows={3}
                            value={config.description || ''}
                            onChange={e => setConfig({ ...config, description: e.target.value })}
                            placeholder="Description de la boutique..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2 : Contact & Showroom */}
                    <div className="config-section">
                      <h3><i className="fa-solid fa-address-book" /> Contact & Showroom</h3>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Numéro de Téléphone</label>
                          <input
                            type="tel"
                            className="form-input"
                            value={config.phone || ''}
                            onChange={e => setConfig({ ...config, phone: e.target.value })}
                            placeholder="+221 77 000 00 00"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Email de Contact</label>
                          <input
                            type="email"
                            className="form-input"
                            value={config.email || ''}
                            onChange={e => setConfig({ ...config, email: e.target.value })}
                            placeholder="contact@byafrica.com"
                          />
                        </div>
                        <div className="form-group full-width">
                          <label className="form-label">Adresse / Showroom</label>
                          <input
                            type="text"
                            className="form-input"
                            value={config.address || ''}
                            onChange={e => setConfig({ ...config, address: e.target.value })}
                            placeholder="Dakar, Sénégal"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3 : Réseaux Sociaux & Liens Directs (Contrôle Admin Restoré) */}
                    <div className="config-section">
                      <h3><i className="fa-solid fa-share-nodes" /> Réseaux Sociaux & Liens Directs</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                        Configurez les liens et numéros de vos pages sociales. Ils s'actualisent en direct sur le pied de page et la page de contact.
                      </p>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label"><i className="fa-brands fa-whatsapp" style={{ color: '#25D366' }} /> WhatsApp (Numéro international ou lien)</label>
                          <input
                            type="text"
                            className="form-input"
                            value={config.whatsapp || ''}
                            onChange={e => setConfig({ ...config, whatsapp: e.target.value })}
                            placeholder="+221770000000"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label"><i className="fa-brands fa-instagram" style={{ color: '#E4405F' }} /> Instagram (URL complète)</label>
                          <input
                            type="url"
                            className="form-input"
                            value={config.instagram || ''}
                            onChange={e => setConfig({ ...config, instagram: e.target.value })}
                            placeholder="https://instagram.com/byafrika"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label"><i className="fa-brands fa-facebook" style={{ color: '#1877F2' }} /> Facebook (URL complète)</label>
                          <input
                            type="url"
                            className="form-input"
                            value={config.facebook || ''}
                            onChange={e => setConfig({ ...config, facebook: e.target.value })}
                            placeholder="https://facebook.com/byafrika"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label"><i className="fa-brands fa-tiktok" /> TikTok (URL complète)</label>
                          <input
                            type="url"
                            className="form-input"
                            value={config.tiktok || ''}
                            onChange={e => setConfig({ ...config, tiktok: e.target.value })}
                            placeholder="https://tiktok.com/@byafrika"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 4 : Catégories d'articles */}
                    <div className="config-section">
                      <h3><i className="fa-solid fa-tags" /> Catégories d'articles</h3>
                      <div id="config-categories-list" className="categories-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {(config.categories || []).map((cat, idx) => (
                          <span key={idx} className="category-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, fontSize: '0.85rem' }}>
                            {cat}
                            <button
                              type="button"
                              onClick={() => handleRemoveCategory(cat)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, marginLeft: 4 }}
                              title={`Supprimer ${cat}`}
                            >
                              <i className="fa-solid fa-xmark" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="config-add-category" style={{ display: 'flex', gap: 10, maxWidth: 450 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Nouvelle catégorie (ex: Chemises)"
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(e); } }}
                        />
                        <button type="button" className="btn btn-primary" onClick={handleAddCategory}>
                          <i className="fa-solid fa-plus" /> Ajouter
                        </button>
                      </div>
                    </div>

                    {/* Section 5 : Frais de Livraison */}
                    <div className="config-section">
                      <h3><i className="fa-solid fa-truck-fast" /> Frais de Livraison</h3>
                      <div className="form-group" style={{ maxWidth: 350 }}>
                        <label className="form-label">Frais forfaitaire de livraison (FCFA)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={config.deliveryFee || 0}
                          onChange={e => setConfig({ ...config, deliveryFee: Number(e.target.value) })}
                          placeholder="2000"
                        />
                      </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: 24, textAlign: 'center', padding: '16px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <p style={{ fontSize: '0.88rem', color: '#10b981', margin: 0, fontWeight: 600 }}>
                        <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />
                        Vos modifications sont automatiquement sauvegardées en temps réel.
                      </p>
                    </div>
                  </form>
                </div>
              )}
            </main>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* VUE 3 : ÉCRAN DE VERROUILLAGE ADMINISTRATEUR (SÉCURITÉ)       */
        /* ============================================================ */
        <div id="admin-gate-screen" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'var(--bg-main)' }}>
          <div style={{ maxWidth: 440, width: '100%', background: '#ffffff', borderRadius: 12, padding: 32, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#111', color: '#dfba5c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: 20 }}>
              <i className="fa-solid fa-shield-halved" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: '#111' }}>Espace d'Administration Sécurisé</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: 24 }}>
              Cet espace est strictement réservé à la direction et aux gestionnaires de la boutique <strong>BY_AFRIKA</strong>.
            </p>
            <form onSubmit={handleAdminLoginForm} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Identifiant Administrateur</label>
                <input type="email" name="adminEmail" required placeholder="admin@byafrica.com" style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.95rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Mot de passe</label>
                <input type="password" name="adminPassword" required placeholder="••••••••" style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.95rem' }} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ padding: '12px', fontSize: '1rem', marginTop: 8 }}>
                <i className="fa-solid fa-lock" style={{ marginRight: 8 }} /> Déverrouiller l'Espace Admin
              </button>
            </form>
            <button
              type="button"
              onClick={() => setActivePage('accueil')}
              style={{ marginTop: 20, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
            >
              ← Retour à la boutique
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS UNIFIÉES                                              */}
      {/* ============================================================ */}

      {/* 1. Modal Overlay Sombre */}
      {(productModal || checkoutOpen || authModalOpen || googleAuthModalOpen || adminLoginModalOpen || forgotModalOpen || confirmedOrder || showProductFormModal || showAddUserModal) && (
        <div
          id="modal-overlay"
          className="modal-overlay"
          style={{ display: 'flex' }}
          onClick={() => {
            setProductModal(null);
            setCheckoutOpen(false);
            setAuthModalOpen(false);
            setGoogleAuthModalOpen(false);
            setAdminLoginModalOpen(false);
            setForgotModalOpen(false);
            setConfirmedOrder(null);
            setShowProductFormModal(false);
            setShowAddUserModal(false);
          }}
        />
      )}

      {/* 2. Modal Détail Produit */}
      {productModal && (
        <div id="modal-product" className="modal" style={{ display: 'block' }}>
          <div className="modal-content modal-large">
            <button type="button" className="modal-close" onClick={() => setProductModal(null)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <div className="product-modal-layout">
              <div className="product-modal-img" style={{ position: 'relative' }}>
                <img
                  src={getSafeImage(productModal.image)}
                  alt={productModal.name}
                  style={{ cursor: 'zoom-in' }}
                  title="Cliquer pour voir en plein écran"
                  onClick={() => {
                    setFullscreenProduct(productModal);
                    setIsImageZoomed(false);
                  }}
                  onError={(e) => { e.target.src = '/tshirt-byafrika.jpg'; }}
                />
                <button
                  type="button"
                  className="btn-modal-fullscreen"
                  onClick={() => {
                    setFullscreenProduct(productModal);
                    setIsImageZoomed(false);
                  }}
                >
                  <i className="fa-solid fa-expand" /> Voir en plein écran
                </button>
              </div>
              <div className="product-modal-info">
                <h2>{productModal.name}</h2>
                <p>{productModal.description}</p>
                <span className="product-modal-price">{formatPrice(productModal.price)}</span>

                <div className="product-modal-option">
                  <label>Taille :</label>
                  <div className="product-modal-sizes">
                    {productModal.sizes?.map(sz => (
                      <button
                        key={sz}
                        type="button"
                        className={`size-btn ${selectedSize === sz ? 'active' : ''}`}
                        onClick={() => setSelectedSize(sz)}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="product-modal-option">
                  <label>Couleur :</label>
                  <div className="product-modal-colors">
                    {productModal.colors?.map(cl => (
                      <button
                        key={cl}
                        type="button"
                        className={`color-btn ${selectedColor === cl ? 'active' : ''}`}
                        onClick={() => setSelectedColor(cl)}
                      >
                        {cl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="product-modal-qty">
                  <label>Quantité :</label>
                  <input
                    type="number"
                    className="form-input"
                    value={selectedQty}
                    min={1}
                    onChange={e => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={() => {
                    addToCart(productModal, selectedSize, selectedColor, selectedQty);
                    setProductModal(null);
                  }}
                >
                  <i className="fa-solid fa-cart-plus" /> Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2.1 Modal Plein Écran Haute Définition avec Zoom */}
      {fullscreenProduct && (
        <div
          className="product-fullscreen-backdrop"
          onClick={() => {
            setFullscreenProduct(null);
            setIsImageZoomed(false);
          }}
        >
          {/* Barre supérieure */}
          <div className="fullscreen-topbar" onClick={(e) => e.stopPropagation()}>
            <div className="fullscreen-product-info">
              <span className="fullscreen-badge">{fullscreenProduct.category || fullscreenProduct.genre || 'Vêtement'}</span>
              <h3 className="fullscreen-title">{fullscreenProduct.name}</h3>
              <span className="fullscreen-price">{formatPrice(fullscreenProduct.price)}</span>
            </div>
            <div className="fullscreen-actions">
              <button
                type="button"
                className="fullscreen-action-btn"
                onClick={() => setIsImageZoomed(!isImageZoomed)}
                title={isImageZoomed ? 'Dézoomer' : 'Zoomer 2x'}
              >
                <i className={`fa-solid ${isImageZoomed ? 'fa-magnifying-glass-minus' : 'fa-magnifying-glass-plus'}`} />
                <span>{isImageZoomed ? 'Zoom 1x' : 'Zoom 2x'}</span>
              </button>
              <button
                type="button"
                className="fullscreen-close-btn"
                onClick={() => {
                  setFullscreenProduct(null);
                  setIsImageZoomed(false);
                }}
                title="Fermer (Échap)"
                aria-label="Fermer le plein écran"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>

          {/* Zone Image */}
          <div
            className={`fullscreen-image-container ${isImageZoomed ? 'zoomed' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsImageZoomed(!isImageZoomed);
            }}
            title={isImageZoomed ? 'Cliquer pour dézoomer' : 'Cliquer pour agrandir les détails'}
          >
            <img
              src={getSafeImage(fullscreenProduct.image)}
              alt={fullscreenProduct.name}
              className={`fullscreen-img ${isImageZoomed ? 'is-zoomed' : ''}`}
              onError={(e) => { e.target.src = '/tshirt-byafrika.jpg'; }}
            />
            <div className="fullscreen-zoom-hint">
              <i className="fa-solid fa-hand-pointer" style={{ marginRight: 6 }} />
              {isImageZoomed ? 'Cliquez pour réduire (1x)' : 'Cliquez sur l\'image pour zoomer sur les détails (2x)'}
            </div>
          </div>

          {/* Barre inférieure */}
          <div className="fullscreen-bottombar" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ background: 'rgba(25, 25, 25, 0.8)', borderColor: 'rgba(255,255,255,0.2)' }}
              onClick={() => {
                const target = fullscreenProduct;
                setFullscreenProduct(null);
                setIsImageZoomed(false);
                setProductModal(target);
                setSelectedSize(target.sizes?.[0] || 'M');
                setSelectedColor(target.colors?.[0] || 'Noir');
                setSelectedQty(1);
              }}
            >
              <i className="fa-solid fa-sliders" /> Choisir taille & couleur
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                addToCart(
                  fullscreenProduct,
                  fullscreenProduct.sizes?.[0] || 'M',
                  fullscreenProduct.colors?.[0] || 'Noir',
                  1
                );
                setFullscreenProduct(null);
                setIsImageZoomed(false);
                setCartOpen(true);
              }}
            >
              <i className="fa-solid fa-cart-plus" /> Ajouter au panier • {formatPrice(fullscreenProduct.price)}
            </button>
          </div>
        </div>
      )}

      {/* 3. Tiroir Panier (Cart Sidebar) */}
      <div id="cart-sidebar" className={`cart-sidebar ${cartOpen ? 'active' : 'hidden'}`} style={{ display: cartOpen ? 'flex' : 'none' }}>
        <div className="cart-header">
          <h2><i className="fa-solid fa-shopping-bag" /> Mon Panier</h2>
          <button type="button" id="close-cart" onClick={() => setCartOpen(false)}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="cart-items" id="cart-items-list">
          {cart.length === 0 ? (
            <p className="empty-state">Votre panier est actuellement vide.</p>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.id}_${item.size}_${item.color}`} className="cart-item" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                <img src={getSafeImage(item.image)} alt={item.name} style={{ width: 55, height: 55, borderRadius: 6, objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem' }}>{item.name}</h4>
                  <div style={{ fontSize: '0.8rem', color: '#777', margin: '3px 0' }}>{item.size} • {item.color}</div>
                  <strong style={{ fontSize: '0.9rem', color: '#c49a26' }}>{formatPrice(item.price)}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button type="button" className="btn btn-sm btn-outline" style={{ padding: '2px 8px' }} onClick={() => updateCartQty(idx, -1)}>-</button>
                  <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                  <button type="button" className="btn btn-sm btn-outline" style={{ padding: '2px 8px' }} onClick={() => updateCartQty(idx, 1)}>+</button>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 6 }} onClick={() => removeCartItem(idx)}>
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="cart-footer">
          <div className="cart-total">
            <span>Sous-total :</span>
            <strong id="cart-total">{formatPrice(cartSubtotal)}</strong>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-full"
            disabled={cart.length === 0}
            onClick={() => {
              setCartOpen(false);
              setCheckoutOpen(true);
            }}
          >
            Finaliser la commande →
          </button>
        </div>
      </div>

      {/* 4. Modal Commande (Checkout) */}
      {checkoutOpen && (
        <div id="modal-checkout" className="modal" style={{ display: 'block' }}>
          <div className="modal-content modal-large">
            <button type="button" className="modal-close" onClick={() => setCheckoutOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <h2>Finaliser la commande</h2>
            <form className="form-stack" onSubmit={handleCheckoutSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nom complet <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" name="name" className="form-input" defaultValue={user?.name || ''} placeholder="Votre nom complet" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="tel" name="phone" className="form-input" placeholder="+221 7X XXX XX XX" required />
                </div>
              </div>

              {/* Choix livraison vs retrait boutique */}
              <div className="checkout-delivery-selector-wrap" style={{ margin: '16px 0' }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>
                  <i className="fa-solid fa-boxes-packing" style={{ color: 'var(--gold-accent)' }} /> Mode de réception souhaité :
                </label>
                <div className="delivery-options-grid">
                  <label className={`delivery-option-card ${checkoutDelivery === 'delivery' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={checkoutDelivery === 'delivery'}
                      onChange={() => setCheckoutDelivery('delivery')}
                    />
                    <div className="delivery-card-inner">
                      <div className="delivery-card-main">
                        <span className="delivery-type-icon"><i className="fa-solid fa-truck-fast" /></span>
                        <div>
                          <span className="delivery-title">Livraison à domicile</span>
                          <span className="delivery-sub">Partout à Dakar et régions</span>
                        </div>
                      </div>
                      <span className="delivery-price-badge">{formatPrice(config.deliveryFee || 2000)}</span>
                    </div>
                  </label>

                  <label className={`delivery-option-card ${checkoutDelivery === 'pickup' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="deliveryType"
                      checked={checkoutDelivery === 'pickup'}
                      onChange={() => setCheckoutDelivery('pickup')}
                    />
                    <div className="delivery-card-inner">
                      <div className="delivery-card-main">
                        <span className="delivery-type-icon"><i className="fa-solid fa-shop" /></span>
                        <div>
                          <span className="delivery-title">Retrait en boutique</span>
                          <span className="delivery-sub">Boutique BY_AFRIKA (Dakar)</span>
                        </div>
                      </div>
                      <span className="delivery-price-badge free-badge">0 FCFA • Gratuit</span>
                    </div>
                  </label>
                </div>
              </div>

              {checkoutDelivery === 'delivery' ? (
                <div className="form-group full-width">
                  <label className="form-label">Adresse de livraison <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" name="address" className="form-input" placeholder="Quartier, rue, repère ou ville au Sénégal" required />
                </div>
              ) : (
                <div className="checkout-pickup-info-box" style={{ display: 'flex', gap: 12, background: '#f8f8f6', padding: 14, borderRadius: 8, margin: '12px 0' }}>
                  <i className="fa-solid fa-location-dot" style={{ color: '#c49a26', fontSize: '1.3rem', marginTop: 2 }} />
                  <div>
                    <strong>Retrait au Showroom BY_AFRIKA</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                      Votre commande sera prête sous 24h à la boutique. Aucun frais de livraison.
                    </p>
                  </div>
                </div>
              )}

              <div className="form-group full-width">
                <label className="form-label">Notes pour la livraison (optionnel)</label>
                <textarea name="notes" className="form-input" rows={2} placeholder="Ex: Appeler avant d'arriver..." />
              </div>

              <div className="checkout-summary" style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, margin: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Sous-total articles :</span>
                  <span>{formatPrice(cartSubtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Frais de livraison :</span>
                  <span>{deliveryFee === 0 ? 'Gratuit (0 FCFA)' : formatPrice(deliveryFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', borderTop: '1px solid #ddd', paddingTop: 8, marginTop: 8 }}>
                  <span>Total à payer à réception :</span>
                  <span style={{ color: '#c49a26' }}>{formatPrice(cartGrandTotal)}</span>
                </div>
              </div>

              <p className="payment-method">
                <i className="fa-solid fa-money-bill-wave" /> Paiement à la réception (Arriver Payer en espèces ou Wave)
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={(e) => handleCheckoutSubmit(e, true)}
                  style={{
                    backgroundColor: '#25D366',
                    borderColor: '#25D366',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '14px',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    borderRadius: 8,
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)'
                  }}
                >
                  <i className="fa-brands fa-whatsapp" style={{ fontSize: '1.35rem' }} />
                  Valider ma commande sur WhatsApp
                </button>

                <button
                  type="submit"
                  className="btn btn-outline"
                  style={{
                    padding: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    borderColor: 'var(--border-color)'
                  }}
                >
                  <i className="fa-solid fa-check" style={{ marginRight: 6 }} />
                  Confirmer sur le site (Arriver Payer)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Reçu / Confirmation */}
      {confirmedOrder && (
        <div id="modal-confirmation" className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="confirmation-icon" style={{ textAlign: 'center', color: '#10b981', fontSize: '3rem', marginBottom: 12 }}>
              <i className="fa-solid fa-circle-check" />
            </div>
            <h2 style={{ textAlign: 'center' }}>Commande Enregistrée !</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              Merci pour votre confiance. Notre équipe va préparer votre colis immédiatement.
            </p>
            <div style={{ background: '#f8f8f8', padding: 16, borderRadius: 8, margin: '16px 0' }}>
              <p><strong>N° de Commande :</strong> {confirmedOrder.id}</p>
              <p><strong>Client :</strong> {confirmedOrder.customer?.name} ({confirmedOrder.customer?.phone})</p>
              <p><strong>Mode :</strong> {confirmedOrder.deliveryType}</p>
              <p><strong>Total à payer :</strong> <strong style={{ color: '#c49a26' }}>{formatPrice(confirmedOrder.total)}</strong></p>
            </div>

            {/* Validation & Envoi WhatsApp */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, margin: '16px 0', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', color: '#166534', fontSize: '0.92rem', fontWeight: 600 }}>
                <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '1.2rem', verticalAlign: 'middle', marginRight: 6 }} />
                Validation instantanée via WhatsApp :
              </p>
              <a
                href={getWhatsAppOrderUrl(confirmedOrder)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{
                  background: '#25D366',
                  borderColor: '#25D366',
                  color: '#fff',
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontWeight: 700,
                  padding: '12px',
                  borderRadius: 8
                }}
              >
                <i className="fa-brands fa-whatsapp" style={{ fontSize: '1.25rem' }} />
                Envoyer & Valider ma commande sur WhatsApp
              </a>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => window.print()}
              >
                <i className="fa-solid fa-print" /> Imprimer le reçu
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setConfirmedOrder(null)}
              >
                Continuer mes achats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Authentification */}
      {authModalOpen && (
        <div id="modal-login" className="modal auth-modal-container" style={{ display: 'block' }}>
          <div className="auth-modal-card">
            <button type="button" className="auth-modal-close-btn modal-close" onClick={() => { setAuthModalOpen(false); setAuthNotice(null); }}>
              <i className="fa-solid fa-xmark" />
            </button>
            <div className="auth-modal-tabs">
              <button
                type="button"
                className={`auth-modal-tab-btn ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthTab('login'); setAuthNotice(null); }}
              >
                Se connecter
              </button>
              <button
                type="button"
                className={`auth-modal-tab-btn ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthTab('register'); setAuthNotice(null); }}
              >
                Créer un compte
              </button>
            </div>

            {authNotice && (
              <div style={{
                backgroundColor: authNotice.type === 'success' ? '#f0fdf4' : (authNotice.type === 'warning' ? '#fffbeb' : '#fef2f2'),
                border: `1px solid ${authNotice.type === 'success' ? '#86efac' : (authNotice.type === 'warning' ? '#fde68a' : '#fecaca')}`,
                color: authNotice.type === 'success' ? '#166534' : (authNotice.type === 'warning' ? '#92400e' : '#991b1b'),
                padding: '14px 16px',
                borderRadius: '12px',
                marginBottom: '18px',
                fontSize: '0.88rem',
                lineHeight: '1.45'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <i className={`fa-solid ${authNotice.type === 'success' ? 'fa-circle-check' : (authNotice.type === 'warning' ? 'fa-envelope-open-text' : 'fa-circle-exclamation')}`} style={{ marginTop: 2, fontSize: '1.15rem' }} />
                  <div style={{ flex: 1 }}>{authNotice.text}</div>
                  <button type="button" onClick={() => setAuthNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, padding: 0 }}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
                {authNotice.email && (authNotice.type === 'warning' || authNotice.type === 'success') && (
                  <div style={{ marginTop: 10, textAlign: 'right' }}>
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={() => handleResendValidationEmail(authNotice.email)}
                      style={{
                        background: 'transparent',
                        border: '1px solid currentColor',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'inherit',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-paper-plane" style={{ marginRight: 5 }} />
                      Renvoyer l'e-mail de validation
                    </button>
                  </div>
                )}
              </div>
            )}

            {authTab === 'login' ? (
              <form className="auth-form-stack" onSubmit={handleAuthSubmit}>
                <div className="auth-field">
                  <label className="auth-label">Adresse e-mail</label>
                  <input
                    type="email"
                    name="email"
                    className="auth-input"
                    placeholder="exemple@email.com"
                    defaultValue={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Mot de passe</label>
                  <div className="auth-password-wrapper">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      name="password"
                      className="auth-input"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowLoginPassword(prev => !prev)}
                      aria-label="Afficher ou masquer le mot de passe"
                    >
                      <i className={showLoginPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} />
                    </button>
                  </div>
                </div>

                <div className="auth-forgot-row">
                  <a
                    href="#"
                    className="auth-forgot-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setAuthModalOpen(false);
                      setForgotModalOpen(true);
                    }}
                  >
                    Mot de passe oublié ?
                  </a>
                </div>

                <button type="submit" className="btn-auth-submit" disabled={authLoading}>
                  {authLoading ? 'Connexion en cours...' : 'Se connecter'}
                </button>

                <div className="auth-divider">
                  <span>OU CONTINUER AVEC</span>
                </div>

                <button type="button" className="btn-google-auth" onClick={handleGoogleAuthClick} disabled={authLoading}>
                  <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continuer avec Google</span>
                </button>
              </form>
            ) : (
              <form className="auth-form-stack" onSubmit={handleAuthSubmit}>
                <div className="auth-field">
                  <label className="auth-label">Nom complet</label>
                  <input type="text" name="name" className="auth-input" placeholder="Votre prénom et nom" required />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Adresse e-mail</label>
                  <input type="email" name="email" className="auth-input" placeholder="exemple@email.com" required />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Mot de passe (min. 6 caractères)</label>
                  <div className="auth-password-wrapper">
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      name="password"
                      className="auth-input"
                      placeholder="Choisir un mot de passe"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowRegisterPassword(prev => !prev)}
                      aria-label="Afficher ou masquer le mot de passe"
                    >
                      <i className={showRegisterPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} />
                    </button>
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label">Confirmer le mot de passe</label>
                  <div className="auth-password-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      className="auth-input"
                      placeholder="Répétez le mot de passe"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      aria-label="Afficher ou masquer la confirmation du mot de passe"
                    >
                      <i className={showConfirmPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} />
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-auth-submit" disabled={authLoading}>
                  {authLoading ? 'Validation en cours...' : 'Créer mon compte'}
                </button>

                <div className="auth-divider">
                  <span>OU CONTINUER AVEC</span>
                </div>

                <button type="button" className="btn-google-auth" onClick={handleGoogleAuthClick} disabled={authLoading}>
                  <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>S'inscrire avec Google</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6b. Modal Connexion Google */}
      {googleAuthModalOpen && (
        <div id="modal-google-auth" className="modal auth-modal-container" style={{ display: 'block' }}>
          <div className="auth-modal-card" style={{ maxWidth: 440 }}>
            <button type="button" className="auth-modal-close-btn modal-close" onClick={() => setGoogleAuthModalOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <svg viewBox="0 0 24 24" width="48" height="48" style={{ marginBottom: 12 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px 0' }}>Connexion Google</h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>Accédez rapidement à votre compte client BY_AFRIKA.</p>
            </div>
            <form className="auth-form-stack" onSubmit={handleGoogleSubmit}>
              <div className="auth-field">
                <label className="auth-label">Prénom & Nom</label>
                <input type="text" name="googleName" className="auth-input" placeholder="Ex: Moussa Diop" required autoFocus />
              </div>
              <div className="auth-field">
                <label className="auth-label">Adresse Google (@gmail.com)</label>
                <input type="email" name="googleEmail" className="auth-input" placeholder="moussa.diop@gmail.com" required />
              </div>
              <button type="submit" className="btn-auth-submit" style={{ backgroundColor: '#4285F4', color: '#fff' }}>
                Continuer avec ce profil Google
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6c. Modal Authentification Administrateur Dédiée */}
      {adminLoginModalOpen && (
        <div id="modal-admin-login" className="modal auth-modal-container" style={{ display: 'block' }}>
          <div className="auth-modal-card" style={{ maxWidth: 440 }}>
            <button type="button" className="auth-modal-close-btn modal-close" onClick={() => setAdminLoginModalOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#111', color: '#dfba5c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 12 }}>
                <i className="fa-solid fa-shield-halved" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px 0' }}>Espace Administrateur</h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>Identifiants de gestion requis pour accéder au panneau d'administration.</p>
            </div>
            <form className="auth-form-stack" onSubmit={handleAdminLoginForm}>
              <div className="auth-field">
                <label className="auth-label">Identifiant Administrateur</label>
                <input type="email" name="adminEmail" className="auth-input" placeholder="admin@byafrica.com" required autoFocus />
              </div>
              <div className="auth-field">
                <label className="auth-label">Mot de passe</label>
                <input type="password" name="adminPassword" className="auth-input" placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn-auth-submit" style={{ backgroundColor: '#111', color: '#dfba5c', border: '1px solid #dfba5c' }}>
                <i className="fa-solid fa-lock" style={{ marginRight: 6 }} /> Déverrouiller l'Administration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6d. Modal Mot de Passe Oublié */}
      {forgotModalOpen && (
        <div id="modal-forgot-password" className="modal auth-modal-container" style={{ display: 'block' }}>
          <div className="auth-modal-card" style={{ maxWidth: 440 }}>
            <button type="button" className="auth-modal-close-btn modal-close" onClick={() => setForgotModalOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(223, 186, 92, 0.15)', color: 'var(--gold-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 12 }}>
                <i className="fa-solid fa-key" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px 0' }}>Mot de passe oublié ?</h3>
              <p style={{ fontSize: '0.88rem', color: '#6b7280', margin: 0 }}>
                Entrez votre adresse email. Nous vous enverrons les instructions de réinitialisation, ou recevez une assistance immédiate via WhatsApp.
              </p>
            </div>
            <form className="auth-form-stack" onSubmit={handleForgotPasswordSubmit}>
              <div className="auth-field">
                <label className="auth-label">Votre adresse email de compte</label>
                <input
                  type="email"
                  name="forgotEmail"
                  className="auth-input"
                  placeholder="exemple@email.com"
                  defaultValue={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="btn-auth-submit">
                <i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }} /> Envoyer le lien de réinitialisation
              </button>

              <div className="auth-divider">
                <span>OU ASSISTANCE DIRECTE</span>
              </div>

              <a
                href={`https://wa.me/${(config.whatsapp || config.phone || '221770000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour BY_AFRIKA, j'ai oublié mon mot de passe pour mon compte (${forgotEmail || 'client'}). Pouvez-vous m'aider à le réinitialiser ?`)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{
                  backgroundColor: '#25D366',
                  borderColor: '#25D366',
                  color: '#fff',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontWeight: 700,
                  padding: '12px',
                  borderRadius: 8
                }}
              >
                <i className="fa-brands fa-whatsapp" style={{ fontSize: '1.2rem' }} />
                Assistance immédiate via WhatsApp
              </a>

              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setForgotModalOpen(false);
                    setAuthModalOpen(true);
                  }}
                  style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'underline' }}
                >
                  <i className="fa-solid fa-arrow-left" style={{ marginRight: 4 }} /> Retour à la connexion
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Admin Ajout/Modification Produit (Mobile & Ordinateur) */}
      {showProductFormModal && (
        <div id="modal-admin-product" className="modal modal-admin-dialog" style={{ display: 'block' }}>
          <div className="modal-content" style={{ padding: 0 }}>
            <button type="button" className="auth-modal-close-btn modal-close" onClick={() => setShowProductFormModal(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8, color: '#111' }}>
                <i className="fa-solid fa-shirt" style={{ color: '#c49a26' }} />
                {editingProduct ? 'Modifier le Vêtement' : 'Ajouter un Vêtement'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                {editingProduct ? 'Modifiez les informations de cet article du catalogue.' : 'Prenez une photo ou sélectionnez une image, ajustez les tailles et ajoutez l\'article au catalogue.'}
              </p>
            </div>
            <form className="form-stack" onSubmit={handleSaveProduct}>
              {/* Photo du Vêtement (Camera / Galerie / Fichier) */}
              <div style={{ background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: 12, padding: '16px', marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#111', marginBottom: 10 }}>
                  <i className="fa-solid fa-camera" style={{ color: '#c49a26', marginRight: 6 }} />
                  Photo du Vêtement (depuis Téléphone ou Ordinateur)
                </label>
                <div className="admin-photo-picker-row" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: 88, height: 88, borderRadius: 10, overflow: 'hidden', border: '1px solid #d1d5db', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={productFormImage || '/tshirt-byafrika.jpg'} alt="Aperçu vêtement" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111', color: '#dfba5c', border: '1px solid #dfba5c', padding: '10px 16px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
                      <i className="fa-solid fa-cloud-arrow-up" /> Prendre une photo / Galerie
                      <input type="file" accept="image/*" onChange={handleImageFileChange} style={{ display: 'none' }} />
                    </label>
                    <input
                      type="text"
                      name="image"
                      className="form-input"
                      value={productFormImage}
                      onChange={(e) => setProductFormImage(e.target.value)}
                      placeholder="Ou lien URL / fichier (ex: /tshirt-byafrika.jpg)"
                      style={{ fontSize: '0.82rem', padding: '8px 12px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nom de l'article *</label>
                  <input type="text" name="name" className="form-input" placeholder="Ex: T-shirt Signature BY_AFRIKA" defaultValue={editingProduct?.name || ''} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Catégorie *</label>
                  <select name="category" className="form-input" defaultValue={editingProduct?.category || 'T-shirts'}>
                    {(config.categories || ['T-shirts', 'Polos', 'Chemises', 'Pantalons', 'Robes', 'Accessoires']).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Genre *</label>
                  <select name="genre" className="form-input" defaultValue={editingProduct?.genre || 'Unisexe'}>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                    <option value="Unisexe">Unisexe</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Prix (FCFA) *</label>
                  <input type="number" name="price" className="form-input" placeholder="15000" defaultValue={editingProduct?.price || 15000} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock disponible (unités) *</label>
                  <input type="number" name="stock" className="form-input" placeholder="25" defaultValue={editingProduct?.stock || 25} required />
                </div>
              </div>

              {/* Sélecteur de Tailles Tactile pour Mobile & PC */}
              <div className="form-group full-width" style={{ marginTop: 12 }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tailles disponibles (Touchez pour sélectionner) *</span>
                  <span style={{ fontSize: '0.78rem', color: '#c49a26' }}>{productFormSizes.length} sélectionnée(s)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(s => {
                    const isSelected = productFormSizes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleFormSize(s)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 6,
                          border: isSelected ? '2px solid #111' : '1px solid #d1d5db',
                          background: isSelected ? '#111' : '#fff',
                          color: isSelected ? '#dfba5c' : '#374151',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        {isSelected && <i className="fa-solid fa-check" style={{ fontSize: '0.75rem' }} />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sélecteur de Couleurs Tactile pour Mobile & PC */}
              <div className="form-group full-width" style={{ marginTop: 12 }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Couleurs disponibles (Touchez pour sélectionner) *</span>
                  <span style={{ fontSize: '0.78rem', color: '#c49a26' }}>{productFormColors.length} sélectionnée(s)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Noir', 'Blanc', 'Bleu Marine', 'Kaki', 'Gris', 'Beige', 'Bordeaux', 'Marron'].map(c => {
                    const isSelected = productFormColors.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleFormColor(c)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 6,
                          border: isSelected ? '2px solid #111' : '1px solid #d1d5db',
                          background: isSelected ? '#111' : '#fff',
                          color: isSelected ? '#dfba5c' : '#374151',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        {isSelected && <i className="fa-solid fa-check" style={{ fontSize: '0.75rem' }} />}
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group full-width" style={{ marginTop: 14, background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    name="featured"
                    defaultChecked={editingProduct ? editingProduct.featured : true}
                    style={{ width: 18, height: 18, accentColor: '#dfba5c', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', display: 'block' }}>
                      Afficher en vedette sur l'Accueil (Collections Stars)
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      L'article sera visible dans la Boutique générale et mis en avant sur l'Accueil.
                    </span>
                  </div>
                </label>
              </div>

              <div className="form-group full-width" style={{ marginTop: 12 }}>
                <label className="form-label">Description du vêtement</label>
                <textarea name="description" className="form-input" rows={3} placeholder="Matière en coton peigné premium, coupe moderne..." defaultValue={editingProduct?.description || ''} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setShowProductFormModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '12px', fontSize: '0.95rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <i className="fa-solid fa-check" />
                  {editingProduct ? 'Enregistrer les modifications' : 'Ajouter au catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7b. Modal Admin Ajout Rôle / Utilisateur */}
      {showAddUserModal && (
        <div id="modal-admin-user" className="modal modal-admin-dialog" style={{ display: 'block', maxWidth: 480 }}>
          <div className="modal-content">
            <button type="button" className="auth-modal-close-btn modal-close" onClick={() => setShowAddUserModal(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-user-plus" style={{ color: '#c49a26' }} />
                Attribuer un Rôle
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                Ajoutez un membre d'équipe et accordez-lui des permissions de gestion.
              </p>
            </div>
            <form className="form-stack" onSubmit={handleAddUserSubmit}>
              <div className="form-group">
                <label className="form-label">Nom complet *</label>
                <input type="text" name="userName" className="form-input" placeholder="Ex: Moussa Ndiaye" required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse e-mail *</label>
                <input type="email" name="userEmail" className="form-input" placeholder="moussa@byafrika.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Rôle attribué *</label>
                <select name="userRole" className="form-input" defaultValue="Gestionnaire de commandes">
                  <option value="Administrateur">Administrateur</option>
                  <option value="Gestionnaire de stock">Gestionnaire de stock</option>
                  <option value="Gestionnaire de commandes">Gestionnaire de commandes</option>
                  <option value="Service Client SAV">Service Client SAV</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddUserModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
                  Confirmer le rôle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Toast de Notification */}
      {toastMessage && (
        <div id="toast" className="toast" style={{ display: 'block' }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 9. Cookie Consent Banner */}
      {!cookieConsent && (
        <div id="cookie-banner" className="cookie-banner" style={{ display: 'block' }}>
          <div className="cookie-container">
            <div className="cookie-icon">
              <i className="fa-solid fa-cookie-bite" />
            </div>
            <div className="cookie-text">
              <h4>Gestion des Cookies & Vie Privée</h4>
              <p>
                Nous utilisons des cookies essentiels pour enregistrer vos sélections de panier et vous garantir une
                expérience d'achat optimale sur <strong>BY_AFRIKA</strong>. Consultez notre{' '}
                <a
                  href="#"
                  className="cookie-policy-link"
                  onClick={(e) => { e.preventDefault(); setActivePage('confidentialite'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ color: '#dfba5c', textDecoration: 'underline' }}
                >
                  Politique de Confidentialité
                </a>.
              </p>
            </div>
            <div className="cookie-actions">
              <button
                type="button"
                id="btn-accept-cookies"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setCookieConsent(true);
                  localStorage.setItem('byafrika_cookie_consent', 'all');
                }}
              >
                Accepter tout
              </button>
              <button
                type="button"
                id="btn-refuse-cookies"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setCookieConsent(true);
                  localStorage.setItem('byafrika_cookie_consent', 'essential');
                }}
              >
                Essentiels uniquement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
