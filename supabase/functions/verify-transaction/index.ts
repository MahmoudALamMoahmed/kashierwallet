import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const SECRET_KEY = "926c538a394d2c853dd83cd2c5ffa0eb$f5b75d78a323dadc99ecbb3eb1093a9526c92e611c6c1f917965edf6936beb0d146e76f6cb1f30881ea008a39e4ac8e5";
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { merchantOrderId, transactionId } = await req.json();
    if (!merchantOrderId && !transactionId) {
      throw new Error("Missing merchantOrderId or transactionId");
    }
    console.log('Verifying transaction with Kashier:', {
      merchantOrderId,
      transactionId
    });
    // استخدام search parameter كما موضح في الـ documentation
    const searchQuery = merchantOrderId || transactionId;
    const url = `https://test-api.kashier.io/v2/aggregator/transactions?search=${encodeURIComponent(searchQuery)}&limit=1`;
    console.log('Kashier API URL:', url);
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: SECRET_KEY,
        Accept: "application/json"
      }
    });
    console.log('Kashier API response status:', resp.status);
    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`Kashier API error: ${resp.status} - ${errorText}`);
      throw new Error(`Kashier API error: ${resp.status}`);
    }
    const data = await resp.json();
    console.log('Kashier API response:', JSON.stringify(data, null, 2));
    // التحقق من وجود transactions في الرد
    if (!data.body || !Array.isArray(data.body) || data.body.length === 0) {
      console.log('No transactions found in response');
      return new Response(JSON.stringify({
        success: true,
        verified: false,
        status: "NOT_FOUND",
        reason: "No transaction found with the given order ID"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // أخذ أول معاملة من النتائج
    const transaction = data.body[0];
    console.log('Processing transaction:', JSON.stringify(transaction, null, 2));
    // استخراج الـ status values بناء على Kashier documentation
    const transactionStatus = transaction.status || 'UNKNOWN'; // "Approved", "Rejected", etc.
    const lastStatus = transaction.lastStatus || ''; // "CAPTURED", etc.
    const paymentStatus = transaction.paymentStatus || ''; // "SUCCESS", "FAILED", etc.
    const responseCode = transaction.transactionResponseCode || ''; // "00" for success
    console.log('Status fields found:', {
      status: transactionStatus,
      lastStatus: lastStatus,
      paymentStatus: paymentStatus,
      responseCode: responseCode
    });
    // منطق التحقق بناء على Kashier's actual values
    let verified = false;
    let finalStatus = 'UNKNOWN';
    // التحقق من النجاح بناء على القيم الفعلية من Kashier
    const isApproved = transactionStatus.toUpperCase() === 'APPROVED';
    const isCaptured = lastStatus.toUpperCase() === 'CAPTURED';
    const isSuccess = paymentStatus.toUpperCase() === 'SUCCESS';
    const isResponseCodeSuccess = responseCode === '00';
    const isNotCancelled = !transaction.isCancelled;
    const isNotVoided = !transaction.isVoided;
    if (isApproved && (isCaptured || isSuccess || isResponseCodeSuccess) && isNotCancelled && isNotVoided) {
      verified = true;
      finalStatus = 'SUCCESS';
      console.log('Transaction verified as successful');
    } else if (transactionStatus.toUpperCase() === 'REJECTED' || transactionStatus.toUpperCase() === 'DECLINED' || transaction.isCancelled || transaction.isVoided || responseCode && responseCode !== '00') {
      verified = false;
      finalStatus = 'FAILED';
      console.log('Transaction verified as failed');
    } else {
      // حالات أخرى مثل PENDING
      verified = false;
      finalStatus = transactionStatus.toUpperCase() || 'PENDING';
      console.log('Transaction in pending or unknown state');
    }
    console.log('Final verification result:', {
      verified,
      finalStatus
    });
    const result = {
      success: true,
      verified,
      status: finalStatus,
      originalStatus: transactionStatus,
      lastStatus: lastStatus,
      paymentStatus: paymentStatus,
      responseCode: responseCode,
      transaction: {
        id: transaction.transactionId || transaction._id,
        merchantOrderId: transaction.merchantOrderId || transaction.orderReference,
        amount: transaction.amount || transaction.totalCapturedAmount,
        currency: transaction.currency || 'EGP',
        method: transaction.method,
        provider: transaction.provider,
        date: transaction.date || transaction.createdAt,
        responseCode: transaction.transactionResponseCode,
        responseMessage: transaction.transactionResponseMessage,
        isCancelled: transaction.isCancelled,
        isVoided: transaction.isVoided,
        totalCapturedAmount: transaction.totalCapturedAmount,
        totalRefundedAmount: transaction.totalRefundedAmount
      },
      debug: {
        rawResponse: data,
        verificationChecks: {
          isApproved,
          isCaptured,
          isSuccess,
          isResponseCodeSuccess,
          isNotCancelled,
          isNotVoided
        },
        allStatusFields: {
          status: transactionStatus,
          lastStatus: lastStatus,
          paymentStatus: paymentStatus,
          responseCode: responseCode
        }
      }
    };
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      verified: false,
      status: "ERROR"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
