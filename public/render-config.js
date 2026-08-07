/**
 * Aplica window.SITE_CONFIG (definido en config.js) a la página.
 * No hace falta editar este archivo — solo config.js.
 */
(function () {
  const cfg = window.SITE_CONFIG;
  if (!cfg) {
    console.error('No se encontró window.SITE_CONFIG. Revisa que config.js se cargue antes que este archivo.');
    return;
  }

  // 1. Colores como variables CSS
  const root = document.documentElement;
  const c = cfg.colors || {};
  if (c.bgDark) root.style.setProperty('--bg-dark', c.bgDark);
  if (c.bgCard) root.style.setProperty('--bg-card', c.bgCard);
  if (c.bgInput) root.style.setProperty('--bg-input', c.bgInput);
  if (c.goldPrimary) root.style.setProperty('--gold-primary', c.goldPrimary);
  if (c.goldHover) root.style.setProperty('--gold-hover', c.goldHover);
  if (c.textMain) root.style.setProperty('--text-main', c.textMain);
  if (c.textMuted) root.style.setProperty('--text-muted', c.textMuted);

  // 1b. Tipografía: carga la fuente de Google Fonts que definas y la aplica
  if (cfg.fonts) {
    const fontLink = document.getElementById('google-fonts-link');
    if (fontLink && cfg.fonts.googleFontsUrl) {
      fontLink.href = cfg.fonts.googleFontsUrl;
    }
    if (cfg.fonts.heading) root.style.setProperty('--font-heading', cfg.fonts.heading);
    if (cfg.fonts.body) root.style.setProperty('--font-body', cfg.fonts.body);
    if (cfg.fonts.headingLetterSpacing !== undefined) {
      root.style.setProperty('--heading-letter-spacing', cfg.fonts.headingLetterSpacing);
    }
  }

  // 1c. Estilo visual: bordes redondeados o rectos, con o sin sombra
  if (cfg.style) {
    if (cfg.style.borderRadius !== undefined) root.style.setProperty('--radius', cfg.style.borderRadius);
    if (cfg.style.cardShadow) {
      root.style.setProperty('--card-shadow', '0 8px 24px rgba(0,0,0,0.35)');
    } else {
      root.style.setProperty('--card-shadow', 'none');
    }
  }

  // 2. Título de la pestaña del navegador
  if (cfg.businessName) {
    document.title = `${cfg.businessName} | Citas & Barbería Tradicional`;
    const footerName = document.getElementById('footer-business-name');
    if (footerName) {
      footerName.textContent = `© ${new Date().getFullYear()} ${cfg.businessName}. Todos los derechos reservados.`;
    }
  }

  // 2b. Favicon (ícono de la pestaña)
  if (cfg.faviconUrl) {
    let iconLink = document.querySelector('link[rel="icon"]');
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = cfg.faviconUrl;
  }

  // 2c. Imagen de fondo del hero (portada)
  const heroSection = document.querySelector('.hero');
  if (heroSection && cfg.heroImageUrl) {
    heroSection.style.backgroundImage = `url('${cfg.heroImageUrl}')`;
  }

  // 3. Logo (navbar)
  const logoEl = document.getElementById('site-logo');
  if (logoEl) {
    if (cfg.logoImageUrl) {
      logoEl.innerHTML = `<img src="${cfg.logoImageUrl}" alt="${cfg.businessName}" style="height: 36px; display:block;">`;
    } else {
      logoEl.textContent = cfg.logoText || cfg.businessName || 'BARBERÍA';
    }
  }

  // 4. Texto del Hero
  const heroEstablished = document.getElementById('hero-established');
  const heroTitle = document.getElementById('hero-title');
  const heroDescription = document.getElementById('hero-description');
  if (heroEstablished && cfg.establishedText) heroEstablished.textContent = cfg.establishedText;
  if (heroTitle && cfg.heroTitle) heroTitle.textContent = cfg.heroTitle;
  if (heroDescription && cfg.heroDescription) heroDescription.textContent = cfg.heroDescription;

  // 5. Servicios (grid visual + opciones del formulario)
  const servicesGrid = document.getElementById('services-grid');
  const serviceSelect = document.getElementById('service');
  if (Array.isArray(cfg.services)) {
    if (servicesGrid) {
      servicesGrid.innerHTML = cfg.services.map(s => `
        <div class="service-card">
          <div class="service-img" style="background-image: url('${s.image}');"></div>
          <div class="service-info">
            <h3>${s.name}</h3>
            <p>${s.description || ''}</p>
            <span class="service-price">$${Number(s.price).toFixed(2)}</span>
          </div>
        </div>
      `).join('');
    }
    if (serviceSelect) {
      serviceSelect.innerHTML = cfg.services.map(s =>
        `<option value="${s.id}">${s.name} ($${Number(s.price).toFixed(2)})</option>`
      ).join('');
    }
  }

  // 6. Barberos (grid visual + opciones del formulario)
  const teamGrid = document.getElementById('team-grid');
  const barberSelect = document.getElementById('barber');
  if (Array.isArray(cfg.barbers)) {
    if (teamGrid) {
      teamGrid.innerHTML = cfg.barbers.map(b => `
        <div class="barber-card" data-barber="${b.name}">
          <div class="barber-img" style="background-image: url('${b.image}');"></div>
          <div class="barber-details">
            <h3>${b.name}</h3>
            <span class="barber-role">${b.role || ''}</span>
          </div>
        </div>
      `).join('');
    }
    if (barberSelect) {
      const opcionCualquiera = '<option value="Cualquiera">Cualquier Maestro Disponible</option>';
      barberSelect.innerHTML = opcionCualquiera + cfg.barbers.map(b =>
        `<option value="${b.name}">${b.name}${b.role ? ' (' + b.role.split('/')[0].trim() + ')' : ''}</option>`
      ).join('');
    }
  }
})();
