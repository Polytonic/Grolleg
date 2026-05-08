import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import m from "mithril";
import mq from "mithril-query";
import { Navigation, closeDrawer } from "../../source/components/navigation";
import { initializeTheme } from "../../source/theme";


// Test Helpers

const originalGet = m.route.get;

// The navigation component references the global document for content inertness
// and oncreate/onremove keydown listeners.
// Bun's test runtime does not provide a global document, so we stub the
// minimum surface. The stub supports event listener registration so that
// oncreate's keydown listener works and Escape dispatch can be tested.
const listeners = new Map<string, Set<EventListener>>();

const stubDocument = {
    querySelector: () => null,
    getElementById: () => null,
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
    initializeTheme({});
});

afterEach(() => {
    initializeTheme({});
    m.route.get = originalGet;
    closeDrawer(false);
    // @ts-expect-error -- remove the stub so it does not leak to other files
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
        expect(output.rootEl.textContent).not.toContain("Studio tools");
        expect(output.rootEl.querySelector(".sidebar__section-label")).toBeUndefined();
        expect(output.rootEl.querySelectorAll(".navigation-link")[0]?.textContent).toBe("Shrinkage Calculator");
        expect(output.rootEl.querySelectorAll(".navigation-link")[1]?.textContent).toBe("Firing Cost Calculator");
    });
});


