type Product ={
    name: string;
    type: string;
    image: string;
}
type ProductCardProps = {
    product: Product;
}
export default function ProductCard({product,}: ProductCardProps) {
    return(
        <article className="product-card">
            <div className="product-image">
            <img src={product.image} alt={product.name}/>
            <span>TVA</span>
            </div>

            <div className= "product-info">
                <div>
                    <small>{product.type}</small>
                    <h3>{product.name}</h3>
                    <p>Precio por confirmar</p>
                </div>

                <button type="button" aria-label={`Ver ${product.name}`}>
                    →
                    </button>
            </div>
        </article>
    )
}