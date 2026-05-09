import m from "mithril";
import { parseLocaleNumber } from "./locale";

// Input With Suffix
// The component should expose a non-interactive unit suffix inside a positioned input wrapper.

// Component Contract
type Modifier = "numeric" | "warn" | "error";

interface InputWithSuffixAttrs {
    suffix: m.Children;
    modifiers?: readonly Modifier[];
    pulseKey?: number;
    // Expanded suffix text should be exposed through a screen-reader description.
    suffixSr?: string;
    [key: string]: unknown;
}

let suffixSrIdCounter = 0;

type PulseTracker = { lastPulseKey: number };

// Pulse Animation
const replayPulse = (element: HTMLElement) => {
    element.classList.remove("pulsing");
    void element.offsetHeight;
    element.classList.add("pulsing");
};

// The generated suffix description id should stay stable for this component instance.
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
        // Lifecycle attrs should stay on the component vnode. The inner input
        // lifecycle is reserved for pulse animation replay.
        const inputAttrs = m.censor(attrs, ["suffix", "modifiers", "pulseKey", "suffixSr"]);
        const modifierClass = attrs.modifiers?.length
            ? "." + attrs.modifiers.join(".")
            : "";

        const hasExplicitState = attrs.modifiers?.includes("warn") || attrs.modifiers?.includes("error");
        const value = attrs.value;
        const parseInvalid = !hasExplicitState
            && attrs.inputmode === "decimal"
            && typeof value === "string"
            && value !== ""
            && !Number.isFinite(parseLocaleNumber(value));

        const inputProps: Record<string, unknown> = { ...inputAttrs };
        if (state.suffixSrId) {
            const existing = inputProps["aria-describedby"];
            inputProps["aria-describedby"] = existing
                ? `${existing} ${state.suffixSrId}`
                : state.suffixSrId;
        }
        if (attrs.pulseKey !== undefined) {
            const pulseKey = attrs.pulseKey;
            inputProps.oncreate = (vnode: m.VnodeDOM<unknown, PulseTracker>) => {
                vnode.state.lastPulseKey = pulseKey;
                // New inputs should flash for the state change that created them.
                if (pulseKey > 0) replayPulse(vnode.dom as HTMLElement);
            };
            inputProps.onupdate = (vnode: m.VnodeDOM<unknown, PulseTracker>) => {
                if (vnode.state.lastPulseKey !== pulseKey) {
                    vnode.state.lastPulseKey = pulseKey;
                    if (pulseKey !== 0) replayPulse(vnode.dom as HTMLElement);
                }
            };
        }

        if (parseInvalid) {
            inputProps["aria-invalid"] = "true";
            inputProps.class = "warn";
        }

        return m(".input-with-suffix",
            m(`input.input.with-suffix${modifierClass}`, inputProps),
            m("span.input-suffix", attrs.suffix),
            state.suffixSrId && attrs.suffixSr && m("span.sr-only", { id: state.suffixSrId }, attrs.suffixSr),
        );
    },
};
