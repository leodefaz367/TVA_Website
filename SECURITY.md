# Seguridad de Team Vivas Academy

Revisión del 10 de septiembre de 2026. Alcance: repositorio, entorno local y proyecto Supabase `rhdyhndfhqvgbudjcbip`, con autorización del propietario. No se publicaron cambios ni se realizaron pruebas destructivas, cargas masivas o pedidos ficticios en la instancia real. Ver hallazgos y evidencia en `SECURITY_AUDIT.md`.

## Arquitectura y modelo de amenazas

React 19 y TypeScript; Vite 8 con Vinext conserva las rutas `app/`. El Worker de Cloudflare sirve HTML/RSC. El navegador consulta Supabase por HTTPS con una clave publicable y, cuando hay sesión, un bearer JWT. PostgreSQL aplica RLS y ejecuta las transacciones de órdenes. Storage contiene imágenes públicas del catálogo. No hay pasarela de pago, Edge Functions comerciales, cuentas de compradores ni API pública para leer pedidos. D1/R2 están desactivados; los ejemplos D1 y ChatGPT Auth no participan en la autorización comercial.

| Elemento        | Modelo                                                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Activos         | Datos de contacto y pedidos, stock, precios, sesiones administrativas, contenido privado, disponibilidad y código                                                                                                                          |
| Usuarios        | Visitante/comprador sin cuenta; usuario Auth sin privilegios; administrador autorizado; operador de Supabase                                                                                                                               |
| Entradas        | Rutas, parámetros de producto, formularios, localStorage/sessionStorage, REST/RPC de Supabase, Auth y uploads                                                                                                                              |
| Atacantes       | Visitante manipulando requests, bots, cuenta normal intentando elevar privilegios, sesión administrativa robada, dependencia comprometida                                                                                                  |
| Datos sensibles | Nombre/correo/teléfono/notas del comprador, tokens Auth, referencias de contenido de pago                                                                                                                                                  |
| Confianza       | Navegador → API: ninguna confianza en precios, cantidades ni roles declarados. JWT validado por Supabase → RLS. Función SECURITY DEFINER → tablas: entrada validada y permisos restringidos. Storage → navegador: origen y tipos limitados |
| Supuestos       | El operador de Supabase conserva control del proyecto. No se protege frente a un operador PostgreSQL superusuario malicioso ni frente al dispositivo del administrador comprometido                                                        |

## Autenticación y revocación

- Contraseñas gestionadas exclusivamente por Supabase Auth. No se almacenan manualmente ni se incorporan al repositorio.
- Registro público cerrado; confirmación de email activa, configurados antes de esta fase. La creación inicial de administrador fue manual.
- `useAdmin` usa `getSession` como indicio de sesión, comprueba el usuario contra Auth con `getUser` y consulta `is_admin`. Revalida al cambiar Auth, al volver a la pestaña y cada minuto visible.
- La barrera efectiva es PostgreSQL: `is_admin` exige pertenencia en `admin_users`, usuario existente y no bloqueado, y `session_id` del JWT correspondiente a una sesión vigente en `auth.sessions`. Comprueba `not_after` cuando existe. Cerrar sesión revoca refresh tokens; eliminar la sesión impide operaciones administrativas aunque el access token aún no haya vencido.
- El SDK conserva tokens en almacenamiento del navegador. Esto es una decisión de la arquitectura cliente existente: XSS podría robarlos. La CSP, el escape de React y la restricción de URLs reducen ese riesgo, pero no equivalen a cookies HttpOnly. No se introdujo una autenticación casera.
- Una página `/admin` puede devolver HTML 200 con el formulario de acceso: esto no revela datos administrativos ni otorga permisos. No se debe interpretar 200 como un bypass.
- Los eventos de login están en los registros de Supabase Auth. No se crean logs de contraseñas, tokens o datos de pago en el cliente.

## Autorización y RLS por tabla

Todas las tablas públicas tienen RLS. `is_admin()` se evalúa también en las políticas de Storage y en las RPC administrativas. Un usuario no puede añadirse a `admin_users` desde la aplicación.

