/**
 * Registers the custom service worker at /sw.js.
 * Calls config.onUpdate(registration) when a new version is waiting.
 * Calls config.onSuccess(registration) after first-time install.
 */
export function register(config) {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        // Check for waiting worker on each page load
        if (registration.waiting && navigator.serviceWorker.controller) {
          config?.onUpdate?.(registration);
        }

        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.onstatechange = () => {
            if (installing.state !== 'installed') return;

            if (navigator.serviceWorker.controller) {
              // A new version is ready and waiting to activate
              config?.onUpdate?.(registration);
            } else {
              // First-time install complete — app is now cached offline
              config?.onSuccess?.(registration);
            }
          };
        };
      })
      .catch((err) => console.error('[SW] Registration failed:', err));

    // When the new SW takes over, reload to load fresh assets
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => reg.unregister())
      .catch(console.error);
  }
}
