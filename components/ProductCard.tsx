import Link from "next/link";
import type { Product } from "@/data/products"

type ProductCardProps = {
    product: Product;
}
export default function ProductCard({product,}: ProductCardProps) {
    return(
                <Link
                    className="product-card-link"
                    href={`/tienda/${product.slug}`}
                    aria-label={`Ver ${product.name}`}
                >
                    <article className="product-card">
                        <div className="product-image">
                            <img src={product.image} alt={product.name} />
                            <span>TVA</span>
                        </div>

                        <div className="product-info">
                            <div>
                                <small>{product.type}</small>
                                <h3>{product.name}</h3>
                            
                                <p>
                                    {product.price ===null ? "Precio por confirmar"
                                    : new Intl.NumberFormat("es-Ec", {
                                        style: "currency",
                                        currency: "USD",
                                    }).format(product.price)}
                                </p>
                            </div>

                            <span className="product-link" aria-hidden="true">
                                    →
                            </span>
                        </div>
                    </article>    
                </Link>
    )
}