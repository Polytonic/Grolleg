import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import m from "mithril";
import mq from "mithril-query";
import { Navigation, closeDrawer } from "../../source/components/navigation";


// Test Helpers

const originalGet = m.route.get;

// The navigation component references the global document in three places:
// syncContentInert (querySelector), scrollContentToTop (querySelector), and
// oncreate/onremove (addEventListener/removeEventListener for Escape key).
// Bun's test runtime does not provide a global document, so we stub the
// minimum surface. The stub supports event listener registration so that
// oncreate's keydown listener works and Escape dispatch can be tested.
const listeners = new Map<string, Set<EventListener>>();

const stubDocument = {
    querySelector: () => null,
    addEventListener(type: string, handler: EventListener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(handler);
    },
    removeEventListener(type: string, handler: EventListener) {
        listeners.get(type)?.delete(handler);
    },
    dispatchEvent(event: Event) {
        listeners.get(event.type)?.forEach((handler) => handler(event));
    },
} as unknown as Document;

const renderAtRoute = (path: string) => {
    m.route.get = () => path;
    return mq(Navigation);
};

beforeEach(() => {
    globalThis.document = stubDocument;
});

afterEach(() => {
    m.route.get = originalGet;
    closeDrawer(false);
    // @ts-expect-error -- remove the stub so it doesn't leak to other files
    delete globalThis.document;
});


// Landmarks
describe("Navigation landmarks", () => {
    it("labels the desktop sidebar and mobile drawer", () => {
        const output = renderAtRoute("/");
        expect(output.rootEl.querySelector("nav.sidebar")?.getAttribute("aria-label")).toBe("Site navigation");
        expect(output.rootEl.querySelector("nav.mobile-nav__drawer")?.getAttribute("aria-label")).toBe("Site navigation");
    });
});


// Links
describe("Navigation links", () => {
    it("renders desktop brand and tool links plus mobile brand and tool links", () => {
        const output = renderAtRoute("/");
        expect(output.rootEl.querySelectorAll("a").length).toBe(6);
        expect(output.rootEl.querySelectorAll(".sidebar__brand").length).toBe(1);
        expect(output.rootEl.querySelectorAll(".mobile-nav__brand").length).toBe(1);
        expect(output.rootEl.querySelectorAll(".navigation-link").length).toBe(4);
    });
});


// Active State
describe("Navigation active state", () => {
    it("marks the active tool link as the current page", () => {
        const output = renderAtRoute("/t/firing");
        const activeLinks = output.rootEl.querySelectorAll(".navigation-link.active");
        expect(activeLinks.length).toBe(2);
        activeLinks.forEach((link) => {
            expect(link.getAttribute("aria-current")).toBe("page");
            expect(link.textContent).toBe("Firing");
        });
    });
});


// Mobile Toggle
describe("Navigation mobile toggle", () => {
    it("toggles aria-expanded on click", () => {
        const output = renderAtRoute("/");
        const button = output.rootEl.querySelector("button.mobile-nav__toggle")!;
        expect(button.getAttribute("aria-expanded")).toBe("false");

        (button as HTMLElement).click();
        output.redraw();
        expect(button.getAttribute("aria-expanded")).toBe("true");

        (button as HTMLElement).click();
        output.redraw();
        expect(button.getAttribute("aria-expanded")).toBe("false");
    });
});


// Escape Key Dismissal
// The document keydown handler is registered in oncreate and calls
// closeDrawer + m.redraw. In mithril-query, m.redraw lacks a scheduler and
// throws, so we cannot dispatch a synthetic keydown through the full path.
// Instead we test closeDrawer directly. It is the same code path the handler
// invokes, minus the m.redraw call that only matters in a mounted app.
describe("Navigation escape key dismissal", () => {
    it("closeDrawer closes an open drawer", () => {
        const output = renderAtRoute("/");
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;
        toggle.click();
        output.redraw();
        expect(toggle.getAttribute("aria-expanded")).toBe("true");

        closeDrawer(false);
        output.redraw();
        expect(toggle.getAttribute("aria-expanded")).toBe("false");
    });

    it("closeDrawer is a no-op when the drawer is already closed", () => {
        const output = renderAtRoute("/");
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;
        expect(toggle.getAttribute("aria-expanded")).toBe("false");

        closeDrawer(false);
        output.redraw();
        expect(toggle.getAttribute("aria-expanded")).toBe("false");
    });
});


// Backdrop
describe("Navigation backdrop", () => {
    it("closes the drawer on backdrop click", () => {
        const output = renderAtRoute("/");
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;
        toggle.click();
        output.redraw();

        const backdrop = output.rootEl.querySelector("button.mobile-nav__backdrop") as HTMLElement;
        backdrop.click();
        output.redraw();
        expect(toggle.getAttribute("aria-expanded")).toBe("false");
    });
});
