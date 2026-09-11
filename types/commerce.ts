export type ProductKind = "physical" | "course";
export type ProductStatus = "draft" | "active" | "archived";
export interface Category {
  id: string;
  name: string;
  slug: string;
}
export interface Variant {
  id: string;
  product_id: string;
  sku: string;
  color: string;
  size: string;
  price_cents: number;
  stock: number;
  active: boolean;
}
export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  url: string;
  alt: string;
  position: number;
  is_primary: boolean;
}
export interface Course {
  product_id: string;
  trainer: string;
  level: string;
  delivery_note: string;
  trailer_url?: string;
}
export interface DeliverySettings {
  product_id: string;
  drive_url: string;
}
export type DeliveryChannel = "whatsapp" | "email" | "other" | "pickup";
export interface ItemDelivery {
  id: string;
  order_item_id: string;
  delivered_at: string;
  channel: DeliveryChannel;
  recipient_email: string;
  drive_url: string | null;
  delivery_note: string;
}
export interface CourseModule {
  id: string;
  product_id: string;
  title: string;
  description: string;
  position: number;
}
export interface InstructionalMedia {
  id: string;
  module_id: string;
  title: string;
  resource: string;
}
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string | null;
  kind: ProductKind;
  status: ProductStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
  product_variants: Variant[];
  product_images: ProductImage[];
  instructional_courses: Course | null;
  instructional_modules: CourseModule[];
}
export interface CartLine {
  variant_id: string;
  product_id: string;
  name: string;
  slug: string;
  kind: ProductKind;
  label: string;
  image: string;
  quantity: number;
  price_cents: number;
  max: number;
}
export interface Customer {
  name: string;
  email: string;
  phone: string;
  delivery_method: "pickup" | "digital";
  notes: string;
}
export type OrderStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";
export interface OrderReceipt {
  id: string;
  total_cents: number;
  status: OrderStatus;
}
export interface OrderItem {
  id: string;
  product_id?: string;
  order_item_deliveries?: ItemDelivery | null;
  variant_id: string;
  product_name: string;
  variant_label: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
  kind: ProductKind;
}
export interface Order extends OrderReceipt {
  customer_name: string;
  email: string;
  phone: string;
  delivery_method: string;
  notes: string;
  subtotal_cents: number;
  created_at: string;
  order_items: OrderItem[];
}
