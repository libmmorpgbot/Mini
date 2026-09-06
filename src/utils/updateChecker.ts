const CHECK_INTERVAL_MS = 60_000;

/**
 * Periodically fetches version.json (bypassing HTTP caches entirely) and hard-reloads
 * the page the moment its buildId no longer matches the one baked into this bundle --
 * GitHub Pages can't set custom cache headers, and Telegram's in-app browser tends to
 * hang onto a stale index.html/bundle far past any reasonable cache lifetime otherwise.
 */
export function startUpdateChecker(): void {
  const check = async (): Promise<void> => {
    try {
      const url = `${import.meta.env.BASE_URL}version.json?_=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return;

      const data = (await response.json()) as { buildId?: string };
      if (data.buildId && data.buildId !== __BUILD_ID__) {
        // Navigate to a fresh URL rather than location.reload() -- some in-app
        // browsers still serve a conditional reload from cache.
        const fresh = `${window.location.pathname}?v=${data.buildId}`;
        window.location.replace(fresh);
      }
    } catch {
      // Offline or a transient network hiccup -- just try again next interval.
    }
  };

  void check();
  setInterval(check, CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
}
