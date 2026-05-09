// Interaction Utilities

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const reducedMotionQuery =
    typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia(REDUCED_MOTION_QUERY)
        : null;

// Missing media-query support should behave like no reduced-motion preference.
export const prefersReducedMotion = (): boolean => reducedMotionQuery?.matches ?? false;

// Unsupported haptics should be a no-op for callers.
export const haptic = () => { globalThis.navigator?.vibrate?.(15); };

// Focus should wait until Mithril applies the latest state mutation.
export const focusLater = (id: string) => {
    setTimeout(() => { globalThis.document?.getElementById(id)?.focus(); }, 0);
};
