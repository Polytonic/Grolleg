import m from "mithril";
import "@css/components/tooltip.css";

// Tooltip constants. CSS duplicates the width and margin values
// because overflow flip logic needs them in JS to measure before painting.
const BUBBLE_WIDTH = 260;
const VIEWPORT_MARGIN = 16;

// Only one tooltip open at a time. Opening a second invokes the first's close.
let globalCloseTooltip: (() => void) | null = null;
let groupIdCounter = 0;


/* ── State Registry ── */

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

// Creates a shared state entry for a tooltip group. All open/close/dismiss
// logic lives here so compound components only need to read and call methods.
const createState = (groupId: string): TooltipState => {
    const state: TooltipState = {
        open: false,
        pinned: false,
        triggerElement: null,
        portalElement: null,
        tooltipId: `tooltip-${++groupIdCounter}`,
        closeTimer: null,

        openTooltip(asPinned: boolean) {
            if (globalCloseTooltip && globalCloseTooltip !== state.close) globalCloseTooltip();
            state.open = true;
            state.pinned = asPinned;
            globalCloseTooltip = state.close;
            document.addEventListener("pointerdown", handleOutsidePointerDown);
        },

        close() {
            if (!state.open) return;
            state.open = false;
            state.pinned = false;
            if (state.closeTimer) { clearTimeout(state.closeTimer); state.closeTimer = null; }
            if (globalCloseTooltip === state.close) globalCloseTooltip = null;
            document.removeEventListener("pointerdown", handleOutsidePointerDown);
        },
    };

    // Closes when clicking outside both trigger and portal bubble
    const handleOutsidePointerDown = (event: PointerEvent) => {
        const target = event.target as Node;
        if (state.triggerElement?.contains(target)) return;
        if (state.portalElement?.contains(target)) return;
        state.close();
        m.redraw();
    };

    return state;
};

// Schedules a close after a short delay, giving the user time
// to move the mouse from trigger to portal bubble across the gap.
const scheduleClose = (state: TooltipState) => {
    if (state.pinned) return;
    state.closeTimer = setTimeout(() => {
        if (!state.pinned) { state.close(); m.redraw(); }
    }, 100);
};

const cancelClose = (state: TooltipState) => {
    if (state.closeTimer) { clearTimeout(state.closeTimer); state.closeTimer = null; }
};


/* ── Compound Components ── */

// State lifecycle and singleton management
interface TooltipRootAttrs {
    groupId?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const TooltipRoot: m.ClosureComponent<TooltipRootAttrs> = () => {
    let groupId: string;

    return {
        oninit(vnode) {
            groupId = vnode.attrs.groupId ?? `tooltip-auto-${++groupIdCounter}`;
            stateRegistry.set(groupId, createState(groupId));
        },
        onremove() {
            const state = stateRegistry.get(groupId);
            if (state) { state.close(); stateRegistry.delete(groupId); }
        },
        view: (vnode) => m("span.tooltip", {
            onmouseleave: () => {
                const state = stateRegistry.get(groupId);
                if (state?.open) scheduleClose(state);
            },
        }, vnode.children),
    };
};

// Wraps any child element and wires up interaction handlers
interface TooltipTriggerAttrs {
    groupId: string;
}

// Detect touch capability to prevent mouseenter from racing with click on mobile.
// Touch devices fire mouseenter → click in sequence, causing open-then-close.
const hasHover = typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches;

export const TooltipTrigger: m.ClosureComponent<TooltipTriggerAttrs> = () => {
    return {
        view: (vnode) => {
            const state = stateRegistry.get(vnode.attrs.groupId);
            if (!state) return vnode.children;

            return m("span", {
                oncreate: (v: m.VnodeDOM) => { state.triggerElement = v.dom as HTMLElement; },
                onmouseenter: () => {
                    cancelClose(state);
                    if (hasHover && !state.open) state.openTooltip(false);
                },
                onclick: (event: MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (state.open) { state.close(); return; }
                    state.openTooltip(true);
                },
                onkeydown: (event: KeyboardEvent) => {
                    if (event.key === "Escape" && state.open) {
                        event.preventDefault();
                        state.close();
                    }
                },
                onblur: () => { if (state.open && state.pinned) state.close(); },
            }, vnode.children);
        },
    };
};

// Renders tooltip bubble content via a portal appended to document.body
interface TooltipContentAttrs {
    groupId: string;
}

export const TooltipContent: m.ClosureComponent<TooltipContentAttrs> = () => {
    let portalDiv: HTMLElement | null = null;
    let latestChildren: m.Children = null;

    const mountPortal = (groupId: string) => {
        if (portalDiv || typeof document === "undefined") return;
        portalDiv = document.createElement("div");
        portalDiv.className = "tooltip-portal";
        document.body.appendChild(portalDiv);

        const tooltipState = stateRegistry.get(groupId);
        if (tooltipState) tooltipState.portalElement = portalDiv;

        m.mount(portalDiv, {
            view: () => {
                const state = stateRegistry.get(groupId);
                if (!state?.open || !state.triggerElement) return null;

                // Position bubble below the trigger using fixed coordinates
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


/* ── Convenience Wrapper ── */

// Backward-compatible Tooltip that composes Root + Trigger + Content
// with the "?" button pattern. Existing call sites use this unchanged.
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
