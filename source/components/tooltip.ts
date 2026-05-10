import m from "mithril";
import "@css/components/tooltip.css";

// Geometry Constants
// CSS should mirror these values so JS can measure before painting.
const BUBBLE_WIDTH = 260;
const VIEWPORT_MARGIN = 16;

// Singleton Open State
// Opening a second tooltip should close the first.
let globalCloseTooltip: (() => void) | null = null;
let groupIdCounter = 0;


// State Registry
interface TooltipState {
    open: boolean;
    pinned: boolean;
    triggerElement: HTMLElement | null;
    portalElement: HTMLElement | null;
    tooltipId: string;
    closeTimer: ReturnType<typeof setTimeout> | null;
    openTooltip: (asPinned: boolean) => void;
    close: () => void;
}

const stateRegistry = new Map<string, TooltipState>();

// State should own dismissal so compound parts stay declarative.
const createState = (): TooltipState => {
    const state: TooltipState = {
        open: false,
        pinned: false,
        triggerElement: null,
        portalElement: null,
        tooltipId: `tooltip-${++groupIdCounter}`,
        closeTimer: null,

        openTooltip(asPinned: boolean) {
            if (globalCloseTooltip && globalCloseTooltip !== state.close) {
                globalCloseTooltip();
            }
            state.open = true;
            state.pinned = asPinned;
            globalCloseTooltip = state.close;
            if (typeof document !== "undefined") {
                document.addEventListener("pointerdown", handleOutsidePointerDown);
            }
        },

        close() {
            if (!state.open) return;
            state.open = false;
            state.pinned = false;
            if (state.closeTimer) {
                clearTimeout(state.closeTimer);
                state.closeTimer = null;
            }
            if (globalCloseTooltip === state.close) globalCloseTooltip = null;
            if (typeof document !== "undefined") {
                document.removeEventListener("pointerdown", handleOutsidePointerDown);
            }
        },
    };

    // Outside pointer presses should dismiss both trigger and portal.
    const handleOutsidePointerDown = (event: PointerEvent) => {
        const target = event.target as Node;
        if (state.triggerElement?.contains(target)) return;
        if (state.portalElement?.contains(target)) return;
        state.close();
        m.redraw();
    };

    return state;
};

// Hover gaps should not close the bubble before the pointer can cross.
const scheduleClose = (state: TooltipState) => {
    if (state.pinned) return;
    state.closeTimer = setTimeout(() => {
        if (!state.pinned) {
            state.close();
            m.redraw();
        }
    }, 100);
};

const cancelClose = (state: TooltipState) => {
    if (state.closeTimer) {
        clearTimeout(state.closeTimer);
        state.closeTimer = null;
    }
};


// Compound Components

// Root State Lifecycle

interface TooltipRootAttrs {
    groupId?: string;
}

const TooltipRoot: m.ClosureComponent<TooltipRootAttrs> = () => {
    let groupId: string;

    return {
        oninit(vnode) {
            groupId = vnode.attrs.groupId ?? `tooltip-auto-${++groupIdCounter}`;
            stateRegistry.set(groupId, createState());
        },
        onremove() {
            const state = stateRegistry.get(groupId);
            if (state) {
                state.close();
                stateRegistry.delete(groupId);
            }
        },
        view: (vnode) => m("span.tooltip", {
            onmouseleave: () => {
                const state = stateRegistry.get(groupId);
                if (state?.open) scheduleClose(state);
            },
        }, vnode.children),
    };
};

// Trigger Wrapper

interface TooltipTriggerAttrs {
    groupId: string;
}

// Touch devices often fire mouseenter before click, causing open then close.
const hasHover = typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches;

const TooltipTrigger: m.ClosureComponent<TooltipTriggerAttrs> = () => {
    return {
        view: (vnode) => {
            const state = stateRegistry.get(vnode.attrs.groupId);
            if (!state) return vnode.children;

            return m("span.tooltip-trigger", {
                oncreate: (vnode: m.VnodeDOM) => {
                    state.triggerElement = vnode.dom as HTMLElement;
                },
                onmouseenter: () => {
                    cancelClose(state);
                    if (hasHover && !state.open) state.openTooltip(false);
                },
                onclick: (event: MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (state.open) {
                        state.close();
                        return;
                    }
                    state.openTooltip(true);
                },
                onkeydown: (event: KeyboardEvent) => {
                    if (event.key === "Escape" && state.open) {
                        event.preventDefault();
                        state.close();
                    }
                },
                onfocusout: (event: FocusEvent) => {
                    if (state.open && !state.portalElement?.contains(event.relatedTarget as Node)) {
                        state.close();
                    }
                },
            }, vnode.children);
        },
    };
};

