# Team Vivas Academy — inicio local

El proyecto conserva React, TypeScript, Vite y Vinext. En este equipo Supabase y .env ya están configurados y se verificó la consulta real del catálogo. Para continuar, ejecuta `npm run dev`; el administrador ya está habilitado y se verificó una sesión del panel. Los siguientes pasos completos se aplican a una instalación nueva: no sobrescribas el .env existente ni reejecutes la migración inicial.

1. Instala Node.js 24 LTS y abre esta carpeta en tu editor.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env`.
4. Sigue la sección **Configurar Supabase** de README.md: migración, datos iniciales y administrador.
5. Configura URL y clave publicable; no uses claves privadas.
6. Ejecuta `npm run dev` y abre la URL que imprima Vite.
7. Entra a `/admin`, completa las variantes y publica los productos.

Sin Supabase configurado, las páginas institucionales siguen disponibles y las vistas comerciales muestran un aviso de conexión.

Comandos de comprobación: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:components`, `npm run build` y `npm run test:production`. El build principal prepara Vercel; consulta DEPLOYMENT.md antes de publicar. El desarrollo sigue usando localhost:5173.

Lee README.md para operaciones del panel, DATABASE.md para el esquema e IMPLEMENTATION_REPORT.md para el estado y las comprobaciones pendientes.
