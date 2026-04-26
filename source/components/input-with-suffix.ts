import m from "mithril";


/* ── Input With Suffix ──
   Number input with an absolutely-positioned unit string at the right
   edge ("%", "in", "¢/in³"). The wrapper provides the relative
   positioning context. The suffix is non-interactive so it doesn't
   eat clicks meant for the input.

   Pass-through API: `suffix`, `inputClass`, and `pulseKey` are consumed
   by the component, everything else flows to the inner <input>.
   `inputClass` takes a space-separated modifier string (e.g., "numeric
   warn") that gets appended to the base `.input.with-suffix` selector.
   `pulseKey` is a monotonic counter. Whenever it changes between
   renders the input replays its `.pulsing` background-fade animation
   (CSS-defined per consumer). The animation also plays on initial
   mount when pulseKey is non-zero, so newly-appearing inputs flash
   alongside surviving ones on the same state change. */

interface InputWithSuffixAttrs {
    suffix: m.Children;
    inputClass?: string;
    pulseKey?: number;
    [key: string]: unknown;
}

type PulseTracker = { lastPulseKey: number };

const replayPulse = (element: HTMLElement) => {
    element.classList.remove("pulsing");
    void element.offsetHeight;
    element.classList.add("pulsing");
};

export const InputWithSuffix: m.Component<InputWithSuffixAttrs> = {
    view: ({ attrs }) => {
        // `key` is consumed by Mithril for the parent component vnode but
        // also surfaces in `attrs`. If left in the spread, it would tag
        // the inner <input> as keyed while its sibling <span> stays
        // unkeyed, which throws a "vnodes must either all have keys or
        // none have keys" fragment error.
        const { suffix, inputClass, pulseKey, key: _key, ...inputAttrs } = attrs;
        void _key;
        const modifier = inputClass
            ? "." + inputClass.split(/\s+/).filter(Boolean).join(".")
            : "";

        const inputProps: Record<string, unknown> = { ...inputAttrs };
        if (pulseKey !== undefined) {
            inputProps.oncreate = (vnode: m.VnodeDOM) => {
                (vnode.state as PulseTracker).lastPulseKey = pulseKey;
                // Mount-time pulse: this input just appeared in response
                // to the same toggle that bumped the key. Animate so the
                // new field reads as "this is what changed."
                if (pulseKey > 0) replayPulse(vnode.dom as HTMLElement);
            };
            inputProps.onupdate = (vnode: m.VnodeDOM) => {
                const tracker = vnode.state as PulseTracker;
                if (tracker.lastPulseKey === pulseKey) return;
                tracker.lastPulseKey = pulseKey;
                if (pulseKey === 0) return;
                replayPulse(vnode.dom as HTMLElement);
            };
        }

        return m(".input-with-suffix",
            m(`input.input.with-suffix${modifier}`, inputProps),
            m("span.input-suffix", suffix),
        );
    },
};
