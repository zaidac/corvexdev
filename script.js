/* =========================================================
   CorvexDev — script.js
   Funcionalidades:
   - Año dinámico en footer
   - Menú hamburguesa (mobile)
   - Header con efecto al hacer scroll
   - Animación de aparición al hacer scroll (IntersectionObserver)
   - Resaltar link activo según la sección visible
   - Validación básica del formulario de contacto
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 1. Año dinámico en el footer ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- 2. Elementos de la navegación ---------- */
  const header   = document.getElementById('header');
  const navList  = document.getElementById('navList');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelectorAll('.nav__link');

  /* ---------- 3. Menú hamburguesa ---------- */
  // Abre/cierra el menú mobile y actualiza aria-expanded
  function toggleMenu(forceState) {
    const willOpen = typeof forceState === 'boolean'
      ? forceState
      : !navList.classList.contains('is-open');

    navList.classList.toggle('is-open', willOpen);
    navToggle.classList.toggle('is-open', willOpen);
    navToggle.setAttribute('aria-expanded', String(willOpen));
    navToggle.setAttribute('aria-label', willOpen ? 'Cerrar menú' : 'Abrir menú');
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => toggleMenu());
  }

  // Cerrar el menú al hacer click en un link (en mobile)
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 720px)').matches) {
        toggleMenu(false);
      }
    });
  });

  /* ---------- 4. Header con fondo al hacer scroll ---------- */
  function onScroll() {
    if (window.scrollY > 20) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 5. Animaciones al hacer scroll (reveal) ---------- */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Dejamos de observarlo una vez visible (animación una sola vez)
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => io.observe(el));
  } else {
    // Fallback para navegadores sin IntersectionObserver
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- 6. Resaltar link activo según la sección visible ---------- */
  const sections = document.querySelectorAll('main section[id]');

  if ('IntersectionObserver' in window && sections.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            const isActive = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('is-active', isActive);
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(s => navObserver.observe(s));
  }

  /* ---------- 7. Validación del formulario de contacto ---------- */
  const form = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  /**
   * Valida un email con una expresión regular sencilla.
   * No es 100% infalible (RFC 5322 es enorme) pero cubre los casos comunes.
   */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Muestra u oculta el error de un campo.
   */
  function setFieldError(name, message) {
    const input = form.querySelector(`[name="${name}"]`);
    const error = form.querySelector(`[data-error="${name}"]`);
    if (!input || !error) return;

    if (message) {
      input.classList.add('is-invalid');
      error.textContent = message;
    } else {
      input.classList.remove('is-invalid');
      error.textContent = '';
    }
  }

  function validateForm(data) {
    let isValid = true;

    // Nombre: requerido, mínimo 2 caracteres
    if (!data.nombre || data.nombre.trim().length < 2) {
      setFieldError('nombre', 'Por favor ingresá tu nombre (mínimo 2 caracteres).');
      isValid = false;
    } else {
      setFieldError('nombre', '');
    }

    // Email: requerido y con formato válido
    if (!data.email) {
      setFieldError('email', 'El email es obligatorio.');
      isValid = false;
    } else if (!isValidEmail(data.email)) {
      setFieldError('email', 'El email no parece válido.');
      isValid = false;
    } else {
      setFieldError('email', '');
    }

    // Mensaje: requerido, mínimo 10 caracteres
    if (!data.mensaje || data.mensaje.trim().length < 10) {
      setFieldError('mensaje', 'Contame un poco más (mínimo 10 caracteres).');
      isValid = false;
    } else {
      setFieldError('mensaje', '');
    }

    return isValid;
  }

  if (form) {
    // Limpia el error del campo en cuanto el usuario empieza a escribir
    form.querySelectorAll('input, textarea').forEach(input => {
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) {
          setFieldError(input.name, '');
        }
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Tomamos los datos del formulario
      const data = {
        nombre: form.nombre.value,
        email:  form.email.value,
        mensaje: form.mensaje.value,
      };

      if (!validateForm(data)) {
        // Foco al primer campo con error para mejorar UX
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Sin backend real: simulamos el envío.
      // Más adelante podés conectar esto a un servicio como Formspree, Netlify Forms, etc.
      form.reset();
      if (formSuccess) {
        formSuccess.hidden = false;
        setTimeout(() => { formSuccess.hidden = true; }, 5000);
      }
    });
  }
})();
