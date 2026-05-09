/// <reference lib="webworker" />
import { manifest } from "@parcel/service-worker";

const CACHE_PREFIX = "grolleg-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;

interface ServiceWorkerLifecycleEvent extends Event {
    waitUntil(promise: Promise<unknown>): void;
}

interface ServiceWorkerFetchEvent extends Event {
    request: Request;
    respondWith(response: Promise<Response> | Response): void;
}

// Parcel should run this module inside a service-worker global, not Window.
declare const self: ServiceWorkerGlobalScope;


// Cache Lifecycle
async function install() {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(manifest);
}

async function activate() {
    const keys = await caches.keys();
    await Promise.all(
        keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
    );
}

const handleInstall = (event: Event) => {
    // Install and activate events should expose waitUntil at the listener boundary.
    const lifecycleEvent = event as ServiceWorkerLifecycleEvent;
    lifecycleEvent.waitUntil(install());
};

const handleActivate = (event: Event) => {
    const lifecycleEvent = event as ServiceWorkerLifecycleEvent;
    lifecycleEvent.waitUntil(activate());
};


// Fetch Strategy
const serviceWorkerScope = self.registration.scope;
const indexUrl = new URL("index.html", serviceWorkerScope).pathname;

const isLocalDevelopmentRequest = (url: URL): boolean =>
    url.hostname === "localhost" || url.hostname === "127.0.0.1";

const matchCachedRequest = async (request: Request): Promise<Response> => {
    const cached = await caches.match(request);
    if (cached) return cached;
    return fetch(request);
};

const matchAppShellRequest = async (request: Request): Promise<Response> => {
    const appShell = await caches.match(indexUrl);
    if (appShell) return appShell;
    return matchCachedRequest(request);
};

const handleFetch = (event: Event) => {
    // Fetch events should expose request/respondWith at the listener boundary.
    const fetchEvent = event as ServiceWorkerFetchEvent;
    const request = fetchEvent.request;
    const url = new URL(request.url);

    if (isLocalDevelopmentRequest(url)) return;
    if (request.mode === "navigate") {
        fetchEvent.respondWith(matchAppShellRequest(request));
        return;
    }

    fetchEvent.respondWith(matchCachedRequest(request));
};

addEventListener("install", handleInstall);
addEventListener("activate", handleActivate);
addEventListener("fetch", handleFetch);
