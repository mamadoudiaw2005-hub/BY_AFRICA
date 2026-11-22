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

  const [adminTab, setAdminTab] = useState('dashboard'); // dashboard, produits, commandes, messages, roles, config
  const [adminSubTab, setAdminSubTab] = useState('messages'); // messages | roles
  const [toastMessage, setToastMessage] = useState('');
  const [cookieConsent, setCookieConsent] = useState(false);

  // Formulaires Admin
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  const [selectedAdminMessage, setSelectedAdminMessage] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // ── CHARGEMENT LOCALSTORAGE & SUPABASE ──
  useEffect(() => {
    // Restaurer session utilisateur & panier
    try {
      const savedUser = localStorage.getItem('byafrika_user');
      if (savedUser) setUser(JSON.parse(savedUser));

      const savedCart = localStorage.getItem('byafrika_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedConsent = localStorage.getItem('byafrika_cookie_consent');
      if (savedConsent) setCookieConsent(true);
    } catch (e) {
      console.error(e);
    }

    // Synchronisation Supabase en arrière-plan
    const syncCloudData = async () => {
      try {
        const { data: dbProds } = await supabase.from('products').select('*');
        if (dbProds && dbProds.length > 0) setProducts(dbProds);

        const { data: dbOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (dbOrders && dbOrders.length > 0) setOrders(dbOrders);

        const { data: dbMsgs } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
        if (dbMsgs && dbMsgs.length > 0) setMessages(dbMsgs);
      } catch (err) {
        console.warn('Mode autonome local activé.', err);
      }
    };
    syncCloudData();
  }, []);

  // Sauvegarder panier
  useEffect(() => {
    try {
      localStorage.setItem('byafrika_cart', JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

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
    return img.startsWith('/') ? img : `/${img}`;
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

  // ── ACTIONS AUTH ──
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const email = e.target.email?.value?.trim() || '';
    const pwd = e.target.password?.value?.trim() || '';

    if (email.toLowerCase() === 'admin@byafrica.com' && (pwd === 'admin123' || pwd === 'byafrika2026' || pwd === 'Admin2026')) {
      const adminUser = { id: 'admin_1', name: 'Direction BY_AFRIKA', email: 'admin@byafrica.com', role: 'admin' };
      setUser(adminUser);
      localStorage.setItem('byafrika_user', JSON.stringify(adminUser));
      setAuthModalOpen(false);
      setActivePage('admin');
      showToast('Connecté avec succès en tant qu\'Administrateur.');
      return;
    }

    const standardUser = {
      id: `usr_${Date.now()}`,
      name: e.target.name?.value?.trim() || email.split('@')[0].toUpperCase(),
      email,
      role: 'client'
    };
    setUser(standardUser);
    localStorage.setItem('byafrika_user', JSON.stringify(standardUser));
    setAuthModalOpen(false);
    showToast(`Bienvenue, ${standardUser.name} !`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('byafrika_user');
    if (activePage === 'admin' || activePage === 'compte') setActivePage('accueil');
    showToast('Vous avez été déconnecté.');
  };

  // ── ACCÈS SÉCURISÉ ADMIN ──
  const handleAdminAccess = () => {
    if (user && user.role === 'admin') {
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

    if (email.toLowerCase() === 'admin@byafrica.com' && (pwd === 'admin123' || pwd === 'byafrika2026' || pwd === 'Admin2026')) {
      const adminUser = { id: 'admin_1', name: 'Direction BY_AFRIKA', email: 'admin@byafrica.com', role: 'admin' };
      setUser(adminUser);
      localStorage.setItem('byafrika_user', JSON.stringify(adminUser));
      setAdminLoginModalOpen(false);
      setActivePage('admin');
      showToast('Authentification réussie : Bienvenue dans l\'Espace Administrateur.');
    } else {
      showToast('Identifiants administrateur incorrects.');
    }
  };

  // ── AUTHENTIFICATION GOOGLE ──
  const handleGoogleAuthClick = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : ''
        }
      });
      if (error) throw error;
    } catch (err) {
      setAuthModalOpen(false);
      setGoogleAuthModalOpen(true);
    }
  };

  const handleGoogleSubmit = (e) => {
    e.preventDefault();
    const email = e.target.googleEmail?.value?.trim() || '';
    const name = e.target.googleName?.value?.trim() || email.split('@')[0].toUpperCase();

    const googleUser = {
      id: `usr_google_${Date.now()}`,
      name,
      email,
      role: 'client',
      provider: 'google'
    };
    setUser(googleUser);
    localStorage.setItem('byafrika_user', JSON.stringify(googleUser));
    setGoogleAuthModalOpen(false);
    showToast(`Connecté avec succès via Google : Bienvenue ${name} !`);
  };

  // ── PASSATION DE COMMANDE (ARRIVER PAYER) ──
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const fd = new FormData(e.target);
    const newOrder = {
      id: `CMD-${Date.now()}`,
      customer: {
        name: fd.get('name'),
        phone: fd.get('phone'),
        email: fd.get('email') || (user ? user.email : ''),
        address: checkoutDelivery === 'delivery' ? fd.get('address') : 'Retrait en boutique BY_AFRIKA (Dakar)',
        notes: fd.get('notes') || ''
      },
      deliveryType: checkoutDelivery === 'delivery' ? 'Livraison à domicile' : 'Retrait en boutique (0 FCFA)',
      deliveryFee,
      items: [...cart],
      subtotal: cartSubtotal,
      total: cartGrandTotal,
      status: 'Reçue',
      paymentMethod: 'Arriver Payer (Espèces / Wave à la livraison)',
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
    } catch (err) {}

    showToast('Votre commande a été enregistrée avec succès !');
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
    } catch (e) {}

    showToast('Votre message a bien été envoyé. Notre service client vous répondra rapidement !');
  };

  // ── GESTION DES PRODUITS (ADMIN) ──
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const prodData = {
      id: editingProduct?.id || `prod_${Date.now()}`,
      name: fd.get('name'),
      category: fd.get('category'),
      genre: fd.get('genre'),
      price: Number(fd.get('price')),
      description: fd.get('description'),
      image: fd.get('image') || '/tshirt-byafrika.jpg',
      sizes: fd.get('sizes').split(',').map(s => s.trim()),
      colors: fd.get('colors').split(',').map(c => c.trim()),
      stock: Number(fd.get('stock')),
      featured: fd.get('featured') === 'on'
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? prodData : p));
      showToast('Produit mis à jour avec succès.');
    } else {
      setProducts(prev => [prodData, ...prev]);
      showToast('Nouveau produit ajouté au catalogue !');
    }

    try {
      await supabase.from('products').upsert([prodData]);
    } catch (e) {}

    setShowProductFormModal(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Voulez-vous vraiment supprimer cet article ?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (e) {}
      showToast('Produit retiré du catalogue.');
    }
  };

  // ── FILTRAGE DES PRODUITS CLIENT ──
  const getFilteredProducts = () => {
    return products.filter(p => {
      if (activePage === 'hommes' && p.genre !== 'Homme' && p.genre !== 'Unisexe') return false;
      if (activePage === 'femmes' && p.genre !== 'Femme' && p.genre !== 'Unisexe') return false;
      if (filterGenre && filterGenre !== 'Tous' && p.genre !== filterGenre && p.genre !== 'Unisexe') return false;
      if (filterCategory && filterCategory !== 'Toutes' && p.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
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
                    } else if (user.role === 'admin') {
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
              <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('contact'); setMobileMenuOpen(false); }}>Contact & Réclamations</a>
              <a href="#" onClick={(e) => { e.preventDefault(); if (!user) setAuthModalOpen(true); else if (user.role === 'admin') setActivePage('admin'); else setActivePage('compte'); setMobileMenuOpen(false); }}>
                <i className="fa-solid fa-user" /> {user ? user.name : 'Mon Compte / Connexion'}
              </a>
              {user && user.role === 'admin' && (
                <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('admin'); setMobileMenuOpen(false); }} style={{ color: '#dfba5c' }}>
                  <i className="fa-solid fa-shield-halved" /> Panneau d'Administration
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
                        onClick={() => { setActivePage('boutique'); setFilterGenre(''); }}
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

                  <div className="apropos-section">
                    <h2><i className="fa-solid fa-user-tie" /> Le Fondateur & La Vision</h2>
                    <p>
                      Originaire de Dakar, Sénégal. Passionné de mode et animé par un profond amour pour l'Afrique,
                      le fondateur a créé BY_AFRIKA pour donner une voix vestimentaire et stylée à la jeunesse africaine.
                    </p>
                    <p>
                      Son ambition : faire de BY_AFRIKA une référence panafricaine dans la mode contemporaine, en partant de Dakar pour
                      conquérir le continent et au-delà. Chaque collection est pensée pour inspirer confiance, fierté et
                      élégance.
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
                      <span>{config.phone || '+221 77 000 00 00'}</span>
                    </div>
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
                <div className="compte-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <h1 style={{ marginBottom: 4, fontSize: '1.8rem' }}>Mon Compte</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      Bonjour <strong>{user?.name || 'Client'}</strong>, bienvenue dans votre espace personnel.
                    </p>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={handleLogout} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.5)' }}>
                    <i className="fa-solid fa-arrow-right-from-bracket" /> Déconnexion
                  </button>
                </div>

                <div className="compte-content">
                  <h2>Historique de mes commandes</h2>
                  {orders.filter(o => o.customer?.email === user?.email || o.customer?.phone === user?.phone).length === 0 ? (
                    <p className="empty-state">Vous n'avez pas encore passé de commande avec ces coordonnées.</p>
                  ) : (
                    <div className="orders-list">
                      {orders.filter(o => o.customer?.email === user?.email || o.customer?.phone === user?.phone).map(o => (
                        <div key={o.id} className="order-card" style={{ background: '#fff', border: '1px solid var(--border-color)', padding: 20, borderRadius: 12, marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <strong>N° {o.id}</strong>
                            <span className="badge-type">{o.status}</span>
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
                    <a href="https://wa.me/221770000000" target="_blank" rel="noreferrer" className="social-btn" aria-label="WhatsApp">
                      <i className="fa-brands fa-whatsapp" />
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="Instagram">
                      <i className="fa-brands fa-instagram" />
                    </a>
                    <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="TikTok">
                      <i className="fa-brands fa-tiktok" />
                    </a>
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
                <p>© 2026 BY_AFRIKA. Tous droits réservés. Maison de prêt-à-porter au Sénégal.</p>
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
      ) : (user && user.role === 'admin') ? (
        /* ============================================================ */
        /* VUE 2 : TABLEAU DE BORD ADMINISTRATEUR (SÉCURISÉ)            */
        /* ============================================================ */
        <div id="admin-view">
          <div className="admin-container">
            {/* Sidebar Admin */}
            <aside className="admin-sidebar" style={{ display: 'block' }}>
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
              <div className="admin-desktop-topbar">
                <div className="admin-topbar-info">
                  <span className="admin-topbar-badge"><i className="fa-solid fa-shield-halved" /> Administration</span>
                  <span className="admin-topbar-user">Connecté : <strong>Direction BY_AFRIKA</strong></span>
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

              {/* Navigation chips mobile admin */}
              <nav className="admin-mobile-chips-nav">
                <button type="button" className={`admin-chip-btn ${adminTab === 'dashboard' ? 'active' : ''}`} onClick={() => setAdminTab('dashboard')}><i className="fa-solid fa-chart-line" /> Dashboard</button>
                <button type="button" className={`admin-chip-btn ${adminTab === 'produits' ? 'active' : ''}`} onClick={() => setAdminTab('produits')}><i className="fa-solid fa-shirt" /> Produits</button>
                <button type="button" className={`admin-chip-btn ${adminTab === 'commandes' ? 'active' : ''}`} onClick={() => setAdminTab('commandes')}><i className="fa-solid fa-box" /> Commandes</button>
                <button type="button" className={`admin-chip-btn ${adminTab === 'messages' ? 'active' : ''}`} onClick={() => setAdminTab('messages')}><i className="fa-solid fa-headset" /> Messages</button>
                <button type="button" className={`admin-chip-btn ${adminTab === 'config' ? 'active' : ''}`} onClick={() => setAdminTab('config')}><i className="fa-solid fa-gear" /> Config</button>
              </nav>

              {/* TAB : DASHBOARD */}
              {adminTab === 'dashboard' && (
                <div className="admin-section active">
                  <h1>Tableau de bord</h1>
                  <div className="admin-stats">
                    <div className="stat-card">
                      <i className="fa-solid fa-box" />
                      <div className="stat-info">
                        <h3>{orders.length}</h3>
                        <p>Commandes</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <i className="fa-solid fa-coins" />
                      <div className="stat-info">
                        <h3>{formatPrice(orders.reduce((s, o) => s + (o.total || 0), 0))}</h3>
                        <p>Chiffre d'Affaires</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <i className="fa-solid fa-shirt" />
                      <div className="stat-info">
                        <h3>{products.length}</h3>
                        <p>Articles</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <i className="fa-solid fa-headset" />
                      <div className="stat-info">
                        <h3>{messages.length}</h3>
                        <p>Réclamations</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB : PRODUITS */}
              {adminTab === 'produits' && (
                <div className="admin-section active">
                  <div className="admin-section-header">
                    <h2>Gestion du Catalogue ({products.length})</h2>
                    <button type="button" className="btn btn-primary" onClick={() => { setEditingProduct(null); setShowProductFormModal(true); }}>
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
                            <td>
                              <img src={getSafeImage(p.image)} alt={p.name} style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                            </td>
                            <td><strong>{p.name}</strong></td>
                            <td><span className="badge-type">{p.genre}</span></td>
                            <td>{p.category}</td>
                            <td><strong style={{ color: '#c49a26' }}>{formatPrice(p.price)}</strong></td>
                            <td>{p.stock} pcs</td>
                            <td>
                              <button type="button" className="btn btn-sm btn-outline" style={{ marginRight: 6 }} onClick={() => { setEditingProduct(p); setShowProductFormModal(true); }}>Modifier</button>
                              <button type="button" className="btn btn-sm btn-outline" style={{ color: '#ef4444' }} onClick={() => handleDeleteProduct(p.id)}>Supprimer</button>
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
                  <h2>Gestion des Commandes Clients ({orders.length})</h2>
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
                        </tr>
                      </thead>
                      <tbody>
                        {orders.length === 0 ? (
                          <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Aucune commande enregistrée pour le moment.</td></tr>
                        ) : (
                          orders.map(o => (
                            <tr key={o.id}>
                              <td><strong>{o.id}</strong></td>
                              <td>{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                              <td>{o.customer?.name}</td>
                              <td>{o.customer?.phone}</td>
                              <td>{o.deliveryType}</td>
                              <td><strong style={{ color: '#c49a26' }}>{formatPrice(o.total)}</strong></td>
                              <td>
                                <select
                                  value={o.status}
                                  onChange={async (e) => {
                                    const val = e.target.value;
                                    setOrders(prev => prev.map(item => item.id === o.id ? { ...item, status: val } : item));
                                    try {
                                      await supabase.from('orders').update({ status: val }).eq('id', o.id);
                                    } catch (err) {}
                                    showToast(`Commande ${o.id} passée à : ${val}`);
                                  }}
                                  className="form-input"
                                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                >
                                  <option value="Reçue">Reçue</option>
                                  <option value="En préparation">En préparation</option>
                                  <option value="En livraison">En livraison</option>
                                  <option value="Livrée">Livrée</option>
                                  <option value="Annulée">Annulée</option>
                                </select>
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
                          {messages.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }}>Aucune réclamation.</td></tr>
                          ) : (
                            messages.map(m => (
                              <tr key={m.id}>
                                <td>{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                                <td>
                                  <strong>{m.name}</strong>
                                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{m.phone}</div>
                                </td>
                                <td><span className="badge-type">{m.type}</span></td>
                                <td style={{ maxWidth: 300 }}>{m.message}</td>
                                <td>
                                  {m.phone && (
                                    <a
                                      href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-sm btn-outline"
                                      style={{ color: '#25D366', borderColor: '#25D366' }}
                                    >
                                      <i className="fa-brands fa-whatsapp" /> Répondre
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
                                <td><strong>{u.name}</strong></td>
                                <td>{u.email}</td>
                                <td><span className="badge-type">{u.role}</span></td>
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
                  <h2>Configuration Générale</h2>
                  <form className="form-stack" onSubmit={(e) => { e.preventDefault(); showToast('Configuration mise à jour !'); }}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Nom de la boutique</label>
                        <input type="text" className="form-input" value={config.siteName} onChange={e => setConfig({ ...config, siteName: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Slogan</label>
                        <input type="text" className="form-input" value={config.slogan} onChange={e => setConfig({ ...config, slogan: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Téléphone</label>
                        <input type="text" className="form-input" value={config.phone} onChange={e => setConfig({ ...config, phone: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Frais de livraison (FCFA)</label>
                        <input type="number" className="form-input" value={config.deliveryFee} onChange={e => setConfig({ ...config, deliveryFee: Number(e.target.value) })} />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 16 }}>
                      <i className="fa-solid fa-save" /> Enregistrer les réglages
                    </button>
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
      {(productModal || checkoutOpen || authModalOpen || googleAuthModalOpen || adminLoginModalOpen || confirmedOrder || showProductFormModal || showAddUserModal) && (
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
              <div className="product-modal-img">
                <img
                  src={getSafeImage(productModal.image)}
                  alt={productModal.name}
                  onError={(e) => { e.target.src = '/tshirt-byafrika.jpg'; }}
                />
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

              <button type="submit" className="btn btn-primary btn-full">Confirmer ma commande</button>
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
            <button type="button" className="auth-modal-close-btn modal-close" onClick={() => setAuthModalOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <div className="auth-modal-tabs">
              <button
                type="button"
                className={`auth-modal-tab-btn ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => setAuthTab('login')}
              >
                Se connecter
              </button>
              <button
                type="button"
                className={`auth-modal-tab-btn ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => setAuthTab('register')}
              >
                Créer un compte
              </button>
            </div>

            {authTab === 'login' ? (
              <form className="auth-form-stack" onSubmit={handleAuthSubmit}>
                <div className="auth-field">
                  <label className="auth-label">Adresse e-mail</label>
                  <input type="email" name="email" className="auth-input" placeholder="exemple@email.com" required />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Mot de passe</label>
                  <input type="password" name="password" className="auth-input" placeholder="••••••••" required />
                </div>
                <button type="submit" className="btn-auth-submit">Se connecter</button>

                <div className="auth-divider">
                  <span>OU CONTINUER AVEC</span>
                </div>

                <button type="button" className="btn-google-auth" onClick={handleGoogleAuthClick}>
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
                  <input type="text" name="name" className="auth-input" placeholder="Votre nom" required />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Adresse e-mail</label>
                  <input type="email" name="email" className="auth-input" placeholder="exemple@email.com" required />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Mot de passe</label>
                  <input type="password" name="password" className="auth-input" placeholder="••••••••" required />
                </div>
                <button type="submit" className="btn-auth-submit">Créer mon compte</button>

                <div className="auth-divider">
                  <span>OU CONTINUER AVEC</span>
                </div>

                <button type="button" className="btn-google-auth" onClick={handleGoogleAuthClick}>
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

      {/* 7. Modal Admin Ajout/Modification Produit */}
      {showProductFormModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content modal-large">
            <button type="button" className="modal-close" onClick={() => setShowProductFormModal(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <h2>{editingProduct ? 'Modifier le Produit' : 'Ajouter un Produit'}</h2>
            <form className="form-stack" onSubmit={handleSaveProduct}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nom de l'article</label>
                  <input type="text" name="name" className="form-input" defaultValue={editingProduct?.name || ''} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Catégorie</label>
                  <select name="category" className="form-input" defaultValue={editingProduct?.category || 'T-shirts'}>
                    {config.categories?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Genre</label>
                  <select name="genre" className="form-input" defaultValue={editingProduct?.genre || 'Unisexe'}>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                    <option value="Unisexe">Unisexe</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Prix (FCFA)</label>
                  <input type="number" name="price" className="form-input" defaultValue={editingProduct?.price || 15000} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock disponible</label>
                  <input type="number" name="stock" className="form-input" defaultValue={editingProduct?.stock || 50} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Image (ex: /tshirt-byafrika.jpg)</label>
                  <input type="text" name="image" className="form-input" defaultValue={editingProduct?.image || '/tshirt-byafrika.jpg'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tailles (séparées par virgule)</label>
                  <input type="text" name="sizes" className="form-input" defaultValue={editingProduct?.sizes?.join(', ') || 'S, M, L, XL, XXL'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Couleurs (séparées par virgule)</label>
                  <input type="text" name="colors" className="form-input" defaultValue={editingProduct?.colors?.join(', ') || 'Noir, Blanc'} />
                </div>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Description</label>
                <textarea name="description" className="form-input" rows={3} defaultValue={editingProduct?.description || ''} />
              </div>
              <button type="submit" className="btn btn-primary btn-full">
                {editingProduct ? 'Enregistrer les modifications' : 'Ajouter au catalogue'}
              </button>
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
