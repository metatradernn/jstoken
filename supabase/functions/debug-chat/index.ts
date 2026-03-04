import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = "8669465832:AAE8gjCvpwESWYNPLz4WjKxuQsHqJ0mnyGQ";
const CHAT_ID = "-1002564995824";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[debug-chat] Request received");

  const { telegramId } = await req.json();

  // 1. Check bot info
  const botInfoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  const botInfo = await botInfoRes.json();
  console.log("[debug-chat] Bot info:", JSON.stringify(botInfo));

  // 2. Check chat info
  const chatInfoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${CHAT_ID}`);
  const chatInfo = await chatInfoRes.json();
  console.log("[debug-chat] Chat info:", JSON.stringify(chatInfo));

  // 3. Check member if telegramId provided
  let memberInfo = null;
  if (telegramId) {
    const memberRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHAT_ID}&user_id=${telegramId}`
    );
    memberInfo = await memberRes.json();
    console.log("[debug-chat] Member info for", telegramId, ":", JSON.stringify(memberInfo));
  }

  return new Response(
    JSON.stringify({
      botInfo,
      chatInfo,
      memberInfo,
      chatIdUsed: CHAT_ID,
      telegramIdUsed: telegramId,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
