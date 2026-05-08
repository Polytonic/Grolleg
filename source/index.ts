import m from "mithril";
import { LandingView } from "./views/landing/landing";
import { ShrinkageCalculatorView } from "./views/shrinkage-calculator/shrinkage-calculator";
import { FiringCalculatorView } from "./views/firing-calculator/firing-calculator";
import { NotFoundView } from "./views/exceptions/not-found";
import { Navigation, closeDrawer } from "./components/navigation";
import { initializeTheme } from "./theme";

// App Shell
// Wraps a tool component so document.title updates on every route entry
// and the Navigation renders on every page. The render method keeps the
// Navigation stable across route transitions (Mithril diffs it rather than
// remounting).

// .app__content persists across routes, so resetting its scroll position in
// onmatch (before the new view renders) works because the container itself is
// never replaced.
const resetContentScroll = () => {
    document.querySelector<HTMLElement>(".app__content")?.scrollTo({ top: 0, behavior: "auto" });
};

const titled = (title: string, component: m.Component): m.RouteResolver => ({
    onmatch() {
        document.title = title;
        closeDrawer(false);
        resetContentScroll();
    },
    render() {
        return m(".app",
            m(Navigation),
            m("main.app__content", m(component)),
        );
    },
});

m.route.prefix = "";
initializeTheme();
m.route(document.body, "/", {
    "/":              titled("Grolleg", LandingView),
    "/t/shrinkage":   titled("Grolleg • Shrinkage Calculator", ShrinkageCalculatorView),
    "/t/firing":      titled("Grolleg • Firing Calculator", FiringCalculatorView),
    "/:rest...":      titled("Grolleg • Page Not Found", NotFoundView),
});

if (process.env.NODE_ENV === "development") {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) =>
            registrations.forEach((registration) => registration.unregister()),
        );
    }
    if (module.hot) {
        module.hot.accept(() => {
            m.redraw();
        });
    }
} else if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(
        new URL("service-worker.ts", import.meta.url),
        { type: "module" },
    );
}
