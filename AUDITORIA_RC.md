# Reporte final de auditoría TVA — 12/09/2026

**Alcance:** proyecto local, pruebas aisladas PostgreSQL, compilación para Vercel y consultas de solo lectura al Supabase existente. Sin publicación, push, compra de dominio ni cambios a la base real durante esta auditoría. La versión alojada en ChatGPT no se modificó. Se conserva el cambio de fotografía Grupo.jpeg que apareció en el espacio de trabajo durante la revisión.

**Resultado:** candidato local para validación de lanzamiento, condicionado a aplicar la migración RC, activar MFA, comprobar los permisos de Drive y configurar recuperación. No es una garantía de riesgo cero ni una autorización de lanzamiento público.

## ✅ CORREGIDO

| Hallazgo | Corrección y evidencia |
| --- | --- |
| No había un build validado para Vercel; npm build generaba el Worker anterior | Next.js de producción como build principal, vercel.json, prueba HTTP de rutas y CSP |
| Generación de tipos Next y Vinext compartía .next y podía romper TypeScript | Next usa .next-production; caches/tipos separados, sin cambiar localhost |
| Tokens administrativos persistentes en localStorage | sessionStorage por pestaña, retirada del token antiguo y desactivación de detección de sesiones por URL |
| No había flujo MFA en administración | Enrolamiento/desafío TOTP; nueva RLS exige AAL2 cuando existe factor verificado |
| site_settings era íntegramente público, arriesgando futuras notas privadas | Nueva política pública solo para schedule, address y bank_transfer |
| academy_photos no retiraba posibles grants heredados, incluyendo TRUNCATE que no pasa por RLS | Revocación completa y grants mínimos explícitos; prueba con default privileges similares a Supabase |
| Campos extra/tipos incorrectos podían llegar a la RPC, aunque no decidían el precio | Wrapper SQL con listas explícitas y rechazo de role/paid/precio extra/tipos inesperados |
| Validación de cuenta bancaria solo en UI | Trigger PostgreSQL valida campos y tipos al escribir |
| Variante podía trasladarse a otro producto | Trigger inmutable para product_id, preservando historial |
| Regex Drive aceptaba sufijos de ruta no previstos | Constraint completo y validación defensiva al renderizar enlaces de entregas antiguas |
| Constraints antiguos estaban NOT VALID | Migración valida longitudes/posiciones históricas transaccionalmente |
| Catálogo usaba SELECT * | Proyección explícita, sin tablas de entrega premium |
| Build no detectaba clave privilegiada colocada como publicable | Preflight falla ante claves no publicables, variables privadas públicas u orígenes inconsistentes |
| Escáner de secretos no cubría el build final | Escaneo de artefactos Next y Worker, además de fuente/env/historial |
| Lint intentaba analizar miles de líneas de empaquetados temporales | Exclusión de outputs/caches/artefactos; código fuente sigue verificado |

Los cambios SQL de esta tabla están aplicados solo en las bases aisladas de pruebas; se entregan en 202609120002_release_hardening.sql para staging y posterior producción autorizada.

## ⚠️ RIESGOS RESIDUALES

- Drive: sin conexión de gestión; no se verificó el acceso real a videos. Un archivo con acceso público por enlace sigue expuesto aunque su URL se oculte en TVA. No abrir ventas hasta comprobarlo.
- Bots: cuotas de pedidos no acreditan al comprador. Correos rotativos pueden consumir cupos/reservar stock; no hay CAPTCHA de servidor ni expiración automática de reservas. Revisión manual necesaria; ampliar protección antes de tráfico hostil/campañas grandes.
- Sesión en JavaScript: sessionStorage no es HttpOnly. XSS/extensiones/dispositivo comprometido siguen siendo amenazas.
- Uploads: firma/decodificación en UI, MIME/tamaño/ruta/permisos en Storage. Un administrador que llame a Storage puede omitir validación binaria. No admitir uploads de compradores con esta arquitectura.
- MFA: no se obliga a cuentas sin factor enrolado. En la consulta real había cero factores administrativos verificados. El titular debe completar enrolamiento y guardar su método de recuperación.
- No se ensayó restauración de un backup real, no se ejecutó una transferencia bancaria ni se envió contenido a un comprador.
- Cualquier persona que tenga acceso legítimo a un video puede grabarlo; no se implementó DRM.

## 🔐 SEGURIDAD

Revisión basada en acceso roto/IDOR, autenticación, inyección/XSS, configuración, componentes, integridad, logs y abuso. RLS, RPC con permisos mínimos, escape React, URLs restringidas, CSP por nonce, no-store, HTTPS/HSTS, errores saneados y auditoría de cambios. No hay endpoints de server actions comerciales; el servidor web rechaza métodos de modificación y no añade CORS wildcard.

## 🗄️ BASE DE DATOS

Consulta real: **15 tablas públicas, ninguna sin RLS**. Storage.objects también tiene RLS. Tablas de órdenes, entregas, medios y configuración Drive no accesibles a visitantes según las consultas REST y pruebas de política. Se comprobaron tipos, restricciones, claves foráneas, transacciones, rollback, snapshots de precio y cancelación idempotente en PostgreSQL aislado.

Ambos buckets reales son públicos para imágenes: product-images y academy-images; MIME JPEG/PNG/WebP y máximo 5.242.880 bytes. Ningún bucket premium público fue creado. La consulta de configuración completa puede repetirse con supabase/release-verification.sql.

## 🎥 INSTRUCCIONALES

