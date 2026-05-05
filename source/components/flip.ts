import type m from "mithril";
import { prefersReducedMotion } from "./interaction";


/* FLIP Animation Utilities   Provides First-Last-Invert-Play layout transitions for children
   marked with data-flip-key attributes. Usage:
     1. Call flipSnapshot(dom) in onbeforeupdate to capture positions.
     2. Call flipPlay(dom, snapshot) in onupdate to animate survivors.
     3. Attach flipLeave as onbeforeremove on individual children to
        fade them out while siblings reflow.
   Honors prefers-reduced-motion: all animation logic is skipped
   under that media query. */

const LAYOUT_DURATION_MS = 250;
const LEAVE_DURATION_MS = 200;
let flipAnimationId = 0;


// Snapshot Phase
// Captures every keyed child's bounding box. Call from
// onbeforeupdate before Mithril patches the DOM.
export const flipSnapshot = (dom: Element | undefined): Map<string, DOMRect> | null => {
    if (prefersReducedMotion() || !dom) return null;
    const snapshot = new Map<string, DOMRect>();
    for (const child of Array.from(dom.children) as HTMLElement[]) {
        // Skip cells already in their leave animation. Their
        // absolute-positioned rect would pollute a survivor's
        // FLIP delta on the next toggle.
        if (child.dataset.flipping === "leaving") continue;
        const key = child.dataset.flipKey;
        if (key) snapshot.set(key, child.getBoundingClientRect());
    }
    return snapshot;
};


// Play Phase
// For each surviving keyed child, computes the (old - new) delta,
// snaps to the old position with transform, then transitions to
// identity. Call from onupdate after Mithril patches the DOM.
export const flipPlay = (dom: Element, snapshot: Map<string, DOMRect> | null): void => {
    if (!snapshot || prefersReducedMotion()) return;
    for (const child of Array.from(dom.children) as HTMLElement[]) {
        if (child.dataset.flipping === "leaving") continue;
        const key = child.dataset.flipKey;
        if (!key) continue;
        const previous = snapshot.get(key);
        if (!previous) continue;
        const current = child.getBoundingClientRect();
        const deltaX = previous.left - current.left;
        const deltaY = previous.top - current.top;
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;
        child.style.transition = "none";
        child.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        requestAnimationFrame(() => {
            const animationId = String(++flipAnimationId);
            child.dataset.flipAnimation = animationId;
            child.style.transition = `transform ${LAYOUT_DURATION_MS / 1000}s ease-out`;
            child.style.transform = "";
            let cleanupTimeout: ReturnType<typeof setTimeout> | undefined;
            const cleanup = (event?: TransitionEvent) => {
                if (event && (event.target !== child || event.propertyName !== "transform")) return;
                child.removeEventListener("transitionend", cleanup);
                if (cleanupTimeout) clearTimeout(cleanupTimeout);
                if (child.dataset.flipAnimation !== animationId) return;
                delete child.dataset.flipAnimation;
                child.style.transition = "";
                child.style.transform = "";
            };
            child.addEventListener("transitionend", cleanup);
            cleanupTimeout = setTimeout(() => cleanup(), LAYOUT_DURATION_MS + 50);
        });
    }
};


/* Leave Animation   Attach as onbeforeremove on children to fade them out during
   removal while the grid collapses around them. The child lifts to
   absolute positioning so siblings reflow immediately. The parent
   element should have position: relative. */

export const flipLeave = (vnode: m.VnodeDOM): Promise<void> | undefined => {
    if (prefersReducedMotion()) return;
    const element = vnode.dom as HTMLElement;
    const parent = element.parentElement;
    if (!parent) return;
    const rect = element.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    element.dataset.flipping = "leaving";
    element.toggleAttribute("inert", true);
    element.setAttribute("aria-hidden", "true");
    element.style.position = "absolute";
    element.style.left = `${rect.left - parentRect.left}px`;
    element.style.top = `${rect.top - parentRect.top}px`;
    element.style.width = `${rect.width}px`;
    element.style.pointerEvents = "none";
    element.style.transition = `opacity ${LEAVE_DURATION_MS / 1000}s ease-out`;
    return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            element.style.opacity = "0";
            // Fallback timeout absorbs frame jitter and tab-throttling
            // on background tabs.
            element.addEventListener("transitionend", () => resolve(), { once: true });
            setTimeout(resolve, LEAVE_DURATION_MS + 50);
        });
    });
};
