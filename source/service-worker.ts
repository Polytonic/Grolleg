import { manifest } from "@parcel/service-worker";

const CACHE_NAME = "grolleg-v1";

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

// Serve from cache first, fall back to network
addEventListener("fetch", (event: FetchEvent) => {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
