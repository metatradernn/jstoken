"use client";

import React from "react";
import { XCircle } from "lucide-react";

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-base font-medium">{message}</p>
        <p className="text-zinc-500 text-sm mt-2">
          Приобретите Jarvis Max для получения токена
        </p>
      </div>
    </div>
  );
};

export default ErrorMessage;