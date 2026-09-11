# Team Vivas Academy

Web de Jiu Jitsu, MMA y Submission Grappling. Conserva el diseño original de TVA y agrega catálogo conectado a Supabase, variantes, carrito, órdenes pendientes y administración privada.

**Estado:** la implementación compila y está conectada al proyecto Supabase `rhdyhndfhqvgbudjcbip`. Migración y semilla aplicadas, .env local configurado y comprobaciones REST aprobadas. Usuario administrador habilitado y sesión del panel verificada con lectura real de producto, variantes e imagen. Falta verificar escrituras, Storage y compra completa. Los productos permanecen en borrador hasta confirmar los datos comerciales.

La fase de seguridad está documentada en [SECURITY.md](SECURITY.md) y [SECURITY_AUDIT.md](SECURITY_AUDIT.md). La migración 202609100002_security.sql ya se aplicó en este proyecto. La actualización de instruccionales requiere aplicar después `202609110001_instructionals.sql`, aplicada y verificada en la base real el 11 de septiembre de 2026. Consulta [INSTRUCCIONALES.md](INSTRUCCIONALES.md) para activarla y operar la entrega manual por Drive. Antes de publicar, resolver los pendientes de producción documentados.

## Arquitectura

- React 19 + TypeScript + Vite 8.
- Vinext conserva las rutas de estilo Next.js en `app/` y genera un Worker compatible con la configuración de Sites existente.
- Supabase PostgreSQL: catálogo, variantes, existencias, cursos, órdenes e información institucional.
- Supabase Auth: inicio de sesión de administradores.
- Supabase Storage: imágenes comerciales en el bucket público `product-images`.
- Context + reducer: borrador de carrito durante navegación y en localStorage. El precio y stock del carrito no son autoridad; se vuelven a consultar y verificar en PostgreSQL.
- Sin pasarela ficticia: se registra una orden pendiente, el pago se coordina manualmente y el administrador confirma su recepción.

Se conservan `app/` y `public/assets/` en lugar de moverlos a `pages/` y `assets/`: ya son las convenciones del proyecto y no necesitan duplicarse. Los ejemplos D1/Drizzle y el helper opcional de ChatGPT Auth siguen conservados como material del starter; no intervienen en el comercio ni en el acceso administrativo. D1 y R2 permanecen desactivados.

## Instalación

Requiere Node.js >=22.13 (se comprobó con Node 24) y npm.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

