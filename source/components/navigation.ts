import m from "mithril";
import "@css/components/navigation.css";
import { menuIcon, xIcon } from "./icons";
import { focusLater, prefersReducedMotion } from "./interaction";
import { PreferencesPopover, closePreferencesPopovers } from "./preferences-popover";


// Navigation
interface Tool {
    path: string;
    label: string;
}

const TOOLS: Tool[] = [
    { path: "/t/shrinkage", label: "Shrinkage Calculator" },
    { path: "/t/firing",    label: "Firing Cost Calculator" },
];

const DRAWER_ID = "mobile-navigation-drawer";
const TOGGLE_ID = "mobile-navigation-toggle";
const FIRST_LINK_ID = "mobile-navigation-first-link";
const BACKDROP_EXIT_MS = 200;
const ROOT_SCROLL_LOCK_CLASS = "mobile-navigation-scroll-locked";


// Drawer State
let drawerOpen = false;
let backdropRendered = false;
let listenerRegistered = false;
let backdropRemovalTimeout: ReturnType<typeof setTimeout> | undefined;


// Route State
const isActiveTool = (path: string): boolean =>
    m.route.get() === path;

const activeDestinationLabel = (): string => {
    if (m.route.get() === "/") return "Home";
    return TOOLS.find((tool) => isActiveTool(tool.path))?.label ?? "Tools";
};


// Drawer Accessibility
const syncContentInert = () => {
    globalThis.document?.querySelector(".app__content")?.toggleAttribute("inert", drawerOpen);
};

const syncRootScrollLock = () => {
    globalThis.document?.documentElement?.classList.toggle(ROOT_SCROLL_LOCK_CLASS, drawerOpen);
};

const syncDrawerAccessibility = (drawerElement?: Element | null) => {
    if (!drawerElement) return;
    const drawerClosed = !drawerOpen;
    (drawerElement as HTMLElement).inert = drawerClosed;
    drawerElement.toggleAttribute("inert", drawerClosed);
    drawerElement.toggleAttribute("aria-hidden", drawerClosed);
};

const syncDrawerAccessibilityFromDocument = () => {
    syncDrawerAccessibility(globalThis.document?.getElementById(DRAWER_ID));
};

const syncDrawerShell = () => {
    syncDrawerAccessibilityFromDocument();
    syncContentInert();
    syncRootScrollLock();
};


// Backdrop Lifecycle
const clearBackdropRemovalTimeout = () => {
    if (!backdropRemovalTimeout) return;
    clearTimeout(backdropRemovalTimeout);
    backdropRemovalTimeout = undefined;
};

const removeBackdrop = () => {
    clearBackdropRemovalTimeout();
    backdropRendered = false;
};

const showBackdrop = () => {
    clearBackdropRemovalTimeout();
    backdropRendered = true;
};

const scheduleBackdropRemoval = () => {
    clearBackdropRemovalTimeout();
    if (prefersReducedMotion()) {
        backdropRendered = false;
        return;
    }
    backdropRemovalTimeout = setTimeout(() => {
        backdropRemovalTimeout = undefined;
        if (drawerOpen) return;
        backdropRendered = false;
        m.redraw();
    }, BACKDROP_EXIT_MS);
};


// Drawer Actions
const setDrawerOpen = (nextDrawerOpen: boolean, focusTargetId?: string) => {
    if (drawerOpen === nextDrawerOpen) {
        if (!drawerOpen) removeBackdrop();
        syncDrawerShell();
        return;
    }

    drawerOpen = nextDrawerOpen;
    if (drawerOpen) showBackdrop();
    else scheduleBackdropRemoval();
    if (focusTargetId) focusLater(focusTargetId);
    syncDrawerShell();
};

export const closeDrawer = (focusToggle: boolean) => {
    setDrawerOpen(false, focusToggle ? TOGGLE_ID : undefined);
};

const toggleDrawer = (event: Event) => {
    const shouldOpenDrawer = !drawerOpen;
    const openedByKeyboard = ((event as MouseEvent).detail ?? 0) === 0;
    if (shouldOpenDrawer) closePreferencesPopovers(false);

    setDrawerOpen(
        shouldOpenDrawer,
        openedByKeyboard ? (shouldOpenDrawer ? FIRST_LINK_ID : TOGGLE_ID) : undefined,
    );
};


