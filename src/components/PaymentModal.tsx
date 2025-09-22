import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X, Wallet, CreditCard } from "lucide-react";
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
        title: "تم الشراء بنجاح! 🎉",
        description: `تم شراء ${product.name} من محفظتك. رصيدك الحالي: ${data.newBalance.toFixed(2)} ${product.currency}`,
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

  const handleDirectPayment = async () => {
    if (!product) return;

    try {
      setIsLoading(true);
      const orderId = generateOrderId();

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

      const baseUrl = "https://checkout.kashier.io";
      const queryParams = new URLSearchParams({
        merchantId: data.merchantId,
        orderId: orderId,
        amount: product.price.toString(),
        currency: product.currency,
        hash: data.hash,
        merchantRedirect: `${window.location.origin}/payment-success?merchantOrderId=${orderId}&amount=${product.price}&currency=${product.currency}`,
        failureRedirect: `${window.location.origin}/payment-failure?merchantOrderId=${orderId}&error=Payment%20failed`,
        redirect: "true",
        display: "ar",
        store: product.name,
        mode: "test",
        customerReference: data.customerReference || "1",
      });

      const checkoutUrl = `${baseUrl}?${queryParams.toString()}`;

      toast({
        title: "تم تهيئة الدفع",
        description: "سيتم توجيهك إلى بوابة الدفع...",
      });

      onClose();
      window.location.href = checkoutUrl;

    } catch (error: any) {
      console.error("Error generating payment hash:", error);
      toast({
        title: "خطأ في الدفع",
        description: "فشل في تهيئة الدفع. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!product) return null;

  const hasWallet = user && wallet;
  const canPayFromWallet = hasWallet && canAfford(product.price);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            إكمال عملية الشراء
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات المنتج */}
          <div className="flex items-center space-x-4 space-x-reverse p-4 bg-muted/30 rounded-lg">
            <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded" />
            <div className="flex-1">
              <h3 className="font-semibold text-right">{product.name}</h3>
              <p className="text-2xl font-bold text-primary text-right">
                {product.price} {product.currency}
              </p>
            </div>
          </div>

          {/* خيارات الدفع */}
          {hasWallet ? (
            <div className="space-y-4">
              <h4 className="font-medium text-right">طريقة الدفع المقترحة:</h4>
              
              {canPayFromWallet ? (
                <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Wallet className="h-6 w-6 text-primary flex-shrink-0" />
                    <div className="flex-1 text-right">
                      <p className="font-medium text-primary">الدفع من المحفظة ✨</p>
                      <p className="text-sm text-muted-foreground">
                        الرصيد المتاح: {wallet.balance.toFixed(2)} {wallet.currency}
                      </p>
                    </div>
                    <span className="text-xs text-green-600 bg-green-100 px-3 py-1 rounded-full">
                      متاح ✓
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-center space-x-3 space-x-reverse text-right">
                      <Wallet className="h-6 w-6 text-red-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-red-700">رصيد المحفظة غير كافي</p>
                        <p className="text-sm text-red-600">
                          الرصيد: {wallet.balance.toFixed(2)} {wallet.currency} | المطلوب: {product.price} {product.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-primary/30 rounded-lg bg-primary/5">
                    <div className="flex items-center space-x-3 space-x-reverse text-right">
                      <CreditCard className="h-6 w-6 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">الدفع المباشر عبر Kashier</p>
                        <p className="text-sm text-muted-foreground">
                          دفع فوري وآمن بالبطاقة الائتمانية
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 border border-muted rounded-lg bg-muted/30 text-center">
              <p className="text-muted-foreground">
                يرجى تسجيل الدخول أو إنشاء حساب لإتمام عملية الشراء
              </p>
            </div>
          )}

          {/* معلومات الأمان */}
          <div className="space-y-2 text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
            <p className="text-right">• دفع آمن ومشفر 🔒</p>
            <p className="text-right">• وضع التجربة - لن يتم خصم أموال حقيقية 🧪</p>
            <p className="text-right">• ضمان إرجاع الأموال خلال 30 يوم 💰</p>
          </div>

          {/* أزرار الدفع */}
          {hasWallet ? (
            canPayFromWallet ? (
              <Button
                onClick={handleWalletPayment}
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جاري الشراء من المحفظة...
                  </>
                ) : (
                  <>
                    <Wallet className="ml-2 h-5 w-5" />
                    شراء من المحفظة ({product.price} {product.currency})
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700 text-center">
                    💡 يمكنك شحن المحفظة أولاً أو استخدام الدفع المباشر
                  </p>
                </div>
                <Button
                  onClick={handleDirectPayment}
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      جاري تهيئة الدفع...
                    </>
                  ) : (
                    <>
                      <CreditCard className="ml-2 h-5 w-5" />
                      دفع مباشر عبر Kashier
                    </>
                  )}
                </Button>
              </div>
            )
          ) : (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">يرجى تسجيل الدخول أولاً</p>
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full"
              >
                إغلاق
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;