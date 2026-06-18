/* =========================================================
   CorvexDev — config.js
   Constantes públicas de Supabase. NO son secretas: la anon
   key está pensada para vivir en el cliente y la seguridad
   real viene de las policies de RLS.

   Este archivo está en git a propósito. La anon key solo
   permite lo que las policies dejan hacer (lectura pública
   en este caso), así que subirla a un repo público no es un
   problema de seguridad.

   ⚠️  Reemplazá los placeholders con los valores reales de tu
   proyecto de Supabase (Settings → API).
   ========================================================= */

window.CORVEX_CONFIG = {
  // --- Supabase ---
  SUPABASE_URL:     'https://eblcvxjqayurrvbcaflw.supabase.co',
  SUPABASE_ANON_KEY:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibGN2eGpxYXl1cnJ2YmNhZmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTExNDksImV4cCI6MjA5NzI4NzE0OX0.4EZ9vtrajOACOGMcaWwz2IbaPWtLaBcrE2ijhOcNRkI',
  PROJECTS_TABLE:   'projects',
  STORAGE_BUCKET:   'project-images',

  // --- Email de contacto ---
  // Una sola fuente de verdad: el HTML trae <template> y script.js
  // arma los mailto: en runtime. Cambiar acá se refleja en contacto y footer.
  EMAIL_USER:       'tomas.corbo11',
  EMAIL_DOMAIN:     'gmail.com',

  // --- Formspree (formulario de contacto) ---
  // 1. Crear cuenta en https://formspree.io y registrar el form.
  // 2. Copiar el form ID (ej: "xkgjabcd") y pegarlo abajo.
  // 3. Listo: el <form> apunta acá y los envíos llegan a tu casilla.
  // 4. Opcional: configurar autorespuesta y captcha desde el panel.
  FORMSPREE_ID:     'xdavvwqa',
};