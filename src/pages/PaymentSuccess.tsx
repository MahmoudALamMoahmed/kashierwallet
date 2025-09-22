import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const merchantOrderId = searchParams.get("merchantOrderId") || "N/A";
  const amount = searchParams.get("amount") || "N/A";
  const currency = searchParams.get("currency") || "EGP";
  const type = searchParams.get("type") || "product";

  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [verificationData, setVerificationData] = useState<any>(null);

  useEffect(() => {
    const verifyAndProcessTransaction = async () => {
      try {
        console.log('Starting transaction verification:', { merchantOrderId, type, amount, currency });

        // التحقق من المعاملة أولاً
        const { data: verificationResult, error: verificationError } = await supabase.functions.invoke("verify-transaction", {
          body: { merchantOrderId },
        });

        console.log('Verification response:', verificationResult);
        console.log('Verification error:', verificationError);

        setVerificationData(verificationResult);
        
        if (verificationResult?.debug) {
          setDebugInfo(verificationResult.debug);
        }

        if (verificationError || !verificationResult?.success) {
          console.error('Verification failed:', verificationError || verificationResult);
          setStatus("failed");
          setMessage(`فشل في التحقق من المعاملة: ${verificationError?.message || 'خطأ غير محدد'}`);
          return;
        }

        console.log('Verification result details:', {
          verified: verificationResult.verified,
          status: verificationResult.status,
          statusCategory: verificationResult.statusCategory
        });

        // تحسين منطق التحقق
        if (verificationResult.verified || verificationResult.statusCategory === 'SUCCESS') {
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

            console.log('Wallet processing result:', walletData);
            console.log('Wallet processing error:', walletError);

            if (walletError) {
              console.error('Wallet processing error:', walletError);
              setStatus("failed");
              setMessage(`فشل في معالجة شحن المحفظة: ${walletError.message}`);
              return;
            }

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
          setMessage(`المعاملة لم تكتمل بنجاح. الحالة: ${verificationResult.status}`);
        }

      } catch (err: any) {
        console.error("Processing error:", err);
        setStatus("failed");
        setMessage(`حدث خطأ أثناء معالجة المعاملة: ${err.message}`);
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
                {verificationData && (
                  <p className="text-sm">حالة Kashier: <span className="font-mono text-xs">{verificationData.status}</span></p>
                )}
                {type === "wallet" && (
                  <p className="text-sm text-primary font-medium mt-2">
                    💳 تم إضافة {amount} {currency} إلى محفظتك
                  </p>
                )}
              </div>
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
                {verificationData && (
                  <>
                    <p className="text-sm">حالة Kashier: <span className="font-mono text-xs">{verificationData.status}</span></p>
                    <p className="text-sm">التحقق: <span className="font-mono text-xs">{verificationData.verified ? "✓" : "✗"}</span></p>
                  </>
                )}
              </div>
            </>
          )}

          {/* معلومات التشخيص */}
          {debugInfo && (
            <Collapsible className="mb-6">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Info className="h-4 w-4 mr-2" />
                  عرض معلومات التشخيص
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="bg-muted/50 rounded-lg p-4 text-left">
                  <h4 className="font-semibold mb-2 text-right">معلومات التشخيص:</h4>
                  <div className="text-xs space-y-2">
                    {debugInfo.matchedSuccessKeywords?.length > 0 && (
                      <p>✅ كلمات النجاح: {debugInfo.matchedSuccessKeywords.join(', ')}</p>
                    )}
                    {debugInfo.matchedFailureKeywords?.length > 0 && (
                      <p>❌ كلمات الفشل: {debugInfo.matchedFailureKeywords.join(', ')}</p>
                    )}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-primary">الرد الكامل من Kashier</summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-40 bg-black/5 p-2 rounded">
                        {JSON.stringify(debugInfo.originalResponse, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="space-y-3">
            <Button asChild className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary">
              <Link to="/">
                {status === "success" 
                  ? (type === "wallet" ? "عودة للتسوق" : "متابعة التسوق")
                  : "المحاولة مرة أخرى"
                }
              </Link>
            </Button>
            {status === "failed" && (
              <p className="text-xs text-muted-foreground">
                إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني مع تقديم معرف الطلب
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;