// Event Handling
const handleBackdropTransitionEnd = (event: Event) => {
    if (event.target !== event.currentTarget || drawerOpen) return;
    const propertyName = (event as TransitionEvent).propertyName;
    if (propertyName && propertyName !== "opacity") return;
    removeBackdrop();
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !drawerOpen) return;
    event.preventDefault();
    closeDrawer(true);
    m.redraw();
};

const isInteractiveTarget = (target: EventTarget | null): boolean =>
    !!(target as Element | null)?.closest?.("button, a");

const openDrawerFromCard = (event: Event) => {
    if (drawerOpen || isInteractiveTarget(event.target)) return;
    closePreferencesPopovers(false);
    setDrawerOpen(true);
};


// Render Helpers
const toolLink = (tool: Tool, className: string, id?: string) => {
    const active = isActiveTool(tool.path);
    return m(m.route.Link, {
        id,
        class: `${className}${active ? " active" : ""}`,
        href: tool.path,
        "aria-current": active ? "page" : undefined,
        onclick: () => { closeDrawer(false); },
    }, tool.label);
};


// Desktop Navigation
const desktopSidebar = () =>
    m("nav.sidebar", { "aria-label": "Site navigation" },
        m(".sidebar__identity",
            m(m.route.Link, {
                class: "sidebar__brand",
                href: "/",
                "aria-current": m.route.get() === "/" ? "page" : undefined,
            }, "Grolleg"),
        ),
        m(".sidebar__section",
            m(".sidebar__tools",
                TOOLS.map((tool) => toolLink(tool, "navigation-link sidebar__link")),
            ),
        ),
        m(".sidebar__footer",
            m(PreferencesPopover, { placement: "desktop" }),
        ),
    );


// Mobile Navigation
const mobileNavigation = () =>
    m(".mobile-nav", { class: drawerOpen ? "open" : "" },
        backdropRendered && m(".mobile-nav__backdrop", {
            "aria-hidden": "true",
            onclick: () => { closeDrawer(true); },
            ontransitionend: handleBackdropTransitionEnd,
        }),
        m(".mobile-nav__card", { onclick: openDrawerFromCard },
            m(".mobile-nav__bar",
                m(".mobile-nav__summary",
                    m(".mobile-nav__kicker", "Grolleg"),
                    m(".mobile-nav__current", activeDestinationLabel()),
                ),
                m(PreferencesPopover, {
                    placement: "mobile",
                    // The mobile card should expose one overlay surface at a time.
                    onBeforeOpen: () => { closeDrawer(false); },
                }),
                m("button.mobile-nav__toggle", {
                    id: TOGGLE_ID,
                    type: "button",
                    "aria-label": drawerOpen ? "Close navigation" : "Open navigation",
                    "aria-expanded": drawerOpen ? "true" : "false",
                    "aria-controls": DRAWER_ID,
                    onclick: toggleDrawer,
                }, drawerOpen ? xIcon(22) : menuIcon(22)),
            ),
            m("nav.mobile-nav__drawer", {
                id: DRAWER_ID,
                "aria-label": "Site navigation",
                "aria-hidden": drawerOpen ? undefined : "true",
                inert: !drawerOpen,
                oncreate: ({ dom }: m.VnodeDOM) => { syncDrawerAccessibility(dom as HTMLElement); },
                onupdate: ({ dom }: m.VnodeDOM) => { syncDrawerAccessibility(dom as HTMLElement); },
            },
                m(m.route.Link, {
                    id: FIRST_LINK_ID,
                    class: `mobile-nav__brand${m.route.get() === "/" ? " active" : ""}`,
                    href: "/",
                    "aria-current": m.route.get() === "/" ? "page" : undefined,
                    onclick: () => { closeDrawer(false); },
                }, "Home"),
                TOOLS.map((tool) =>
                    toolLink(tool, "navigation-link"),
                ),
            ),
        ),
    );


// Component Lifecycle
export const Navigation: m.Component = {
    oncreate() {
        if (!listenerRegistered && globalThis.document) {
            document.addEventListener("keydown", handleDocumentKeydown);
            listenerRegistered = true;
        }
    },
    onremove() {
        drawerOpen = false;
        removeBackdrop();
        syncDrawerShell();
        if (globalThis.document) {
            document.removeEventListener("keydown", handleDocumentKeydown);
            listenerRegistered = false;
        }
    },
    view: () => [
        desktopSidebar(),
        mobileNavigation(),
    ],
};
