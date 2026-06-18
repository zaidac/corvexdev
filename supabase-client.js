/* =========================================================
   CorvexDev — supabase-client.js
   Inicializa el cliente de Supabase una sola vez y lo expone
   en window.supabaseClient. Lo usan tanto el sitio público
   (projects-public.js) como el admin (admin.js).

   Requisitos:
     - El SDK @supabase/supabase-js debe estar cargado antes
       (CDN, declarado en el HTML).
     - window.CORVEX_CONFIG debe estar definido (config.js).
   ========================================================= */

(function () {
  'use strict';

  function safeRun(name, fn) {
    try { fn(); } catch (err) { console.warn('[CorvexDev] ' + name + ':', err); }
  }

  safeRun('supabase-init', () => {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.error('[CorvexDev] SDK de Supabase no está cargado. ¿Falta el <script> del CDN?');
      return;
    }

    const cfg = window.CORVEX_CONFIG;
    if (!cfg || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf('http') !== 0) {
      console.error('[CorvexDev] config.js no tiene SUPABASE_URL válida.');
      return;
    }
    if (!cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.indexOf('eyJ') !== 0) {
      console.error('[CorvexDev] config.js no tiene SUPABASE_ANON_KEY válida.');
      return;
    }

    window.supabaseClient = window.supabase.createClient(
      cfg.SUPABASE_URL,
      cfg.SUPABASE_ANON_KEY
    );
  });
})();