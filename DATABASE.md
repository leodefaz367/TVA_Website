# Modelo de datos TVA

El SQL de `supabase/migrations/202609100001_commerce.sql` y la semilla ya están aplicados al proyecto Supabase `rhdyhndfhqvgbudjcbip`. Se verificaron once tablas con RLS y el bucket product-images. No reejecutar la migración inicial; los cambios posteriores requieren una migración nueva. Las pruebas locales también crean este esquema en PostgreSQL embebido desechable.

## Tablas

Actualización aplicada en la base real el 11 de septiembre de 2026: `202609110001_instructionals.sql`. Añade `instructional_courses.trailer_url`, `order_items.product_id` (incluyendo los artículos anteriores), `instructional_delivery_settings` para el enlace privado de Drive y `order_item_deliveries` para el historial de entrega por artículo. Ambas tablas nuevas son privadas para administradores. No se crean cuentas de alumnos. Consulta [INSTRUCCIONALES.md](INSTRUCCIONALES.md).

| Tabla                 | Responsabilidad y relaciones                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| categories            | Nombre y slug único de la categoría                                                                    |
| products              | Producto físico o digital, slug único, descripción, categoría, estado, destacado y fechas              |
| product_variants      | FK producto; SKU único, color/talla únicos por producto, precio en centavos, stock disponible y estado |
| product_images        | FK producto y variante opcional del mismo producto; URL, alt, posición y portada                       |
| instructional_courses | Extensión 1:1 de un producto digital: entrenador, nivel y entrega                                      |
| instructional_modules | Temario público de un curso, ordenado por posición                                                     |
| instructional_media   | Referencias privadas de videos/recursos por módulo; solo administración                                |
| site_settings         | Información pública por clave, actualmente horarios y dirección                                        |
| admin_users           | UUID de Supabase Auth autorizado para administrar                                                      |
| orders                | Comprador, contacto, entrega, estado, total, fecha y clave de idempotencia                             |
| order_items           | Referencias a variantes y copia histórica de nombre, SKU, variante, cantidad y precio                  |

No hay tabla inventory independiente: existe exactamente una cantidad de stock por variante, por lo que separarla añadiría una relación 1:1 innecesaria en esta etapa. Un registro de movimientos sería una ampliación futura. Los cursos reutilizan products/variants para evitar duplicar carrito, precios y órdenes; instructional_courses conserva sus atributos específicos.

No se guardan contraseñas: Auth se ocupa de ellas. No se guardan imágenes ni videos binarios en PostgreSQL.

## Dinero y disponibilidad

Los importes son enteros en centavos USD. Cada variante tiene su precio. El catálogo muestra el menor precio y el prefijo Desde cuando hay precios distintos. Los productos sin variantes disponibles no se pueden comprar.

Las variantes físicas tienen stock finito. Las variantes digitales tienen color y talla vacíos y stock cero; la combinación única impide crear dos variantes digitales para el mismo curso. Se permite un acceso por curso y orden. El tipo de producto es inmutable para evitar cambiar el significado del inventario histórico.

Las imágenes vinculadas a una variante deben pertenecer al mismo producto, verificado por clave foránea compuesta. Un índice parcial permite una sola portada por producto. `set_primary_image` cambia la portada transaccionalmente.

## Crear orden

`create_order(p_key uuid, p_customer jsonb, p_items jsonb)`:

1. Valida estructura, máximo 50 líneas, cantidades enteras 1–99 y ausencia de variantes repetidas.
2. Serializa solicitudes con la misma clave mediante bloqueo asesor transaccional.
3. Si ya existe la solicitud, compara su huella y devuelve la misma referencia sin volver a reservar.
4. Valida datos de contacto mediante restricciones de PostgreSQL.
5. Bloquea las variantes en orden de UUID para reducir riesgo de interbloqueos.
6. Verifica variante activa, producto publicado, precio esperado y stock.
7. Reserva existencias físicas y guarda los precios obtenidos de la base.
8. Guarda subtotal/total y devuelve únicamente referencia, total y estado.

Un error revierte toda la transacción. Los importes enviados por un cliente no determinan el precio cobrado. Un precio esperado distinto causa rechazo para que el comprador confirme nuevamente.

No hay API pública de lectura de órdenes. El navegador recibe el comprobante mínimo de la creación; la administración consulta los datos completos. El comprador debe conservar la referencia o contactar a la academia.

## Estados

- pending → confirmed: pago/acuerdo verificado manualmente.
- confirmed → fulfilled: todos los artículos tienen una entrega registrada; la función `record_item_delivery` cierra la orden al completar la última línea.
- pending o confirmed → cancelled: devuelve existencias físicas, únicamente si no hay entregas registradas.
- cancelled y fulfilled son terminales.
- Repetir el mismo estado es una operación inocua.

`change_order_status` comprueba rol administrativo, bloquea la orden y restaura stock una sola vez. Las escrituras directas en orders/order_items están revocadas a clientes. Las órdenes y variantes referenciadas no se eliminan desde el panel.

La expiración automática de reservas no está implementada. Revisar y cancelar órdenes abandonadas forma parte de la operación manual actual.

## Permisos

- Anónimo: lectura del catálogo publicado, variantes activas, imágenes, temario e información pública; puede solicitar una orden por RPC.
- Autenticado sin admin_users: mismos permisos comerciales públicos; no administra.
- Administrador: CRUD de catálogo y contenido; lectura de órdenes; cambio de estado mediante RPC.
- Nadie puede asignarse permisos administrativos desde la web.
- Media privada no tiene política pública de lectura.
- Funciones elevadas fijan search_path vacío, califican tablas y restringen ejecución.
- Las tablas habilitan RLS y reciben permisos explícitos.
- product-images es un bucket público de imágenes de catálogo; solo administradores pueden escribir. Admite JPEG, PNG y WebP, hasta 5 MB.

La clave publicable no sustituye las políticas. Nunca se debe conectar el frontend con service_role.

## Datos iniciales y conservación

`npm run db:seed:generate` lee el catálogo histórico y genera SQL repetible que conserva registros existentes. Los siete productos originales se cargan como borradores. Sus precios originales se retienen; no se declara stock real ni se inventan variantes comercializables. Un administrador debe corregir y activar los datos.

Las rutas originales /assets continúan funcionando sin copiar imágenes a Storage. Nuevas cargas utilizan Storage. Retirar una imagen elimina su relación; el archivo permanece disponible para revisión y limpieza posterior.

## Verificación y siguientes pasos

Las pruebas ejecutan migración y semilla en PGlite, comprueban repetibilidad, rollback, precio histórico, stock, idempotencia, restricciones digitales, roles y cancelación. PGlite usa una conexión; no acredita cargas concurrentes de compradores.

`npm run db:check` requiere la instancia Supabase y comprueba lecturas públicas, relaciones REST y restricciones anónimas. Deben verificarse además login administrativo, Storage real, usuarios sin privilegios y concurrencia desde clientes independientes.

Antes del despliegue: revisar políticas con el Security Advisor, aplicar límites antiabuso para reservas públicas, definir expiración de pendientes, auditoría de cambios, backups y recuperación. No habilitar operaciones comerciales públicas sin esa validación.
