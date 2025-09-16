import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { XCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const PaymentFailure = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "N/A";
  const errorMessage = searchParams.get("error") || "Payment was cancelled or failed";

  const [status, setStatus] = useState<"loading" | "failed" | "success">("loading");

  useEffect(() => {
    const verifyTransaction = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-transaction", {
          body: { orderId }
        });

        if (error || !data?.success) {
          setStatus("failed");
          return;
        }

        const txn = data.data?.transactions?.[0];
        if (txn && txn.status === "SUCCESS") {
          setStatus("success");
        } else {
          setStatus("failed");
        }
      } catch (err) {
        console.error("Verify error:", err);
        setStatus("failed");
      }
    };

    if (orderId !== "N/A") {
      verifyTransaction();
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8">
          {status === "loading" && <p>Verifying payment...</p>}

          {status === "failed" && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-destructive mb-6" />
              <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
              <p className="mb-6">{errorMessage}</p>
              <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold mb-2">Order Details</h3>
                <p>Order ID: {orderId}</p>
                <p>Status: <span className="text-destructive">Failed</span></p>
              </div>
              <Button asChild className="w-full">
                <Link to="/">Try Again</Link>
              </Button>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-success mb-6" />
              <h1 className="text-2xl font-bold mb-2">Payment Completed</h1>
              <p className="mb-6">Looks like your payment actually succeeded!</p>
              <Button asChild className="w-full">
                <Link to="/">Continue Shopping</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailure;