Presentación y tráiler públicos. Tablas de referencias, enlaces y entregas privadas para administradores. Pago confirmado es requisito de la RPC de entrega. Autorización del archivo final delegada a Drive Restringido por cuenta; no hay signed URLs ni verificación automática de permisos de Google. No se hallaron extensiones de video en public. La prueba de acceso directo real al video está pendiente del propietario/Drive.

## 👤 AUTENTICACIÓN

Supabase gestiona contraseñas, firma/expiración JWT y refresh. UUID define el administrador; correo o metadata no otorgan roles. SessionStorage, logout con manejo de errores y revalidación. TOTP añadido sin activar un factor del titular. La protección AAL2 de API está incluida en la migración RC, pendiente de aplicar en la base real.

## 🛡️ ADMIN

UI privada con verificación Auth/is_admin; RLS/RPC son la autorización efectiva. Sin escrituras públicas de roles, precios, stock, pedidos o configuración. JWT de usuario normal, sesión revocada/bloqueada/expirada y AAL1 de administrador con MFA son rechazados en pruebas aisladas. La respuesta anónima de /admin no contiene datos de entregas/pedidos.

## 💳 PAGOS

Transferencia manual en USD. No existe pasarela ni webhook que simular. La DB decide total/stock y crea pending. Solo administrador confirma tras revisar el banco; entrega no se habilita antes. No se hicieron transacciones ni cambios de estado reales como prueba.

## 🌐 PRODUCCIÓN

Build principal Next.js para Vercel; dev Vite preservado. Dominio configurable con PRIMARY_SITE_URL, rutas directas y refresh, 404, headers y nonce coherente. Ningún deploy/push ejecutado. vercel.json es necesario para seleccionar el build correcto; no hay rewrite SPA a index.html.

## 🔑 VARIABLES DE ENTORNO

Vercel: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. PRIMARY_SITE_URL opcional hasta elegir origen HTTPS definitivo, solo servidor. Local Vite: VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY. Si coexisten deben coincidir. No se requiere service_role ni clave privada de pagos. .env.example tiene nombres vacíos; ningún secreto aparece en este reporte.

## 🌍 DOMINIO

Comprar/elegir un .com con tu cuenta; añadir raíz y www a Vercel; copiar los registros A/CNAME/TXT exactos que muestre Vercel; preservar MX/SPF/DKIM/DMARC; elegir principal, redirigir el otro, comprobar HTTPS y ajustar Site URL/Auth. No se reservó ningún dominio. DEPLOYMENT.md explica los pasos.

## 🧪 PRUEBAS

| Grupo | Evidencia y alcance |
| --- | --- |
| Instalación/dependencias | npm install --ignore-scripts: sin paquetes pendientes; npm audit: 0 vulnerabilidades conocidas |
| Compilación/calidad | npm run build, npm run typecheck y npm run lint aprobados; build Next separado en .next-production |
| PostgreSQL/unidades | npm test: 33 pruebas aprobadas; migraciones ejecutadas con roles anon/authenticated y fixtures de Auth |
| Componentes | npm run test:components: 9 pruebas aprobadas; variantes/carrito, textos XSS, tráiler, entrega y galería |
| Producción Next | npm run test:production: 10 pruebas HTTP; páginas principales repetidas/refrescadas, admin sin datos, 404, POST e imagen proxy bloqueados, nonce en scripts |
| Compatibilidad local previa | npm run test:rendered: 11 pruebas del Worker, sin despliegue |
| Secretos | npm run security:check: sin coincidencias en fuente, env local, historial Git alcanzable y archivos compilados; escaneo heurístico |
| Supabase real | Solo lectura: catálogo accesible, órdenes/entregas/enlaces privados restringidos, anon no administrador, auditoría inaccesible, RLS y configuración de buckets comprobadas |

Matriz solicitada: A/B/I/N/O cubiertos por RLS y pruebas de roles; C/D/J mediante acceso a metadatos privados y manipulación de IDs (Drive real no verificado); E/F/G por precios/stock/tipos y rollback; H por escape de React; K por llamadas RPC directas/POST inválido; L por pruebas HTTP repetidas; M por escaneo de artefactos. Las pruebas PGlite simulan la plataforma Auth/Storage; no equivalen a probar toda la infraestructura gestionada de Supabase. No se afirma que el login MFA real ni los permisos de un archivo Drive se hayan probado.

## 🚨 ACCIONES MANUALES PENDIENTES

1. Autorizar el lanzamiento; entonces aplicar la migración RC revisada en staging/producción. Se dejó sin aplicar porque esta fase no debe cambiar producción.
2. El titular debe activar TOTP y comprobar un nuevo login; verificar que el buzón administrativo exista. No se puede enrolar su aplicación autenticadora por él.
3. Comprobar/configurar permisos de los videos en Drive con la cuenta propietaria y una cuenta sin acceso; esa conexión no está disponible aquí.
4. Conectar tu repositorio GitHub a tu Vercel cuando lo autorices, seleccionar variables de Production/Preview y comprar/configurar tu dominio con tu cuenta.
5. Elegir retención/responsable/almacenamiento de backups y ensayar restauración en un proyecto separado disponible para ese fin. No se sobrescribe la base real para ensayar.

Guías entregadas: SECURITY.md (arquitectura, riesgos y recuperación), DEPLOYMENT.md (pasos GitHub/Vercel/DNS/Auth), supabase/release-verification.sql (solo lectura) y la migración RC.
