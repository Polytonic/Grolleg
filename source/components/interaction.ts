/* ── Interaction Utilities ──
   Lightweight progressive enhancements shared across tools. */

// iOS Safari silently ignores vibration, so no error handling needed.
export const haptic = () => { navigator?.vibrate?.(15); };

// Defer focus to next tick so the DOM reflects the latest state mutation.
export const focusLater = (id: string) =>
    setTimeout(() => { globalThis.document?.getElementById(id)?.focus(); }, 0);
