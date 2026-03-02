export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
  };
  ready: () => void;
  close: () => void;
  expand: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  const user = tg?.initDataUnsafe?.user;
  const initData = tg?.initData;

  const ready = () => {
    tg?.ready();
  };

  const close = () => {
    tg?.close();
  };

  const expand = () => {
    tg?.expand();
  };

  return {
    tg,
    user,
    initData,
    ready,
    close,
    expand,
  };
}