// Preferences
describe("Navigation preferences", () => {
    it("places preferences in the desktop footer and before the mobile menu toggle", () => {
        const output = renderAtRoute("/");
        const desktopTrigger = output.rootEl.querySelector(".sidebar__footer .preferences-popover--desktop .preferences-popover__trigger");
        const mobileTrigger = output.rootEl.querySelector(".mobile-nav__bar .preferences-popover--mobile .preferences-popover__trigger");
        const mobilePreferenceRoot = output.rootEl.querySelector(".mobile-nav__bar .preferences-popover--mobile");

        expect(desktopTrigger?.getAttribute("aria-label")).toBe("Preferences");
        expect(mobileTrigger?.getAttribute("aria-label")).toBe("Preferences");
        expect(mobilePreferenceRoot?.nextElementSibling?.classList.contains("mobile-nav__toggle")).toBe(true);
    });

    it("opens mobile preferences without opening the drawer", () => {
        const output = renderAtRoute("/");
        const preferencesTrigger = output.rootEl.querySelector(".mobile-nav__bar .preferences-popover__trigger") as HTMLElement;
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;

        preferencesTrigger.click();
        output.redraw();

        expect(preferencesTrigger.getAttribute("aria-expanded")).toBe("true");
        expect(toggle.getAttribute("aria-expanded")).toBe("false");
    });

    it("closes the mobile drawer before opening mobile preferences", () => {
        const output = renderAtRoute("/");
        const preferencesTrigger = output.rootEl.querySelector(".mobile-nav__bar .preferences-popover__trigger") as HTMLElement;
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;

        toggle.click();
        output.redraw();
        expect(toggle.getAttribute("aria-expanded")).toBe("true");

        preferencesTrigger.click();
        output.redraw();

        expect(toggle.getAttribute("aria-expanded")).toBe("false");
        expect(preferencesTrigger.getAttribute("aria-expanded")).toBe("true");
    });

    it("closes mobile preferences before opening the mobile drawer", () => {
        const output = renderAtRoute("/");
        const preferencesTrigger = output.rootEl.querySelector(".mobile-nav__bar .preferences-popover__trigger") as HTMLElement;
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;

        preferencesTrigger.click();
        output.redraw();
        expect(preferencesTrigger.getAttribute("aria-expanded")).toBe("true");

        toggle.click();
        output.redraw();

        expect(preferencesTrigger.getAttribute("aria-expanded")).toBe("false");
        expect(toggle.getAttribute("aria-expanded")).toBe("true");
    });

    it("does not open the mobile drawer from popover panel clicks", () => {
        const output = renderAtRoute("/");
        const preferencesTrigger = output.rootEl.querySelector(".mobile-nav__bar .preferences-popover__trigger") as HTMLElement;
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;

        preferencesTrigger.click();
        output.redraw();
        const panel = output.rootEl.querySelector(".mobile-nav__bar .preferences-popover__panel") as HTMLElement;
        panel.click();
        output.redraw();

        expect(toggle.getAttribute("aria-expanded")).toBe("false");
        expect(preferencesTrigger.getAttribute("aria-expanded")).toBe("true");
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
            expect(link.textContent).toBe("Firing Cost Calculator");
        });
    });

    it("summarizes the current mobile destination", () => {
        const output = renderAtRoute("/t/shrinkage");
        expect(output.rootEl.querySelector(".mobile-nav__current")?.textContent).toBe("Shrinkage Calculator");
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

    it("opens from a closed card shell click", () => {
        const output = renderAtRoute("/");
        const card = output.rootEl.querySelector(".mobile-nav__card") as HTMLElement;
        const button = output.rootEl.querySelector("button.mobile-nav__toggle")!;
        expect(button.getAttribute("aria-expanded")).toBe("false");

        card.click();
        output.redraw();
        expect(button.getAttribute("aria-expanded")).toBe("true");
    });

    it("does not focus the first link after a card shell pointer click", async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));

        const focusLookups: string[] = [];
        const originalGetElementById = document.getElementById.bind(document);
        document.getElementById = ((id: string) => {
            focusLookups.push(id);
            return { focus: () => undefined } as unknown as HTMLElement;
        }) as Document["getElementById"];

        try {
            const output = renderAtRoute("/");
            const card = output.rootEl.querySelector(".mobile-nav__card") as HTMLElement;

            card.click();
            output.redraw();
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(focusLookups).not.toContain("mobile-navigation-first-link");
        } finally {
            document.getElementById = originalGetElementById;
        }
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
    it("renders the backdrop only while open or closing", () => {
        const output = renderAtRoute("/");
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;

        expect(output.rootEl.querySelector(".mobile-nav__backdrop")).toBeUndefined();

        toggle.click();
        output.redraw();
        const openBackdrop = output.rootEl.querySelector(".mobile-nav__backdrop") as HTMLElement;
        expect(openBackdrop).toBeDefined();
        expect(openBackdrop.getAttribute("aria-hidden")).toBe("true");
        expect(openBackdrop.hasAttribute("tabindex")).toBe(false);

        toggle.click();
        output.redraw();
        const closingBackdrop = output.rootEl.querySelector(".mobile-nav__backdrop") as HTMLElement;
        expect(closingBackdrop).toBeDefined();
        expect(closingBackdrop.getAttribute("aria-hidden")).toBe("true");

        const transitionEnd = output.rootEl.ownerDocument.createEvent("Event");
        transitionEnd.initEvent("transitionend", true, true);
        closingBackdrop.dispatchEvent(transitionEnd);
        output.redraw();
        expect(output.rootEl.querySelector(".mobile-nav__backdrop")).toBeUndefined();
    });

    it("keeps the closing backdrop until its opacity transition ends", () => {
        const output = renderAtRoute("/");
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;
        toggle.click();
        output.redraw();
        toggle.click();
        output.redraw();

        const closingBackdrop = output.rootEl.querySelector(".mobile-nav__backdrop") as HTMLElement;
        const colorTransitionEnd = output.rootEl.ownerDocument.createEvent("Event");
        colorTransitionEnd.initEvent("transitionend", true, true);
        Object.defineProperty(colorTransitionEnd, "propertyName", { value: "background-color" });
        closingBackdrop.dispatchEvent(colorTransitionEnd);
        output.redraw();
        expect(output.rootEl.querySelector(".mobile-nav__backdrop")).toBeDefined();

        const opacityTransitionEnd = output.rootEl.ownerDocument.createEvent("Event");
        opacityTransitionEnd.initEvent("transitionend", true, true);
        Object.defineProperty(opacityTransitionEnd, "propertyName", { value: "opacity" });
        closingBackdrop.dispatchEvent(opacityTransitionEnd);
        output.redraw();
        expect(output.rootEl.querySelector(".mobile-nav__backdrop")).toBeUndefined();
    });

    it("closes the drawer on backdrop click", () => {
        const output = renderAtRoute("/");
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;
        toggle.click();
        output.redraw();

        const backdrop = output.rootEl.querySelector(".mobile-nav__backdrop") as HTMLElement;
        backdrop.click();
        output.redraw();
        expect(toggle.getAttribute("aria-expanded")).toBe("false");
    });
});