| Tabla                 | Visitante / usuario normal                                                 | Administrador vigente                                            |
| --------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| admin_users           | Visitante sin SELECT; usuario ve únicamente su pertenencia, sin escrituras | Lectura de pertenencia; altas/bajas solo por operador autorizado |
| categories            | SELECT público                                                             | INSERT/UPDATE/DELETE                                             |
| products              | SELECT de estado active                                                    | Gestiona catálogo y borradores                                   |
| product_variants      | SELECT de variantes activas de producto publicado                          | Gestiona precio y stock                                          |
| product_images        | SELECT de imágenes de producto publicado                                   | Gestiona relaciones e imágenes                                   |
| instructional_courses | SELECT de metadata de curso publicado                                      | Gestiona curso                                                   |
| instructional_modules | SELECT del temario de curso publicado                                      | Gestiona módulos                                                 |
| instructional_media   | Ninguna fila visible                                                       | Gestiona referencias privadas                                    |
| site_settings         | SELECT público; almacenar solo información institucional pública           | Gestiona información                                             |
| orders                | Visitante sin SELECT; usuario normal sin filas                             | SELECT y cambios mediante RPC                                    |
| order_items           | Visitante sin SELECT; usuario normal sin filas                             | SELECT; sin escrituras directas                                  |
| admin_audit_log       | Visitante sin SELECT; usuario normal sin filas                             | SELECT; sin modificar ni borrar                                  |

Las políticas `USING(true)` se limitan a lectura de categorías e información pública. No autorizan operaciones administrativas. Las funciones elevadas fijan `search_path=''` y califican tablas. La operación interna de órdenes está en `private`, con acceso revocado a `PUBLIC`, `anon` y `authenticated`. Nunca exponer ese esquema en Data API.

## Pedidos, validación y concurrencia

- El navegador no define el precio cobrado: la función SQL consulta la variante y guarda una copia histórica. Un precio esperado distinto produce rechazo. Si un cliente omite ese campo, sigue aplicándose el precio real de PostgreSQL.
- Restricciones para UUID, cantidad 1–99, máximo 50 líneas, contacto, totales, precio no negativo, stock no negativo, claves únicas y relaciones FK. Límites adicionales de longitud/posición en la segunda migración. Los nuevos CHECK se crearon `NOT VALID`: protegen INSERT/UPDATE desde su aplicación; validar datos antiguos es un paso explícito antes de producción.
- Una transacción bloquea variantes en orden, comprueba disponibilidad y reserva stock. Los reintentos con la misma clave y cuerpo no duplican pedidos. Otra carga con esa clave se rechaza. La clave de idempotencia es aleatoria y no es una API de lectura de datos de clientes.
- Cancelar devuelve existencias una sola vez. El formulario de variantes utiliza comparación del stock leído al guardar para no sobrescribir silenciosamente una venta concurrente; un conflicto exige recargar.
- La función pública limita a 5 órdenes por correo/hora, 3 pendientes por correo y 100 órdenes/hora en total. Un bloqueo transaccional serializa el control para impedir carreras. También cubre llamadas directas al RPC. Los reintentos válidos no consumen otra cuota.
- Estas cuotas son **contención**, no identidad ni protección DDoS: un atacante puede alternar correos, agotar la cuota global o reservar existencias. No limitan solicitudes fallidas. Las reservas aún no expiran automáticamente. Requiere una capa antiabuso adicional y un procedimiento de cancelación.
- El carrito es un borrador local; no autoridad de compra. El contacto pendiente de un reintento se conserva en sessionStorage y se elimina al confirmar éxito. No se recopilan tarjetas, CVV ni credenciales bancarias.

## Storage e imágenes

`product-images` es público únicamente para imágenes comerciales. JPEG/PNG/WebP, máximo 5 MiB. Las políticas exigen administrador vigente y una ruta `UUID-producto/UUID-archivo.ext` asociada a un producto existente. Se generan nombres aleatorios y `upsert:false`; no se reutiliza el nombre enviado por el usuario. Borrar asociaciones desde el panel no elimina automáticamente blobs compartidos.

La UI comprueba tamaño, MIME, firma binaria y decodificación/dimensiones con `createImageBitmap`. Los checks cliente son eludibles por un administrador con requests propias: Storage impone MIME declarado/tamaño/permisos, pero esta fase **no implementa inspección binaria o recodificación del lado servidor**. Antes de aceptar archivos de usuarios menos confiables, usar un upload gateway que decodifique y recodifique JPEG/PNG/WebP y descarte originales/metadatos. No admitir SVG/HTML.

`SiteImage` admite assets locales y URLs del bucket público del propio proyecto. Otras fuentes se sustituyen por el logo. La CSP limita el origen de imágenes. El endpoint de optimización de imágenes que no usaba la aplicación devuelve 404, evitando un parser/proxy innecesario.

Los recursos de instruccionales son referencias privadas protegidas por RLS, no enlaces públicos mostrados al comprador. No subir videos pagados a `product-images`. Para entrega automática futura: bucket privado, tabla de derechos de acceso ligada a pagos verificados, endpoint autenticado que valide derecho vigente y emita URLs firmadas de corta duración. No emitir URLs firmadas desde la clave publicable ni guardar una URL permanente pública como protección de pago.

## XSS, inyección, CSRF, CORS y redirecciones

Los campos se renderizan como texto React, sin HTML de la base mediante `dangerouslySetInnerHTML`. Prueba automatizada con etiquetas y atributos maliciosos. Consultas Supabase parametrizadas; SQL dinámico interno utiliza lista fija y `format('%I',...)`. El generador histórico de seed escapa comillas y no procesa requests públicas. No hay shell ejecutada con entradas de visitantes.

Las operaciones comerciales usan bearer tokens, no cookies enviadas automáticamente al Worker; no se identificó CSRF clásico en ese flujo. La creación pública de pedidos puede ser abusada sin sesión: es el riesgo de automatización anterior, no se resuelve con un token CSRF del frontend. El Worker rechaza métodos de mutación porque no hay Server Actions ni rutas API comerciales. Al añadirlas habrá que revisar esta decisión y validar origen/entrada/autorización.

No se añadió `Access-Control-Allow-Origin:*` al Worker. Supabase soporta clientes de varios orígenes; su CORS no es una barrera de autorización. La clave publicable es pública y RLS se mantiene obligatoria. Un gateway futuro deberá permitir solo los orígenes necesarios y no combinar cookies con comodines.

El helper histórico de ChatGPT Auth normaliza destinos relativos y rechaza orígenes externos/rutas reservadas; no se utiliza para el panel TVA. No se identificó open redirect en las rutas comerciales. No hay fetch de URLs elegidas por compradores en el backend comercial.

## Cabeceras y secretos

En el Worker: CSP con nonce aleatorio por respuesta y por todos los scripts del framework; scripts sin `unsafe-inline` ni `unsafe-eval`, `object-src none`, `base-uri none`, `frame-ancestors none`, fuentes/conexiones limitadas. `style-src-attr unsafe-inline` es una excepción limitada a estilos de React/Image; no autoriza JavaScript. HTML sin caché compartida. `nosniff`, `no-referrer`, `X-Frame-Options:DENY`, Permissions-Policy restrictiva y HSTS de un año para HTTPS. HTTP no local redirige a HTTPS. No se añadió `includeSubDomains` sin inventario del dominio.

TLS y cabeceras de assets estáticos pueden depender de Cloudflare/Sites y deben verificarse en el dominio publicado. El servidor de desarrollo se limita a loopback; nunca usar Vite como servidor público. HTTP local se permite exclusivamente para desarrollo. El servidor de producción local sirve la CSP; esto no reemplaza una revisión tras despliegue.

`.env*` ignorados salvo `.env.example`. Solo URL y clave publicable se incorporan al cliente. No se encontró evidencia de claves privadas expuestas que obligue a rotación en esta revisión. El escáner es heurístico y solo examina el historial Git accesible, no forks, logs de CI ni copias externas. Si se descubre una clave secret/service_role comprometida, rotarla en Supabase y revisar sesiones/logs; borrarla del último commit no basta.

## Auditoría y errores

Diez disparadores registran actor, acción, recurso, identificador, fecha y campos cambiados. Los valores se limitan a precio, stock, estado, activo y total: no duplican contacto, descripciones o referencias de videos. Operaciones anónimas/sistema tienen actor nulo. Los administradores solo leen el registro; el operador de PostgreSQL mantiene privilegios superiores y necesita controles propios de auditoría y backups.

