# Configurar Supabase para CorvexDev

Esta guía te lleva de cero a tener la sección `#proyectos` funcionando con datos reales y el panel `/admin.html` operativo. Tiempo estimado: 15–20 minutos.

---

## 1. Crear el proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **Start your project** (o **New project** si ya tenés cuenta).
2. **Organization**: la que tengas (o crear una nueva).
3. **Project name**: por ejemplo `corvexdev`.
4. **Database password**: una contraseña fuerte. Guardala en tu gestor de contraseñas — no la vas a usar directamente, pero si alguna vez necesitás conectarte por fuera la vas a necesitar.
5. **Region**: la más cercana a tus visitantes. Para Argentina suele ir bien `São Paulo (sa-east-1)`. Cuanto más cerca, menos latencia en el fetch desde `index.html`.
6. Click **Create new project**. Tarda 1–2 minutos en aprovisionar.

---

## 2. Crear la tabla y las policies

1. En el panel de tu proyecto, ir a **SQL Editor** (ícono de base de datos en la barra lateral).
2. Click **New query**.
3. Abrir el archivo `docs/SCHEMA.sql` de este repo, copiar **todo** el contenido y pegarlo en el editor.
4. Click **Run** (o Ctrl/Cmd + Enter).

Vas a ver mensajes de éxito para cada bloque. Si algún `drop policy` falla porque la policy no existía (es la primera vez que corrés esto), es normal y no rompe nada.

**Importante**: las policies de Storage (último bloque) requieren que el bucket `project-images` exista. Si todavía no lo creaste, vas a ver errores en ese paso. Está bien — seguí con el paso 3 y volvé a correr el SQL al final.

---

## 3. Crear el bucket de Storage

1. Ir a **Storage** en la barra lateral.
2. Click **New bucket**.
3. Configurar:
   - **Name**: `project-images` (exacto, en minúsculas y con guión).
   - **Public bucket**: **ON**. Esto es lo que hace que las imágenes sean accesibles vía URL pública sin necesidad de un token.
   - **File size limit**: `2097152` (2 MB).
   - **Allowed MIME types**: `image/png,image/jpeg,image/webp`.
4. Click **Create bucket**.

Ahora volvé al **SQL Editor** y corré de nuevo `docs/SCHEMA.sql` — esta vez todas las policies de Storage van a aplicar sin error.

---

## 4. Crear el usuario admin

1. Ir a **Authentication** → **Users** (ícono de personas en la barra lateral).
2. Click **Add user** → **Create new user**.
3. Completar:
   - **Email**: tu email real.
   - **Password**: una contraseña fuerte (es la única barrera de acceso a `/admin.html`).
   - **Auto Confirm User**: **ON**. Esto evita tener que confirmar por mail.
4. Click **Create user**.

---

## 5. Copiar las credenciales al repo

1. En el panel de Supabase, ir a **Settings** (ícono de engranaje) → **API**.
2. Copiar dos valores:
   - **Project URL**: algo como `https://abcdefgh.supabase.co`.
   - **Project API keys** → **anon public**: un string largo que empieza con `eyJhbGciOi...`.
3. Abrir `config.js` en la raíz del repo.
4. Pegar los valores:
   ```js
   window.CORVEX_CONFIG = {
     SUPABASE_URL:     'https://abcdefgh.supabase.co',
     SUPABASE_ANON_KEY:'eyJhbGciOi...tu-key-larga...',
     PROJECTS_TABLE:   'projects',
     STORAGE_BUCKET:   'project-images',
   };
   ```
5. Guardar y commit.

**Sobre la "anon key" en git**: no es un secreto. Está diseñada para vivir en el cliente. La seguridad real viene de las policies de RLS que ya configuraste: aunque alguien copie la key, solo puede hacer lo que las policies dejan (leer proyectos publicados, en este caso). Subirla a un repo público de GitHub es seguro.

---

## 6. Probar end-to-end

1. **Servir el sitio localmente** (necesario porque Supabase no acepta `file://` por CORS):
   ```bash
   python -m http.server 8000
   ```
   o
   ```bash
   npx serve .
   ```

2. Abrir `http://localhost:8000/`:
   - La sección `#proyectos` debería mostrar 3 esqueletos durante un instante y luego quedar en estado vacío (todavía no cargaste nada).
   - Si ves el error "No pudimos cargar los proyectos", revisá la consola del navegador: probablemente `config.js` tiene valores placeholder o `SUPABASE_URL`/`ANON_KEY` están mal copiados.

3. Abrir `http://localhost:8000/admin.html`:
   - Loguearte con el email y contraseña del paso 4.
   - Click **+ Nuevo proyecto**.
   - Completar título, descripción, link, tags, elegir una imagen.
   - Click **Guardar**.
   - El proyecto debería aparecer en la lista de admin.

4. Volver a `http://localhost:8000/#proyectos` y verificar que la tarjeta ya aparece con su imagen.

---

## 7. Deploy

Hacer commit y push. GitHub Pages va a servir los archivos estáticos tal cual. La sección `#proyectos` se va a hidratar sola desde Supabase en cada visita.

La URL del admin va a ser `https://zaidac.github.io/corvexdev/admin.html` (o el dominio que uses). **No la linkees desde el sitio público** — es solo para tu uso.

---

## Estructura final del bucket

Las imágenes se guardan con prefijo `projects/` y un UUID como nombre:

```
project-images/
└── projects/
    ├── 3f2a1c8e-9b4d-...png
    ├── 7e9d0a51-...webp
    └── ...
```

---

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| `Error: new row violates row-level security policy` al guardar | Las policies de Storage no se crearon. Correr de nuevo `SCHEMA.sql` después de crear el bucket. |
| El sitio muestra el error "No pudimos cargar los proyectos" | `config.js` con placeholders, o la URL/anon key están mal. Revisar la consola. |
| Login dice "Email o contraseña incorrectos" | Usuario no creado, o Auto Confirm no estaba en ON. |
| La imagen subida no se ve | El bucket no es público. Marcar **Public bucket = ON** en Storage. |
| El sitio público muestra proyectos "no publicados" | La policy `projects_public_read` no se creó. Revisar SQL Editor. |

Si nada de esto resuelve, revisar la consola del navegador (F12 → Console) — los errores de Supabase suelen ser explícitos.