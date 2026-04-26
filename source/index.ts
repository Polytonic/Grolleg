import m from "mithril";
import { ShrinkageCalculatorView } from "./views/shrinkage-calculator/shrinkage-calculator";
import { FiringCalculatorView } from "./views/firing-calculator/firing-calculator";
import { NotFoundView } from "./views/exceptions/not-found";

// HTML5 history mode (no hash). For GitHub Pages project pages the URL
// includes the repo name as a base path (e.g. polytonic.github.io/Grolleg/);
// detecting it at runtime keeps Mithril's routes (/shrinkage, /firing)
// matching against pathname slices that come AFTER the base. Local dev
// runs at the host root, so the prefix is empty.
const detectBase = (): string => {
    const { hostname, pathname } = window.location;
    if (hostname.endsWith(".github.io")) {
        const firstSegment = pathname.split("/")[1] ?? "";
        if (firstSegment) return "/" + firstSegment;
    }
    return "";
};

// The bare base path redirects to /shrinkage so the URL bar always shows a
// canonical tool route, never an empty one. Unknown paths fall through to
// the catch-all NotFoundView.
const redirectToShrinkage: m.RouteResolver = {
    onmatch() {
        m.route.set("/shrinkage", undefined, { replace: true });
    },
};

// Wraps a tool component so document.title updates on every route entry,
// not only on initial mount. A bare component would set the title in
// `oncreate`, which doesn't re-fire on back/forward navigation between
// tools (Mithril keeps the same root mounted and just swaps children).
const titled = (title: string, component: m.Component): m.RouteResolver => ({
    onmatch() {
        document.title = title;
        return component;
    },
});

m.route.prefix = detectBase();
m.route(document.body, "/shrinkage", {
    "/":            redirectToShrinkage,
    "/shrinkage":   titled("Grolleg • Shrinkage Calculator", ShrinkageCalculatorView),
    "/firing":      titled("Grolleg • Firing Calculator", FiringCalculatorView),
    "/:rest...":    NotFoundView,
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(
        new URL("service-worker.ts", import.meta.url),
        { type: "module" },
    );
}
