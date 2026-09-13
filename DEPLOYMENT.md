# Desplegar TVA en Vercel y conectar un .com

Esta guía es para una publicación futura autorizada. **No se publicó ni se hizo git push en esta auditoría.** No necesitas la versión alojada en ChatGPT. El destino preparado es Vercel con Next.js. El desarrollo existente sigue en localhost:5173.

## 1. Preparar y comprobar el proyecto

Instala Node.js 24 LTS y Git desde sus páginas oficiales. Abre una terminal en la carpeta con package.json. En una copia nueva, copia .env.example a .env y completa las variables públicas de Supabase. **En este equipo ya existe .env: no lo sobrescribas.** Ejecuta:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run test:components
npm run build
npm run test:production
npm run security:check
npm audit
```

El build principal genera Next.js para Vercel. `npm start` permite revisarlo localmente. `test:production` inicia y cierra su servidor temporal en 127.0.0.1:4174; ese puerto debe estar libre. Para seguir desarrollando usa `npm run dev`, normalmente en 127.0.0.1:5173. Nada de esto publica el sitio.

## 2. Preparar staging y la base de datos

Usa un proyecto Supabase separado para pruebas de pedidos, entregas y uploads. En una DB vacía aplica en SQL Editor las migraciones en este orden:

1. 202609100001_commerce.sql
2. 202609100002_security.sql
3. 202609110001_instructionals.sql
4. 202609120001_academy_photos.sql
5. 202609120002_release_hardening.sql

La base TVA existente ya tiene las cuatro primeras: **no repetirlas**. La quinta está probada localmente, pendiente de autorización para aplicarse en producción con respaldo y la nueva interfaz. Si detecta datos incompatibles, revierte la transacción: revisar las filas sin borrarlas a ciegas. La semilla es solo para una DB vacía, no para introducir pedidos ficticios en producción.

Ejecuta `supabase/release-verification.sql` para comprobar tablas, políticas, funciones y Storage. En staging crea un usuario administrativo de prueba y registra su UUID en admin_users como operador de Supabase. Prueba un pedido completo, confirmación manual, entrega, cancelación e imágenes. Las pruebas automatizadas de SQL usan una DB aislada y no modifican la real.

## 3. Subir a GitHub después de autorizarlo

Crea un repositorio privado en tu cuenta GitHub, sin README inicial si vas a subir este repositorio existente. En terminal revisa:

```powershell
git status
git diff
git check-ignore .env
```

No deben aparecer .env, claves ni backups entre los archivos a subir. Cuando revises y autorices el cambio:

```powershell
git add .
git commit -m "Preparar candidato de producción TVA"
git remote -v
git remote add github URL_DEL_REPOSITORIO_QUE_CREASTE
git push -u github main
```

Sustituye el marcador por la URL de tu repositorio. Si ya existe el remoto github, revisa su URL en lugar de añadirlo otra vez. Usa el inicio de sesión de Git Credential Manager; no escribas tokens en la URL. Estos comandos no se ejecutaron durante esta auditoría.

## 4. Conectar Vercel

En Vercel elige **Add New → Project**, conecta GitHub y permite acceso solo al repositorio TVA. Importa el repositorio. La carpeta raíz debe ser la que contiene package.json.

- Framework: Next.js.
- Node.js: 24.x.
- Build Command: `npm run build:vercel` (vercel.json lo fija explícitamente).
- Install Command: `npm ci`.
- Output Directory: `.next-production`, definido también en `vercel.json` para coincidir con `distDir` de `next.config.ts`. No usar `.next`, `dist` ni `public`.

No configurar rewrite universal a index.html: no es una SPA con React Router. Las fichas y administración usan App Router con render de servidor. Vercel no usa la configuración histórica .openai/hosting.json ni publica en ChatGPT.

## 5. Variables de entorno

En **Project Settings → Environment Variables** configura los valores sin pegarlos en el repositorio:

| Variable                             | Entorno                          | Valor que debes obtener                            |
| ------------------------------------ | -------------------------------- | -------------------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL             | Vercel Production/Preview        | URL HTTPS del proyecto Supabase correspondiente    |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Vercel Production/Preview        | Clave publicable o anon legacy, nunca service_role |
| PRIMARY_SITE_URL                     | Vercel Production, solo servidor | Origen HTTPS principal cuando elijas el .com       |
| VITE_SUPABASE_URL                    | .env local con Vite              | URL pública de Supabase                            |
| VITE_SUPABASE_PUBLISHABLE_KEY        | .env local con Vite              | Clave pública de Supabase                          |

En Preview usa Supabase de staging y deja PRIMARY_SITE_URL vacío para no redirigir al sitio real. También puedes dejarlo vacío mientras pruebas el dominio .vercel.app. Si configuras ambos pares VITE/NEXT_PUBLIC, deben coincidir; el build rechaza una mezcla de proyectos.

Las variables públicas son visibles por diseño; RLS protege los datos. Nunca poner contraseñas, DATABASE_URL, service_role ni secretos de pagos bajo VITE_ o NEXT_PUBLIC_. Esta aplicación no requiere esas claves privadas. Cambiar valores públicos requiere recompilar/redeploy. No conectes previews de ramas de terceros a datos reales.

## 6. Primer deployment

Solo después de tu autorización, pulsa **Deploy** y espera el estado Ready. Prueba la URL .vercel.app:

1. Inicio, academia, fotos, profesor, contacto y catálogo.
2. Abre una ficha real desde la URL y refresca en /tienda/... e /instruccionales/....
3. Abre /admin en incógnito: acceso privado, sin pedidos ni enlaces.
4. En staging prueba una cuenta normal: no debe administrar nada.
5. Comprueba imágenes, tráiler y ausencia de Mixed Content o errores CSP.
6. En staging crea un pedido, verifica total y stock, confirma pago manual, registra entrega y comprueba idempotencia/cancelación.
7. Activa MFA como titular, inicia sesión nuevamente y comprueba el desafío. La migración RC debe estar aplicada para exigir AAL2 también en REST/RPC/Storage.

No abrir tráfico público real hasta resolver los controles de Drive, MFA y recuperación documentados en SECURITY.md.

## 7. Comprar o utilizar un .com

Elige el dominio definitivo y cómpralo con tu cuenta en el registrador que prefieras. Activa renovación automática y MFA. Si ya tienes uno, conserva tu registrador. No se ha comprado ni reservado un dominio en esta auditoría.

En **Vercel → Project → Settings → Domains** añade el dominio raíz y www. Decide cuál será principal. Configura la otra variante como redirección hacia el principal, conservando ruta/query. Establece PRIMARY_SITE_URL con ese mismo origen, por ejemplo https://teamvivasacademy.com solo si realmente es tu dominio. No es obligatorio usar ese nombre.

## 8. DNS y www

Copia al panel DNS del registrador los valores exactos que Vercel muestre para tu proyecto:

| Tipo habitual   | Nombre          | Valor                              |
| --------------- | --------------- | ---------------------------------- |
| A               | @ (raíz)        | IPv4 exacta indicada por Vercel    |
| CNAME           | www             | Destino exacto indicado por Vercel |
| TXT, si se pide | Nombre mostrado | Valor de verificación mostrado     |

No uses una IP genérica ni el CNAME de otro proyecto. Si Vercel solicita otro registro, sigue sus valores actuales. Revisa antes de retirar A/AAAA/CNAME que entren en conflicto. **No borres MX, SPF, DKIM o DMARC** de tu correo. Si cambias nameservers, migra también esos registros.

Espera Valid Configuration; propagación y caché dependen del TTL. [Guía oficial de dominios Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## 9. HTTPS

Vercel gestiona certificados después de verificar dominio/DNS. Comprueba HTTPS válido en raíz y www, redirección desde HTTP y destino principal. Si tienes CAA, sigue los requisitos de Vercel; no ignores advertencias del navegador. El código emite HSTS sobre HTTPS sin includeSubDomains ni preload. No activar estos últimos hasta revisar todos los subdominios.

## 10. Supabase y autenticación en producción

En **Authentication → URL Configuration**, Site URL debe ser tu origen HTTPS principal. Conserva las URLs locales necesarias para desarrollo y añade únicamente URLs exactas realmente usadas por los flujos implementados.

Actualmente TVA usa correo/contraseña; no tiene OAuth, alta pública, recuperación ni magic links en su interfaz. No inventar una ruta /callback para una función inexistente. Si se agregan, implementar su callback/PKCE, autorizar sus Redirect URLs y probarlas antes de habilitarlas. detectSessionInUrl está deshabilitado intencionalmente.

Revisa antes de lanzar:

- Registro público desactivado si solo habrá administradores creados por el operador.
- Confirmación de email activa; el correo de administrador debe ser un buzón real bajo tu control.
- SMTP y dominio de correo verificados para mensajes de Auth; cambiar la dirección en la cuenta no crea un buzón.
- Políticas de contraseña, protección contra contraseñas filtradas si el plan la admite y límites de Auth.
- TOTP habilitado y enrolado por cada administrador; MFA también en las cuentas de infraestructura.
- No activar CAPTCHA en Auth sin integrar antes su token en el formulario, porque bloquearía el acceso.

TVA no añade CORS wildcard. Supabase gestiona su propio CORS: su clave pública no autoriza leer pedidos; RLS lo impide. No hay webhooks de pagos ni proveedores OAuth que actualizar hoy.

## 11. Pagos e instruccionales

La cuenta bancaria se edita desde Información. Verifica el movimiento bancario real, importe USD y referencia antes de confirmar la orden. Una captura del comprador no basta. No hay integración bancaria ni webhooks ficticios.

Antes de vender cada curso, configura Drive con acceso general Restringido y sin permisos públicos heredados. Añade como lector el correo confirmado del comprador después de comprobar pago. Prueba el enlace desde otra cuenta sin permisos. TVA no puede comprobar la configuración de Drive con su conexión actual. No poner enlaces premium en descripciones, notas públicas o tráiler, ni archivos premium en public.

## 12. Backups y restauración

Define responsable, frecuencia y retención. Exporta PostgreSQL según la guía de Supabase; respalda por separado objetos Storage y videos/permisos Drive. Cifra los backups, guarda una copia fuera del proveedor y fuera de Git. Un backup DB no contiene los archivos Storage. En Free no asumir restauraciones garantizadas: [documentación de backups](https://supabase.com/docs/guides/platform/backups).

Ensaya en staging: restaurar DB/objetos, comparar conteos de pedidos e ítems, stock, roles y políticas; probar permisos y MFA. Nunca restaurar sobre la base real para practicar. Un rollback del código en Vercel no revierte migraciones, pagos bancarios ni permisos Drive.

## 13. Actualizaciones posteriores

Trabaja en una rama, ejecuta los controles del paso 1 y revisa el diff. Un push puede generar un Preview; fusionar en la rama Production puede publicar automáticamente. No hagas push a esa rama sin intención y autorización de publicación. Revisa las migraciones en staging, mantén compatibilidad durante el cambio y conserva una versión anterior del código para rollback. Registra migraciones aplicadas; no reedites las ya aplicadas.

Durante esta auditoría no se conectó remotamente GitHub/Vercel, no se tocó DNS y no se modificó la versión de ChatGPT.
