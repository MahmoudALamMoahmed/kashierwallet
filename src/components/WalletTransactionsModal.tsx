import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Calendar } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface WalletTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletTransactionsModal = ({ isOpen, onClose }: WalletTransactionsModalProps) => {
  const { transactions, loading } = useWallet();

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowUpCircle className="h-5 w-5 text-green-500" />;
      case 'purchase':
        return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
      case 'refund':
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTransactionTitle = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'شحن المحفظة';
      case 'purchase':
        return 'شراء منتج';
      case 'refund':
        return 'استرداد';
      default:
        return 'معاملة';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">مكتملة</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">قيد المعالجة</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">فاشلة</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">ملغاة</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 space-x-reverse">
            <Calendar className="h-5 w-5 text-primary" />
            <span>سجل المعاملات</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-3 space-x-reverse p-4">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد معاملات بعد</p>
              <p className="text-sm text-muted-foreground mt-1">
                قم بشحن محفظتك أو اشتر منتجاً لتظهر المعاملات هنا
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {transactions.map((transaction, index) => (
                <div key={transaction.id}>
                  <div className="flex items-center space-x-4 space-x-reverse p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">
                          {getTransactionTitle(transaction.transaction_type)}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                      
                      {transaction.description && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {transaction.description}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.created_at), 'PPp', { locale: ar })}
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0 text-left">
                      <p className={`font-semibold text-sm ${
                        transaction.transaction_type === 'deposit' ? 'text-green-600' : 
                        transaction.transaction_type === 'purchase' ? 'text-red-600' : 
                        'text-blue-600'
                      }`}>
                        {transaction.transaction_type === 'purchase' ? '-' : '+'}
                        {transaction.amount.toFixed(2)} {transaction.currency}
                      </p>
                    </div>
                  </div>
                  
                  {index < transactions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};