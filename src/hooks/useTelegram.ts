import { useEffect, useState } from 'react';
import type { TelegramWebApp } from '../types';

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#3a7bd5');
    tg.setBackgroundColor?.('#87ceeb');
    setWebApp(tg);
  }, []);

  return { webApp, user: webApp?.initDataUnsafe.user };
}
