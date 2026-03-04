"use client";

import React, { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { supabase } from "@/integrations/supabase/client";
import { Key, Loader2, User } from "lucide-react";
import TokenDisplay from "@/components/TokenDisplay";
import ErrorMessage from "@/components/ErrorMessage";
import JarvisLogo from "@/components/JarvisLogo";

type AppState = "idle" | "loading" | "success" | "error";

interface TokenResult {
  token: string;
  isExisting: boolean;
}

const Index: React.FC = () => {
  const { user, initData, ready, expand } = useTelegram();
  const [state, setState] = useState<AppState>("idle");
  const [tokenResult, setTokenResult] = useState<TokenResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    ready();
    expand();
  }, []);

  const telegramId = user?.id;
  const displayName = user
    ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`
    : null;

  const handleGetToken = async () => {
    const userId = telegramId;

    if (!userId) {
      setErrorMessage("Не удалось определить ваш Telegram ID. Откройте приложение через Telegram.");
      setState("error");
      return;
    }

    setState("loading");

    const response = await supabase.functions.invoke("check-subscription", {
      body: {
        telegramId: userId,
        initData: initData,
      },
    });

    const data = response.data;

    if (data?.success) {
      setTokenResult({
        token: data.token,
        isExisting: data.isExisting,
      });
      setState("success");
    } else {
      setErrorMessage(data?.message || "Произошла ошибка. Попробуйте позже.");
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setTokenResult(null);
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <div className="pt-10 pb-6 px-6 flex flex-col items-center">
        <JarvisLogo />

        {displayName && (
          <div className="flex items-center gap-2 mt-4 bg-zinc-900/80 border border-zinc-800 rounded-full px-4 py-2">
            <User className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-300 text-sm">{displayName}</span>
            {telegramId && (
              <span className="text-zinc-600 text-xs">ID: {telegramId}</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-10 flex flex-col items-center">
        {state === "idle" && (
          <div className="w-full max-w-sm flex flex-col items-center gap-6 mt-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 w-full">
              <p className="text-zinc-400 text-sm leading-relaxed text-center">
                Нажмите кнопку ниже, чтобы получить ваш персональный токен доступа к Jarvis Max.
              </p>
            </div>

            <button
              onClick={handleGetToken}
              className="w-full max-w-sm bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold rounded-2xl py-4 px-6 flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.97] shadow-lg shadow-emerald-500/20"
            >
              <Key className="w-5 h-5" />
              Получить токен
            </button>
          </div>
        )}

        {state === "loading" && (
          <div className="flex flex-col items-center gap-4 mt-12 animate-in fade-in duration-300">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-zinc-400 text-sm">Проверяем подписку...</p>
          </div>
        )}

        {state === "success" && tokenResult && (
          <div className="w-full max-w-sm mt-4">
            <TokenDisplay
              token={tokenResult.token}
              isExisting={tokenResult.isExisting}
            />
          </div>
        )}

        {state === "error" && (
          <div className="w-full max-w-sm mt-4">
            <ErrorMessage message={errorMessage} />
          </div>
        )}

        {(state === "success" || state === "error") && (
          <button
            onClick={handleReset}
            className="mt-6 text-zinc-500 hover:text-zinc-300 text-sm transition-colors duration-200"
          >
            ← Вернуться назад
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="pb-6 text-center">
        <p className="text-zinc-700 text-xs">Jarvis Max © 2025</p>
      </div>
    </div>
  );
};

export default Index;