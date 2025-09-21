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
    const { userId, productId, productName, productPrice, currency } = await req.json();
    
    console.log('Processing wallet purchase:', { userId, productId, productName, productPrice, currency });

    if (!userId || !productId || !productName || !productPrice) {
      throw new Error('Missing required parameters');
    }

    // جلب محفظة المستخدم
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      console.error('Wallet lookup error:', walletError);
      throw new Error('المحفظة غير موجودة');
    }

    // التحقق من كفاية الرصيد
    if (wallet.balance < productPrice) {
      return new Response(JSON.stringify({
        success: false,
        message: 'الرصيد غير كافي لإتمام الشراء',
        currentBalance: wallet.balance,
        requiredAmount: productPrice
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // إنشاء معاملة الشراء
    const orderId = `purchase-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    
    const { data: transaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert([{
        wallet_id: wallet.id,
        user_id: userId,
        transaction_type: 'purchase',
        amount: productPrice,
        currency: currency || 'EGP',
        description: `شراء ${productName}`,
        merchant_order_id: orderId,
        status: 'pending',
        metadata: {
          product_id: productId,
          product_name: productName,
          product_price: productPrice
        }
      }])
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      throw new Error('فشل في إنشاء معاملة الشراء');
    }

    // خصم المبلغ من المحفظة
    const newBalance = wallet.balance - productPrice;
    const { error: balanceUpdateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id);

    if (balanceUpdateError) {
      console.error('Balance update error:', balanceUpdateError);
      
      // حذف المعاملة في حالة فشل تحديث الرصيد
      await supabase
        .from('wallet_transactions')
        .delete()
        .eq('id', transaction.id);
        
      throw new Error('فشل في تحديث رصيد المحفظة');
    }

    // تحديث حالة المعاملة إلى مكتملة
    const { error: statusUpdateError } = await supabase
      .from('wallet_transactions')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    if (statusUpdateError) {
      console.error('Status update error:', statusUpdateError);
      // لا نرمي خطأ هنا لأن المعاملة نجحت والرصيد تم خصمه
    }

    console.log('Purchase completed successfully. New balance:', newBalance);

    return new Response(JSON.stringify({
      success: true,
      message: 'تم الشراء بنجاح من المحفظة',
      orderId: orderId,
      newBalance: newBalance,
      transaction: transaction
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error processing wallet purchase:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});