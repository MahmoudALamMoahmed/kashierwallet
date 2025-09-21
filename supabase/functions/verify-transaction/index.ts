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
    let url;
    if (transactionId) {
      url = `https://test-api.kashier.io/v2/aggregator/transactions/${transactionId}`;
    } else {
      url = `https://test-api.kashier.io/v2/aggregator/transactions?search=${merchantOrderId}`;
    }
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: SECRET_KEY,
        Accept: "application/json"
      }
    });
    if (!resp.ok) throw new Error(`Kashier API error: ${resp.status}`);
    const data = await resp.json();
    // أحيانًا بيرجع Array أو Object
    const txn = Array.isArray(data?.body) && data.body.length > 0 ? data.body[0] : data.body || null;
    if (!txn) {
      return new Response(JSON.stringify({
        success: true,
        verified: false,
        status: "NOT_FOUND",
        reason: "No transaction found"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // خليه كده
    const status = txn.paymentStatus?.toUpperCase() || txn.status?.toUpperCase() || txn.lastStatus?.toUpperCase();
    const successKeywords = [
      "SUCCESS",
      "APPROVED",
      "CAPTURED",
      "COMPLETED"
    ];
    const verified = successKeywords.includes(status);
    return new Response(JSON.stringify({
      success: true,
      verified,
      status,
      transaction: txn
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
