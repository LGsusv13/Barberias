/**
 * ============================================================================
 * CONFIGURACIÓN DEL NEGOCIO — edita SOLO este archivo para cambiar de cliente
 * ============================================================================
 * Cambia nombre, colores, logo, servicios y barberos aquí. No hace falta
 * tocar el HTML, CSS ni el resto del JavaScript — todo se genera automático
 * a partir de lo que pongas en este archivo.
 */
window.SITE_CONFIG = {

  // ---------------------------------------------------------------------
  // IDENTIDAD DEL NEGOCIO
  // ---------------------------------------------------------------------
  businessName: "Barbería Elite",

  // Si dejas logoImageUrl vacío (""), se muestra el texto de logoText.
  // Si pones una URL de imagen, se muestra esa imagen en su lugar.
  logoText: "BARBERÍA ELITE",
  logoImageUrl: "",

  establishedText: "ESTABLECIDO EN 2024",
  heroTitle: "EL ARTE DEL AFEITADO Y CORTE TRADICIONAL",
  heroDescription: "Un espacio exclusivo diseñado para el hombre moderno con el carácter y la distinción de la barbería clásica.",

  // Imagen de fondo de la portada (hero). Usa una URL de imagen ancha,
  // idealmente de al menos 1600px de ancho para que se vea nítida.
  heroImageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1600",

  // Ícono que aparece en la pestaña del navegador (favicon). Usa una imagen
  // cuadrada (ej. 512x512px), formato .png o .ico. Déjalo vacío ("") para
  // usar el ícono por defecto del navegador.
  faviconUrl: "",

  // ---------------------------------------------------------------------
  // TIPOGRAFÍA — Cinzel (títulos elegantes/vintage) + Montserrat (texto)
  // ---------------------------------------------------------------------
  fonts: {
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Montserrat:wght@300;400;500;600;700&display=swap",
    heading: "'Cinzel', serif",
    body: "'Montserrat', sans-serif",
    headingLetterSpacing: "1px",
  },

  // ---------------------------------------------------------------------
  // ESTILO VISUAL — esquinas rectas y planas (look vintage/clásico)
  // ---------------------------------------------------------------------
  style: {
    borderRadius: "0px",
    cardShadow: false,
  },

  // ---------------------------------------------------------------------
  // COLORES (se aplican automáticamente a todo el sitio)
  // ---------------------------------------------------------------------
  colors: {
    bgDark: "#0a0a0a",       // Fondo general
    bgCard: "#141414",       // Fondo de tarjetas
    bgInput: "#1c1c1c",      // Fondo de inputs del formulario
    goldPrimary: "#c5a059",  // Color principal (antes "dorado")
    goldHover: "#e5c178",    // Color principal al pasar el mouse
    textMain: "#f5f5f5",     // Texto principal
    textMuted: "#9e9e9e",    // Texto secundario/gris
  },

  // ---------------------------------------------------------------------
  // SERVICIOS — agrega, quita o edita los que quieras
  // ---------------------------------------------------------------------
  services: [
    {
      id: "Corte de Cabello",
      name: "Corte Clásico & Peinado",
      description: "Corte personalizado con asesoría de imagen, lavado revitalizante y peinado con pomada tradicional.",
      price: 20,
      image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=600",
    },
    {
      id: "Corte y Barba",
      name: "Ritual de Barba Tradicional",
      description: "Perfilado con navaja, tratamiento con toalla caliente, aceites esenciales y bálsamo hidratante.",
      price: 15,
      image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=600",
    },
    {
      id: "Experiencia Elite",
      name: "Experiencia Elite",
      description: "Servicio completo de corte, barba, exfoliación facial y bebida de cortesía a elección.",
      price: 30,
      image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=600",
    },
  ],

  // ---------------------------------------------------------------------
  // BARBEROS — agrega, quita o edita los que quieras
  // ---------------------------------------------------------------------
  barbers: [
    {
      name: "Carlos Silva",
      role: "Master Barber / Especialista en Cortes Clásicos",
      image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=600",
    },
    {
      name: "Mateo Rossi",
      role: "Especialista en Barba & Ritual a Navaja",
      image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=600",
    },
  ],
};
