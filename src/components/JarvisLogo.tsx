"use client";

import React from "react";
import { Bot } from "lucide-react";

const JarvisLogo: React.FC = () => {
  return (
    <div className="flex flex-col items-center gap-3 mb-2">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Bot className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-4 border-zinc-950 animate-pulse" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Jarvis Max
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Token Generator</p>
      </div>
    </div>
  );
};

export default JarvisLogo;