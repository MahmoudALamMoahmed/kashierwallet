import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const merchantOrderId = searchParams.get("merchantOrderId") || "N/A";
  const amount = searchParams.get("amount") || "N/A";
  const currency = searchParams.get("currency") || "EGP";

  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");

  useEffect(() => {
    const verifyTransaction = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-transaction", {
          body: { merchantOrderId },
        });

        if (error || !data?.success) {
          setStatus("failed");
          return;
        }

        if (data.verified) {
          setStatus("success");
        } else {
          setStatus("failed");
        }

      } catch (err) {
        console.error("Verify error:", err);
        setStatus("failed");
      }
    };

    if (merchantOrderId !== "N/A") {
      verifyTransaction();
    }
  }, [merchantOrderId]);


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8">
          {status === "loading" && <p>Verifying payment...</p>}

          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-success mb-6" />
              <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
              <p className="mb-6">Thank you for your purchase.</p>
              <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold mb-2">Order Details</h3>
                <p>Order ID: {merchantOrderId}</p>
                <p>Amount: {currency} {amount}</p>
                <p>Status: <span className="text-success">Completed</span></p>
              </div>
              <Button asChild className="w-full">
                <Link to="/">Continue Shopping</Link>
              </Button>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-destructive mb-6" />
              <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
              <p className="mb-6">We could not verify your transaction.</p>
              <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold mb-2">Order Details</h3>
                <p>Order ID: {merchantOrderId}</p>
                <p>Status: <span className="text-destructive">Failed</span></p>
              </div>
              <Button asChild className="w-full">
                <Link to="/">Try Again</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