El cliente muestra únicamente errores traducidos conocidos y `ValidationError` escritos por la aplicación. No imprime errores completos. El Worker registra fallos con identificador aleatorio, sin URL/query/PII, y devuelve respuesta genérica. PostgREST puede seguir devolviendo detalles de validación de sus propias API; una capa gateway sería necesaria para normalizar todas sus respuestas. No confundir estos detalles con acceso a filas privadas.

## Operación y pasos externos antes de producción

1. En SQL Editor del proyecto, **no reejecutar** las migraciones 001/002 ya aplicadas. Usar `supabase/security-verification.sql` para inspección. Revisar Security Advisor. Validar los CHECK existentes con `ALTER TABLE public.products VALIDATE CONSTRAINT products_slug_length;` y equivalentes `categories_slug_length`, `images_url_length`, `images_position_limit`, `modules_position_limit` en sus tablas. Si fallan, corregir datos con el propietario; no borrarlos.
2. Authentication → Sign In / Providers: mantener Allow new users to sign up apagado y Confirm email encendido mientras no haya cuentas de alumnos. Authentication → Rate Limits: revisar límites del plan. No se realizaron intentos de fuerza bruta contra Supabase.
3. Implementar enrolamiento/challenge MFA en el panel antes de exigir AAL2 en `is_admin`; exigirlo ahora sin UI bloquearía al administrador. Habilitar MFA también en la cuenta operadora de Supabase y custodiar recuperación. No se crearon factores ni contraseñas por el agente.
4. Para registro público futuro: SMTP propio, dominio remitente verificado, Site URL de producción y lista exacta de redirect URLs; integrar CAPTCHA en la UI y después activar su validación en Auth. No activar una exigencia CAPTCHA sin que el formulario envíe el token.
5. Checkout: crear un gateway Worker/Edge Function que valide Turnstile, límite por IP confiable de plataforma y tamaño del body; usar un rol servidor con acceso únicamente a la función comercial. Solo tras comprobarlo, revocar EXECUTE de `create_order` a anon/authenticated para impedir saltarse el gateway. No confiar en IP/headers enviados por el cliente ni dejar la clave de servidor en VITE_. La configuración actual mantiene la funcionalidad con cuotas SQL.
6. Definir vencimiento de reservas con el negocio. Implementar cancelación programada mediante la misma lógica transaccional (sin devolver stock dos veces), notificar al comprador y probar reintentos. Mientras tanto revisar pendientes manualmente.
7. Configurar dominio HTTPS, comprobar HSTS/CSP sobre HTML y assets en el hosting real, restricciones de acceso al dashboard, backups y un ensayo de restauración. No se publicaron cambios durante la auditoría.
8. Definir plazos de retención de pedidos y logs, exportación/borrado legítimo de datos y responsables de acceso. No se eliminaron registros actuales.
9. Probar en staging multiconexión real, expiración/revocación, subida/descarga con cada rol y concurrencia compra/cancelación/edición. PGlite prueba transacciones y RLS, pero no acredita concurrencia entre conexiones ni todos los servicios gestionados.

## Verificación repetible y CI

`npm run security:check`, `npm audit`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:components`, `npm run build`, `npm run test:rendered` y `npm run db:check` (último requiere configuración real). No usar `npm audit fix --force`. El override sharp 0.35.4 corrige una dependencia transitiva fijada por Miniflare; revisar/eliminar el override cuando upstream lo incluya.

No se confirmó un remote GitHub. Propuesta para CI: checkout del commit, Node 24, `npm ci`, los checks anteriores excepto `db:check` en PRs de terceros; sin secretos de producción, permisos de repositorio solo lectura y acciones fijadas a SHA revisados. Para staging usar un job separado con aprobación de entorno y datos desechables. No desplegar automáticamente desde PRs.

Valoración: **ACEPTABLE para desarrollo y validación controlada**. Hay controles efectivos en la base, pruebas y runtime actualizado; las reservas anónimas, MFA y controles operativos pendientes impiden calificarlo como listo para comercio público sin trabajo adicional.
