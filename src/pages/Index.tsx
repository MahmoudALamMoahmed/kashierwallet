import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import PaymentModal from "@/components/PaymentModal";
import { WalletComponent } from "@/components/WalletComponent";
import { AuthComponent } from "@/components/AuthComponent";
import { useWallet } from "@/hooks/useWallet";
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
    name: "سماعات لاسلكية متطورة",
    price: 299,
    currency: "EGP",
    image: headphonesImg,
    description: "استمتع بصوت نقي وواضح مع سماعاتنا اللاسلكية المتطورة مع إلغاء الضوضاء وبطارية تدوم 30 ساعة.",
  },
  {
    id: "2",
    name: "ساعة ذكية للياقة البدنية",
    price: 599,
    currency: "EGP",
    image: smartwatchImg,
    description: "تتبع أهدافك الرياضية مع GPS ومراقب نبضات القلب والإشعارات الذكية. تصميم مقاوم للماء للحياة النشطة.",
  },
];

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const { user, refreshWallet } = useWallet();

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
              <p className="text-muted-foreground mt-1">متجر إلكتروني مع نظام محفظة آمن</p>
            </div>
            <div className="flex items-center space-x-4">
              <WalletComponent />
              <AuthComponent user={user} onAuthChange={refreshWallet} />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            اكتشف التكنولوجيا المميزة
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            تسوق من مجموعتنا المختارة من المنتجات التقنية المتطورة مع نظام محفظة آمن
          </p>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-foreground mb-2">المنتجات المميزة</h3>
            <p className="text-muted-foreground">منتجات منتقاة بعناية وعالية الجودة</p>
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
            © 2024 TechStore. دفع آمن مع نظام المحفظة الإلكترونية.
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
