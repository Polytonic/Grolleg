import m from "mithril";
import { LandingView } from "./views/landing/landing";
import { ShrinkageCalculatorView } from "./views/shrinkage-calculator/shrinkage-calculator";
import { FiringCalculatorView } from "./views/firing-calculator/firing-calculator";
import { NotFoundView } from "./views/exceptions/not-found";
import { Navigation, closeDrawer } from "./components/navigation";
import { closePreferencesPopovers } from "./components/preferences-popover";
import { initializeTheme } from "./theme";

// App Shell
const MAIN_CONTENT_ID = "main-content";

const resetContentScroll = () => {
    // .app__content should reset before the routed view renders because the
    // container persists across route transitions.
    document.querySelector<HTMLElement>(".app__content")?.scrollTo({ top: 0, behavior: "auto" });
};

const focusMainContent = () => {
    document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true });
};

const titled = (title: string, component: m.Component): m.RouteResolver => ({
    onmatch() {
        document.title = title;
        closeDrawer(false);
        closePreferencesPopovers(false);
        resetContentScroll();
    },
    render() {
        return m(".app",
            m("a.skip-link", {
                href: `#${MAIN_CONTENT_ID}`,
                onclick: focusMainContent,
            }, "Skip to content"),
            m(Navigation),
            m(`main#${MAIN_CONTENT_ID}.app__content`, { tabindex: -1 }, m(component)),
        );
    },
});

// Routing
m.route.prefix = "";
initializeTheme();
m.route(document.body, "/", {
    "/":              titled("Grolleg", LandingView),
    "/t/shrinkage":   titled("Grolleg • Shrinkage Calculator", ShrinkageCalculatorView),
    "/t/firing":      titled("Grolleg • Firing Calculator", FiringCalculatorView),
    "/:rest...":      titled("Grolleg • Page Not Found", NotFoundView),
});

// Service Worker
const unregisterDevelopmentServiceWorkers = async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
};

const registerProductionServiceWorker = async () => {
    await navigator.serviceWorker.register(
        new URL("service-worker.ts", import.meta.url),
        { type: "module" },
    );
};

const syncServiceWorker = async () => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") {
        await unregisterDevelopmentServiceWorkers();
        return;
    }

    await registerProductionServiceWorker();
};

// Service worker setup should not block the first route render.
void syncServiceWorker();
