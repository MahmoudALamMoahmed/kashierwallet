import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, amount, currency } = await req.json();

    console.log('Generating hash for order:', { orderId, amount, currency });

    // Validate required parameters
    if (!orderId || !amount || !currency) {
      throw new Error('Missing required parameters: orderId, amount, currency');
    }

    // Kashier test credentials
    const mid = 'MID-37646-41'; // Test Merchant ID
    const CustomerReference = '1';
    const secret = '73342d90-d195-41a6-b260-1ea6cbf380bb'; // Test Payment API Key
    
    // Generate hash using Kashier's official method
    const path = `/?payment=${mid}.${orderId}.${amount}.${currency}${CustomerReference ? '.' + CustomerReference : ''}`;
    
    console.log('Hash path:', path);
    
    // Create HMAC SHA256 hash
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(path);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('Generated hash:', hash);

    return new Response(JSON.stringify({ 
      hash,
      merchantId: mid,
      customerReference: CustomerReference 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-payment-hash function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});