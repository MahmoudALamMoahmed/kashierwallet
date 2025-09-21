import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import PaymentModal from "@/components/PaymentModal";
import { WalletComponent } from "@/components/WalletComponent";
import headphonesImg from "@/assets/headphones.jpg";
import smartwatchImg from "@/assets/smartwatch.jpg";

interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  description: string;
}

const products: Product[] = [
  {
    id: "1",
    name: "Premium Wireless Headphones",
    price: 299,
    currency: "EGP",
    image: headphonesImg,
    description: "Experience crystal-clear sound with our premium wireless headphones featuring noise cancellation and 30-hour battery life.",
  },
  {
    id: "2",
    name: "Smart Fitness Watch",
    price: 599,
    currency: "EGP",
    image: smartwatchImg,
    description: "Track your fitness goals with GPS, heart rate monitoring, and smart notifications. Waterproof design for active lifestyles.",
  },
];

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleBuyProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">TechStore</h1>
              <p className="text-muted-foreground mt-1">Premium tech products with secure payment</p>
            </div>
            <div className="flex-shrink-0">
              <WalletComponent />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Discover Premium Tech
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Shop our curated collection of cutting-edge technology products with secure Kashier payment integration
          </p>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-foreground mb-2">Featured Products</h3>
            <p className="text-muted-foreground">Carefully selected premium items</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onBuy={handleBuyProduct}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2024 TechStore. Secure payments powered by Kashier.
          </p>
        </div>
      </footer>

      <PaymentModal
        product={selectedProduct}
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
      />
    </div>
  );
};

export default Index;
