import m from "mithril";
import "@css/components/navigation.css";
import { menuIcon, xIcon } from "./icons";
import { focusLater } from "./interaction";


// Navigation
// Fixed desktop sidebar and collapsible mobile drawer.

interface Tool {
    path: string;
    label: string;
}

const TOOLS: Tool[] = [
    { path: "/t/shrinkage", label: "Shrinkage" },
    { path: "/t/firing",    label: "Firing" },
];

const DRAWER_ID = "mobile-navigation-drawer";
const TOGGLE_ID = "mobile-navigation-toggle";
const FIRST_LINK_ID = "mobile-navigation-first-link";

let drawerOpen = false;
let listenerRegistered = false;

const isActiveTool = (path: string): boolean =>
    m.route.get() === path;

const syncContentInert = () => {
    globalThis.document?.querySelector(".app__content")?.toggleAttribute("inert", drawerOpen);
};

export const closeDrawer = (focusToggle: boolean) => {
    if (!drawerOpen) return;
    drawerOpen = false;
    if (focusToggle) focusLater(TOGGLE_ID);
    syncContentInert();
};

const toggleDrawer = (event: Event) => {
    drawerOpen = !drawerOpen;
    if (!(event as PointerEvent).detail) {
        focusLater(drawerOpen ? FIRST_LINK_ID : TOGGLE_ID);
    }
    syncContentInert();
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !drawerOpen) return;
    event.preventDefault();
    closeDrawer(true);
    m.redraw();
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
        m(m.route.Link, {
            class: "sidebar__brand",
            href: "/",
            "aria-current": m.route.get() === "/" ? "page" : undefined,
        }, "Grolleg"),
        m(".sidebar__tools",
            TOOLS.map((tool) => toolLink(tool, "navigation-link sidebar__link")),
        ),
    );

const mobileNavigation = () =>
    m(`.mobile-nav${drawerOpen ? ".open" : ""}`,
        m("button.mobile-nav__backdrop", {
            type: "button",
            "aria-label": "Close navigation",
            "aria-hidden": drawerOpen ? undefined : "true",
            inert: drawerOpen ? undefined : "",
            tabindex: drawerOpen ? 0 : -1,
            onclick: () => { closeDrawer(true); },
        }),
        m(".mobile-nav__card",
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
                }, "Grolleg"),
                TOOLS.map((tool) =>
                    toolLink(tool, "navigation-link mobile-nav__link"),
                ),
            ),
            m(".mobile-nav__bar",
                m("button.mobile-nav__toggle", {
                    id: TOGGLE_ID,
                    type: "button",
                    "aria-label": drawerOpen ? "Close navigation" : "Open navigation",
                    "aria-expanded": drawerOpen ? "true" : "false",
                    "aria-controls": DRAWER_ID,
                    onclick: toggleDrawer,
                }, drawerOpen ? xIcon(22) : menuIcon(22)),
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
