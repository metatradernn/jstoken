import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = Deno.env.get("BOT_TOKEN") ?? "8669465832:AAE8gjCvpwESWYNPLz4WjKxuQsHqJ0mnyGQ";
const CHAT_ID = "-1002564995824";

// Rate limiting: max 5 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) {
    return false;
  }
  entry.count++;
  return true;
}

// Validate Telegram WebApp initData using HMAC-SHA256
async function validateTelegramInitData(initData: string): Promise<{ valid: boolean; userId?: number }> {
  try {
    if (!initData || initData.trim() === "") {
      console.log("[check-subscription] No initData provided");
      return { valid: false };
    }

    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      console.log("[check-subscription] No hash in initData");
      return { valid: false };
    }

    // Build data-check-string: sorted key=value pairs (excluding hash)
    params.delete("hash");
    const dataCheckArr: string[] = [];
    params.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join("\n");

    // HMAC-SHA256: key = HMAC-SHA256("WebAppData", bot_token), data = dataCheckString
    const encoder = new TextEncoder();

    const secretKeyRaw = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const secretKeyBytes = await crypto.subtle.sign(
      "HMAC",
      secretKeyRaw,
      encoder.encode(BOT_TOKEN)
    );

    const hmacKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      encoder.encode(dataCheckString)
    );

    const computedHash = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedHash !== hash) {
      console.log("[check-subscription] Hash mismatch — invalid initData");
      return { valid: false };
    }

    // Check that initData is not older than 1 hour
    const authDate = parseInt(params.get("auth_date") ?? "0", 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 3600) {
      console.log("[check-subscription] initData expired");
      return { valid: false };
    }

    // Extract user id
    const userStr = params.get("user");
    if (!userStr) return { valid: true };
    const user = JSON.parse(userStr);
    return { valid: true, userId: user.id };
  } catch (e) {
    console.error("[check-subscription] initData validation error:", e);
    return { valid: false };
  }
}

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

  // Rate limiting
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(clientIp)) {
    console.log("[check-subscription] Rate limit exceeded for IP:", clientIp);
    return new Response(
      JSON.stringify({ success: false, message: "Слишком много запросов. Подождите минуту." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let body: { telegramId?: number; initData?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "Неверный формат запроса." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { telegramId, initData } = body;

  // Validate Telegram initData signature
  const validation = await validateTelegramInitData(initData ?? "");

  if (!validation.valid) {
    console.log("[check-subscription] Invalid initData — request rejected");
    return new Response(
      JSON.stringify({
        success: false,
        message: "Доступ запрещён. Откройте приложение через Telegram.",
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Make sure the telegramId matches the one in initData (prevent spoofing)
  if (validation.userId && validation.userId !== telegramId) {
    console.log("[check-subscription] telegramId mismatch — possible spoofing attempt");
    return new Response(
      JSON.stringify({
        success: false,
        message: "Доступ запрещён.",
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const userId = validation.userId ?? telegramId;

  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, message: "Telegram ID не найден." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  console.log("[check-subscription] Validated user:", userId);

  // Check Telegram chat membership
  const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHAT_ID}&user_id=${userId}`;
  const telegramResponse = await fetch(telegramUrl);
  const telegramData = await telegramResponse.json();

  console.log("[check-subscription] Telegram API response:", telegramData);

  if (!telegramData.ok) {
    return new Response(
      JSON.stringify({ success: false, message: "Вы не приобрели Jarvis Max" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const memberStatus = telegramData.result?.status;
  const validStatuses = ["member", "administrator", "creator"];

  if (!validStatuses.includes(memberStatus)) {
    console.log("[check-subscription] Not a member, status:", memberStatus);
    return new Response(
      JSON.stringify({ success: false, message: "Вы не приобрели Jarvis Max" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  console.log("[check-subscription] User is a valid member, processing token");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  // Check for existing token
  const { data: existingToken, error: fetchError } = await supabaseClient
    .from("tokens")
    .select("token, created_at")
    .eq("telegram_id", String(userId))
    .maybeSingle();

  if (fetchError) {
    console.error("[check-subscription] DB fetch error:", fetchError);
  }

  if (existingToken) {
    console.log("[check-subscription] Returning existing token for user:", userId);
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

  // Generate and save new token
  const newToken = generateToken(30);

  const { error: insertError } = await supabaseClient
    .from("tokens")
    .insert({ telegram_id: String(userId), token: newToken });

  if (insertError) {
    console.error("[check-subscription] DB insert error:", insertError);
    return new Response(
      JSON.stringify({ success: false, message: "Ошибка при генерации токена. Попробуйте позже." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  console.log("[check-subscription] Token generated successfully for user:", userId);

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
