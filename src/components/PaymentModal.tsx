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

    // Remove any existing Kashier script first
    const existingScript = document.getElementById('kashier-checkout');
    if (existingScript) {
      existingScript.remove();
    }

    // Create form data for payment
    const paymentData = {
      amount: product.price.toString(),
      hash: hashData.hash,
      currency: product.currency,
      orderId: orderId,
      merchantId: hashData.merchantId,
      merchantRedirect: `${window.location.origin}/payment-success?orderId=${orderId}&amount=${product.price}&currency=${product.currency}`,
      failureRedirect: `${window.location.origin}/payment-failure?orderId=${orderId}&error=Payment%20failed`,
      mode: 'test',
      display: 'en',
      redirectMethod: 'get',
      customerReference: hashData.customerReference || '1',
      metaData: JSON.stringify({
        'Customer Name': 'Test Customer',
        'Customer Email': 'test@example.com'
      })
    };

    // Create the Kashier script with proper configuration
    const script = document.createElement('script');
    script.id = 'kashier-checkout';
    script.src = 'https://checkout.kashier.io/kashier-checkout.js';
    
    // Set all required data attributes according to Kashier documentation
    Object.entries(paymentData).forEach(([key, value]) => {
      script.setAttribute(`data-${key}`, value);
    });

    // Add the script to head (as recommended by Kashier)
    document.head.appendChild(script);
    
    // Wait for the script to load and initialize
    script.onload = () => {
      console.log('Kashier script loaded successfully');
      // Close modal after script loads
      setTimeout(() => {
        onClose();
      }, 1000);
    };

    script.onerror = () => {
      console.error('Failed to load Kashier script');
      toast({
        title: "Payment Error", 
        description: "Failed to load payment gateway. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    };

    toast({
      title: "Payment Initialized",
      description: "Opening Kashier payment gateway...",
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      // Clean up any existing scripts when modal closes
      const existingScript = document.getElementById('kashier-checkout');
      if (existingScript) {
        existingScript.remove();
      }
    }
  }, [isOpen]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      const existingScript = document.getElementById('kashier-checkout');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

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