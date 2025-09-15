import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PaymentFailure = () => {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Clean up any remaining Kashier scripts
    const existingScript = document.getElementById('kashier-iframe');
    if (existingScript) {
      existingScript.remove();
    }
  }, []);

  const orderId = searchParams.get('orderId') || 'N/A';
  const errorMessage = searchParams.get('error') || 'Payment was cancelled or failed';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8">
          <div className="mb-6">
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Payment Failed
          </h1>
          
          <p className="text-muted-foreground mb-6">
            {errorMessage}
          </p>

          <div className="bg-muted rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold mb-2">Order Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="font-mono">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-destructive font-semibold">Failed</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              asChild 
              className="w-full bg-[var(--shop-gradient)] hover:bg-primary-glow"
            >
              <Link to="/">Try Again</Link>
            </Button>
            
            <p className="text-xs text-muted-foreground">
              If you continue to experience issues, please contact our support team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailure;