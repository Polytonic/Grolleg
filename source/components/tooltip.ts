import m from "mithril";
import "../styles/tooltip.css";

// Module-level singleton: only one tooltip is open at a time. Opening a
// second tooltip invokes the first's close function before proceeding.
let globalCloseTooltip: (() => void) | null = null;
let tooltipIdCounter = 0;

// tooltip.css duplicates these values. Overflow flip logic needs them
// in JS to measure before painting.
const BUBBLE_WIDTH = 260;
const VIEWPORT_MARGIN = 16;

interface TooltipAttrs {
    label: string;
    text: string;
}

export const Tooltip: m.ClosureComponent<TooltipAttrs> = () => {
    let open = false;
    let pinned = false;
    let flipRight = false;
    let wrapperElement: HTMLElement | null = null;
    tooltipIdCounter += 1;
    const tooltipId = `tooltip-${tooltipIdCounter}`;

    const close = () => {
        if (!open) return;
        open = false;
        pinned = false;
        if (globalCloseTooltip === close) globalCloseTooltip = null;
        document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };

    const handleOutsidePointerDown = (event: PointerEvent) => {
        if (!wrapperElement) return;
        if (wrapperElement.contains(event.target as Node)) return;
        close();
        m.redraw();
    };

    // Overflow-aware placement. If opening to the left would push past
    // the viewport, anchor to the right instead.
    const computeFlip = (): boolean => {
        if (!wrapperElement) return false;
        const rect = wrapperElement.getBoundingClientRect();
        return rect.left + BUBBLE_WIDTH > window.innerWidth - VIEWPORT_MARGIN;
    };

    const openTooltip = (asPinned: boolean) => {
        if (globalCloseTooltip && globalCloseTooltip !== close) globalCloseTooltip();
        flipRight = computeFlip();
        open = true;
        pinned = asPinned;
        globalCloseTooltip = close;
        document.addEventListener("pointerdown", handleOutsidePointerDown);
    };

    return {
        onremove: () => {
            document.removeEventListener("pointerdown", handleOutsidePointerDown);
            if (globalCloseTooltip === close) globalCloseTooltip = null;
        },
        view: ({ attrs }) => m("span.tooltip",
            {
                oncreate: (vnode: m.VnodeDOM) => { wrapperElement = vnode.dom as HTMLElement; },
                onmouseleave: () => {
                    if (open && !pinned) close();
                },
            },
            m(`button.tooltip-button${open ? ".open" : ""}`,
                {
                    type: "button",
                    "aria-label": `More info about ${attrs.label}`,
                    "aria-describedby": open ? tooltipId : undefined,
                    onmouseenter: () => {
                        if (open) return;
                        openTooltip(false);
                    },
                    onclick: (event: MouseEvent) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (open) {
                            close();
                            return;
                        }
                        openTooltip(true);
                    },
                    onkeydown: (event: KeyboardEvent) => {
                        if (event.key === "Escape" && open) {
                            event.preventDefault();
                            close();
                        }
                    },
                    onblur: () => {
                        if (open && pinned) close();
                    },
                },
                "?",
            ),
            open && m(`span.tooltip-bubble${flipRight ? ".flipped" : ""}`,
                {
                    id: tooltipId,
                    role: "tooltip",
                },
                attrs.text,
            ),
        ),
    };
};
