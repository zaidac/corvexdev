/* =========================================================
   CorvexDev — script.js
   Funcionalidades:
   - Año dinámico en footer (con fallback estático en HTML)
   - Menú hamburguesa (mobile) con teclado accesible
   - Header con efecto al hacer scroll
   - Animación de aparición al hacer scroll (IntersectionObserver)
   - Resaltar link activo según la sección visible (con aria-current)
   - Validación del formulario de contacto + honeypot + setTimeout race fix
   - Ensamblaje de email ofuscado (data-user + data-domain) para evitar harvest
   ========================================================= */

(function () {
  'use strict';

  /* Cada bloque está envuelto en try/catch para que un error en uno
     (por ejemplo, un selector que cambió) no tumbe los siguientes
     y deje al usuario sin menú, sin scroll-reveal, sin mailto, etc. */
  function safeRun(name, fn) {
    try { fn(); } catch (err) { console.warn('[CorvexDev] bloque "' + name + '" falló:', err); }
  }

  /* ---------- 1. Año dinámico en el footer ---------- */
  safeRun('year', () => {
    const yearEl = document.getElementById('year');
    if (yearEl) {
      const currentYear = new Date().getFullYear();
      if (yearEl.textContent !== String(currentYear)) {
        yearEl.textContent = currentYear;
      }
    }
  });

  /* ---------- 2. Elementos de la navegación ---------- */
  const header    = document.getElementById('header');
  const navList   = document.getElementById('navList');
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.querySelectorAll('.nav__link');
  const MOBILE_BP = 720;

  /* ---------- 3. Menú hamburguesa ---------- */
  safeRun('menu', () => {
    let menuOpen = false;

    function isMobile() {
      return window.matchMedia(`(max-width: ${MOBILE_BP}px)`).matches;
    }

    function setMenu(open) {
      menuOpen = !!open;
      if (navList)   navList.classList.toggle('is-open', menuOpen);
      if (navToggle) navToggle.classList.toggle('is-open', menuOpen);
      if (navToggle) {
        navToggle.setAttribute('aria-expanded', String(menuOpen));
        navToggle.setAttribute('aria-label', menuOpen ? 'Cerrar menú' : 'Abrir menú');
      }

      if (menuOpen && navList) {
        const firstLink = navList.querySelector('.nav__link');
        if (firstLink) firstLink.focus();
      }
    }

    function closeMenu() { if (menuOpen) setMenu(false); }
    function toggleMenu() { setMenu(!menuOpen); }

    if (navToggle) {
      navToggle.addEventListener('click', toggleMenu);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuOpen) {
          closeMenu();
          navToggle.focus();
        }
      });

      window.addEventListener('resize', () => {
        if (!isMobile() && menuOpen) closeMenu();
      });
    }

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (isMobile()) closeMenu();
      });
    });
  });

  /* ---------- 4. Header con fondo al hacer scroll ---------- */
  safeRun('header-scroll', () => {
    if (!header) return;
    function onScroll() {
      if (window.scrollY > 20) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });

  /* ---------- 5. Animaciones al hacer scroll (reveal) ---------- */
  safeRun('reveal', () => {
    const revealEls = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      revealEls.forEach(el => io.observe(el));
    } else {
      revealEls.forEach(el => el.classList.add('is-visible'));
    }
  });

  /* ---------- 6. Resaltar link activo según la sección visible ---------- */
  safeRun('active-nav', () => {
    const sections = document.querySelectorAll('main section[id]');

    function setActiveLink(id) {
      navLinks.forEach(link => {
        const isActive = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('is-active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    if ('IntersectionObserver' in window && sections.length) {
      const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveLink(entry.target.id);
        });
      }, { rootMargin: '-30% 0px -50% 0px' });

      sections.forEach(s => navObserver.observe(s));
    }
  });

  /* ---------- 7. Validación + envío del formulario de contacto ----------
     El <form> apunta directo a Formspree. Si JS falla, el form sigue
     funcionando (POST nativo). Con JS, interceptamos para:
       - Validar antes de enviar.
       - Mostrar estado "Enviando..." en el botón.
       - Mostrar éxito / error inline sin recargar la página.
     Honeypot: si el campo oculto "website" llega con valor, lo bloqueamos
     y fingimos éxito silencioso (así el bot no se da cuenta).
  */
  safeRun('form', () => {
    const form         = document.getElementById('contactForm');
    const formStatus   = document.getElementById('formStatus');
    const submitBtn    = document.getElementById('contactSubmit');
    const counter      = document.getElementById('mensajeCounter');

    if (!form) return;

    // Si el form ID de Formspree no fue configurado, deshabilitamos el
    // submit para que nadie pierda un mensaje. Mensaje claro en consola.
    const formId = (window.CORVEX_CONFIG && window.CORVEX_CONFIG.FORMSPREE_ID) || '';
    const formspreeReady = formId && formId !== 'REEMPLAZAR_FORMSPREE_ID';

    // Reemplazamos el action del HTML con el real. Así, si JS no termina de
    // cargar, el form sigue apuntando a Formspree con el ID correcto
    // (gracias a la línea de abajo en el IIFE principal, que se ejecuta
    // apenas config.js define la config). Si JS falla por completo, el
    // form usa el action que tenga en el HTML.
    if (formspreeReady) {
      form.setAttribute('action', 'https://formspree.io/f/' + formId);
    }

    if (!formspreeReady) {
      console.warn(
        '[CorvexDev] El formulario de contacto está en modo demo.\n' +
        'Configurá FORMSPREE_ID en config.js para activarlo. Pasos:\n' +
        '  1. Crear cuenta en https://formspree.io\n' +
        '  2. Registrar el formulario y copiar el form ID\n' +
        '  3. Pegarlo en config.js → CORVEX_CONFIG.FORMSPREE_ID'
      );
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Formulario no configurado';
        submitBtn.title = 'Configurá FORMSPREE_ID en config.js';
      }
      // Seguimos dejando la validación visible aunque no se pueda enviar.
    }

    function isValidEmail(email) {
      // TLDs de al menos 2 letras. Permisivo pero no acepta "a@b.c".
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    }

    function setFieldError(name, message) {
      const input = form.querySelector(`[name="${name}"]`);
      const error = form.querySelector(`[data-error="${name}"]`);
      if (!input || !error) return;

      if (message) {
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', error.id);
        error.textContent = message;
      } else {
        input.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        error.textContent = '';
      }
    }

    function clearStatus() {
      if (!formStatus) return;
      formStatus.hidden = true;
      formStatus.className = 'form__status';
      formStatus.textContent = '';
    }

    function showStatus(type, message) {
      if (!formStatus) return;
      formStatus.hidden = false;
      formStatus.className = 'form__status form__status--' + type;
      formStatus.textContent = message;
    }

    function validateForm(data) {
      let isValid = true;

      if (!data.nombre || data.nombre.trim().length < 2) {
        setFieldError('nombre', 'Por favor ingresá tu nombre (mínimo 2 caracteres).');
        isValid = false;
      } else {
        setFieldError('nombre', '');
      }

      if (!data.email) {
        setFieldError('email', 'El email es obligatorio.');
        isValid = false;
      } else if (!isValidEmail(data.email)) {
        setFieldError('email', 'El email no parece válido.');
        isValid = false;
      } else {
        setFieldError('email', '');
      }

      if (!data.mensaje || data.mensaje.trim().length < 10) {
        setFieldError('mensaje', 'Contame un poco más (mínimo 10 caracteres).');
        isValid = false;
      } else {
        setFieldError('mensaje', '');
      }

      return isValid;
    }

    // Limpia el error del campo en cuanto el usuario vuelve a escribir.
    form.querySelectorAll('input, textarea').forEach(input => {
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) {
          setFieldError(input.name, '');
        }
      });
    });

    // Contador de caracteres del mensaje (opcional, decorativo).
    if (counter) {
      const mensaje = form.querySelector('[name="mensaje"]');
      const update = () => {
        const max = mensaje.maxLength || 2000;
        counter.textContent = mensaje.value.length + ' / ' + max;
      };
      mensaje.addEventListener('input', update);
      update();
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Honeypot: bots lo completan, humanos no. Simulamos éxito y no
      // mandamos nada, así el bot no aprende que fue detectado.
      const honeypot = form.querySelector('[name="website"]');
      if (honeypot && honeypot.value) {
        form.reset();
        showStatus('success', 'Mensaje recibido. Te responderé a la brevedad.');
        return;
      }

      clearStatus();

      const data = {
        nombre:  form.nombre.value,
        email:   form.email.value,
        mensaje: form.mensaje.value,
      };

      if (!validateForm(data)) {
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Si el form no está configurado, no intentamos mandar.
      if (!formspreeReady) {
        showStatus('error',
          'El formulario no está configurado todavía. Escribime directo a ' +
          (window.CORVEX_CONFIG && window.CORVEX_CONFIG.EMAIL_USER
            ? window.CORVEX_CONFIG.EMAIL_USER + '@' + window.CORVEX_CONFIG.EMAIL_DOMAIN
            : 'mi email') + '.'
        );
        return;
      }

      // Loading state.
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.dataset.originalText || submitBtn.textContent;
        submitBtn.textContent = 'Enviando…';
      }

      // Formspree acepta application/x-www-form-urlencoded. Usamos FormData.
      const payload = new FormData(form);

      fetch('https://formspree.io/f/' + formId, {
        method: 'POST',
        body: payload,
        headers: { 'Accept': 'application/json' },
      })
        .then((response) => {
          if (response.ok) {
            form.reset();
            if (counter) {
              const mensaje = form.querySelector('[name="mensaje"]');
              const max = mensaje.maxLength || 2000;
              counter.textContent = '0 / ' + max;
            }
            showStatus('success', 'Mensaje recibido. Te responderé a la brevedad.');
          } else {
            // Formspree devuelve 4xx con JSON { errors: [...] } cuando falla
            // la validación del lado del servidor.
            return response.json().then((body) => {
              const msg = (body && body.errors && body.errors.length)
                ? body.errors.map(e => e.message).join('. ')
                : 'No se pudo enviar el mensaje. Probá de nuevo en unos minutos.';
              showStatus('error', msg);
            }).catch(() => {
              showStatus('error', 'No se pudo enviar el mensaje. Probá de nuevo en unos minutos.');
            });
          }
        })
        .catch(() => {
          showStatus('error',
            'Sin conexión con el servidor. Revisá tu internet y volvé a intentar.'
          );
        })
        .finally(() => {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText || 'Enviar mensaje';
          }
        });
    });
  });

  /* ---------- 8. Email renderizado desde config.js ----------
     El HTML trae <a class="email-link" data-email-slot="contact|footer">
     con texto placeholder ("cargando…"). Este bloque lo reemplaza por
     el mailto: real usando window.CORVEX_CONFIG.EMAIL_USER + EMAIL_DOMAIN.
     Centralizado: cambiar el email es solo editar config.js.
  */
  safeRun('email', () => {
    const cfg = window.CORVEX_CONFIG || {};
    const user = cfg.EMAIL_USER;
    const domain = cfg.EMAIL_DOMAIN;
    if (!user || !domain) return;

    const address = user + '@' + domain;

    document.querySelectorAll('.email-link[data-email-slot]').forEach((link) => {
      link.setAttribute('href', 'mailto:' + address);

      // En la sección de contacto mostramos la dirección entera.
      // En el footer queda como "Email" (lo que ya tiene el HTML).
      if (link.dataset.emailSlot === 'contact') {
        link.textContent = address;
      }
    });
  });
})();