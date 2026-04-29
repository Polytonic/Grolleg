import m from "mithril";


/* ── Input With Suffix ──
   Number input with an absolutely-positioned unit string at the right
   edge ("%", "in", "¢/in³"). The wrapper provides the relative
   positioning context. The suffix is non-interactive so it doesn't
   eat clicks meant for the input.

   Pass-through API: `suffix`, `modifiers`, and `pulseKey` are consumed
   by the component, everything else flows to the inner <input>.
   `modifiers` is a typed list of class hooks ("numeric", "warn",
   "error") that get appended to the base `.input.with-suffix` selector.
   `pulseKey` is a monotonic counter. Whenever it changes between
   renders the input replays its `.pulsing` background-fade animation
   (CSS-defined per consumer). The animation also plays on initial
   mount when pulseKey is non-zero, so newly-appearing inputs flash
   alongside surviving ones on the same state change. */

type Modifier = "numeric" | "warn" | "error";

interface InputWithSuffixAttrs {
    suffix: m.Children;
    modifiers?: readonly Modifier[];
    pulseKey?: number;
    // Verbose unit string for SR announcement, adding aria-describedby to a hidden sibling.
    suffixSr?: string;
    [key: string]: unknown;
}

let suffixSrIdCounter = 0;

type PulseTracker = { lastPulseKey: number };

const replayPulse = (element: HTMLElement) => {
    element.classList.remove("pulsing");
    void element.offsetHeight;
    element.classList.add("pulsing");
};

// Per-instance counter used to mint a stable id for the SR-only unit
// span when `suffixSr` is provided.
interface InputWithSuffixState {
    suffixSrId?: string;
}

export const InputWithSuffix: m.Component<InputWithSuffixAttrs, InputWithSuffixState> = {
    oninit(vnode) {
        if (vnode.attrs.suffixSr) {
            vnode.state.suffixSrId = `input-suffix-sr-${++suffixSrIdCounter}`;
        }
    },
    view({ attrs, state }) {
        // m.censor strips Mithril's reserved attrs (key + lifecycle hooks)
        // plus the named extras, so the remainder spreads cleanly onto the
        // inner <input> without the fragment-key error.
        const inputAttrs = m.censor(attrs, ["suffix", "modifiers", "pulseKey", "suffixSr"]);
        const modifierClass = attrs.modifiers?.length
            ? "." + attrs.modifiers.join(".")
            : "";

        const inputProps: Record<string, unknown> = { ...inputAttrs };
        if (state.suffixSrId) {
            // Compose with caller-supplied aria-describedby if present.
            const existing = inputProps["aria-describedby"];
            inputProps["aria-describedby"] = existing
                ? `${existing} ${state.suffixSrId}`
                : state.suffixSrId;
        }
        // Trackpad scroll over a focused number input would otherwise
        // change the value (browser default for type="number"), making
        // the page feel stuck. Blur on wheel hands the wheel back to
        // the page so it scrolls instead.
        if (inputProps.type === "number") {
            inputProps.onwheel = (event: WheelEvent) => {
                const target = event.currentTarget as HTMLInputElement;
                if (document.activeElement === target) target.blur();
            };
        }
        if (attrs.pulseKey !== undefined) {
            const pulseKey = attrs.pulseKey;
            inputProps.oncreate = (vnode: m.VnodeDOM<unknown, PulseTracker>) => {
                vnode.state.lastPulseKey = pulseKey;
                // Mount-time pulse: this input just appeared in response
                // to the same toggle that bumped the key. Animate so the
                // new field reads as "this is what changed."
                if (pulseKey > 0) replayPulse(vnode.dom as HTMLElement);
            };
            inputProps.onupdate = (vnode: m.VnodeDOM<unknown, PulseTracker>) => {
                if (vnode.state.lastPulseKey === pulseKey) return;
                vnode.state.lastPulseKey = pulseKey;
                if (pulseKey === 0) return;
                replayPulse(vnode.dom as HTMLElement);
            };
        }

        return m(".input-with-suffix",
            m(`input.input.with-suffix${modifierClass}`, inputProps),
            m("span.input-suffix", attrs.suffix),
            state.suffixSrId && attrs.suffixSr && m("span.sr-only", { id: state.suffixSrId }, attrs.suffixSr),
        );
    },
};
