import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const merchantOrderId = searchParams.get("merchantOrderId") || "N/A";
  const amount = searchParams.get("amount") || "N/A";
  const currency = searchParams.get("currency") || "EGP";
  const type = searchParams.get("type") || "product"; // wallet or product

  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyAndProcessTransaction = async () => {
      try {
        console.log('Starting transaction verification:', { merchantOrderId, type, amount, currency });

        // التحقق من المعاملة أولاً
        const { data: verificationData, error: verificationError } = await supabase.functions.invoke("verify-transaction", {
          body: { merchantOrderId },
        });

        if (verificationError || !verificationData?.success) {
          console.error('Verification failed:', verificationError || verificationData);
          setStatus("failed");
          setMessage("فشل في التحقق من المعاملة");
          return;
        }

        console.log('Verification result:', verificationData);

        if (verificationData.verified && verificationData.status === 'SUCCESS') {
          setStatus("success");
          
          // إذا كانت معاملة شحن محفظة، معالجة الشحن
          if (type === "wallet") {
            console.log('Processing wallet payment...');
            
            const { data: walletData, error: walletError } = await supabase.functions.invoke("process-wallet-payment", {
              body: { 
                merchantOrderId,
                transactionStatus: "SUCCESS",
                amount: parseFloat(amount),
                currency
              }
            });

            if (walletError) {
              console.error('Wallet processing error:', walletError);
              setStatus("failed");
              setMessage("فشل في معالجة شحن المحفظة");
              return;
            }

            console.log('Wallet processing result:', walletData);

            if (walletData?.success) {
              setMessage("تم شحن المحفظة بنجاح! يمكنك الآن استخدام رصيدك للتسوق.");
            } else {
              setStatus("failed");
              setMessage(walletData?.message || "فشل في معالجة شحن المحفظة");
            }
          } else {
            setMessage("تم الدفع بنجاح! شكراً لك على الشراء.");
          }
        } else {
          setStatus("failed");
          setMessage("المعاملة لم تكتمل بنجاح");
        }

      } catch (err) {
        console.error("Processing error:", err);
        setStatus("failed");
        setMessage("حدث خطأ أثناء معالجة المعاملة");
      }
    };

    if (merchantOrderId !== "N/A") {
      verifyAndProcessTransaction();
    } else {
      setStatus("failed");
      setMessage("معرف المعاملة مفقود");
    }
  }, [merchantOrderId, type, amount, currency]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-16 w-16 text-primary animate-spin mb-6" />
              <h1 className="text-2xl font-bold mb-2">جاري التحقق من المعاملة...</h1>
              <p className="mb-6">يرجى الانتظار بينما نتحقق من حالة الدفع</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-success mb-6" />
              <h1 className="text-2xl font-bold mb-2 text-right">
                {type === "wallet" ? "تم شحن المحفظة بنجاح! 🎉" : "تم الدفع بنجاح! 🎉"}
              </h1>
              <p className="mb-6 text-right">
                {message}
              </p>
              <div className="bg-muted rounded-lg p-4 mb-6 text-right">
                <h3 className="font-semibold mb-2">تفاصيل المعاملة</h3>
                <p className="text-sm">معرف الطلب: {merchantOrderId}</p>
                <p className="text-sm">المبلغ: {amount} {currency}</p>
                <p className="text-sm">الحالة: <span className="text-success font-medium">مكتملة ✓</span></p>
                {type === "wallet" && (
                  <p className="text-sm text-primary font-medium mt-2">
                    💳 تم إضافة {amount} {currency} إلى محفظتك
                  </p>
                )}
              </div>
              <Button asChild className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary">
                <Link to="/">
                  {type === "wallet" ? "عودة للتسوق" : "متابعة التسوق"}
                </Link>
              </Button>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-destructive mb-6" />
              <h1 className="text-2xl font-bold mb-2 text-right">فشلت المعاملة ❌</h1>
              <p className="mb-6 text-right text-muted-foreground">
                {message}
              </p>
              <div className="bg-muted rounded-lg p-4 mb-6 text-right">
                <h3 className="font-semibold mb-2">تفاصيل المعاملة</h3>
                <p className="text-sm">معرف الطلب: {merchantOrderId}</p>
                {amount !== "N/A" && <p className="text-sm">المبلغ: {amount} {currency}</p>}
                <p className="text-sm">الحالة: <span className="text-destructive font-medium">فاشلة ✗</span></p>
              </div>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link to="/">المحاولة مرة أخرى</Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;