import { afterEach, beforeEach, describe, it, expect } from "bun:test";
import m from "mithril";
import mq from "mithril-query";
import { Navigation, closeDrawer } from "../../source/components/navigation";
import { initializeTheme } from "../../source/theme";


// Test Helpers

const originalGet = m.route.get;
const originalRedraw = m.redraw;
const ROOT_SCROLL_LOCK_CLASS = "mobile-navigation-scroll-locked";
type NavigationOutput = ReturnType<typeof mq> & { onremove: () => void };

// The navigation component references the global document for content inertness
// and oncreate/onremove keydown listeners.
// Bun's test runtime does not provide a global document, so we stub the
// minimum surface. The stub supports event listener registration so that
// oncreate's keydown listener works and Escape dispatch can be tested.
const listeners = new Map<string, Set<EventListener>>();
const rootClasses = new Set<string>();

const classListFor = (classes: Set<string>) => ({
    add: (...tokens: string[]) => { tokens.forEach((token) => classes.add(token)); },
    remove: (...tokens: string[]) => { tokens.forEach((token) => classes.delete(token)); },
    contains: (token: string) => classes.has(token),
    toggle: (token: string, force?: boolean) => {
        const shouldHaveToken = force ?? !classes.has(token);
        if (shouldHaveToken) classes.add(token);
        else classes.delete(token);
        return shouldHaveToken;
    },
}) as unknown as DOMTokenList;

