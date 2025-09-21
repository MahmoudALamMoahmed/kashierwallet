import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchantOrderId, transactionStatus, amount, currency } = await req.json();
    
    console.log('Processing wallet payment:', { merchantOrderId, transactionStatus, amount, currency });

    if (!merchantOrderId) {
      throw new Error('Missing merchantOrderId');
    }

    // التحقق من المعاملة في Kashier
    const { data: verificationData, error: verificationError } = await supabase.functions.invoke('verify-transaction', {
      body: { merchantOrderId }
    });

    if (verificationError || !verificationData?.success) {
      console.error('Verification failed:', verificationError || verificationData);
      throw new Error('فشل في التحقق من المعاملة');
    }

    // البحث عن معاملة المحفظة
    const { data: walletTransaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('merchant_order_id', merchantOrderId)
      .eq('transaction_type', 'deposit')
      .single();

    if (transactionError) {
      console.error('Transaction lookup error:', transactionError);
      throw new Error('لم يتم العثور على معاملة المحفظة');
    }

    if (verificationData.verified && verificationData.status === 'SUCCESS') {
      // المعاملة نجحت - تحديث رصيد المحفظة
      
      // جلب المحفظة أو إنشاؤها
      let { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', walletTransaction.user_id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // إنشاء محفظة جديدة
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert([{
            user_id: walletTransaction.user_id,
            balance: walletTransaction.amount,
            currency: walletTransaction.currency
          }])
          .select()
          .single();

        if (createError) {
          throw new Error('فشل في إنشاء المحفظة');
        }
        wallet = newWallet;
      } else if (walletError) {
        throw new Error('فشل في جلب بيانات المحفظة');
      } else {
        // تحديث الرصيد
        const newBalance = wallet.balance + walletTransaction.amount;
        const { error: updateError } = await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', wallet.id);

        if (updateError) {
          throw new Error('فشل في تحديث رصيد المحفظة');
        }
        
        wallet.balance = newBalance;
      }

      // تحديث حالة المعاملة إلى مكتملة
      const { error: statusUpdateError } = await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'completed',
          kashier_order_id: verificationData.transaction?.kashierOrderId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletTransaction.id);

      if (statusUpdateError) {
        console.error('Status update error:', statusUpdateError);
        // لا نرمي خطأ هنا لأن المعاملة نجحت والرصيد تم تحديثه
      }

      console.log('Wallet balance updated successfully:', wallet.balance);

      return new Response(JSON.stringify({
        success: true,
        message: 'تم شحن المحفظة بنجاح',
        wallet: wallet,
        transaction: walletTransaction
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      // المعاملة فشلت
      const { error: statusUpdateError } = await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', walletTransaction.id);

      if (statusUpdateError) {
        console.error('Status update error:', statusUpdateError);
      }

      return new Response(JSON.stringify({
        success: false,
        message: 'فشلت عملية الدفع',
        status: verificationData.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('Error processing wallet payment:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});