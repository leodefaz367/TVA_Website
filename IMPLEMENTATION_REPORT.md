# Informe técnico de implementación

## Estado de la fase

Implementación local conectada a Supabase real (`rhdyhndfhqvgbudjcbip`). Migración y semilla aplicadas; consultas REST y restricciones de lectura anónima verificadas. **Pendiente validar administración, Storage y compra completa con un usuario administrativo**. No se ha publicado el sitio.

## 1. Estado original

Base visual React/TypeScript/Vite con Vinext y rutas Next.js. Seis páginas institucionales/comerciales, tres componentes compartidos y siete productos en TypeScript. Instruccionales y carrito eran botones deshabilitados. D1/Drizzle estaban presentes, sin tablas ni binding activo. Había tres errores de tipos Cloudflare, scripts incompatibles con PowerShell, metadatos ausentes, un enlace relativo incorrecto y navegación oculta en móvil.

## 2. Arquitectura resultante

Se conserva Vite/Vinext y el diseño TVA. Rutas en app; componentes por dominio; hooks para estado/carga/autenticación; services para acceso a datos; types y utils compartidos. Supabase aporta PostgreSQL, Auth y Storage. Las funciones SQL son la autoridad para órdenes, precios e inventario.

## 3. Archivos principales

- app/layout.tsx, app/commerce.css, components/Header.tsx y layouts/SiteShell.tsx.
- Rutas tienda, instruccionales, carrito, checkout y admin.
- components/catalog, components/checkout y components/admin.
- hooks/useCart.tsx, hooks/useAdmin.ts y hooks/useResource.ts.
- services/catalog.ts, publicCatalog.ts, orders.ts, admin.ts y supabase.ts.
- supabase/migrations/202609100001_commerce.sql y supabase/seed.sql.
- scripts/build.mjs, validate-artifact.mjs, generate-seed.mjs y check-supabase.mjs.
- tests, README.md, DATABASE.md y .env.example.

El archivo histórico data/products.ts y las imágenes originales se conservan. Ya no son la fuente de datos del sitio en ejecución.

## 4. Tablas

Definidas en SQL y creadas en Supabase: categories, products, product_variants, product_images, instructional_courses, instructional_modules, instructional_media, site_settings, admin_users, orders y order_items. Se verificaron once tablas con RLS, ocho productos en borrador, siete variantes, ocho imágenes asociadas y el bucket product-images.

## 5. Funcionalidades implementadas

Catálogo consultado desde Supabase; búsqueda, categorías, ordenamiento y disponibilidad. Detalle con galería, color/talla, precio variable, cantidad y carrito. Carrito persistido como borrador local y revalidado. Checkout sin cobro ficticio, órdenes persistentes mediante RPC, stock reservado y precios históricos. Administración con Supabase Auth y autorización RLS, gestión de variantes e imágenes, inventario, cursos, módulos, media privada y estados de órdenes. Horarios y dirección administrables. Estados de carga, error, vacío y agotado.

## 6. Decisiones

- No migrar a otra SPA ni duplicar el enrutamiento.
- Supabase porque reúne PostgreSQL, Auth y almacenamiento compatibles con HTTP/Workers.
- Precio e inventario por variante; sin tabla inventory 1:1 redundante.
- Productos digitales comparten el flujo de compra con productos físicos.
- Retiro físico y entrega digital manual hasta definir envíos y pagos.
- Desactivación en lugar de borrado de productos con historial.
- Datos iniciales en borrador: precios preservados, existencias y tallas por confirmar.
- Imágenes originales conservadas; cargas nuevas a Storage.

## 7. Pendientes

Supabase Auth: registro público desactivado y confirmación de correo activa. La cuenta inicial tiene correo confirmado y su asignación a admin_users se aplicó tras la autorización del propietario, con una fila insertada verificada. db:check volvió a pasar contra Supabase real. El servidor local está iniciado. Se observó una sesión administrativa válida en /admin con editor de producto, variantes e imagen cargados desde Supabase. El catálogo público consultado todavía no tiene productos publicados.

Validar carga de imágenes, escrituras CRUD y compra completa contra servicios reales. Confirmar datos comerciales. Verificar responsive del panel poblado, permisos y concurrencia multiconexión. Integrar pagos, automatizar contenido y expiración de reservas cuando se definan esas fases. El catálogo público está conectado; no muestra productos porque siguen en borrador.

## 8. Variables

VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env. No se necesita service_role en frontend. La base de datos administra el permiso mediante admin_users.

## 9. Ejecución y pruebas

npm install; configurar .env y Supabase; npm run dev. Comprobaciones: npm run typecheck, npm run lint, npm test, npm run test:components, npm run build, npm run test:rendered. npm run db:check valida la instancia configurada.

Los tests SQL utilizan el esquema comercial real en PGlite, con esquemas mínimos de la plataforma; no equivalen a probar Supabase alojado. Las pruebas del Worker verifican rutas y metadatos de la compilación de producción.

Resultados comprobados el 10 de septiembre de 2026:

- Instalación final: correcta. npm informa scripts de instalación pendientes de autorización en dependencias del starter; no impidieron compilar ni ejecutar en este equipo.
- TypeScript y lint: correctos, sin errores ni advertencias de código pendientes.
- Lógica y PostgreSQL: 17 comprobaciones aprobadas.
- Componentes: 3 pruebas aprobadas (variantes/precio/agotado, límite de carrito y recuperación del borrador).
- Worker compilado: 10 pruebas aprobadas, incluidas páginas principales, metadatos y ruta desconocida con 404.
- Build completo y arranque de producción: correctos.
- Navegador: menú móvil y tienda a 390 px, academia a 768 px, portada a 1440 px y acceso administrativo sin sesión. Sin desbordamiento horizontal en las vistas medidas.
- Supabase real: db:check aprobado para siete tablas públicas, relaciones del catálogo, media privada oculta y lectura anónima de órdenes denegada. Navegador: categorías reales cargadas y catálogo vacío sin error de conexión. .env local configurado con URL y clave publicable e ignorado por Git. Se verificó el editor administrativo poblado con una sesión válida; quedan pendientes escrituras y subida real de archivos.

## 10. Fase de ciberseguridad

Hardening implementado y verificado: consultar SECURITY.md y SECURITY_AUDIT.md para controles aplicados en código/Supabase y riesgos residuales. Los criterios de publicación se mantienen pendientes hasta completar la lista de producción.

Priorizar protección antiabuso del checkout y reservas, MFA administrativo, revisión de sesiones y RLS/Storage, límites de carga, protección de media de pago, CSP/cabeceras, auditoría, copias y restauración, análisis de dependencias y pruebas con usuarios sin privilegios. Incorporar firma y verificación de webhooks e idempotencia del proveedor cuando se elija una pasarela. No hay afirmación de endurecimiento ni certificación de seguridad en esta fase.
