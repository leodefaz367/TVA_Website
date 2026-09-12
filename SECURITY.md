# Seguridad de Team Vivas Academy

Auditoría del 12/09/2026. Trabajo local autorizado; no se publicó, no se hizo push y no se alteró la base de producción durante esta fase. La migración nueva se prueba en PostgreSQL aislado. El reporte vigente es AUDITORIA_RC.md; SECURITY_AUDIT.md conserva la revisión histórica anterior.

## Arquitectura y confianza

React 19 + TypeScript, App Router en app/. Desarrollo Vite/Vinext en localhost:5173. El build principal ahora genera Next.js 16 para Vercel. El perfil Worker previo se conserva solo por compatibilidad. Supabase Auth gestiona contraseñas/JWT; PostgreSQL aplica RLS y las transacciones; Storage guarda imágenes públicas; Google Drive aloja el contenido premium. No hay pasarela bancaria, reproductor premium, cuentas de alumnos ni API de compras de alumnos. Neon, D1/R2 y los ejemplos del starter no participan en el comercio.

El navegador no es confiable. Los precios, cantidades, stock, roles y estados deben validarse en PostgreSQL. El catálogo público se consulta sin sesión administrativa para SSR; usa una proyección explícita sin tablas de entrega. No se acepta HTML del usuario: React escapa nombres y descripciones.

## Autenticación, roles y sesiones

Visitante: lee catálogo activo y crea solicitudes. Usuario Auth normal: estar autenticado no otorga administración. ADMIN: UUID incluido en admin_users por el operador de Supabase; la aplicación no puede otorgar ese rol. No se necesita inventar una tabla CLIENTE para el flujo manual actual.

useAdmin verifica getUser y la RPC is_admin. RLS es la barrera real: exige pertenencia, usuario no bloqueado, session_id vigente en auth.sessions y not_after válido cuando existe. Supabase valida firma y expiración del JWT antes de la API. Modificar localStorage, JavaScript, IDs o metadata no concede privilegios. La página /admin puede devolver HTTP 200 con el acceso privado; eso no revela información administrativa.

La sesión pasa de localStorage a sessionStorage; se retira la clave persistente del mecanismo anterior. Puede requerirse iniciar sesión nuevamente. El token dura en esa pestaña, no se acepta una sesión desde parámetros de URL y el SDK mantiene renovación/revocación. El panel revalida al volver a la pestaña y cada minuto visible. Logout usa Supabase signOut y muestra un error si falla: sin conexión no se promete revocación remota. Para pérdida de dispositivo, revocar sesiones desde Supabase.

La nueva interfaz permite enrolar TOTP y responder al desafío. La migración RC exige AAL2 si el administrador tiene un factor verificado; un token AAL1 no permite llamar directamente a Storage/REST/RPC para saltarse MFA. El titular debe activar el factor con su aplicación de autenticación. No se activó ni probó un factor real durante esta revisión. El correo cambiado del administrador no acredita por sí solo la existencia de su buzón.

Riesgo: sessionStorage sigue accesible a JavaScript, no equivale a cookies HttpOnly. MFA no es obligatorio mientras la cuenta no haya enrolado un factor. Antes del lanzamiento debe enrolarse cada administrador y proteger también las cuentas GitHub, Vercel, Supabase y registrador.

## Datos y RLS

| Tablas                                       | Visitante/usuario normal                          | Administrador válido                 |
| -------------------------------------------- | ------------------------------------------------- | ------------------------------------ |
| products, product_variants, product_images   | Catálogo activo y variantes activas               | CRUD por RLS                         |
| categories                                   | Lectura                                           | CRUD                                 |
| instructional_courses, instructional_modules | Presentación y temario de cursos activos          | CRUD                                 |
| instructional_media                          | Sin filas visibles                                | CRUD de referencias privadas         |
| instructional_delivery_settings              | Sin privilegios de lectura                        | CRUD de enlaces Drive                |
| orders, order_items                          | Sin lectura/escritura directa                     | Lectura; estados solo por RPC        |
| order_item_deliveries                        | Sin acceso                                        | Lectura; escritura solo RPC          |
| admin_users                                  | Auth ve solo su propia pertenencia, sin escritura | Sin concesión de roles               |
| admin_audit_log                              | Sin acceso                                        | Lectura, sin editar/borrar historial |
| site_settings                                | Tras RC: solo schedule, address, bank_transfer    | CRUD                                 |
| academy_photos                               | Lectura                                           | CRUD                                 |

Las 15 tablas reales se inspeccionaron en Supabase; sus políticas se contrastan con las migraciones y pruebas aisladas. La nueva migración 202609120002_release_hardening.sql NO está aplicada en producción. Restringe ajustes públicos, valida constraints históricos, URLs Drive completas, fotos de academia y datos bancarios al escribir. Impide reasignar variantes a otro producto, incorpora MFA y rechaza campos extra/tipos inesperados en pedidos. Falla transaccionalmente si encuentra filas incompatibles, sin borrarlas a ciegas.

Las RPC SECURITY DEFINER usan search_path vacío y grants específicos. SQL de compradores parametrizado; el SQL dinámico de migraciones solo usa listas fijas de tablas. Constraints limitan longitudes, enteros, precios, cantidades y stock. Claves foráneas preservan referencias de pedidos. La función privada con las cuotas no es ejecutable por anon/authenticated.

## Pedidos, pagos y abuso

La DB calcula precios y totales, bloquea filas de stock y conserva snapshots históricos. Request UUID/fingerprint asegura idempotencia. Solo ADMIN puede confirmar un pago; el comprador no puede enviar paid=true ni escribir órdenes directamente. Solo se entregan artículos de órdenes confirmadas; las cancelaciones restauran stock una vez y no cancelan entregas ya registradas. No hay webhook ni cobro automático: comprobar la transferencia real fuera de la web es responsabilidad del administrador. Una captura de pago no prueba que se haya recibido dinero.

Cuotas transaccionales: 100 solicitudes/h globales, 5/h por correo y 3 pendientes por correo. No se confía en una IP enviada por el navegador. Auth aporta sus límites de servicio; revisar configuración de producción. No hay limitador por IP distribuido propio ni CAPTCHA integrado.

Riesgo residual de disponibilidad: bots con correos distintos pueden consumir cupos o reservar stock dentro de esas cuotas. No hay vencimiento automático de reservas. Revisar/cancelar pendientes desde administración. Antes de tráfico hostil o campañas importantes, añadir una puerta de pedidos con desafío verificado en servidor y retirar el grant anónimo directo; un CAPTCHA solo visual o CORS no solucionaría el acceso directo. Las cuotas actuales reducen abuso, no lo eliminan.

## Instruccionales y Drive

Portadas, galería, descripción, temario y tráiler son públicos por diseño. No guardar contenido premium en esos campos ni en delivery_note. Los enlaces de entrega y su historial están en tablas privadas y no se entregan en HTML/RSC del catálogo. No se encontraron extensiones de video en public/; esto no equivale a una inspección forense de cada binario.

La protección del archivo premium depende de Drive: acceso general RESTRINGIDO, sin permisos públicos heredados, lector únicamente para la cuenta del comprador después de comprobar pago. Probar que el enlace falla con una cuenta no autorizada. TVA no tiene una conexión a Drive para verificar ni modificar sus permisos. Guardar una URL válida no significa que sea privada. Si Drive está en «Cualquier persona con el enlace», no vender así: quien conozca la URL tendrá acceso.

No existen signed URLs de videos ni DRM. Copiar/preparar un mensaje no marca entrega ni lo envía. Registrar entrega exige confirmación de pago y registra administrador, fecha, correo y canal. La entrega efectiva de Drive sigue siendo manual; el checkbox no consulta Google.

Una futura reproducción dentro de TVA necesitará identidades de alumnos, derechos de compra y backend que verifique JWT/compra antes de generar signed URLs cortas de un bucket PRIVADO. Nunca usar el bucket público de imágenes para premium. Ni signed URLs ni Drive impiden totalmente grabar la pantalla de una reproducción legítima.

## Imágenes y Storage

product-images y academy-images son públicos, exclusivamente para imágenes. Solo administradores vigentes pueden cargar; políticas limitan rutas UUID, producto correspondiente cuando aplica, tipos JPEG/PNG/WebP y 5 MiB. La interfaz valida firma, decodificación y dimensiones hasta 10000×10000; nombres aleatorios, upsert:false y limpieza del objeto si falla el registro. Las imágenes se renderizan como img y no como HTML. URLs de imágenes/Drive se validan al renderizar y el tráiler usa un ID YouTube validado.

