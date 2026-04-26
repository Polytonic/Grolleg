import { manifest } from "@parcel/service-worker";

const CACHE_NAME = "grolleg-v2";

// Cache all build assets on install
async function install() {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(manifest);
}
addEventListener("install", (event: ExtendableEvent) => event.waitUntil(install()));

// Remove old caches when a new version activates
async function activate() {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
}
addEventListener("activate", (event: ExtendableEvent) => event.waitUntil(activate()));

// Navigation requests (SPA route changes, deep links, refreshes) all need to
// resolve to the app shell so the Mithril router can take over. Serving the
// cached index.html for any navigate-mode request bypasses the GitHub Pages
// 404 round-trip when the service worker is active, and lets the app work
// offline for any in-app route. The SW global is typed as Window in this
// build (no @types/serviceworker), so the registration cast is local.
const swScope = (self as unknown as { registration: { scope: string } }).registration.scope;
const indexUrl = new URL("./", swScope).pathname;

addEventListener("fetch", (event: FetchEvent) => {
    const request = event.request;
    if (request.mode === "navigate") {
        event.respondWith(
            caches.match(indexUrl)
                .then((cached) => cached || caches.match(request))
                .then((cached) => cached || fetch(request))
        );
        return;
    }
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
