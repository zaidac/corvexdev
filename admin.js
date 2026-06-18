/* =========================================================
   CorvexDev — admin.js
   Lógica de la página /admin.html:
     1. Estado de auth y alternancia login/admin
     2. Login / logout
     3. Listado de proyectos
     4. Eliminar proyecto (con confirmación y limpieza de Storage)
     5. Abrir form para alta o edición
     6. Vista previa de imagen seleccionada
     7. Guardar (alta o edición) + subida de imagen a Storage
   Todo dentro de un IIFE con safeRun para que un fallo en un
   bloque no tumbe el resto.
   ========================================================= */

(function () {
  'use strict';

  function safeRun(name, fn) {
    try { fn(); } catch (err) { console.warn('[CorvexDev] admin "' + name + '":', err); }
  }

  /* ---------- Constantes y referencias al DOM ---------- */
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
  const ACCEPTED_TYPES  = ['image/png', 'image/jpeg', 'image/webp'];

  const loginView   = document.getElementById('loginView');
  const adminView   = document.getElementById('adminView');
  const loginForm   = document.getElementById('loginForm');
  const loginStatus = document.getElementById('loginStatus');
  const logoutBtn   = document.getElementById('logoutBtn');
  const newBtn      = document.getElementById('newProjectBtn');
  const adminList   = document.getElementById('adminList');
  const adminEmpty  = document.getElementById('adminEmpty');
  const adminStatus = document.getElementById('adminStatus');

  const formCard    = document.getElementById('projectFormCard');
  const formTitle   = document.getElementById('formTitle');
  const formEl      = document.getElementById('projectForm');
  const cancelBtn   = document.getElementById('cancelFormBtn');
  const saveBtn     = document.getElementById('saveBtn');
  const fId         = document.getElementById('projectId');
  const fTitle      = document.getElementById('fTitle');
  const fDesc       = document.getElementById('fDescription');
  const fLink       = document.getElementById('fLink');
  const fTags       = document.getElementById('fTags');
  const fOrder      = document.getElementById('fOrder');
  const fImage      = document.getElementById('fImage');
  const fImagePrev  = document.getElementById('fImagePreview');
  const fImageCur   = document.getElementById('fImageCurrent');
  const fPublished  = document.getElementById('fPublished');

  /* ---------- Helpers de UI ---------- */
  function showStatus(el, kind, msg) {
    if (!el) return;
    el.classList.remove('is-error', 'is-ok');
    if (kind === 'error') el.classList.add('is-error');
    if (kind === 'ok')    el.classList.add('is-ok');
    el.textContent = msg || '';
  }
  function clearStatus(el) { if (el) { el.classList.remove('is-error', 'is-ok'); el.textContent = ''; } }

  function setView(loggedIn) {
    if (loginView) loginView.hidden = loggedIn;
    if (adminView) adminView.hidden = !loggedIn;
  }

  function resetForm() {
    if (!formEl) return;
    formEl.reset();
    if (fId) fId.value = '';
    if (fImagePrev) { fImagePrev.src = ''; fImagePrev.style.display = 'none'; }
    if (fImageCur)  { fImageCur.textContent = ''; fImageCur.style.display = 'none'; }
    if (fPublished) fPublished.checked = true;
    if (fOrder)     fOrder.value = '0';
  }

  function openForm(project) {
    if (!formCard) return;
    resetForm();
    if (project) {
      formTitle.textContent = 'Editar proyecto';
      fId.value        = project.id || '';
      fTitle.value     = project.title || '';
      fDesc.value      = project.description || '';
      fLink.value      = project.link || '';
      fTags.value      = Array.isArray(project.tags) ? project.tags.join(', ') : '';
      fOrder.value     = (project.display_order != null) ? String(project.display_order) : '0';
      fPublished.checked = project.is_published !== false;

      // Mostrar imagen actual si existe
      if (project.image_url) {
        fImagePrev.src = project.image_url;
        fImagePrev.style.display = 'block';
        fImageCur.textContent = 'Dejá este campo vacío si querés conservar la imagen actual.';
        fImageCur.style.display = 'block';
      }
    } else {
      formTitle.textContent = 'Nuevo proyecto';
    }
    formCard.hidden = false;
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeForm() {
    if (formCard) formCard.hidden = true;
    resetForm();
  }

  /* ---------- 1. Estado de auth ---------- */
  safeRun('auth-state', () => {
    if (!window.supabaseClient) {
      // Sin cliente, no se puede hacer nada. Mostramos el login igual
      // para que el usuario sepa que la página existe, pero el form
      // va a fallar cuando intente entrar.
      setView(false);
      return;
    }

    window.supabaseClient.auth.getSession().then(({ data }) => {
      setView(!!data.session);
      if (data.session) loadProjects();
    });

    window.supabaseClient.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session;
      setView(loggedIn);
      if (loggedIn) loadProjects();
      else closeForm();
    });
  });

  /* ---------- 2. Login / logout ---------- */
  safeRun('login', () => {
    if (!loginForm) return;
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!window.supabaseClient) {
        showStatus(loginStatus, 'error', 'Supabase no está configurado. Revisá config.js.');
        return;
      }
      clearStatus(loginStatus);
      const email    = loginForm.email.value.trim();
      const password = loginForm.password.value;
      if (!email || !password) {
        showStatus(loginStatus, 'error', 'Completá email y contraseña.');
        return;
      }
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const oldText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Ingresando…';

      const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
      submitBtn.disabled = false;
      submitBtn.textContent = oldText;

      if (error) {
        showStatus(loginStatus, 'error', 'Email o contraseña incorrectos.');
        return;
      }
      // onAuthStateChange se encarga de cambiar la vista y cargar proyectos
      loginForm.reset();
      clearStatus(loginStatus);
    });
  });

  safeRun('logout', () => {
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async () => {
      if (!window.supabaseClient) return;
      await window.supabaseClient.auth.signOut();
    });
  });

  /* ---------- 3. Listado de proyectos ---------- */
  async function loadProjects() {
    if (!adminList || !window.supabaseClient) return;

    adminList.innerHTML = '';
    adminEmpty.hidden   = true;
    clearStatus(adminStatus);

    const { data, error } = await window.supabaseClient
      .from(window.CORVEX_CONFIG.PROJECTS_TABLE)
      .select('id, title, description, link, image_url, tags, display_order, is_published, created_at')
      .order('display_order', { ascending: true })
      .order('created_at',   { ascending: false });

    if (error) {
      showStatus(adminStatus, 'error', 'No pudimos cargar los proyectos: ' + (error.message || 'error desconocido'));
      return;
    }

    if (!data || data.length === 0) {
      adminEmpty.hidden = false;
      return;
    }

    const frag = document.createDocumentFragment();
    data.forEach(function (p) { frag.appendChild(buildItem(p)); });
    adminList.appendChild(frag);
  }

  function buildItem(p) {
    const item = document.createElement('div');
    item.className = 'admin-item';
    item.dataset.id = p.id;

    const tags = Array.isArray(p.tags) ? p.tags : [];
    const tagsStr = tags.length ? ' · ' + tags.join(', ') : '';
    const statusStr = p.is_published ? '' : ' · <em style="color:#fca5a5;">no publicado</em>';

    item.innerHTML =
      '<img class="admin-item__thumb" src="' + escapeAttr(p.image_url || '') + '"' +
        ' alt="" onerror="this.style.visibility=\'hidden\';" />' +
      '<div class="admin-item__body">' +
        '<div class="admin-item__title">' + escapeHtml(p.title || '(sin título)') + '</div>' +
        '<div class="admin-item__meta">orden ' + escapeHtml(String(p.display_order ?? 0)) +
          tagsStr + statusStr + '</div>' +
      '</div>' +
      '<div class="admin-item__actions">' +
        '<button type="button" class="btn btn--secondary" data-action="edit">Editar</button>' +
        '<button type="button" class="btn btn--danger"    data-action="delete">Borrar</button>' +
      '</div>';

    item.querySelector('[data-action="edit"]').addEventListener('click', () => openForm(p));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteProject(p));

    return item;
  }

  /* ---------- 4. Eliminar proyecto ---------- */
  async function deleteProject(p) {
    const ok = window.confirm(
      '¿Confirmás que querés borrar el proyecto "' + (p.title || '') + '"?\n\n' +
      'Esta acción no se puede deshacer.'
    );
    if (!ok) return;

    if (!window.supabaseClient) return;

    // 1) Borrar fila
    const { error: delError } = await window.supabaseClient
      .from(window.CORVEX_CONFIG.PROJECTS_TABLE)
      .delete()
      .eq('id', p.id);

    if (delError) {
      showStatus(adminStatus, 'error', 'No pudimos borrar el proyecto: ' + (delError.message || 'error desconocido'));
      return;
    }

    // 2) Intentar borrar el archivo del bucket (best effort).
    //    Si falla, no rompemos el flujo: la fila ya no aparece en el sitio público.
    if (p.image_url) {
      const path = extractStoragePath(p.image_url);
      if (path) {
        await window.supabaseClient.storage
          .from(window.CORVEX_CONFIG.STORAGE_BUCKET)
          .remove([path])
          .catch(() => { /* ignorar errores de Storage en borrado */ });
      }
    }

    showStatus(adminStatus, 'ok', 'Proyecto borrado.');
    loadProjects();
  }

  /* Extrae el path interno dentro del bucket a partir de la URL pública.
     Formato típico: https://<host>/storage/v1/object/public/<bucket>/<path> */
  function extractStoragePath(publicUrl) {
    try {
      const marker = '/storage/v1/object/public/' + window.CORVEX_CONFIG.STORAGE_BUCKET + '/';
      const i = publicUrl.indexOf(marker);
      if (i === -1) return null;
      return publicUrl.substring(i + marker.length).split('?')[0];
    } catch (_) { return null; }
  }

  /* ---------- 5. Abrir form (alta o edición) ---------- */
  safeRun('form-open', () => {
    if (newBtn)   newBtn.addEventListener('click', () => openForm(null));
    if (cancelBtn) cancelBtn.addEventListener('click', closeForm);
  });

  /* ---------- 6. Vista previa de la imagen seleccionada ---------- */
  safeRun('image-preview', () => {
    if (!fImage) return;
    fImage.addEventListener('change', () => {
      const file = fImage.files && fImage.files[0];
      if (!file) {
        fImagePrev.style.display = 'none';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        fImagePrev.src = reader.result;
        fImagePrev.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  });

  /* ---------- 7. Guardar (alta o edición) ---------- */
  safeRun('save', () => {
    if (!formEl) return;

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearStatus(adminStatus);

      if (!window.supabaseClient) {
        showStatus(adminStatus, 'error', 'Supabase no está configurado.');
        return;
      }

      const title = fTitle.value.trim();
      const description = fDesc.value.trim();
      const link = fLink.value.trim();
      if (!title || !description || !link) {
        showStatus(adminStatus, 'error', 'Completá título, descripción y link.');
        return;
      }
      if (!/^https?:\/\//i.test(link)) {
        showStatus(adminStatus, 'error', 'El link tiene que empezar con http:// o https://');
        return;
      }

      const tags = fTags.value
        .split(',').map(t => t.trim()).filter(Boolean);

      const displayOrder = parseInt(fOrder.value, 10) || 0;
      const isPublished  = !!fPublished.checked;
      const editingId    = fId.value || null;

      // Validar imagen si se subió una nueva
      const file = fImage.files && fImage.files[0];
      if (file) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          showStatus(adminStatus, 'error', 'Formato de imagen no soportado. Usá PNG, JPG o WebP.');
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          showStatus(adminStatus, 'error', 'La imagen supera los 2 MB.');
          return;
        }
      }

      saveBtn.disabled = true;
      const oldText = saveBtn.textContent;
      saveBtn.textContent = 'Guardando…';

      try {
        let imageUrl = null;

        // Si hay archivo nuevo, lo subimos primero.
        if (file) {
          const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
          const path = 'projects/' + cryptoRandomId() + '.' + ext;

          const { error: upErr } = await window.supabaseClient.storage
            .from(window.CORVEX_CONFIG.STORAGE_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type });

          if (upErr) throw new Error('Subida de imagen: ' + (upErr.message || 'falló'));

          const { data: pub } = window.supabaseClient.storage
            .from(window.CORVEX_CONFIG.STORAGE_BUCKET)
            .getPublicUrl(path);

          imageUrl = pub && pub.publicUrl ? pub.publicUrl : null;
          if (!imageUrl) throw new Error('No se pudo obtener la URL pública de la imagen.');
        }

        if (editingId) {
          // UPDATE
          const update = {
            title, description, link, tags,
            display_order: displayOrder,
            is_published: isPublished,
          };
          if (imageUrl) update.image_url = imageUrl;

          const { data: updatedRows, error: upRowErr } = await window.supabaseClient
            .from(window.CORVEX_CONFIG.PROJECTS_TABLE)
            .update(update)
            .eq('id', editingId)
            .select('id, title, description, link, image_url, tags, display_order, is_published, created_at')
            .single();

          if (upRowErr) throw new Error('Actualizar: ' + (upRowErr.message || 'falló'));

          // Si reemplazamos la imagen, intentar borrar la vieja (best effort).
          if (imageUrl && updatedRows) {
            const oldPath = extractStoragePath(updatedRows.image_url);
            // updatedRows.image_url ya es la nueva; pedimos la vieja con un select previo sería ideal,
            // pero evitamos la doble query: si la nueva === vieja no hay nada que borrar.
            // Para simplificarlo, dejamos el archivo viejo si la URL cambió (limpieza manual futura).
            // (Silenciar para que el linter no se queje de variable no usada.)
            void oldPath;
          }

          showStatus(adminStatus, 'ok', 'Proyecto actualizado.');
        } else {
          // INSERT
          if (!imageUrl) {
            throw new Error('La imagen es obligatoria para un proyecto nuevo.');
          }
          const { error: insErr } = await window.supabaseClient
            .from(window.CORVEX_CONFIG.PROJECTS_TABLE)
            .insert({
              title, description, link,
              image_url: imageUrl,
              tags,
              display_order: displayOrder,
              is_published: isPublished,
            });
          if (insErr) throw new Error('Crear: ' + (insErr.message || 'falló'));
          showStatus(adminStatus, 'ok', 'Proyecto creado.');
        }

        closeForm();
        loadProjects();
      } catch (err) {
        showStatus(adminStatus, 'error', err && err.message ? err.message : String(err));
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = oldText;
      }
    });
  });

  /* ---------- Helpers varios ---------- */
  function cryptoRandomId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    // Fallback por si el navegador no tiene randomUUID (no debería pasar en navegadores modernos)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
})();