En este equipo `.env` ya está configurado: no lo sobrescribas. Las instrucciones de instalación sirven para un entorno nuevo. Abre la URL impresa por Vite, normalmente http://localhost:5173. Reinicia Vite después de cambiar variables.

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-clave-publicable
```

Estos dos valores son públicos y se incorporan al bundle. **Nunca uses una clave secret o service_role en variables VITE\_.** La aplicación no necesita claves administrativas de Supabase. `.env` está ignorado por Git.

## Configurar Supabase

1. Crea o selecciona un proyecto Supabase.
2. En su editor SQL, ejecuta `supabase/migrations/202609100001_commerce.sql` una sola vez. Define las tablas, restricciones, funciones transaccionales, RLS y bucket de imágenes.
3. Aplica `supabase/migrations/202609100002_security.sql` y después `supabase/migrations/202609110001_instructionals.sql`, una sola vez y en ese orden. Ejecuta `supabase/seed.sql` si necesitas el catálogo inicial; es repetible y no sobrescribe registros existentes.
4. En Authentication, crea o invita la cuenta administrativa mediante las herramientas de Supabase. Gestiona la contraseña con Supabase Auth.
5. Autoriza ese usuario desde el editor SQL, usando su UUID real:
   ```sql
   insert into public.admin_users(user_id)
   values ('UUID-DEL-USUARIO-AUTH')
   on conflict do nothing;
   ```
6. Copia la URL y la clave **publicable** a `.env`; reinicia Vite.
7. Ejecuta `npm run db:check` para comprobar tablas, relaciones y restricciones de lectura anónima.
8. Accede a `/admin`, inicia sesión y verifica crear un borrador, una variante, una imagen y una orden de prueba.

La migración no crea una cuenta ni una contraseña. No debe ejecutarse sobre tablas comerciales preexistentes con los mismos nombres sin revisar primero sus diferencias. Para cambios posteriores, agrega migraciones nuevas; no reejecutes la migración inicial.

El mecanismo de datos iniciales conserva siete productos, sus precios e imágenes originales. Sus variantes quedan inactivas, sin stock, con talla/color por confirmar; los productos son borradores. No se inventó inventario. El instruccional Protect Ya Neck se conserva como borrador sin precio de venta ni temario ficticios.

Para regenerar el SQL desde el archivo histórico:

```powershell
npm run db:seed:generate
```

La web ya no importa `data/products.ts`; ese archivo solo alimenta el generador de datos iniciales y se conserva para no perder información.

## Administración

En `/admin` encontrarás:

- **Productos:** crear, editar, publicar y desactivar. Usa estado Desactivado para retirarlos sin perder referencias históricas.
- **Variantes:** SKU único, combinación color/talla, precio en USD, stock disponible y activación.
- **Imágenes:** subir JPG/PNG/WebP de hasta 5 MB, editar texto alternativo, orden, asociación con variante y portada.
- **Instruccionales:** precio digital simplificado, portada, tráiler público de YouTube, entrenador, nivel, instrucciones de entrega, temario opcional y enlace privado de Drive.
- **Inventario:** consultar existencias, filtrar cantidades de cinco o menos y acceder a su edición.
- **Órdenes:** consultar las 200 más recientes, abrir detalle con precios históricos y cambiar estado.
- **Información:** horarios, dirección y creación de categorías.

### Agregar un producto

1. Crea un borrador con nombre, slug, categoría y descripción.
2. Guarda los datos generales.
3. Agrega cada combinación real de color/talla, con SKU, precio y stock.
4. Sube imágenes y selecciona una principal.
5. Publica el producto cuando los datos sean correctos.

El precio se almacena en centavos enteros para evitar errores de redondeo. El stock pertenece a la variante y representa unidades disponibles, descontando reservas de órdenes pendientes.

### Crear un instruccional

Crea un borrador en Instruccionales. Guarda el precio, sube la portada y guarda la presentación, con un tráiler de YouTube opcional. Configura el enlace privado de Drive en su sección de entrega. Los módulos son opcionales. Revisa la vista previa y publica. Los textos y el tráiler son públicos: no pegues allí enlaces del contenido de pago. El enlace privado solo es consultable por administradores. El flujo completo se explica en [INSTRUCCIONALES.md](INSTRUCCIONALES.md).

### Imágenes

Los archivos nuevos se suben a Supabase Storage; PostgreSQL conserva únicamente URL, texto alternativo y relaciones. Los archivos originales siguen en `public/assets/` y sus rutas se conservan en la semilla. Retirar una imagen del producto elimina la relación, pero conserva el archivo en Storage para evitar borrar material compartido accidentalmente. La limpieza de huérfanos se realiza después de revisar referencias.

## Compra y órdenes

- Búsqueda, categorías, ordenamiento, destacados y filtro de disponibilidad.
- Detalle con galería y selectores. Las combinaciones agotadas no se pueden agregar.
- El carrito permite cambiar cantidades y eliminar artículos.
- Checkout recopila nombre, correo, teléfono y observaciones.
- Productos físicos: retiro en la academia. No se ofrece envío sin tarifas definidas.
- Cursos: autorización manual en Drive de la cuenta de Google indicada; envío del enlace por WhatsApp, correo u otro medio después de confirmar el pago.
- `create_order` valida datos y variantes en PostgreSQL, bloquea filas, toma precios vigentes, verifica el precio esperado, reserva stock y guarda los precios históricos en una sola transacción.
- Una clave de solicitud evita duplicar órdenes por reintentos. La solicitud pendiente se conserva temporalmente en sessionStorage hasta recibir confirmación; incluye el borrador de contacto.
- Estados: pendiente → pago confirmado → entregada. Cada artículo tiene su propio registro de entrega y la orden se cierra al completar todos. Se permite cancelar órdenes pendientes o confirmadas que aún no tengan entregas; devuelve stock una sola vez.
- No hay cobro automático ni verificación bancaria. El administrador confirma solo después de verificar el pago por fuera del sistema.

Las reservas pendientes **no expiran automáticamente** en esta fase. El administrador debe revisarlas y cancelar las abandonadas para liberar stock.

## Estructura

| Ruta                   | Responsabilidad                                       |
| ---------------------- | ----------------------------------------------------- |
| `app/`                 | Rutas, metadatos, páginas institucionales y estilos   |
| `components/catalog/`  | Catálogo, ficha de producto, galería y variantes      |
| `components/checkout/` | Carrito y formulario de orden                         |
| `components/admin/`    | Acceso y módulos administrativos                      |
| `layouts/`             | Estructura pública y separación del panel             |
| `hooks/`               | Carrito, sesión administrativa, carga y acciones      |
| `services/`            | Consultas Supabase, órdenes, administración y errores |
| `types/`               | Contratos TypeScript y tipos del entorno              |
| `utils/`               | Moneda, validación y reconciliación del carrito       |
| `supabase/`            | Migración y datos iniciales                           |
| `tests/`               | Pruebas de dominio, PostgreSQL, componentes y Worker  |
| `scripts/`             | Build, validación y herramientas de datos             |

## Comprobaciones

```powershell
npm run typecheck
npm run lint
npm test
npm run test:components
npm run build
npm run test:rendered
npm run start
```

Los comandos principales son compatibles con Windows. `npm run build` comprueba TypeScript, compila Vinext y valida el Worker y el manifiesto de Sites. El antiguo script Linux de instalación del starter se conserva como `install:ci`, pero no es necesario para trabajar en PowerShell.

Las pruebas de PostgreSQL usan PGlite y ejecutan el SQL comercial real con esquemas mínimos de Auth/Storage para probar transacciones y RLS. **No prueban el servicio real de Supabase Auth, PostgREST o Storage, ni concurrencia multiconexión.** Los datos ficticios viven exclusivamente en pruebas.

## Pendientes antes de operación real

- Verificar los flujos de edición y compra con el administrador ya habilitado.
- Confirmar precios, tallas, colores, existencias, horarios, dirección y contenido de los cursos.
- Verificar en esa instancia: administración, carga de imágenes, persistencia tras recargar, checkout, cancelación y permisos de usuarios no administradores.
- Definir proveedor de pagos, envíos e impuestos si corresponden al flujo comercial acordado.
- Automatizar entrega digital, confirmaciones y expiración de reservas.
- Completar revisión responsive del panel con registros reales y formularios largos.
- Optimización de originales pesados y variantes de imagen: por ahora se sirven directamente con dimensiones y carga diferida, sin requerir el servicio Cloudflare IMAGES.
- Fase de seguridad específica antes de publicar: controles antiabuso del checkout público, MFA, sesiones, CSP, revisión RLS/Storage, auditoría, copias de seguridad, límites y protección de contenido.

La base Supabase ya está configurada; el sitio no se ha publicado. Consulta `DATABASE.md` y `IMPLEMENTATION_REPORT.md` para decisiones y límites de la verificación.

Referencias: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Auth](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [Storage](https://supabase.com/docs/guides/storage/security/access-control).
