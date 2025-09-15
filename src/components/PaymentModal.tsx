import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  const [paymentHash, setPaymentHash] = useState<string | null>(null);

  const generateOrderId = () => {
    return `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const generatePaymentHash = async (orderId: string) => {
    if (!product) return null;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-payment-hash', {
        body: {
          orderId,
          amount: product.price,
          currency: product.currency
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Error generating payment hash:', error);
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
    const hashData = await generatePaymentHash(orderId);
    
    if (!hashData) return;

    setPaymentHash(hashData.hash);

    // Remove any existing Kashier script first
    const existingScript = document.getElementById('kashier-checkout');
    if (existingScript) {
      existingScript.remove();
    }

    // Create and inject Kashier checkout script
    const script = document.createElement('script');
    script.id = 'kashier-checkout';
    script.src = 'https://payments.kashier.io/kashier-checkout.js';
    script.setAttribute('data-amount', product.price.toString());
    script.setAttribute('data-hash', hashData.hash);
    script.setAttribute('data-currency', product.currency);
    script.setAttribute('data-orderId', orderId);
    script.setAttribute('data-merchantId', hashData.merchantId);
    script.setAttribute('data-merchantRedirect', `${window.location.origin}/payment-success?orderId=${orderId}&amount=${product.price}&currency=${product.currency}`);
    script.setAttribute('data-failureRedirect', `${window.location.origin}/payment-failure?orderId=${orderId}&amount=${product.price}&currency=${product.currency}`);
    script.setAttribute('data-mode', 'test');
    script.setAttribute('data-type', 'external');
    script.setAttribute('data-display', 'en');
    script.setAttribute('data-redirectMethod', 'get');
    
    // Add script to head for better compatibility
    document.head.appendChild(script);
    
    // Close the modal after a short delay to allow the payment gateway to load
    setTimeout(() => {
      onClose();
    }, 1000);

    toast({
      title: "Payment Initialized",
      description: "Opening Kashier payment gateway...",
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setPaymentHash(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Complete Your Purchase
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
            <img 
              src={product.image} 
              alt={product.name}
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-2xl font-bold text-primary">
                {product.currency} {product.price}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Secure payment powered by Kashier</p>
            <p>• Test mode - No real charges will be made</p>
            <p>• You will be redirected to complete payment</p>
          </div>

          <Button 
            onClick={handlePayment}
            disabled={isLoading}
            className="w-full bg-shop-gradient hover:bg-primary-glow text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing Payment...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;