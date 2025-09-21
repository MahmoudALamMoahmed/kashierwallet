import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";

interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  description: string;
}

interface PaymentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const PaymentModal = ({ product, isOpen, onClose }: PaymentModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'direct'>('wallet');
  const { wallet, user, canAfford, refreshWallet } = useWallet();

  const generateOrderId = () => {
    return `order-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  };

  const handleWalletPayment = async () => {
    if (!product || !user) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke("process-wallet-purchase", {
        body: {
          userId: user.id,
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          currency: product.currency,
        },
      });

      if (error) {
        console.error("Wallet payment error:", error);
        throw new Error(error.message);
      }

      if (!data.success) {
        toast({
          title: "فشل في الدفع",
          description: data.message || "حدث خطأ أثناء الدفع من المحفظة",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "تم الشراء بنجاح!",
        description: `تم شراء ${product.name} من محفظتك. رصيدك الحالي: ${data.newBalance} ${product.currency}`,
      });

      await refreshWallet();
      onClose();

    } catch (error: any) {
      console.error("Error in wallet payment:", error);
      toast({
        title: "خطأ في الدفع",
        description: error.message || "حدث خطأ أثناء الدفع من المحفظة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createCheckoutSession = async (orderId: string) => {
    if (!product) return null;

    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke("generate-payment-hash", {
        body: {
          orderId,
          amount: product.price,
          currency: product.currency,
        },
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error("Error generating payment hash:", error);
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!product) return;

    const orderId = generateOrderId();
    const hashData = await createCheckoutSession(orderId);

    if (!hashData) return;

    const baseUrl = "https://checkout.kashier.io";
    const queryParams = new URLSearchParams({
      merchantId: hashData.merchantId,
      orderId: orderId,
      amount: product.price.toString(),
      currency: product.currency,
      hash: hashData.hash,
      merchantRedirect: `${window.location.origin}/payment-success?merchantOrderId=${orderId}&amount=${product.price}&currency=${product.currency}`,
      failureRedirect: `${window.location.origin}/payment-failure?merchantOrderId=${orderId}&error=Payment%20failed`,
      redirect: "true",
      display: "en",
      store: product.name,
      mode: "test",
      customerReference: hashData.customerReference || "1",
    });

    const checkoutUrl = `${baseUrl}?${queryParams.toString()}`;

    console.log("Redirecting to:", checkoutUrl);

    toast({
      title: "Payment Initialized",
      description: "Redirecting to Kashier payment gateway...",
    });

    onClose();
    window.location.href = checkoutUrl;
  };

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setPaymentMethod('wallet');
    }
  }, [isOpen]);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            إكمال عملية الشراء
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
            <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded" />
            <div className="flex-1">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-2xl font-bold text-primary">
                {product.currency} {product.price}
              </p>
            </div>
          </div>

          {/* طريقة الدفع */}
          {user && wallet && (
            <div className="space-y-3">
              <h4 className="font-medium">اختر طريقة الدفع:</h4>
              
              <div className="space-y-2">
                {/* الدفع بالمحفظة */}
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setPaymentMethod('wallet')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input 
                        type="radio" 
                        checked={paymentMethod === 'wallet'} 
                        onChange={() => setPaymentMethod('wallet')}
                      />
                      <Wallet className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">الدفع من المحفظة</p>
                        <p className="text-sm text-muted-foreground">
                          الرصيد المتاح: {wallet.balance.toFixed(2)} {wallet.currency}
                        </p>
                      </div>
                    </div>
                    {canAfford(product.price) ? (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        متاح
                      </span>
                    ) : (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                        غير كافي
                      </span>
                    )}
                  </div>
                </div>

                {/* الدفع المباشر */}
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'direct' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setPaymentMethod('direct')}
                >
                  <div className="flex items-center space-x-3">
                    <input 
                      type="radio" 
                      checked={paymentMethod === 'direct'} 
                      onChange={() => setPaymentMethod('direct')}
                    />
                    <div>
                      <p className="font-medium">الدفع المباشر</p>
                      <p className="text-sm text-muted-foreground">
                        عبر بوابة Kashier
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• دفع آمن مدعوم بواسطة Kashier</p>
            <p>• وضع التجربة - لن يتم خصم أموال حقيقية</p>
            {paymentMethod === 'direct' && <p>• سيتم توجيهك لإكمال الدفع</p>}
          </div>

          {/* أزرار الدفع */}
          {user && paymentMethod === 'wallet' ? (
            <Button
              onClick={handleWalletPayment}
              disabled={isLoading || !canAfford(product.price)}
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الشراء...
                </>
              ) : (
                `شراء من المحفظة (${product.price} ${product.currency})`
              )}
            </Button>
          ) : (
            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full bg-shop-gradient hover:bg-primary-glow text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري تهيئة الدفع...
                </>
              ) : (
                "متابعة للدفع"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;