Límite: la validación binaria/decodificación se ejecuta en el navegador. Un administrador puede omitirla llamando a Storage directamente, aunque no puede eludir RLS, MIME declarado y límite de tamaño. Los archivos se sirven en otro origen y la aplicación solo los incrusta como imagen bajo CSP. Antes de permitir uploads de clientes, implementar validación/reencodificación de servidor y retirar INSERT directo. No afirmar que esa capa existe actualmente.

## Headers, XSS, CSRF y CORS

Next proxy.ts genera nonce aleatorio, lo transmite al render y configura CSP. HTML dinámico/no-store evita reutilizar nonces. Solo scripts propios con nonce; sin unsafe-eval ni unsafe-inline en scripts. Los atributos de estilo React sí están permitidos. Se limita Supabase como origen de imágenes/API y youtube-nocookie para tráiler; object-src none, frame-ancestors none y base-uri none.

X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options y noindex en admin. HSTS se emite sobre HTTPS sin includeSubDomains/preload. PRIMARY_SITE_URL es un origen HTTPS validado, conserva rutas/query al redirigir y no procede del comprador. Se bloquean POST/PUT/PATCH/DELETE al servidor web y optimizadores de imagen no usados. Las operaciones comerciales usan Supabase, no server actions.

El servidor TVA no devuelve CORS wildcard. Supabase puede devolver Access-Control-Allow-Origin:* como parte de su API gestionada: eso NO es autorización y no se modifica con vercel.json. JWT bearer y RLS deciden los permisos; no hay cookies ambientales de sesión para las mutaciones actuales. No hay endpoints privados propios con cookies, por lo que el token CSRF tradicional no aplica en esta arquitectura. Si se añaden cookies/BFF, deberán incorporarse CSRF/origin checks.

Errores de aplicación genéricos salvo códigos propios conocidos; no se registran contraseñas, cuerpos de pedidos ni claves. PostgREST conserva sus mensajes técnicos de proveedor; el frontend los sanea. Revisar logs del proveedor con acceso restringido, no adjuntarlos sin filtrar a incidencias públicas.

## Secretos y dependencias

Solo valores públicos en VITE_* y NEXT_PUBLIC_*. El build rechaza claves privadas/roles privilegiados, URLs inseguras y pares Vite/Next inconsistentes. .env.example tiene nombres vacíos. Git ignora .env, backups, volcados y builds. security:check examina patrones en fuente, env local, historial Git alcanzable y artefactos sin imprimir valores. No cubre repositorios remotos independientes, objetos inalcanzables ni todos los formatos de secretos. npm audit solo detecta avisos conocidos.

No añadir secretos service_role, DB o pagos al frontend. Para nuevas integraciones, usar un backend y un gestor de secretos. No hay tales credenciales necesarias hoy. No se realizaron actualizaciones mayores a ciegas.

## Backups, restauración e incidentes

Respaldar por separado PostgreSQL (incluyendo Auth/permisos según proceso del proveedor), objetos Storage, videos originales/permisos Drive, código/lockfile/migraciones y configuración de dominio/Auth. Un dump de DB NO contiene los bytes de Storage. Cifrar backups, restringir acceso y mantener copia fuera del único proveedor, nunca en Git.

Definir frecuencia, retención y responsable antes del lanzamiento. Supabase Free requiere exportaciones regulares; no se comprobó una restauración real aquí. Ensayar en otro proyecto: restaurar esquema/datos, objetos y permisos; comparar conteos/stock; comprobar RLS con anónimo/usuario normal y login/MFA. No restaurar sobre la DB real para practicar. Un rollback del código no revierte la DB ni Drive.

Ante incidente: detener confirmaciones/entregas, revocar sesiones/bloquear cuenta, rotar claves expuestas, preservar auditoría, revisar pedidos/Drive, restaurar primero en entorno aislado. No enviar datos de clientes o claves a incidencias públicas.

Fuentes operativas consultadas: [MFA de Supabase](https://supabase.com/docs/guides/auth/auth-mfa), [backups y Storage](https://supabase.com/docs/guides/platform/backups), [dominios Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
