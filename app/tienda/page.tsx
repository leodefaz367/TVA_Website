import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";

export default function TiendaPage(){
    return(
        <main>
            <section className="shop section page-section">
                <div className="shop-heading">
                    <div>
                        <span className="kicker">INDUMENTARIA TVA </span>

                        <h1>VISTE EL
                            <br />
                            <em>DARK SIDE.</em>
                        </h1>
                    </div>

                    <p> Equipamento diseñado para entrenar, competir y representar 
                        el darkside
                    </p>
                </div>

                <div className="product-grid">
                    {products.map((product)=> (
                        <ProductCard key={product.name} product={product} />
                        ))}
                </div>

                <p className="catalog-note">
                    Los precios, tallas y existencias se conectaran al inventario de la tienda.
                </p>
            </section>
        </main>
    )
}