const stubDocument = {
    documentElement: {
        classList: classListFor(rootClasses),
    },
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

const renderAtRoute = (path: string): NavigationOutput => {
    m.route.get = () => path;
    return mq(Navigation) as NavigationOutput;
};

// focusLater schedules with setTimeout(0), so focus assertions wait one macrotask.
const flushFocus = () => new Promise((resolve) => setTimeout(resolve, 0));

const dispatchDocumentKeydown = (key: string) => {
    let defaultPrevented = false;
    document.dispatchEvent({
        type: "keydown",
        key,
        preventDefault() { defaultPrevented = true; },
    } as unknown as Event);
    return defaultPrevented;
};

beforeEach(() => {
    rootClasses.clear();
    globalThis.document = stubDocument;
    initializeTheme({});
});

afterEach(() => {
    initializeTheme({});
    m.route.get = originalGet;
    m.redraw = originalRedraw;
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
    it("renders desktop brand and tool links in the sidebar", () => {
        const output = renderAtRoute("/");
        const sidebar = output.rootEl.querySelector("nav.sidebar")!;
        const toolLinks = Array.from(sidebar.querySelectorAll(".navigation-link"));

        expect(sidebar.querySelectorAll(".sidebar__brand").length).toBe(1);
        expect(toolLinks.map((link) => link.textContent)).toEqual([
            "Shrinkage Calculator",
            "Firing Cost Calculator",
        ]);
        expect(sidebar.textContent).not.toContain("Studio tools");
        expect(sidebar.querySelector(".sidebar__section-label")).toBeUndefined();
    });

    it("renders mobile brand and tool links in the drawer", () => {
        const output = renderAtRoute("/");
        const drawer = output.rootEl.querySelector("nav.mobile-nav__drawer")!;
        const toolLinks = Array.from(drawer.querySelectorAll(".navigation-link"));

        expect(drawer.querySelectorAll(".mobile-nav__brand").length).toBe(1);
        expect(toolLinks.map((link) => link.textContent)).toEqual([
            "Shrinkage Calculator",
            "Firing Cost Calculator",
        ]);
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

    it("moves focus into mobile preferences after closing an open drawer", async () => {
        const output = renderAtRoute("/");
        const focusedIds: string[] = [];
        const originalGetElementById = document.getElementById.bind(document);
        document.getElementById = ((id: string) => {
            const element = output.rootEl.querySelector<HTMLElement>(`#${id}`);
            if (id === "mobile-navigation-drawer") return element;
            if (!element || element.closest("[hidden], [aria-hidden='true']")) return null;
            return { focus: () => { focusedIds.push(id); } } as unknown as HTMLElement;
        }) as Document["getElementById"];

        try {
            const preferencesTrigger = output.rootEl.querySelector(".mobile-nav__bar .preferences-popover__trigger") as HTMLElement;
            const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;

            toggle.click();
            output.redraw();
            await flushFocus();
            expect(focusedIds[focusedIds.length - 1]).toBe("mobile-navigation-first-link");

            preferencesTrigger.click();
            await flushFocus();
            output.redraw();
            await flushFocus();

            expect(toggle.getAttribute("aria-expanded")).toBe("false");
            expect(preferencesTrigger.getAttribute("aria-expanded")).toBe("true");
            expect(focusedIds[focusedIds.length - 1].startsWith("preferences-popover-")).toBe(true);
            expect(focusedIds[focusedIds.length - 1].endsWith("-theme-system")).toBe(true);
        } finally {
            document.getElementById = originalGetElementById;
        }
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

    it("marks the closed mobile drawer hidden and inert until it opens", () => {
        const output = renderAtRoute("/");
        const button = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;
        const closedDrawer = output.rootEl.querySelector("nav.mobile-nav__drawer") as HTMLElement;

        expect(button.getAttribute("aria-expanded")).toBe("false");
        expect(closedDrawer.getAttribute("aria-hidden")).toBe("true");
        expect(closedDrawer.hasAttribute("inert")).toBe(true);
        expect((closedDrawer as HTMLElement & { inert?: boolean }).inert).toBe(true);

        button.click();
        output.redraw();
        const openDrawer = output.rootEl.querySelector("nav.mobile-nav__drawer") as HTMLElement;

        expect(button.getAttribute("aria-expanded")).toBe("true");
        expect(openDrawer.hasAttribute("aria-hidden")).toBe(false);
        expect(openDrawer.hasAttribute("inert")).toBe(false);
        expect((openDrawer as HTMLElement & { inert?: boolean }).inert).toBe(false);
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

    it("locks root scrolling while the drawer is open and clears on removal", () => {
        const output = renderAtRoute("/");
        const button = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;

        expect(rootClasses.has(ROOT_SCROLL_LOCK_CLASS)).toBe(false);

        button.click();
        output.redraw();
        expect(rootClasses.has(ROOT_SCROLL_LOCK_CLASS)).toBe(true);

        button.click();
        output.redraw();
        expect(rootClasses.has(ROOT_SCROLL_LOCK_CLASS)).toBe(false);

        button.click();
        output.redraw();
        expect(rootClasses.has(ROOT_SCROLL_LOCK_CLASS)).toBe(true);

        output.onremove();
        expect(rootClasses.has(ROOT_SCROLL_LOCK_CLASS)).toBe(false);
    });

    it("does not focus the first link after a card shell pointer click", async () => {
        await flushFocus();

        const focusLookups: string[] = [];
        const originalGetElementById = document.getElementById.bind(document);
        document.getElementById = ((id: string) => {
            if (id === "mobile-navigation-drawer") return null;
            focusLookups.push(id);
            return { focus: () => undefined } as unknown as HTMLElement;
        }) as Document["getElementById"];

        try {
            const output = renderAtRoute("/");
            const card = output.rootEl.querySelector(".mobile-nav__card") as HTMLElement;

            card.click();
            output.redraw();
            await flushFocus();

            expect(focusLookups).not.toContain("mobile-navigation-first-link");
        } finally {
            document.getElementById = originalGetElementById;
        }
    });
});


// Escape Key Dismissal
describe("Navigation escape key dismissal", () => {
    it("Escape closes an open drawer through the document listener", () => {
        let redrawCalls = 0;
        const redraw = (() => { redrawCalls += 1; }) as typeof m.redraw;
        redraw.sync = () => {};
        m.redraw = redraw;

        const output = renderAtRoute("/");
        const toggle = output.rootEl.querySelector("button.mobile-nav__toggle") as HTMLElement;
        toggle.click();
        output.redraw();
        expect(toggle.getAttribute("aria-expanded")).toBe("true");

        const defaultPrevented = dispatchDocumentKeydown("Escape");
        output.redraw();

        expect(defaultPrevented).toBe(true);
        expect(redrawCalls).toBe(1);
        expect(toggle.getAttribute("aria-expanded")).toBe("false");
    });

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
