import { products } from "@/data/products";

type ProductPageProps= {
    params: Promise<{
        slug:string;
    }>;
};

export default async function ProductPage({params,}: ProductPageProps){
    const {slug} = await params;

    const product = products.find(
        (currentProduct)=> currentProduct.slug ===slug,
    );

    if (!product){
        return(
            <main>
                <section className="section page-section">
                    <h1>Producto no encontrado</h1>
                </section>
            </main>
        );
    }

    return (
        <main>
            <section className="product-detail section page-section">
                <div className="product-detail-image">
                    <img src={product.image} alt={product.name} />
                </div>

                <div className="product-detail-info">
                    <span className="kicker">{product.type}</span>

                    <h1> {product.name}</h1>

                    <p>{product.description}</p>

                    <p className="product-detail-price">
                        Precio: ${product.price}
                    </p>

                    <button className="button button-primary" type="button" disabled>
                        Carrito próximamente
                    </button>
                </div>
            </section>
        </main>
    )
}  
