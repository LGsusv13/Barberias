/**
 * ============================================================================
 * CONFIGURACIÓN DEL NEGOCIO — edita SOLO este archivo para cambiar de cliente
 * ============================================================================
 */
window.SITE_CONFIG = {

  // ---------------------------------------------------------------------
  // IDENTIDAD DEL NEGOCIO
  // ---------------------------------------------------------------------
  businessName: "Urban Cuts Studio",

  logoText: "URBAN CUTS",
  logoImageUrl: "",

  establishedText: "BARBERÍA URBANA MODERNA",
  heroTitle: "ESTILO CON ACTITUD, CORTE CON PRECISIÓN",
  heroDescription: "Un espacio moderno donde el estilo urbano se encuentra con la técnica de barbería de precisión.",

  heroImageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1600",

  faviconUrl: "",

  // ---------------------------------------------------------------------
  // TIPOGRAFÍA — Oswald (títulos, condensada y moderna) + Inter (texto),
  // en vez de Cinzel + Montserrat (vintage clásico del original)
  // ---------------------------------------------------------------------
  fonts: {
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@300;400;500;600;700&display=swap",
    heading: "'Oswald', sans-serif",
    body: "'Inter', sans-serif",
    headingLetterSpacing: "0.5px",
  },

  // ---------------------------------------------------------------------
  // ESTILO VISUAL — tarjetas y botones con esquinas redondeadas y sombra,
  // en vez de las esquinas rectas y planas del estilo vintage original
  // ---------------------------------------------------------------------
  style: {
    borderRadius: "14px",
    cardShadow: true,
  },

  // ---------------------------------------------------------------------
  // COLORES — paleta azul marino + cobre (contraste total con el dorado/negro original)
  // ---------------------------------------------------------------------
  colors: {
    bgDark: "#0f1b2b",       // Azul marino muy oscuro (fondo general)
    bgCard: "#16263b",       // Azul marino un poco más claro (tarjetas)
    bgInput: "#1c2f47",      // Fondo de inputs del formulario
    goldPrimary: "#c2703d",  // Cobre/naranja quemado (color principal)
    goldHover: "#e08a52",    // Cobre más claro al pasar el mouse
    textMain: "#f2f2f2",     // Texto principal
    textMuted: "#8fa3b8",    // Texto secundario azul grisáceo
  },

  // ---------------------------------------------------------------------
  // SERVICIOS
  // ---------------------------------------------------------------------
  services: [
    {
      id: "Fade Urbano",
      name: "Fade Urbano & Diseño",
      description: "Degradado de precisión con diseño personalizado a navaja y acabado con línea definida.",
      price: 18,
      image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=600",
    },
    {
      id: "Barba Express",
      name: "Barba Express",
      description: "Perfilado rápido con máquina y navaja, toalla caliente y aceite hidratante.",
      price: 12,
      image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=600",
    },
    {
      id: "Combo Full Style",
      name: "Combo Full Style",
      description: "Corte + barba + lavado + diseño de cejas + mascarilla facial. La experiencia completa.",
      price: 28,
      image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600",
    },
  ],

  // ---------------------------------------------------------------------
  // BARBEROS
  // ---------------------------------------------------------------------
  barbers: [
    {
      name: "Andrés Vega",
      role: "Especialista en Fades & Diseños",
      image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=600",
    },
    {
      name: "Kevin Torres",
      role: "Barbero Senior / Estilo Urbano",
      image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600",
    },
  ],
};
