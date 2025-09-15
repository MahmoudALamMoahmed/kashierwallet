import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Clean up any remaining Kashier scripts
    const existingScript = document.getElementById('kashier-iframe');
    if (existingScript) {
      existingScript.remove();
    }
  }, []);

  const orderId = searchParams.get('orderId') || 'N/A';
  const amount = searchParams.get('amount') || 'N/A';
  const currency = searchParams.get('currency') || 'EGP';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8">
          <div className="mb-6">
            <CheckCircle className="mx-auto h-16 w-16 text-success" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Payment Successful!
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Thank you for your purchase. Your payment has been processed successfully.
          </p>

          <div className="bg-muted rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold mb-2">Order Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="font-mono">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span>{currency} {amount}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-success font-semibold">Completed</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              asChild 
              className="w-full bg-[var(--shop-gradient)] hover:bg-primary-glow"
            >
              <Link to="/">Continue Shopping</Link>
            </Button>
            
            <p className="text-xs text-muted-foreground">
              A confirmation email will be sent to your registered email address.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;