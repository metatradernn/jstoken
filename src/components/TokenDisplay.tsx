"use client";

import React, { useState } from "react";
import { Copy, Check, Shield } from "lucide-react";

interface TokenDisplayProps {
  token: string;
  isExisting: boolean;
}

const TokenDisplay: React.FC<TokenDisplayProps> = ({ token, isExisting }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-sm font-medium">
            {isExisting ? "Ваш существующий токен" : "Токен успешно сгенерирован"}
          </span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-5">
        <p className="text-zinc-400 text-xs uppercase tracking-wider mb-3">
          Ваш токен Jarvis Max
        </p>
        <div className="bg-black/60 rounded-xl p-4 font-mono text-sm text-emerald-400 break-all leading-relaxed">
          {token}
        </div>
        <button
          onClick={handleCopy}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 px-4 transition-all duration-200 active:scale-[0.98]"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Скопировано!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Скопировать токен</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TokenDisplay;