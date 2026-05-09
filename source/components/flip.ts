import type m from "mithril";
import { prefersReducedMotion } from "./interaction";


// FLIP Layout Animation
// Animates keyed children across Mithril patches unless reduced motion is set.

const LAYOUT_DURATION_MS = 250;
const LEAVE_DURATION_MS = 200;
let flipAnimationId = 0;


// Snapshot Phase
// Captures keyed child positions before Mithril patches the DOM.
export const flipSnapshot = (dom: Element | undefined): Map<string, DOMRect> | null => {
    if (prefersReducedMotion() || !dom) return null;
    const snapshot = new Map<string, DOMRect>();
    for (const child of Array.from(dom.children) as HTMLElement[]) {
        // Leaving children should not affect survivor deltas.
        if (child.dataset.flipping === "leaving") continue;
        const key = child.dataset.flipKey;
        if (key) snapshot.set(key, child.getBoundingClientRect());
    }
    return snapshot;
};


// Play Phase
// Moves surviving keyed children from their old rect to the patched rect.
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


// Leave Phase
// Removed children should fade out while siblings reflow.

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
    // Absolute positioning should let sibling layout collapse before the fade.
    element.style.position = "absolute";
    element.style.left = `${rect.left - parentRect.left}px`;
    element.style.top = `${rect.top - parentRect.top}px`;
    element.style.width = `${rect.width}px`;
    element.style.pointerEvents = "none";
    element.style.transition = `opacity ${LEAVE_DURATION_MS / 1000}s ease-out`;
    return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            element.style.opacity = "0";
            // Timeout should absorb frame jitter and background-tab throttling.
            element.addEventListener("transitionend", () => resolve(), { once: true });
            setTimeout(resolve, LEAVE_DURATION_MS + 50);
        });
    });
};
