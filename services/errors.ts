import { ValidationError } from "../utils/validation-error";
const messages: Record<string, string> = {
  INVALID_BANK_SETTINGS: "Revisa los datos de la cuenta bancaria.",
  VARIANT_PRODUCT_IMMUTABLE:
    "Una variante no puede trasladarse a otro producto.",
  mfa_verification_failed:
    "El código no es válido o ya venció. Inténtalo nuevamente.",
  over_request_rate_limit:
    "Hay demasiados intentos. Espera antes de volver a intentar.",
  DELIVERY_PENDING:
    "Todavía hay artículos sin entregar. Registra cada entrega antes de cerrar la orden.",
  COURSE_PUBLICATION_INCOMPLETE:
    "Guarda la presentación, el precio y una portada antes de publicar. El temario es opcional.",
  DELIVERY_ALREADY_RECORDED:
    "Esta orden tiene entregas registradas. Revisa la devolución y los accesos manualmente antes de gestionar una cancelación.",
  PAYMENT_NOT_CONFIRMED: "Primero verifica el pago y confirma la orden.",
  INVALID_DELIVERY_CHANNEL: "Selecciona un medio de entrega válido.",
  DRIVE_LINK_REQUIRED:
    "Guarda el enlace privado de Drive en el instruccional antes de registrar la entrega.",
  PGRST116:
    "El registro cambió o ya no está disponible. Actualiza antes de guardar.",
  ORDER_RATE_LIMIT:
    "Hay demasiadas solicitudes. Espera antes de volver a intentarlo.",
  INVALID_ORDER: "Revisa los datos de tu pedido.",
  INVALID_ITEMS: "Revisa los artículos de tu carrito.",
  INVALID_QUANTITY: "Revisa las cantidades de tu carrito.",
  "23503":
    "El registro relacionado ya no está disponible. Actualiza la página.",
  "40001":
    "Los datos cambiaron durante la operación. Actualiza y vuelve a intentarlo.",
  "40P01": "Otra operación está actualizando estos datos. Vuelve a intentarlo.",
  PRICE_CHANGED:
    "El precio cambió. Revisa el carrito antes de confirmar de nuevo.",
  INSUFFICIENT_STOCK:
    "El stock cambió. Revisa el carrito y ajusta las cantidades.",
  VARIANT_UNAVAILABLE: "Una variante ya no está disponible. Revisa tu carrito.",
  PRODUCT_UNAVAILABLE:
    "Un producto dejó de estar disponible. Revisa tu carrito.",
  REQUEST_CONFLICT: "La solicitud cambió. Vuelve a revisar el carrito.",
  INVALID_TRANSITION: "Ese cambio de estado no está permitido.",
  FORBIDDEN: "No tienes permisos administrativos.",
  "Invalid login credentials": "Correo o contraseña incorrectos.",
  "23505":
    "Ya existe un registro con ese slug, SKU o combinación de variantes.",
  "23514": "Los datos no cumplen las validaciones de la base de datos.",
  "42501": "No tienes permiso para realizar esta acción.",
};
export function errorMessage(error: unknown): string {
  const e = error as { message?: string; code?: string };
  const match = Object.keys(messages).find(
    (key) => e?.message?.includes(key) || e?.code === key,
  );
  if (match) return messages[match];
  if (error instanceof ValidationError) return error.message;
  return "No se pudo completar la operación. Comprueba la conexión y vuelve a intentarlo.";
}
