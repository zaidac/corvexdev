/* =========================================================
   CorvexDev — projects-public.js
   Lee los proyectos publicados desde Supabase y los pinta
   en #projectsGrid. Maneja tres estados: carga (skeleton),
   vacío (mensaje amigable), error (mensaje de error).

   No comparte estado con script.js: cada archivo es
   independiente para que un fallo del fetch no tumbe el
   menú, el scroll-reveal, ni el form de contacto.

   También monta su propio IntersectionObserver para animar
   las tarjetas que se renderizan dinámicamente, así no se
   acopla al observer de script.js.
   ========================================================= */

(function () {
  'use strict';

  function safeRun(name, fn) {
    try { fn(); } catch (err) { console.warn('[CorvexDev] ' + name + ':', err); }
  }

  /* ---------- Render de proyectos desde Supabase ---------- */
  safeRun('projects', async () => {
    const grid    = document.getElementById('projectsGrid');
    const empty   = document.getElementById('projectsEmpty');
    const errorEl = document.getElementById('projectsError');
    if (!grid) return;

    // Si el cliente de Supabase no se inicializó (config.js sin pegar),
    // mostramos error y salimos sin romper nada más.
    if (!window.supabaseClient || !window.CORVEX_CONFIG) {
      grid.hidden = true;
      if (errorEl) errorEl.hidden = false;
      return;
    }

    const cfg = window.CORVEX_CONFIG;

    let result;
    try {
      result = await window.supabaseClient
        .from(cfg.PROJECTS_TABLE)
        .select('id, title, description, link, image_url, tags')
        .eq('is_published', true)
        .order('display_order', { ascending: true })
        .order('created_at',   { ascending: false });
    } catch (err) {
      console.error('[CorvexDev] fetch projects:', err);
      grid.hidden = true;
      if (errorEl) errorEl.hidden = false;
      return;
    }

    const { data, error } = result || {};
    if (error) {
      console.error('[CorvexDev] fetch projects:', error);
      grid.hidden = true;
      if (errorEl) errorEl.hidden = false;
      return;
    }

    grid.removeAttribute('aria-busy');

    if (!data || data.length === 0) {
      grid.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    data.forEach(function (p) { frag.appendChild(buildCard(p)); });
    grid.appendChild(frag);

    observeReveals(grid);
  });

  /* ---------- Construcción de una tarjeta ---------- */
  function buildCard(p) {
    const article = document.createElement('article');
    article.className = 'project-card reveal';
    article.dataset.id = p.id || '';

    const tags = Array.isArray(p.tags) ? p.tags : [];

    const tagsHtml = tags.length
      ? '<ul class="project-card__tags" aria-label="Tecnologías">' +
          tags.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') +
        '</ul>'
      : '';

    article.innerHTML =
      '<div class="project-card__media">' +
        '<img src="' + escapeAttr(p.image_url) + '"' +
             ' alt="' + escapeAttr(p.title || 'Proyecto') + '"' +
             ' loading="lazy" decoding="async" />' +
      '</div>' +
      '<div class="project-card__body">' +
        '<h3 class="project-card__title">' + escapeHtml(p.title) + '</h3>' +
        '<p class="project-card__description">' + escapeHtml(p.description) + '</p>' +
        tagsHtml +
        '<div class="project-card__actions">' +
          '<a href="' + escapeAttr(p.link) + '" class="btn btn--primary"' +
             ' target="_blank" rel="noopener noreferrer">Ver proyecto</a>' +
        '</div>' +
      '</div>';

    return article;
  }

  /* ---------- Reveal-on-scroll local (para tarjetas dinámicas) ---------- */
  function observeReveals(scope) {
    const els = scope.querySelectorAll('.reveal');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Helpers de escape ---------- */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }
})();