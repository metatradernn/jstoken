import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = "8669465832:AAE8gjCvpwESWYNPLz4WjKxuQsHqJ0mnyGQ";
const CHAT_ID = "-1002564995824";

function generateToken(length: number = 30): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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

  console.log("[check-subscription] ===== New request =====");

  let body: { telegramId?: number | string; initData?: string } = {};
  try {
    body = await req.json();
  } catch (e) {
    console.error("[check-subscription] Failed to parse request body:", e);
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { telegramId, initData } = body;

  console.log("[check-subscription] telegramId received:", telegramId, "type:", typeof telegramId);

  if (!telegramId) {
    console.log("[check-subscription] No telegramId provided");
    return new Response(
      JSON.stringify({ error: "Telegram ID is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  // First check if user already has a token in DB (skip Telegram check)
  console.log("[check-subscription] Checking DB for existing token...");
  const { data: existingToken, error: fetchError } = await supabaseClient
    .from("tokens")
    .select("token, created_at")
    .eq("telegram_id", String(telegramId))
    .maybeSingle();

  if (fetchError) {
    console.error("[check-subscription] DB fetch error:", fetchError);
  }

  if (existingToken) {
    console.log("[check-subscription] Found existing token in DB for user:", telegramId);
    return new Response(
      JSON.stringify({
        success: true,
        token: existingToken.token,
        message: "Ваш токен Jarvis Max",
        isExisting: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[check-subscription] No existing token, checking Telegram membership...");

  // Check Telegram chat membership
  const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHAT_ID}&user_id=${telegramId}`;
  console.log("[check-subscription] Calling Telegram API:", telegramUrl);

  let telegramData: {
    ok: boolean;
    result?: { status: string; user?: { id: number } };
    error_code?: number;
    description?: string;
  };

  try {
    const telegramResponse = await fetch(telegramUrl);
    telegramData = await telegramResponse.json();
  } catch (e) {
    console.error("[check-subscription] Telegram API fetch error:", e);
    return new Response(
      JSON.stringify({ success: false, message: "Ошибка соединения с Telegram. Попробуйте позже." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[check-subscription] Telegram API full response:", JSON.stringify(telegramData));

  if (!telegramData.ok) {
    const errCode = telegramData.error_code;
    const errDesc = telegramData.description;
    console.log("[check-subscription] Telegram API error_code:", errCode, "description:", errDesc);

    // error_code 400 with "Bad Request: user not found" or "member not found" means user is not in chat
    // error_code 403 means bot is not admin
    if (errCode === 403) {
      console.error("[check-subscription] Bot is not admin in the chat! Cannot check members.");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Ошибка конфигурации: бот не является администратором группы.",
          debug: errDesc,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "Вы не приобрели Jarvis Max",
        debug: errDesc,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const memberStatus = telegramData.result?.status;
  console.log("[check-subscription] Member status:", memberStatus);

  // "left" and "kicked" mean not a member
  const validStatuses = ["member", "administrator", "creator", "restricted"];

  if (!memberStatus || !validStatuses.includes(memberStatus)) {
    console.log("[check-subscription] User is NOT a valid member. Status:", memberStatus);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Вы не приобрели Jarvis Max",
        debug: `status: ${memberStatus}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[check-subscription] User IS a valid member! Generating token...");

  // Generate new token
  const newToken = generateToken(30);

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
        message: "Ошибка при сохранении токена. Попробуйте позже.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[check-subscription] Token generated and saved successfully for:", telegramId);

  return new Response(
    JSON.stringify({
      success: true,
      token: newToken,
      message: "Ваш токен Jarvis Max",
      isExisting: false,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
