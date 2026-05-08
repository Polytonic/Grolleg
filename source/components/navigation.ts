import m from "mithril";
import "@css/components/navigation.css";
import { menuIcon, xIcon } from "./icons";
import { focusLater, prefersReducedMotion } from "./interaction";
import { PreferencesPopover, closePreferencesPopovers } from "./preferences-popover";


// Navigation
// Fixed desktop tool rail and collapsible mobile tray.

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

let drawerOpen = false;
let backdropRendered = false;
let listenerRegistered = false;
let backdropRemovalTimeout: ReturnType<typeof setTimeout> | undefined;

const isActiveTool = (path: string): boolean =>
    m.route.get() === path;

const activeDestinationLabel = (): string => {
    if (m.route.get() === "/") return "Home";
    return TOOLS.find((tool) => isActiveTool(tool.path))?.label ?? "Tools";
};

const syncContentInert = () => {
    globalThis.document?.querySelector(".app__content")?.toggleAttribute("inert", drawerOpen);
};

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

export const closeDrawer = (focusToggle: boolean) => {
    if (!drawerOpen) {
        removeBackdrop();
        return;
    }
    drawerOpen = false;
    scheduleBackdropRemoval();
    if (focusToggle) focusLater(TOGGLE_ID);
    syncContentInert();
};

const toggleDrawer = (event: Event) => {
    const opening = !drawerOpen;
    if (opening) closePreferencesPopovers(false);

    drawerOpen = opening;
    if (drawerOpen) showBackdrop();
    else scheduleBackdropRemoval();
    if (!(event as PointerEvent).detail) {
        focusLater(drawerOpen ? FIRST_LINK_ID : TOGGLE_ID);
    }
    syncContentInert();
};

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
    drawerOpen = true;
    showBackdrop();
    syncContentInert();
};


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
                inert: drawerOpen ? undefined : "",
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
