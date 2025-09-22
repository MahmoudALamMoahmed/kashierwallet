import { useState } from 'react';
import { Wallet, Plus, Eye, EyeOff, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { WalletDepositModal } from './WalletDepositModal';
import { WalletTransactionsModal } from './WalletTransactionsModal';

export const WalletComponent = () => {
  const { wallet, loading, user } = useWallet();
  const [showBalance, setShowBalance] = useState(true);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-muted rounded-lg h-10 w-32"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="bg-gradient-to-r from-muted/30 to-muted/10 border-muted">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-muted rounded-full">
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">المحفظة</span>
              <div className="text-lg font-bold text-muted-foreground">
                جاري التحميل...
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/20 rounded-full">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-muted-foreground">رصيد المحفظة</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBalance(!showBalance)}
                    className="h-6 w-6 p-0"
                  >
                    {showBalance ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
                <div className="text-lg font-bold">
                  {showBalance ? (
                    <>
                      {wallet?.balance?.toFixed(2) || '0.00'} {wallet?.currency || 'EGP'}
                    </>
                  ) : (
                    '••••••'
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransactionsModalOpen(true)}
                className="h-8 px-3"
              >
                <History className="h-4 w-4 mr-1" />
                المعاملات
              </Button>
              <Button
                size="sm"
                onClick={() => setIsDepositModalOpen(true)}
                className="h-8 px-3 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
              >
                <Plus className="h-4 w-4 mr-1" />
                شحن المحفظة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <WalletDepositModal 
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />
      
      <WalletTransactionsModal
        isOpen={isTransactionsModalOpen}
        onClose={() => setIsTransactionsModalOpen(false)}
      />
    </>
  );
};