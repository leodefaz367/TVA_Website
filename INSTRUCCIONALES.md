# Administración de instruccionales

## Activación

La actualización se aplicó y verificó en Supabase el 11 de septiembre de 2026. Para una instalación nueva, aplica `supabase/migrations/202609110001_instructionals.sql`, después de las migraciones `202609100001_commerce.sql` y `202609100002_security.sql`. La migración se ejecuta una sola vez y dentro de una transacción. No publica el sitio ni conecta Google Drive automáticamente. Debe aplicarse antes de desplegar el código actualizado; conviene disponer de una copia de seguridad de la base real.

La migración añade el tráiler público, una tabla privada para el enlace de Drive, el identificador del producto a los artículos históricos y un registro privado de entregas por artículo. Conserva cursos, módulos, recursos, precios históricos y pedidos existentes. No inventa fechas ni medios de entrega para órdenes antiguas ya entregadas.

## Preparar un instruccional

1. En **Administración → Instruccionales**, crea un borrador con nombre, dirección amigable y descripción.
2. Guarda el precio del acceso. El código interno se genera automáticamente. No se gestiona stock para instruccionales.
3. Sube una portada JPG, PNG o WebP de hasta 5 MB.
4. Guarda la presentación: entrenador, nivel, indicaciones públicas y, si deseas, tráiler.
5. Guarda el enlace privado de una carpeta o archivo de Drive. Configura el acceso general de Drive como **Restringido**.
6. Añade módulos únicamente si quieres mostrar un temario. Su orden se modifica mediante el número de posición. Las referencias anteriores por módulo siguen disponibles en una sección desplegable.
7. Abre la vista previa con los datos guardados. Después selecciona **Publicado** y guarda los datos generales.

Para publicar se exige presentación, precio activo y portada. No se exige tráiler ni módulos. El enlace de Drive debe estar guardado antes de registrar una entrega. Cada sección se guarda por separado. La vista previa no guarda ni publica y no permite añadir el borrador al carrito.

## Tráiler

Se admiten enlaces HTTPS de YouTube en formato `youtube.com/watch?v=IDENTIFICADOR`, `youtu.be/IDENTIFICADOR`, `/shorts/IDENTIFICADOR` o `/embed/IDENTIFICADOR`, con un identificador de once caracteres. Se construye una dirección de inserción de `www.youtube-nocookie.com`; no se acepta código HTML ni direcciones de otros proveedores. La política de seguridad permite únicamente ese origen para marcos.

El propietario debe permitir la inserción del video. Restricciones de edad, región, privacidad o bloqueo del proveedor pueden impedir la reproducción: la ficha ofrece un enlace para verlo en YouTube. El video promocional es público y no debe contener el material de pago. No se suben archivos de tráiler desde esta interfaz.

## Comprar y entregar

1. El comprador indica el correo de la cuenta de Google con la que abrirá Drive. No tiene que terminar en Gmail. La ayuda también aparece en carritos que combinan ropa e instruccionales.
2. La compra crea una orden pendiente. No cobra, no concede permisos y no envía enlaces automáticamente.
3. Verifica el pago fuera de la web y confirma la orden.
4. En Drive, añade como lector el correo mostrado en cada instruccional comprado.
5. Copia el mensaje propuesto y envíalo por WhatsApp, correo u otro medio. Copiar no registra la entrega.
6. Selecciona el medio utilizado, confirma que autorizaste el correo y enviaste el enlace, y pulsa **Registrar entrega de este artículo**.
7. En artículos físicos, confirma que entregaste todas las unidades de esa línea. La orden se cierra automáticamente cuando todas sus líneas tienen entrega registrada.

Una orden parcialmente entregada conserva el estado de pago confirmado y muestra el número de artículos entregados. Los reintentos no duplican entregas ni modifican su primera fecha. Una orden con entregas registradas no puede cancelarse mediante el botón general: una devolución o revocación requiere una revisión manual, para evitar devolver stock de productos que ya recibió el comprador. No hay un flujo automático de reembolsos o revocación de Drive.

## Seguridad y crecimiento futuro

- `instructional_courses.trailer_url` es público. El enlace de pago se guarda únicamente en `instructional_delivery_settings`, cuya lectura y escritura requiere una sesión administrativa vigente. El catálogo no consulta esa tabla.
- `order_item_deliveries` conserva fecha, medio, correo, enlace e indicaciones usados en la entrega. Solo los administradores pueden leerla y solo una función autorizada puede crear registros. No se permite editarlos o borrarlos desde el cliente.
- La función bloquea la orden durante cada entrega para coordinar cancelaciones y reintentos. La base impide cerrar una orden con artículos pendientes.
- Las compras tienen identificadores propios y conservan nombre, precio y código del artículo al comprar. El correo no es una clave primaria.
- En el futuro se pueden añadir perfiles asociados a Supabase Auth, relaciones entre cuentas y órdenes, y permisos por instruccional en esta misma base. No hace falta otra base de datos.
- Para reclamar compras anteriores habrá que verificar la identidad y la propiedad del correo mediante un proceso confiable, considerando cambios o reutilización de direcciones. Escribir el mismo correo durante el registro no debe conceder acceso. El historial debe protegerse con políticas específicas por usuario.

## Comprobación local

`npm test` verifica las transacciones y políticas con PostgreSQL temporal mediante PGlite; no modifica Supabase real. Incluye publicación sin módulos, protección de enlaces, entregas parciales, reintentos, bloqueo de cancelación, conservación histórica y revocación de permisos administrativos.

`npm run test:components` verifica el temario opcional, el tráiler, el precio digital y la confirmación manual, además de las pruebas previas de la tienda física. `npm run typecheck` comprueba los tipos y `npm run build` genera el sitio.

El acceso efectivo a una carpeta de Drive y la reproducción del tráiler real deben comprobarse con los archivos y permisos del propietario. Las pruebas locales no conceden permisos ni envían comunicaciones.

La revisión visual local utilizó los componentes reales con datos ficticios, a tamaños de móvil y escritorio. Se comprobó la ausencia de desplazamiento horizontal, los formularios de administración y entrega, y la reproducción de un video de demostración de YouTube. No se utilizaron cuentas de alumnos ni se modificó Supabase real.

## Transferencias bancarias

Los datos de Banco de Guayaquil se guardan en `site_settings`, clave `bank_transfer`. Se muestran en el resumen del carrito, al confirmar la orden y en el comprobante de orden recibida. Se modifican juntos desde Administración → Información → Cuenta para transferencias. El número de cuenta y la identificación se conservan como texto para no perder ceros iniciales.

El comprador registra su orden y envía el comprobante por los medios de contacto de la academia. El administrador verifica el ingreso en el banco antes de confirmar el pago. La web no consulta movimientos bancarios ni aprueba pagos por recibir un comprobante.
