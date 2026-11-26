export const DEFAULT_CONFIG = {
  siteName: "BY_AFRIKA",
  slogan: "Portez vos origines avec confiance",
  description: "BY_AFRIKA est une maison de prêt-à-porter célébrant la fierté, l'élégance et l'héritage africain à travers des créations haut de gamme.",
  phone: "+221 76 317 75 08",
  email: "contact@byafrica.com",
  address: "Dakar, Sénégal",
  whatsapp: "+221 76 317 75 08",
  facebook: "https://facebook.com/byafrika",
  instagram: "https://www.instagram.com/baye_adama_dioume/",
  tiktok: "https://tiktok.com/@byafrika",
  deliveryFee: 2000,
  categories: [
    "T-shirts",
    "Chemises",
    "Pantalons",
    "Robes",
    "Jupes",
    "Vestes",
    "Sweats",
    "Accessoires"
  ]
};

export const DEFAULT_PRODUCTS = [
  {
    id: "prod_1",
    name: "T-Shirt BY_AFRIKA Classic",
    description: "T-shirt premium en coton noir orné du logo BY_AFRIKA signature. Confort exceptionnel et coupe moderne pour affirmer vos origines au quotidien.",
    price: 5000,
    genre: "Unisexe",
    category: "T-shirts",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Noir", "Blanc"],
    stock: 15,
    image: "tshirt-byafrika.jpg",
    featured: true,
    createdAt: "2026-11-21T01:00:00.000Z"
  },
  {
    id: "prod_2",
    name: "Chemise Wax Prestige Homme",
    description: "Chemise raffinée confectionnée à partir d'un wax sélectionné de haute qualité. Motifs géométriques exclusifs, col structuré et finitions faites main.",
    price: 25000,
    genre: "Homme",
    category: "Chemises",
    sizes: ["M", "L", "XL"],
    colors: ["Doré & Noir", "Bleu Indigo"],
    stock: 25,
    image: "hero-3d.jpg",
    featured: true,
    createdAt: "2026-11-21T01:05:00.000Z"
  },
  {
    id: "prod_3",
    name: "Robe Majestueuse Femme Kente",
    description: "Robe longue fluide inspirée des motifs traditionnels royaux. Silhouette élégante parfaite pour vos soirées, célébrations et sorties habillées.",
    price: 35000,
    genre: "Femme",
    category: "Robes",
    sizes: ["S", "M", "L"],
    colors: ["Ocre & Or", "Émeraude"],
    stock: 18,
    image: "hero-3d-white.jpg",
    featured: true,
    createdAt: "2026-11-21T01:10:00.000Z"
  },
  {
    id: "prod_4",
    name: "Hoodie Streetwear Afro Luxe",
    description: "Sweat à capuche oversize ultra-doux avec broderie discrète BY_AFRIKA. L'alliance parfaite entre le confort urbain et l'authenticité africaine.",
    price: 22000,
    genre: "Unisexe",
    category: "Sweats",
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Noir Carbone", "Blanc Neige"],
    stock: 30,
    image: "hero-banner.jpg",
    featured: false,
    createdAt: "2026-11-21T01:15:00.000Z"
  },
  {
    id: "prod_5",
    name: "Pantalon Chino Éco-Africain",
    description: "Pantalon ajusté en toile de coton respirante avec subtil liseré wax sur la poche arrière. Confortable et polyvalent pour un style décontracté chic.",
    price: 20000,
    genre: "Homme",
    category: "Pantalons",
    sizes: ["38", "40", "42", "44"],
    colors: ["Beige Safari", "Noir"],
    stock: 20,
    image: "hero-3d.jpg",
    featured: false,
    createdAt: "2026-11-21T01:20:00.000Z"
  },
  {
    id: "prod_6",
    name: "Ensemble Jupe & Top Glamour",
    description: "Ensemble deux pièces moderne et affirmé. Coupe ajustée valorisant la silhouette, motifs modernes aux teintes chaudes africaines.",
    price: 28000,
    genre: "Femme",
    category: "Jupes",
    sizes: ["S", "M", "L"],
    colors: ["Terracotta", "Bleu Nuit"],
    stock: 15,
    image: "hero-3d-white.jpg",
    featured: false,
    createdAt: "2026-11-21T01:25:00.000Z"
  }
];

export const DEMO_ADMINS = [
  {
    id: "usr_founder_adama",
    name: "Adama Dioume (Fondateur)",
    email: "admin@byafrika.com",
    phone: "+221 76 317 75 08",
    role: "Fondateur",
    permissions: {
      dashboard: true,
      products: true,
      orders: true,
      messages: true,
      config: true,
      roles: true
    }
  }
];
