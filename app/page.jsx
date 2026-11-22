'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_PRODUCTS, DEFAULT_CONFIG, DEMO_ADMINS } from '../lib/initialData';

export default function ByAfrikaApp() {
  // ── ÉTATS PRINCIPAUX ──
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [usersList, setUsersList] = useState(DEMO_ADMINS);

  // ── NAVIGATION & FILTRES ──
  const [activePage, setActivePage] = useState('accueil'); // 'accueil' | 'boutique' | 'a-propos' | 'contact' | 'compte' | 'admin'
  const [genderFilter, setGenderFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── MODALS ──
  const [cartOpen, setCartOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [productModal, setProductModal] = useState(null); // produit sélectionné pour détails
  const [modalSize, setModalSize] = useState('M');
  const [modalColor, setModalColor] = useState('Noir');
  const [modalQty, setModalQty] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);

  // ── ADMIN ──
  const [adminTab, setAdminTab] = useState('dashboard'); // 'dashboard' | 'produits' | 'commandes' | 'messages' | 'roles' | 'config'
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [selectedAdminOrder, setSelectedAdminOrder] = useState(null);
  const [selectedAdminMessage, setSelectedAdminMessage] = useState(null);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState({ checked: false, connected: false, message: '' });

  // ── CHECKOUT FORM ──
  const [checkoutDelivery, setCheckoutDelivery] = useState('delivery'); // 'delivery' | 'pickup'
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutCreateAccount, setCheckoutCreateAccount] = useState(true);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutPassword, setCheckoutPassword] = useState('');
  const [checkoutOptin, setCheckoutOptin] = useState(true);

  // ── CONTACT FORM ──
  const [contactName, setContactName] = useState('');
  const [contactContact, setContactContact] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactType, setContactType] = useState('Demande générale');
  const [contactMessage, setContactMessage] = useState('');

  // ── COOKIE CONSENT & TOAST ──
  const [cookieConsent, setCookieConsent] = useState(true); // masqué par défaut si déjà accepté
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });

  // Notification Toast Helper
  const showToast = (message, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3500);
  };

  // ── CHARGEMENT INITIAL (LocalStorage & Supabase) ──
  useEffect(() => {
    // 1. Panier LocalStorage
    try {
      const savedCart = localStorage.getItem('byafrika_cart');
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch (e) { }

    // 2. Utilisateur LocalStorage
    try {
      const savedUser = localStorage.getItem('byafrika_user');
      if (savedUser) setUser(JSON.parse(savedUser));
    } catch (e) { }

    // 3. Cookie Consent LocalStorage
    try {
      const consent = localStorage.getItem('byafrika_cookie_consent');
      if (!consent) setCookieConsent(false);
    } catch (e) { }

    // 4. Charger données Supabase
    fetchSupabaseData();
  }, []);

  // Sauvegarder le panier dans LocalStorage à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem('byafrika_cart', JSON.stringify(cart));
    } catch (e) { }
  }, [cart]);

  // Synchronisation avec Supabase Cloud
  const fetchSupabaseData = async () => {
    try {
      // Tester la connexion Supabase
      const { data: dbProducts, error: prodErr } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!prodErr && dbProducts && dbProducts.length > 0) {
        // Normalisation
        const normalized = dbProducts.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: Number(p.price) || 0,
          genre: p.genre || 'Unisexe',
          category: p.category || 'T-shirts',
          sizes: p.sizes || ['M', 'L', 'XL'],
          colors: p.colors || ['Noir'],
          stock: p.stock || 10,
          image: p.image || 'tshirt-byafrika.jpg',
          featured: p.featured,
          createdAt: p.created_at
        }));
        setProducts(normalized);
        setSupabaseStatus({ checked: true, connected: true, message: 'Connecté en direct à Supabase' });
      } else {
        setSupabaseStatus({ checked: true, connected: false, message: 'Mode secours local actif' });
      }

      // Config
      const { data: dbConfig } = await supabase.from('site_config').select('*').eq('id', 'main').single();
      if (dbConfig && dbConfig.data) {
        setConfig(dbConfig.data);
      }

      // Commandes
      const { data: dbOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (dbOrders) {
        const normOrders = dbOrders.map(o => ({
          id: o.id,
          items: o.items || [],
          customer: o.customer || {},
          deliveryType: o.delivery_type || 'Livraison à domicile',
          deliveryFee: Number(o.delivery_fee) || 2000,
          total: Number(o.total) || 0,
          status: o.status || 'Reçue',
          paymentMethod: o.payment_method,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        }));
        setOrders(normOrders);
      }

      // Messages
      const { data: dbMsgs } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
      if (dbMsgs) {
        const normMsgs = dbMsgs.map(m => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          subject: m.subject,
          type: m.type,
          orderId: m.order_id,
          message: m.message,
          status: m.status || 'Nouveau',
          createdAt: m.created_at
        }));
        setMessages(normMsgs);
      }
    } catch (e) {
      console.log('Mode secours local actif:', e);
      setSupabaseStatus({ checked: true, connected: false, message: 'Stockage local actif' });
    }
  };

  // ── ACTIONS PANIER ──
  const addToCart = (product, size, color, qty = 1) => {
    const quantity = Math.max(1, parseInt(qty, 10) || 1);
    setCart(prev => {
      const idx = prev.findIndex(item => item.productId === product.id && item.size === size && item.color === color);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].qty += quantity;
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image || 'tshirt-byafrika.jpg',
          size: size || (product.sizes?.[0] || 'Standard'),
          color: color || (product.colors?.[0] || 'Noir'),
          qty: quantity
        }
      ];
    });

    showToast(`${product.name} ajouté au panier !`);
    if (productModal) setProductModal(null);
  };

  const updateCartQty = (index, delta) => {
    setCart(prev => {
      const copy = [...prev];
      copy[index].qty += delta;
      if (copy[index].qty <= 0) {
        copy.splice(index, 1);
      }
      return copy;
    });
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
    showToast('Article retiré du panier');
  };

  const cartTotalItems = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const deliveryFee = checkoutDelivery === 'pickup' ? 0 : (config.deliveryFee || 2000);
  const checkoutTotal = cartSubtotal + deliveryFee;

  // Formatage FCFA
  const formatPrice = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount || 0) + ' FCFA';
  };

  // Filtrage des produits
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Filtre genre
      if (genderFilter !== 'all') {
        const pGenre = (p.genre || '').toLowerCase();
        if (genderFilter === 'homme' && pGenre !== 'homme' && pGenre !== 'unisexe') return false;
        if (genderFilter === 'femme' && pGenre !== 'femme' && pGenre !== 'unisexe') return false;
        if (genderFilter === 'unisexe' && pGenre !== 'unisexe') return false;
      }
      // Filtre catégorie
      if (categoryFilter !== 'all') {
        if ((p.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }
      // Recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [products, genderFilter, categoryFilter, searchQuery]);

  // ── ACTIONS COMMANDE ──
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('Votre panier est vide !', true);
      return;
    }
    if (!checkoutName.trim() || !checkoutPhone.trim()) {
      showToast('Veuillez renseigner votre nom et votre numéro de téléphone', true);
      return;
    }
    if (checkoutDelivery === 'delivery' && !checkoutAddress.trim()) {
      showToast('Veuillez renseigner votre adresse de livraison', true);
      return;
    }

    const orderId = `CMD-${Date.now()}`;
    const newOrder = {
      id: orderId,
      items: cart,
      customer: {
        name: checkoutName.trim(),
        phone: checkoutPhone.trim(),
        address: checkoutDelivery === 'delivery' ? checkoutAddress.trim() : 'Retrait en Boutique BY_AFRIKA (Dakar)',
        notes: checkoutNotes.trim(),
        email: checkoutEmail.trim()
      },
      deliveryType: checkoutDelivery === 'pickup' ? 'Retrait en boutique' : 'Livraison à domicile',
      deliveryFee,
      total: checkoutTotal,
      status: 'Reçue',
      paymentMethod: checkoutDelivery === 'pickup'
        ? 'Paiement au retrait en boutique (0 FCFA)'
        : 'Paiement à la livraison (Arriver Payer)',
      createdAt: new Date().toISOString()
    };

    // 1. Sauvegarde locale
    setOrders(prev => [newOrder, ...prev]);

    // 2. Décrémenter les stocks
    setProducts(prev => {
      const copy = [...prev];
      cart.forEach(cItem => {
        const prod = copy.find(p => p.id === cItem.productId);
        if (prod) prod.stock = Math.max(0, (prod.stock || 0) - cItem.qty);
      });
      return copy;
    });

    // 3. Sauvegarde Cloud Supabase
    try {
      await supabase.from('orders').insert({
        id: newOrder.id,
        items: newOrder.items,
        customer: newOrder.customer,
        delivery_type: newOrder.deliveryType,
        delivery_fee: newOrder.deliveryFee,
        total: newOrder.total,
        status: newOrder.status,
        payment_method: newOrder.paymentMethod,
        created_at: newOrder.createdAt
      });
    } catch (err) {
      console.log('Sauvegarde Supabase:', err);
    }

    // Réinitialiser le panier et ouvrir le reçu
    setCart([]);
    setCheckoutOpen(false);
    setReceiptOrder(newOrder);
    showToast('Votre commande a été validée avec succès !');
  };

  // ── ACTIONS AUTHENTIFICATION ──
  const handleLogin = (e) => {
    e.preventDefault();
    const emailInput = e.target.email.value.trim().toLowerCase();
    const pwdInput = e.target.password.value.trim();

    // Vérifier admin demo
    if (emailInput === 'admin@byafrica.com' && (pwdInput === 'admin123' || pwdInput === 'byafrika2026')) {
      const loggedAdmin = { id: 'user_admin_1', name: 'Direction BY_AFRIKA', email: 'admin@byafrica.com', role: 'admin' };
      setUser(loggedAdmin);
      localStorage.setItem('byafrika_user', JSON.stringify(loggedAdmin));
      setAuthModalOpen(false);
      showToast('Bienvenue sur le tableau de bord Administrateur !');
      return;
    }

    // Connexion client standard
    const loggedUser = {
      id: `user_${Date.now()}`,
      name: emailInput.split('@')[0].toUpperCase(),
      email: emailInput,
      role: 'client'
    };
    setUser(loggedUser);
    localStorage.setItem('byafrika_user', JSON.stringify(loggedUser));
    setAuthModalOpen(false);
    showToast(`Bienvenue sur BY_AFRIKA, ${loggedUser.name} !`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('byafrika_user');
    setActivePage('accueil');
    showToast('Vous avez été déconnecté(e)');
  };

  // ── ACTIONS CONTACT & RÉCLAMATIONS ──
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactMessage.trim() || !contactContact.trim()) {
      showToast('Veuillez remplir tous les champs obligatoires', true);
      return;
    }

    const newMsg = {
      id: `msg_${Date.now()}`,
      name: contactName.trim(),
      email: contactContact.includes('@') ? contactContact.trim() : '',
      phone: !contactContact.includes('@') ? contactContact.trim() : '',
      subject: contactSubject.trim() || 'Demande client',
      type: contactType,
      message: contactMessage.trim(),
      status: 'Nouveau',
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [newMsg, ...prev]);

    // Envoi Supabase
    try {
      await supabase.from('messages').insert({
        id: newMsg.id,
        name: newMsg.name,
        email: newMsg.email,
        phone: newMsg.phone,
        subject: newMsg.subject,
        type: newMsg.type,
        message: newMsg.message,
        status: newMsg.status,
        created_at: newMsg.createdAt
      });
    } catch (e) { }

    setContactName('');
    setContactContact('');
    setContactSubject('');
    setContactMessage('');
    showToast('Votre message a été transmis avec succès à notre équipe !');
  };

  // ── ACTIONS ADMIN ──
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
    } catch (e) { }
    showToast(`Statut commande ${orderId} : ${newStatus}`);
  };

  const handleDeleteProduct = async (prodId) => {
    if (!confirm('Supprimer définitivement ce produit ?')) return;
    setProducts(prev => prev.filter(p => p.id !== prodId));
    try {
      await supabase.from('products').delete().eq('id', prodId);
    } catch (e) { }
    showToast('Produit supprimé');
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const price = parseInt(form.price.value, 10) || 0;
    const stock = parseInt(form.stock.value, 10) || 10;
    const genre = form.genre.value;
    const category = form.category.value;
    const description = form.description.value.trim();
    const image = form.image.value.trim() || 'tshirt-byafrika.jpg';

    if (editingProduct) {
      // Édition
      const updated = { ...editingProduct, name, price, stock, genre, category, description, image };
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      try {
        await supabase.from('products').update({
          name, price, stock, genre, category, description, image
        }).eq('id', updated.id);
      } catch (e) { }
      showToast('Produit mis à jour avec succès !');
    } else {
      // Création
      const newProd = {
        id: `prod_${Date.now()}`,
        name, price, stock, genre, category, description, image,
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Noir', 'Blanc'],
        featured: false,
        createdAt: new Date().toISOString()
      };
      setProducts(prev => [newProd, ...prev]);
      try {
        await supabase.from('products').insert(newProd);
      } catch (e) { }
      showToast('Nouveau produit ajouté au catalogue !');
    }
    setProductFormOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="byafrika-theme">
      {/* ── TOAST NOTIFICATION ── */}
      {toast.visible && (
        <div className={`toast-notification ${toast.isError ? 'toast-error' : 'toast-success'}`}>
          <i className={toast.isError ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check'} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── BANDEAU ANNONCE LUXE ── */}
      <div className="top-banner">
        <span>LIVRAISON PARTOUT AU SÉNÉGAL • ARRANGEZ VOS ORIGINES AVEC CONFIANCE • BY_AFRIKA</span>
      </div>

      {/* ── HEADER / NAVBAR PRINCIPALE ── */}
      <header className="main-header">
        <div className="header-container">
          {/* Bouton Hamburger Mobile */}
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Menu"
          >
            <i className={mobileMenuOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} />
          </button>

          {/* Logo & Identité */}
          <div className="brand-logo" onClick={() => setActivePage('accueil')}>
            <img src="/logo.jpg" alt="Logo BY_AFRIKA" className="brand-logo-img" />
            <span className="brand-name">BY_AFRIKA</span>
          </div>

          {/* Navigation Liens Desktop */}
          <nav className="nav-links desktop-nav">
            <button type="button" className={`nav-link ${activePage === 'accueil' ? 'active' : ''}`} onClick={() => setActivePage('accueil')}>Accueil</button>
            <button type="button" className={`nav-link ${activePage === 'boutique' ? 'active' : ''}`} onClick={() => { setActivePage('boutique'); setGenderFilter('all'); }}>Boutique</button>
            <button type="button" className={`nav-link ${genderFilter === 'homme' && activePage === 'boutique' ? 'active' : ''}`} onClick={() => { setActivePage('boutique'); setGenderFilter('homme'); }}>Homme</button>
            <button type="button" className={`nav-link ${genderFilter === 'femme' && activePage === 'boutique' ? 'active' : ''}`} onClick={() => { setActivePage('boutique'); setGenderFilter('femme'); }}>Femme</button>
            <button type="button" className={`nav-link ${activePage === 'a-propos' ? 'active' : ''}`} onClick={() => setActivePage('a-propos')}>À Propos</button>
            <button type="button" className={`nav-link ${activePage === 'contact' ? 'active' : ''}`} onClick={() => setActivePage('contact')}>Contact</button>
          </nav>

          {/* Actions Droite (Recherche, Compte, Panier, Admin) */}
          <div className="header-actions">
            {/* Recherche rapide */}
            <button type="button" className="action-circle-btn" onClick={() => setSearchOpen(prev => !prev)} title="Rechercher">
              <i className="fa-solid fa-magnifying-glass" />
            </button>

            {/* Compte / Connexion */}
            <button
              type="button"
              className="action-circle-btn"
              onClick={() => {
                if (user) setActivePage('compte');
                else setAuthModalOpen(true);
              }}
              title={user ? `Compte (${user.name})` : 'Connexion'}
            >
              <i className="fa-regular fa-user" />
            </button>

            {/* Panier avec badge */}
            <button
              type="button"
              className="action-circle-btn cart-action-btn"
              onClick={() => setCartOpen(true)}
              title="Panier"
            >
              <i className="fa-solid fa-bag-shopping" />
              {cartTotalItems > 0 && <span className="cart-badge-count">{cartTotalItems}</span>}
            </button>

            {/* Raccourci vers l'administration */}
            <button
              type="button"
              className="admin-switch-btn"
              onClick={() => setActivePage(prev => prev === 'admin' ? 'accueil' : 'admin')}
              title="Tableau de bord administration"
            >
              <i className="fa-solid fa-shield-halved" />
              <span>{activePage === 'admin' ? 'Boutique' : 'Admin'}</span>
            </button>
          </div>
        </div>

        {/* Barre de recherche déployable */}
        {searchOpen && (
          <div className="search-bar-dropdown">
            <div className="search-input-wrapper">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="text"
                placeholder="Rechercher un T-shirt, une chemise, une robe..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')}><i className="fa-solid fa-xmark" /></button>
              )}
            </div>
          </div>
        )}

        {/* Menu Déroulant Mobile */}
        {mobileMenuOpen && (
          <div className="mobile-drawer">
            <button type="button" className="mobile-nav-item" onClick={() => { setActivePage('accueil'); setMobileMenuOpen(false); }}>Accueil</button>
            <button type="button" className="mobile-nav-item" onClick={() => { setActivePage('boutique'); setGenderFilter('all'); setMobileMenuOpen(false); }}>Toute la Boutique</button>
            <button type="button" className="mobile-nav-item" onClick={() => { setActivePage('boutique'); setGenderFilter('homme'); setMobileMenuOpen(false); }}>Collection Homme</button>
            <button type="button" className="mobile-nav-item" onClick={() => { setActivePage('boutique'); setGenderFilter('femme'); setMobileMenuOpen(false); }}>Collection Femme</button>
            <button type="button" className="mobile-nav-item" onClick={() => { setActivePage('a-propos'); setMobileMenuOpen(false); }}>À Propos de la marque</button>
            <button type="button" className="mobile-nav-item" onClick={() => { setActivePage('contact'); setMobileMenuOpen(false); }}>Contact & Assistance</button>
            <button type="button" className="mobile-nav-item" onClick={() => { setActivePage('admin'); setMobileMenuOpen(false); }}>
              <i className="fa-solid fa-shield-halved" style={{ marginRight: 8, color: '#d4af37' }} />
              Panneau d'Administration
            </button>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          VUE 1 : PANNEAU D'ADMINISTRATION
          ═══════════════════════════════════════════════════════════════ */}
      {activePage === 'admin' ? (
        <main className="admin-container">
          <div className="admin-header-bar">
            <div>
              <h1 className="admin-title">Panneau d'Administration BY_AFRIKA</h1>
              <p className="admin-subtitle">Gérez vos stocks, commandes clients, réclamations et synchronisation Supabase en temps réel.</p>
            </div>
            <button type="button" className="btn btn-outline" onClick={() => setActivePage('accueil')}>
              ← Retour à la boutique
            </button>
          </div>

          {/* Onglets Administration */}
          <div className="admin-tabs-nav">
            <button type="button" className={`admin-tab-btn ${adminTab === 'dashboard' ? 'active' : ''}`} onClick={() => setAdminTab('dashboard')}>
              <i className="fa-solid fa-chart-line" /> Tableau de Bord
            </button>
            <button type="button" className={`admin-tab-btn ${adminTab === 'produits' ? 'active' : ''}`} onClick={() => setAdminTab('produits')}>
              <i className="fa-solid fa-shirt" /> Produits & Stocks ({products.length})
            </button>
            <button type="button" className={`admin-tab-btn ${adminTab === 'commandes' ? 'active' : ''}`} onClick={() => setAdminTab('commandes')}>
              <i className="fa-solid fa-bag-shopping" /> Commandes ({orders.length})
            </button>
            <button type="button" className={`admin-tab-btn ${adminTab === 'messages' ? 'active' : ''}`} onClick={() => setAdminTab('messages')}>
              <i className="fa-solid fa-headset" /> Messages & Réclamations ({messages.length})
            </button>
            <button type="button" className={`admin-tab-btn ${adminTab === 'roles' ? 'active' : ''}`} onClick={() => setAdminTab('roles')}>
              <i className="fa-solid fa-users-gear" /> Gestion des Rôles
            </button>
            <button type="button" className={`admin-tab-btn ${adminTab === 'config' ? 'active' : ''}`} onClick={() => setAdminTab('config')}>
              <i className="fa-solid fa-sliders" /> Paramètres & Supabase
            </button>
          </div>

          {/* TAB 1 : DASHBOARD STATS */}
          {adminTab === 'dashboard' && (
            <div className="admin-content-section">
              <div className="stats-cards-grid">
                <div className="stat-card">
                  <div className="stat-label">Commandes Totales</div>
                  <div className="stat-val">{orders.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Chiffre d'Affaires</div>
                  <div className="stat-val">{formatPrice(orders.reduce((s, o) => s + (o.total || 0), 0))}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Articles en Catalogue</div>
                  <div className="stat-val">{products.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Réclamations / Messages</div>
                  <div className="stat-val">{messages.length}</div>
                </div>
              </div>

              <div className="admin-recent-block" style={{ marginTop: '2rem' }}>
                <h3>Dernières Commandes</h3>
                {orders.length === 0 ? (
                  <p className="empty-state">Aucune commande pour le moment.</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Numéro</th>
                          <th>Client</th>
                          <th>Mode</th>
                          <th>Total</th>
                          <th>Statut</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map(o => (
                          <tr key={o.id}>
                            <td><strong>{o.id}</strong></td>
                            <td>{o.customer?.name} ({o.customer?.phone})</td>
                            <td>{o.deliveryType}</td>
                            <td><strong style={{ color: '#d4af37' }}>{formatPrice(o.total)}</strong></td>
                            <td>
                              <select
                                value={o.status}
                                onChange={e => handleUpdateOrderStatus(o.id, e.target.value)}
                                className="status-select"
                              >
                                <option value="Reçue">Reçue</option>
                                <option value="Validée">Validée</option>
                                <option value="En préparation">En préparation</option>
                                <option value="En livraison">En livraison</option>
                                <option value="Livrée">Livrée</option>
                                <option value="Annulée">Annulée</option>
                              </select>
                            </td>
                            <td>
                              <button type="button" className="btn btn-sm btn-outline" onClick={() => setSelectedAdminOrder(o)}>Détails</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2 : GESTION DES PRODUITS */}
          {adminTab === 'produits' && (
            <div className="admin-content-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2>Catalogue des Produits ({products.length})</h2>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { setEditingProduct(null); setProductFormOpen(true); }}
                >
                  <i className="fa-solid fa-plus" /> Ajouter un Vêtement
                </button>
              </div>

              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Nom</th>
                      <th>Catégorie</th>
                      <th>Genre</th>
                      <th>Prix</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td><img src={p.image.startsWith('http') ? p.image : `/${p.image}`} alt={p.name} className="table-thumb" /></td>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.category}</td>
                        <td>{p.genre}</td>
                        <td><strong>{formatPrice(p.price)}</strong></td>
                        <td>
                          <span className={`stock-badge ${p.stock > 5 ? 'in-stock' : 'low-stock'}`}>
                            {p.stock} en stock
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => { setEditingProduct(p); setProductFormOpen(true); }}
                              title="Modifier"
                            >
                              <i className="fa-solid fa-pen" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              style={{ color: '#ef4444' }}
                              onClick={() => handleDeleteProduct(p.id)}
                              title="Supprimer"
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3 : COMMANDES */}
          {adminTab === 'commandes' && (
            <div className="admin-content-section">
              <h2>Toutes les Commandes ({orders.length})</h2>
              {orders.length === 0 ? (
                <p className="empty-state">Aucune commande enregistrée.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>N° Commande</th>
                        <th>Client</th>
                        <th>Articles</th>
                        <th>Mode de Réception</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td>{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td><strong>{o.id}</strong></td>
                          <td>
                            <strong>{o.customer?.name}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#888' }}>{o.customer?.phone}</div>
                          </td>
                          <td>{o.items?.length || 0} article(s)</td>
                          <td>{o.deliveryType}</td>
                          <td><strong style={{ color: '#d4af37' }}>{formatPrice(o.total)}</strong></td>
                          <td>
                            <select
                              value={o.status}
                              onChange={e => handleUpdateOrderStatus(o.id, e.target.value)}
                              className="status-select"
                            >
                              <option value="Reçue">Reçue</option>
                              <option value="Validée">Validée</option>
                              <option value="En préparation">En préparation</option>
                              <option value="En livraison">En livraison</option>
                              <option value="Livrée">Livrée</option>
                              <option value="Annulée">Annulée</option>
                            </select>
                          </td>
                          <td>
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => setSelectedAdminOrder(o)}>Détails</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4 : MESSAGES & RÉCLAMATIONS */}
          {adminTab === 'messages' && (
            <div className="admin-content-section">
              <h2>Messages et Réclamations ({messages.length})</h2>
              {messages.length === 0 ? (
                <p className="empty-state">Aucune réclamation enregistrée.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Contact</th>
                        <th>Type</th>
                        <th>Objet</th>
                        <th>Message</th>
                        <th>WhatsApp</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map(m => (
                        <tr key={m.id}>
                          <td>{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td><strong>{m.name}</strong></td>
                          <td>{m.phone || m.email}</td>
                          <td><span className="badge-type">{m.type}</span></td>
                          <td>{m.subject}</td>
                          <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</td>
                          <td>
                            {m.phone ? (
                              <a
                                href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-outline"
                                style={{ color: '#25D366', borderColor: '#25D366' }}
                              >
                                <i className="fa-brands fa-whatsapp" /> Répondre
                              </a>
                            ) : '-'}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setSelectedAdminMessage(m)}
                            >
                              Consulter
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5 : GESTION DES RÔLES */}
          {adminTab === 'roles' && (
            <div className="admin-content-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2>Gestion des Rôles & Accès</h2>
                <button type="button" className="btn btn-primary" onClick={() => setAddUserModalOpen(true)}>
                  <i className="fa-solid fa-user-plus" /> Ajouter un Membre
                </button>
              </div>

              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Téléphone</th>
                      <th>Rôle Actuel</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td>{u.phone}</td>
                        <td>
                          <span className={`role-badge role-${u.role}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <select
                            value={u.role}
                            onChange={e => {
                              const newRole = e.target.value;
                              setUsersList(prev => prev.map(item => item.id === u.id ? { ...item, role: newRole } : item));
                              showToast(`Rôle mis à jour pour ${u.name}`);
                            }}
                            className="status-select"
                            disabled={u.email === 'admin@byafrica.com'}
                          >
                            <option value="admin">Administrateur</option>
                            <option value="gestionnaire">Gestionnaire</option>
                            <option value="livreur">Livreur</option>
                            <option value="client">Client</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6 : PARAMÈTRES & SUPABASE */}
          {adminTab === 'config' && (
            <div className="admin-content-section">
              <div className="config-box" style={{ border: '1px solid rgba(212,175,55,0.4)', borderRadius: 12, padding: '1.5rem', background: '#121214' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 style={{ color: '#d4af37', margin: 0 }}>
                    <i className="fa-solid fa-database" style={{ marginRight: 8 }} />
                    Connexion Supabase Cloud
                  </h3>
                  <span className={`badge-status ${supabaseStatus.connected ? 'status-green' : 'status-gold'}`}>
                    {supabaseStatus.connected ? '● Connecté en direct à Supabase' : '● Mode Local Actif'}
                  </span>
                </div>
                <p style="font-size:0.9rem; color:#aaa; margin-bottom:1rem;">
                  Votre application Next.js interroge directement la base de données <strong>PostgreSQL Supabase</strong> sans passer par un serveur intermédiaire.
                </p>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">SUPABASE URL</label>
                  <input type="text" readOnly className="form-input" value="https://vgaifljtaocvnifiyrsg.supabase.co" />
                </div>
                <div className="form-group">
                  <label className="form-label">SUPABASE KEY</label>
                  <input type="text" readOnly className="form-input" value="sb_publishable_7oHChmVbT7XB7A4FxJNWOA_69FN41xh" />
                </div>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           VUE 2 : BOUTIQUE CLIENT PUBLIQUE
           ═══════════════════════════════════════════════════════════════ */
        <main className="client-main">
          {/* ── SECTION HERO ── */}
          {activePage === 'accueil' && (
            <section className="hero-section">
              <div className="hero-banner-wrap">
                <img src="/hero-3d.jpg" alt="Collection BY_AFRIKA" className="hero-banner-image" />
                <div className="hero-overlay-content">
                  <h2 className="hero-tagline">PORTEZ VOS ORIGINES AVEC CONFIANCE</h2>
                  <h1 className="hero-main-title">BY_AFRIKA</h1>
                  <p className="hero-description">
                    L'expression suprême de la mode et du streetwear africain contemporain. Élégance intemporelle, matières nobles et créations de prestige.
                  </p>
                  <div className="hero-cta-group">
                    <button
                      type="button"
                      className="btn-hero-homme"
                      onClick={() => { setActivePage('boutique'); setGenderFilter('homme'); }}
                    >
                      COLLECTION HOMME →
                    </button>
                    <button
                      type="button"
                      className="btn-hero-femme"
                      onClick={() => { setActivePage('boutique'); setGenderFilter('femme'); }}
                    >
                      COLLECTION FEMME →
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── SECTION CATALOGUE & COLLECTIONS ── */}
          {(activePage === 'accueil' || activePage === 'boutique') && (
            <section className="catalog-section" id="collections">
              <div className="section-header-center">
                <span className="section-eyebrow">NOS COLLECTIONS</span>
                <h2 className="section-title">BY AFRIKA</h2>
                <div className="title-divider-gold" />
              </div>

              {/* Filtres par Genre */}
              <div className="filter-chips-row">
                <button
                  type="button"
                  className={`chip-btn ${genderFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setGenderFilter('all')}
                >
                  Tous les modèles
                </button>
                <button
                  type="button"
                  className={`chip-btn ${genderFilter === 'homme' ? 'active' : ''}`}
                  onClick={() => setGenderFilter('homme')}
                >
                  Homme
                </button>
                <button
                  type="button"
                  className={`chip-btn ${genderFilter === 'femme' ? 'active' : ''}`}
                  onClick={() => setGenderFilter('femme')}
                >
                  Femme
                </button>
                <button
                  type="button"
                  className={`chip-btn ${genderFilter === 'unisexe' ? 'active' : ''}`}
                  onClick={() => setGenderFilter('unisexe')}
                >
                  Unisexe
                </button>
              </div>

              {/* Filtres par Catégorie */}
              <div className="category-chips-row">
                <button
                  type="button"
                  className={`cat-pill ${categoryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('all')}
                >
                  Tout
                </button>
                {(config.categories || []).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-pill ${categoryFilter.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(prev => prev.toLowerCase() === cat.toLowerCase() ? 'all' : cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grille de Produits */}
              {filteredProducts.length === 0 ? (
                <div className="empty-catalog-state">
                  <i className="fa-solid fa-shirt" style={{ fontSize: '2.5rem', color: '#666', marginBottom: 12 }} />
                  <p>Aucun produit ne correspond à ces critères.</p>
                  <button type="button" className="btn btn-outline" onClick={() => { setGenderFilter('all'); setCategoryFilter('all'); setSearchQuery(''); }}>
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="products-grid">
                  {filteredProducts.map(p => (
                    <article key={p.id} className="product-card" onClick={() => setProductModal(p)}>
                      <div className="card-image-wrap">
                        <img
                          src={p.image.startsWith('http') ? p.image : `/${p.image}`}
                          alt={p.name}
                          className="card-product-img"
                          onError={e => { e.currentTarget.src = '/tshirt-byafrika.jpg'; }}
                        />
                        {p.featured && <span className="card-badge-gold">POPULAIRE</span>}
                      </div>

                      <div className="card-content">
                        <span className="card-category">{p.category} • {p.genre}</span>
                        <h3 className="card-title">{p.name}</h3>
                        <p className="card-price">{formatPrice(p.price)}</p>

                        <div className="card-actions">
                          <button
                            type="button"
                            className="btn-card-add"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p, p.sizes?.[0] || 'M', p.colors?.[0] || 'Noir', 1);
                            }}
                          >
                            <i className="fa-solid fa-bag-shopping" /> Ajouter au panier
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── SECTION À PROPOS ── */}
          {activePage === 'a-propos' && (
            <section className="about-section">
              <div className="about-container">
                <span className="section-eyebrow">LA MAISON</span>
                <h1 className="section-title">L'Héritage BY_AFRIKA</h1>
                <div className="title-divider-gold" />
                <p className="about-text">
                  BY_AFRIKA est née d'une vision forte : donner à la jeunesse et à tous les passionnés d'élégance africaine une marque capable de rivaliser avec les plus grandes maisons de mode internationales, tout en portant haut les racines, la culture et la fierté du continent.
                </p>
                <p className="about-text">
                  Chaque pièce, du t-shirt signature aux vestes wax d'apparat, est conçue avec une rigueur absolue dans les coupes, des matières nobles et un confort d'exception.
                </p>
              </div>
            </section>
          )}

          {/* ── SECTION CONTACT ── */}
          {activePage === 'contact' && (
            <section className="contact-section">
              <div className="contact-container">
                <span className="section-eyebrow">ASSISTANCE CLIENT</span>
                <h1 className="section-title">Contact & Réclamations</h1>
                <div className="title-divider-gold" />
                <p style={{ textAlign: 'center', color: '#aaa', marginBottom: '2rem' }}>
                  Une question sur une taille, une commande en cours ou une réclamation ? Remplissez ce formulaire ou écrivez-nous directement sur WhatsApp.
                </p>

                <form onSubmit={handleContactSubmit} className="contact-form">
                  <div className="form-group">
                    <label className="form-label">Votre Nom complet *</label>
                    <input type="text" className="form-input" required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ex: Aminata Diallo" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Numéro de téléphone ou Email *</label>
                    <input type="text" className="form-input" required value={contactContact} onChange={e => setContactContact(e.target.value)} placeholder="Ex: +221 77 000 00 00 ou email@..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Motif de votre demande</label>
                    <select className="form-input" value={contactType} onChange={e => setContactType(e.target.value)}>
                      <option value="Question Produit">Question sur un Vêtement / Taille</option>
                      <option value="Suivi de Commande">Suivi d'une Commande en cours</option>
                      <option value="Réclamation Commande">Réclamation / Colis</option>
                      <option value="Autre Demande">Autre demande générale</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Votre Message *</label>
                    <textarea rows="4" className="form-input" required value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="Expliquez-nous en détail votre demande..." />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                    <i className="fa-solid fa-paper-plane" /> Envoyer mon message
                  </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <a
                    href="https://wa.me/221763177508"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ borderColor: '#25D366', color: '#25D366' }}
                  >
                    <i className="fa-brands fa-whatsapp" /> Nous contacter directement sur WhatsApp
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* ── SECTION COMPTE CLIENT ── */}
          {activePage === 'compte' && user && (
            <section className="account-section">
              <div className="account-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h1>Espace Client</h1>
                    <p style={{ color: '#888' }}>Connecté en tant que <strong>{user.name}</strong> ({user.email})</p>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={handleLogout}>
                    <i className="fa-solid fa-arrow-right-from-bracket" /> Se déconnecter
                  </button>
                </div>

                <div className="account-orders-card">
                  <h3>Historique de vos Commandes</h3>
                  {orders.length === 0 ? (
                    <p className="empty-state">Vous n'avez pas encore passé de commande.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>N° Commande</th>
                            <th>Articles</th>
                            <th>Mode</th>
                            <th>Total</th>
                            <th>Statut</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => (
                            <tr key={o.id}>
                              <td><strong>{o.id}</strong></td>
                              <td>{o.items?.length} article(s)</td>
                              <td>{o.deliveryType}</td>
                              <td><strong style={{ color: '#d4af37' }}>{formatPrice(o.total)}</strong></td>
                              <td><span className={`status-pill status-${(o.status || '').toLowerCase().replace(/ /g, '-')}`}>{o.status}</span></td>
                              <td>
                                <button type="button" className="btn btn-sm btn-outline" onClick={() => setReceiptOrder(o)}>
                                  Reçu
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {/* ── FOOTER ── */}
      <footer className="main-footer">
        <div className="footer-container">
          <div className="footer-col">
            <h3 className="footer-brand">BY_AFRIKA</h3>
            <p className="footer-desc">Portez vos origines avec confiance. La marque d'élégance et de fierté africaine.</p>
          </div>
          <div className="footer-col">
            <h4>Boutique</h4>
            <button type="button" className="footer-link" onClick={() => { setActivePage('boutique'); setGenderFilter('homme'); }}>Collection Homme</button>
            <button type="button" className="footer-link" onClick={() => { setActivePage('boutique'); setGenderFilter('femme'); }}>Collection Femme</button>
            <button type="button" className="footer-link" onClick={() => { setActivePage('boutique'); setGenderFilter('all'); }}>Nouveautés</button>
          </div>
          <div className="footer-col">
            <h4>Informations</h4>
            <button type="button" className="footer-link" onClick={() => setActivePage('a-propos')}>À Propos</button>
            <button type="button" className="footer-link" onClick={() => setActivePage('contact')}>Service Client & WhatsApp</button>
            <button type="button" className="footer-link" onClick={() => setActivePage('admin')}>Administration</button>
          </div>
          <div className="footer-col">
            <h4>Contact Direct</h4>
            <p><i className="fa-solid fa-location-dot" /> Dakar, Sénégal</p>
            <p><i className="fa-solid fa-phone" /> {config.phone || '+221 77 000 00 00'}</p>
            <p><i className="fa-solid fa-envelope" /> contact@byafrica.com</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} BY_AFRIKA. Tous droits réservés.</p>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════
          MODALS & OVERLAYS
          ═══════════════════════════════════════════════════════════════ */}

      {/* 1. TIROIR DU PANIER */}
      {cartOpen && (
        <div className="modal-backdrop" onClick={() => setCartOpen(false)}>
          <div className="cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Votre Panier ({cartTotalItems})</h3>
              <button type="button" className="btn-close-drawer" onClick={() => setCartOpen(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="drawer-body">
              {cart.length === 0 ? (
                <div className="empty-cart-view">
                  <i className="fa-solid fa-bag-shopping" style={{ fontSize: '3rem', color: '#555', marginBottom: 12 }} />
                  <p>Votre panier est vide.</p>
                  <button type="button" className="btn btn-primary" onClick={() => { setCartOpen(false); setActivePage('boutique'); }}>
                    Découvrir nos vêtements
                  </button>
                </div>
              ) : (
                <div className="cart-items-stack">
                  {cart.map((item, idx) => (
                    <div key={`${item.productId}-${item.size}-${item.color}`} className="cart-item-row">
                      <img src={item.image.startsWith('http') ? item.image : `/${item.image}`} alt={item.name} className="cart-item-img" />
                      <div className="cart-item-info">
                        <h4>{item.name}</h4>
                        <div className="cart-item-sub">Taille : {item.size} | {item.color}</div>
                        <div className="cart-item-price">{formatPrice(item.price)}</div>
                        <div className="cart-qty-stepper">
                          <button type="button" onClick={() => updateCartQty(idx, -1)}>-</button>
                          <span>{item.qty}</span>
                          <button type="button" onClick={() => updateCartQty(idx, 1)}>+</button>
                        </div>
                      </div>
                      <button type="button" className="btn-remove-item" onClick={() => removeFromCart(idx)} title="Retirer">
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="drawer-footer">
                <div className="drawer-subtotal-row">
                  <span>Sous-total :</span>
                  <strong>{formatPrice(cartSubtotal)}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                >
                  Commander Maintenant →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. MODAL DÉTAIL PRODUIT */}
      {productModal && (
        <div className="modal-backdrop" onClick={() => setProductModal(null)}>
          <div className="product-modal-card" onClick={e => e.stopPropagation()}>
            <button type="button" className="modal-close-icon" onClick={() => setProductModal(null)}>
              <i className="fa-solid fa-xmark" />
            </button>

            <div className="product-modal-grid">
              <div className="product-modal-media">
                <img src={productModal.image.startsWith('http') ? productModal.image : `/${productModal.image}`} alt={productModal.name} />
              </div>
              <div className="product-modal-details">
                <span className="modal-cat-tag">{productModal.category} • {productModal.genre}</span>
                <h2 className="modal-prod-title">{productModal.name}</h2>
                <div className="modal-prod-price">{formatPrice(productModal.price)}</div>
                <p className="modal-prod-desc">{productModal.description}</p>

                {/* Sélecteur de Taille */}
                <div className="modal-field-block">
                  <label className="field-label">Choisir votre taille :</label>
                  <div className="pills-selector">
                    {(productModal.sizes || ['S', 'M', 'L', 'XL', 'XXL']).map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`size-pill ${modalSize === s ? 'active' : ''}`}
                        onClick={() => setModalSize(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sélecteur de Couleur */}
                <div className="modal-field-block">
                  <label className="field-label">Couleur :</label>
                  <div className="pills-selector">
                    {(productModal.colors || ['Noir', 'Blanc']).map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`color-pill ${modalColor === c ? 'active' : ''}`}
                        onClick={() => setModalColor(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantité & Ajout */}
                <div className="modal-add-row">
                  <div className="qty-counter">
                    <button type="button" onClick={() => setModalQty(prev => Math.max(1, prev - 1))}>-</button>
                    <span>{modalQty}</span>
                    <button type="button" onClick={() => setModalQty(prev => prev + 1)}>+</button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-modal-add"
                    onClick={() => addToCart(productModal, modalSize, modalColor, modalQty)}
                  >
                    <i className="fa-solid fa-bag-shopping" /> Ajouter au Panier
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL DE COMMANDE (CHECKOUT) */}
      {checkoutOpen && (
        <div className="modal-backdrop" onClick={() => setCheckoutOpen(false)}>
          <div className="checkout-modal-card" onClick={e => e.stopPropagation()}>
            <button type="button" className="modal-close-icon" onClick={() => setCheckoutOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>

            <h2 className="checkout-title">Finaliser votre Commande</h2>

            <form onSubmit={handlePlaceOrder}>
              {/* Choix Mode de Réception */}
              <div className="delivery-choice-box">
                <label className={`delivery-radio-label ${checkoutDelivery === 'delivery' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="delivery"
                    checked={checkoutDelivery === 'delivery'}
                    onChange={() => setCheckoutDelivery('delivery')}
                  />
                  <div>
                    <strong>🚚 Livraison à domicile</strong>
                    <div style={{ fontSize: '0.82rem', color: '#aaa' }}>Livré directement chez vous ({formatPrice(config.deliveryFee || 2000)})</div>
                  </div>
                </label>

                <label className={`delivery-radio-label ${checkoutDelivery === 'pickup' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="pickup"
                    checked={checkoutDelivery === 'pickup'}
                    onChange={() => setCheckoutDelivery('pickup')}
                  />
                  <div>
                    <strong>🏬 Retrait en Boutique BY_AFRIKA</strong>
                    <div style={{ fontSize: '0.82rem', color: '#22c55e' }}>Dakar, Sénégal — 0 FCFA (Gratuit)</div>
                  </div>
                </label>
              </div>

              {/* Coordonnées Client */}
              <div className="form-group">
                <label className="form-label">Nom et Prénom *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: Ibrahima Ndiaye"
                  value={checkoutName}
                  onChange={e => setCheckoutName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Numéro de Téléphone (WhatsApp / Appel) *</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  placeholder="Ex: +221 77 123 45 67"
                  value={checkoutPhone}
                  onChange={e => setCheckoutPhone(e.target.value)}
                />
              </div>

              {checkoutDelivery === 'delivery' && (
                <div className="form-group">
                  <label className="form-label">Adresse de livraison complète à Dakar / Sénégal *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Quartier, rue, numéro de villa ou repère"
                    value={checkoutAddress}
                    onChange={e => setCheckoutAddress(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Instructions ou remarques de commande</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Appeler avant d'arriver..."
                  value={checkoutNotes}
                  onChange={e => setCheckoutNotes(e.target.value)}
                />
              </div>

              {/* Proposition création de compte si non connecté */}
              {!user && (
                <div className="account-prompt-card">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={checkoutCreateAccount}
                      onChange={e => setCheckoutCreateAccount(e.target.checked)}
                    />
                    <span>Créer un compte client BY_AFRIKA (Recommandé)</span>
                  </label>
                  {checkoutCreateAccount && (
                    <div style={{ marginTop: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <input
                        type="email"
                        placeholder="Votre email"
                        className="form-input"
                        value={checkoutEmail}
                        onChange={e => setCheckoutEmail(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="Créer un mot de passe"
                        className="form-input"
                        value={checkoutPassword}
                        onChange={e => setCheckoutPassword(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Récapitulatif Total */}
              <div className="checkout-summary-box">
                <div className="summary-line">
                  <span>Sous-total articles :</span>
                  <strong>{formatPrice(cartSubtotal)}</strong>
                </div>
                <div className="summary-line">
                  <span>Frais de réception :</span>
                  <strong style={{ color: checkoutDelivery === 'pickup' ? '#22c55e' : '#fff' }}>
                    {checkoutDelivery === 'pickup' ? '0 FCFA (Gratuit)' : formatPrice(deliveryFee)}
                  </strong>
                </div>
                <div className="summary-line total-line">
                  <span>Total à régler à réception :</span>
                  <span className="total-gold">{formatPrice(checkoutTotal)}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1.25rem', padding: '14px' }}>
                <i className="fa-solid fa-check" /> Valider la Commande ({checkoutDelivery === 'pickup' ? 'Paiement au Retrait' : 'Arriver Payer'})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. REÇU DE CAISSE TÉLÉCHARGEABLE */}
      {receiptOrder && (
        <div className="modal-backdrop" onClick={() => setReceiptOrder(null)}>
          <div className="receipt-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '1.8rem' }}>
                ✓
              </div>
              <h2 style={{ margin: 0, color: '#d4af37' }}>COMMANDE CONFIRMÉE !</h2>
              <p style={{ color: '#aaa', fontSize: '0.9rem' }}>N° {receiptOrder.id}</p>
            </div>

            <div className="receipt-paper">
              <div className="receipt-row"><span>Client :</span><strong>{receiptOrder.customer?.name}</strong></div>
              <div className="receipt-row"><span>Téléphone :</span><strong>{receiptOrder.customer?.phone}</strong></div>
              <div className="receipt-row"><span>Mode :</span><strong>{receiptOrder.deliveryType}</strong></div>
              <div className="receipt-row"><span>Règlement :</span><strong>{receiptOrder.paymentMethod}</strong></div>

              <hr style={{ borderColor: '#333', margin: '10px 0' }} />

              <div style={{ marginBottom: 10 }}>
                {receiptOrder.items?.map(it => (
                  <div key={`${it.productId}-${it.size}`} className="receipt-row" style={{ fontSize: '0.85rem' }}>
                    <span>{it.name} [{it.size}] x{it.qty}</span>
                    <span>{formatPrice(it.price * it.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="receipt-row total-gold" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                <span>Total :</span>
                <span>{formatPrice(receiptOrder.total)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => window.print()}>
                <i className="fa-solid fa-print" /> Imprimer
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => setReceiptOrder(null)}>
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL AUTHENTIFICATION */}
      {authModalOpen && (
        <div className="modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div className="auth-modal-card" onClick={e => e.stopPropagation()}>
            <button type="button" className="modal-close-icon" onClick={() => setAuthModalOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>

            <div className="auth-tabs-row">
              <button
                type="button"
                className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => setAuthTab('login')}
              >
                Se Connecter
              </button>
              <button
                type="button"
                className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => setAuthTab('register')}
              >
                Créer un Compte
              </button>
            </div>

            <form onSubmit={handleLogin} className="auth-form-stack">
              <div className="form-group">
                <label className="form-label">Adresse Email</label>
                <input type="email" name="email" required className="form-input" placeholder="exemple@gmail.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <input type="password" name="password" required className="form-input" placeholder="••••••••" />
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }}>
                {authTab === 'login' ? 'Se Connecter' : 'Créer mon Compte'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL AJOUT / MODIFICATION PRODUIT (ADMIN) */}
      {productFormOpen && (
        <div className="modal-backdrop" onClick={() => setProductFormOpen(false)}>
          <div className="admin-form-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="modal-close-icon" onClick={() => setProductFormOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <h2>{editingProduct ? 'Modifier le Produit' : 'Ajouter un Vêtement'}</h2>

            <form onSubmit={handleSaveProduct} className="form-grid-stack">
              <div className="form-group">
                <label className="form-label">Nom du vêtement *</label>
                <input type="text" name="name" required className="form-input" defaultValue={editingProduct?.name || ''} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Prix (FCFA) *</label>
                  <input type="number" name="price" required className="form-input" defaultValue={editingProduct?.price || 15000} />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock disponible *</label>
                  <input type="number" name="stock" required className="form-input" defaultValue={editingProduct?.stock || 20} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Genre</label>
                  <select name="genre" className="form-input" defaultValue={editingProduct?.genre || 'Unisexe'}>
                    <option value="Unisexe">Unisexe</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Catégorie</label>
                  <select name="category" className="form-input" defaultValue={editingProduct?.category || 'T-shirts'}>
                    {(config.categories || ['T-shirts', 'Chemises', 'Robes', 'Pantalons', 'Sweats']).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nom du fichier image</label>
                <input type="text" name="image" className="form-input" defaultValue={editingProduct?.image || 'tshirt-byafrika.jpg'} />
              </div>

              <div className="form-group">
                <label className="form-label">Description du produit</label>
                <textarea name="description" rows="3" className="form-input" defaultValue={editingProduct?.description || ''} />
              </div>

              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }}>
                Enregistrer dans le Catalogue
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. DÉTAIL COMMANDE ADMIN */}
      {selectedAdminOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedAdminOrder(null)}>
          <div className="admin-detail-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="modal-close-icon" onClick={() => setSelectedAdminOrder(null)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <h2>Détail de la Commande {selectedAdminOrder.id}</h2>
            <div style={{ margin: '1rem 0' }}>
              <p><strong>Client :</strong> {selectedAdminOrder.customer?.name}</p>
              <p><strong>Téléphone :</strong> {selectedAdminOrder.customer?.phone}</p>
              <p><strong>Adresse / Mode :</strong> {selectedAdminOrder.deliveryType} — {selectedAdminOrder.customer?.address}</p>
              <p><strong>Notes :</strong> {selectedAdminOrder.customer?.notes || 'Aucune'}</p>
              <p><strong>Total :</strong> <span style={{ color: '#d4af37', fontWeight: 'bold' }}>{formatPrice(selectedAdminOrder.total)}</span></p>
            </div>
            <h4>Articles commandés :</h4>
            <ul>
              {selectedAdminOrder.items?.map((it, idx) => (
                <li key={idx}>{it.name} [{it.size} - {it.color}] x{it.qty} = {formatPrice(it.price * it.qty)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 8. MODAL AJOUT UTILISATEUR RÔLES */}
      {addUserModalOpen && (
        <div className="modal-backdrop" onClick={() => setAddUserModalOpen(false)}>
          <div className="admin-detail-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="modal-close-icon" onClick={() => setAddUserModalOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <h2>Ajouter un Membre de l'Équipe</h2>
            <form onSubmit={e => {
              e.preventDefault();
              const name = e.target.name.value.trim();
              const email = e.target.email.value.trim();
              const phone = e.target.phone.value.trim();
              const role = e.target.role.value;
              setUsersList(prev => [...prev, { id: `user_${Date.now()}`, name, email, phone, role }]);
              setAddUserModalOpen(false);
              showToast('Nouveau membre ajouté avec succès !');
            }}>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Nom complet</label>
                <input type="text" name="name" required className="form-input" placeholder="Ex: Fatou Ndiaye" />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Email professionnel</label>
                <input type="email" name="email" required className="form-input" placeholder="fatou@byafrica.com" />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Téléphone</label>
                <input type="tel" name="phone" className="form-input" placeholder="+221..." />
              </div>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label className="form-label">Rôle attribué</label>
                <select name="role" className="form-input">
                  <option value="gestionnaire">Gestionnaire (Stocks & Commandes)</option>
                  <option value="livreur">Livreur (Expéditions & Encaissements)</option>
                  <option value="admin">Administrateur</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-full">Enregistrer le Membre</button>
            </form>
          </div>
        </div>
      )}

      {/* 9. BANDEAU DE COOKIES */}
      {!cookieConsent && (
        <div className="cookie-banner-wrap">
          <div className="cookie-banner-content">
            <p>
              Nous utilisons des cookies essentiels pour sécuriser votre session et vous garantir la meilleure expérience sur <strong>BY_AFRIKA</strong>.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => { setCookieConsent(true); localStorage.setItem('byafrika_cookie_consent', 'accepted'); }}
              >
                Accepter tout
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => { setCookieConsent(true); localStorage.setItem('byafrika_cookie_consent', 'essential'); }}
              >
                Essentiels
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
