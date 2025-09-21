import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, Banknote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';

interface WalletDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletDepositModal = ({ isOpen, onClose }: WalletDepositModalProps) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, refreshWallet } = useWallet();

  const predefinedAmounts = [50, 100, 200, 500, 1000];

  const generateOrderId = () => {
    return `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  };

  const handleDeposit = async () => {
    if (!user || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const orderId = generateOrderId();
      const depositAmount = parseFloat(amount);

      // إنشاء معاملة في قاعدة البيانات
      const { data: transaction, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert([{
          user_id: user.id,
          wallet_id: user.id, // سيتم تحديث هذا بعد جلب المحفظة
          transaction_type: 'deposit',
          amount: depositAmount,
          currency: 'EGP',
          description: `شحن محفظة بمبلغ ${depositAmount} جنيه`,
          merchant_order_id: orderId,
          status: 'pending'
        }])
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
        throw new Error('فشل في إنشاء المعاملة');
      }

      // إنتاج hash للدفع
      const { data: hashData, error: hashError } = await supabase.functions.invoke("generate-payment-hash", {
        body: {
          orderId,
          amount: depositAmount,
          currency: 'EGP',
        },
      });

      if (hashError || hashData?.error) {
        throw new Error(hashData?.error || 'فشل في إنتاج hash للدفع');
      }

      // توجيه إلى صفحة الدفع
      const baseUrl = "https://checkout.kashier.io";
      const queryParams = new URLSearchParams({
        merchantId: hashData.merchantId,
        orderId: orderId,
        amount: depositAmount.toString(),
        currency: 'EGP',
        hash: hashData.hash,
        merchantRedirect: `${window.location.origin}/payment-success?merchantOrderId=${orderId}&amount=${depositAmount}&currency=EGP&type=wallet`,
        failureRedirect: `${window.location.origin}/payment-failure?merchantOrderId=${orderId}&error=فشل في شحن المحفظة&type=wallet`,
        redirect: "true",
        display: "ar",
        store: "شحن المحفظة",
        mode: "test",
        customerReference: hashData.customerReference || "1",
        description: `شحن محفظة بمبلغ ${depositAmount} جنيه`,
      });

      const checkoutUrl = `${baseUrl}?${queryParams.toString()}`;

      toast({
        title: "تم تهيئة الدفع",
        description: "سيتم توجيهك إلى صفحة الدفع...",
      });

      onClose();
      window.location.href = checkoutUrl;

    } catch (error: any) {
      console.error('Deposit error:', error);
      toast({
        title: "خطأ في الشحن",
        description: error.message || "حدث خطأ أثناء شحن المحفظة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 space-x-reverse">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>شحن المحفظة</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* المبالغ المحددة مسبقاً */}
          <div>
            <Label className="text-sm font-medium">مبالغ سريعة</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {predefinedAmounts.map((preAmount) => (
                <Button
                  key={preAmount}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(preAmount.toString())}
                  className="h-10"
                >
                  {preAmount} ج.م
                </Button>
              ))}
            </div>
          </div>

          {/* إدخال المبلغ المخصص */}
          <div className="space-y-2">
            <Label htmlFor="amount">المبلغ المطلوب شحنه</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="أدخل المبلغ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-12"
                min="1"
                step="0.01"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                ج.م
              </div>
            </div>
          </div>

          {/* معلومات الدفع */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3 space-x-reverse">
                <Banknote className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">معلومات مهمة:</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• الدفع آمن عبر بوابة Kashier</li>
                    <li>• وضع التجربة - لن يتم خصم أموال حقيقية</li>
                    <li>• سيتم إضافة المبلغ للمحفظة فوراً بعد نجاح الدفع</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* أزرار التحكم */}
          <div className="flex space-x-3 space-x-reverse">
            <Button
              onClick={handleDeposit}
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري التحويل للدفع...
                </>
              ) : (
                'متابعة للدفع'
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};