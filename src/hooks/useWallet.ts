import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User, Session } from '@supabase/supabase-js';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  transaction_type: 'deposit' | 'purchase' | 'refund';
  amount: number;
  currency: string;
  description?: string;
  kashier_order_id?: string;
  merchant_order_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer supabase calls to prevent deadlock
          setTimeout(() => {
            fetchWallet(session.user.id);
          }, 0);
        } else {
          setWallet(null);
          setTransactions([]);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchWallet(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchWallet = async (userId: string) => {
    try {
      setLoading(true);
      
      // جلب بيانات المحفظة
      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // إنشاء محفظة جديدة إذا لم تكن موجودة
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert([{ user_id: userId, balance: 0, currency: 'EGP' }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating wallet:', createError);
          toast({
            title: "خطأ",
            description: "حدث خطأ في إنشاء المحفظة",
            variant: "destructive",
          });
          return;
        }
        walletData = newWallet;
      } else if (walletError) {
        console.error('Error fetching wallet:', walletError);
        return;
      }

      setWallet(walletData);

      // جلب آخر المعاملات
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
      } else {
        setTransactions((transactionsData as WalletTransaction[]) || []);
      }

    } catch (error) {
      console.error('Error in fetchWallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshWallet = async () => {
    if (user) {
      await fetchWallet(user.id);
    }
  };

  const canAfford = (amount: number) => {
    return wallet ? wallet.balance >= amount : false;
  };

  return {
    wallet,
    transactions,
    loading,
    user,
    refreshWallet,
    canAfford
  };
};