// Portal Content

interface TooltipContentAttrs {
    groupId: string;
}

const TooltipContent: m.ClosureComponent<TooltipContentAttrs> = () => {
    let portalDiv: HTMLElement | null = null;
    let latestChildren: m.Children = null;
    let scrollElement: Element | null = null;
    let dismissForViewportChange: (() => void) | null = null;

    const mountViewportListeners = (groupId: string) => {
        if (typeof window === "undefined") return;
        dismissForViewportChange = () => {
            const state = stateRegistry.get(groupId);
            if (!state?.open) return;
            state.close();
            m.redraw();
        };
        window.addEventListener("resize", dismissForViewportChange);
        window.addEventListener("scroll", dismissForViewportChange, { passive: true });
        window.visualViewport?.addEventListener("resize", dismissForViewportChange);
        scrollElement = typeof document === "undefined" ? null : document.querySelector(".app__content");
        scrollElement?.addEventListener("scroll", dismissForViewportChange, { passive: true });
    };

    const unmountViewportListeners = () => {
        if (!dismissForViewportChange || typeof window === "undefined") return;
        window.removeEventListener("resize", dismissForViewportChange);
        window.removeEventListener("scroll", dismissForViewportChange);
        window.visualViewport?.removeEventListener("resize", dismissForViewportChange);
        scrollElement?.removeEventListener("scroll", dismissForViewportChange);
        scrollElement = null;
        dismissForViewportChange = null;
    };

    const mountPortal = (groupId: string) => {
        if (portalDiv || typeof document === "undefined") return;
        portalDiv = document.createElement("div");
        portalDiv.className = "tooltip-portal";
        document.body.appendChild(portalDiv);
        mountViewportListeners(groupId);

        const tooltipState = stateRegistry.get(groupId);
        if (tooltipState) {
            tooltipState.portalElement = portalDiv;
        }

        m.mount(portalDiv, {
            view: () => {
                const state = stateRegistry.get(groupId);
                if (!state?.open || !state.triggerElement) return null;

                // Bubble should stay within the viewport before it paints.
                const rect = state.triggerElement.getBoundingClientRect();
                const flipRight = rect.left + BUBBLE_WIDTH > window.innerWidth - VIEWPORT_MARGIN;
                const style: Record<string, string> = {
                    position: "fixed",
                    top: `${rect.bottom + 8}px`,
                    maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
                };
                if (flipRight) {
                    style.right = `${window.innerWidth - rect.right}px`;
                } else {
                    style.left = `${rect.left}px`;
                }

                return m("span.tooltip-bubble", {
                    id: state.tooltipId,
                    role: "tooltip",
                    style,
                    onmouseenter: () => cancelClose(state),
                    onmouseleave: () => scheduleClose(state),
                }, latestChildren);
            },
        });
    };

    const unmountPortal = (groupId: string) => {
        unmountViewportListeners();
        const state = stateRegistry.get(groupId);
        if (state) state.portalElement = null;
        if (portalDiv) {
            m.mount(portalDiv, null);
            portalDiv.remove();
            portalDiv = null;
        }
    };

    return {
        oncreate(vnode) { mountPortal(vnode.attrs.groupId); },
        onremove(vnode) { unmountPortal(vnode.attrs.groupId); },
        view(vnode) {
            latestChildren = vnode.children;
            return null;
        },
    };
};


// Compatibility Wrapper
// Keeps the existing question-button API over the compound pieces.
interface TooltipAttrs {
    label: string;
    text: string;
}

export const Tooltip: m.ClosureComponent<TooltipAttrs> = () => {
    const groupId = `tooltip-compat-${++groupIdCounter}`;

    return {
        view: ({ attrs }) => {
            const state = stateRegistry.get(groupId);
            const isOpen = state?.open ?? false;

            return m(TooltipRoot, { groupId },
                m(TooltipTrigger, { groupId },
                    m(`button.tooltip-button${isOpen ? ".open" : ""}`, {
                        type: "button",
                        "aria-label": `More info about ${attrs.label}`,
                        "aria-describedby": isOpen ? state!.tooltipId : undefined,
                    }, "?"),
                ),
                m(TooltipContent, { groupId }, attrs.text),
            );
        },
    };
};
