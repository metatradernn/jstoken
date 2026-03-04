import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = Deno.env.get("BOT_TOKEN") ?? "8669465832:AAE8gjCvpwESWYNPLz4WjKxuQsHqJ0mnyGQ";
const CHAT_ID = "-1002564995824";
const SECRET = "jarvis159786max21";

function generateToken(length: number = 30): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let token = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[check-subscription] Request received");

  const { telegramId, initData } = await req.json();

  if (!telegramId) {
    console.log("[check-subscription] No telegramId provided");
    return new Response(
      JSON.stringify({ error: "Telegram ID is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  console.log(
    "[check-subscription] Checking subscription for user:",
    telegramId
  );

  // Check if user is a member of the chat
  const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHAT_ID}&user_id=${telegramId}`;

  console.log("[check-subscription] Calling Telegram API");

  const telegramResponse = await fetch(telegramUrl);
  const telegramData = await telegramResponse.json();

  console.log("[check-subscription] Telegram API response:", telegramData);

  if (!telegramData.ok) {
    console.log("[check-subscription] Telegram API error:", telegramData);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Вы не приобрели Jarvis Max",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const memberStatus = telegramData.result?.status;
  console.log("[check-subscription] Member status:", memberStatus);

  const validStatuses = ["member", "administrator", "creator"];

  if (!validStatuses.includes(memberStatus)) {
    console.log("[check-subscription] User is not a member, status:", memberStatus);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Вы не приобрели Jarvis Max",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  console.log("[check-subscription] User is a valid member, generating token");

  // User is a member — check if they already have a token
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  // Check for existing token
  const { data: existingToken, error: fetchError } = await supabaseClient
    .from("tokens")
    .select("token, created_at")
    .eq("telegram_id", String(telegramId))
    .maybeSingle();

  if (fetchError) {
    console.error("[check-subscription] DB fetch error:", fetchError);
  }

  if (existingToken) {
    console.log("[check-subscription] Returning existing token for user:", telegramId);
    return new Response(
      JSON.stringify({
        success: true,
        token: existingToken.token,
        message: "Ваш токен Jarvis Max",
        isExisting: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Generate new token
  const newToken = generateToken(30);

  console.log("[check-subscription] Saving new token for user:", telegramId);

  const { error: insertError } = await supabaseClient
    .from("tokens")
    .insert({
      telegram_id: String(telegramId),
      token: newToken,
    });

  if (insertError) {
    console.error("[check-subscription] DB insert error:", insertError);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Ошибка при генерации токена. Попробуйте позже.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  console.log("[check-subscription] Token generated successfully");

  return new Response(
    JSON.stringify({
      success: true,
      token: newToken,
      message: "Ваш токен Jarvis Max",
      isExisting: false,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});