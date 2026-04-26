import m from "mithril";
import { Tooltip } from "../../components/tooltip";
import { ConnectedPill } from "../../components/connected-pill";
import { UnitToggle } from "../../components/unit-toggle";
import { InputWithSuffix } from "../../components/input-with-suffix";
import {
    state, BASIS_META, ROUNDING_OPTIONS, toDisplayRate,
    handleBasisChange, handleRoundingChange, handleMinHeightInput,
    handleFiringRateInput, handleBundledRateInput,
    toggleFiring, toggleBundled,
} from "./state";
import type { Derived } from "./state";


/* Aria-label expansion for every unit string the calculator can show.
   Falls back to the raw unit if a key isn't listed. */
const UNIT_ARIA_LABELS: Record<string, string> = {
    mm: "millimeters",
    cm: "centimeters",
    in: "inches",
    g:  "grams",
    kg: "kilograms",
    oz: "ounces",
    lb: "pounds",
};


/* ── Local Icon ──
   The chain glyph signals the Bundled state without text. The icon
   alone reads as a different class from the firing pills next to it. */

const chainLinkIcon = (size: number = 16): m.Vnode =>
    m("svg", {
        width: size, height: size, viewBox: "0 0 24 24",
        fill: "none", stroke: "currentColor", "stroke-width": 2,
        "stroke-linecap": "round", "stroke-linejoin": "round",
        "aria-hidden": "true",
    },
        m("path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }),
        m("path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }),
    );


/* ── Local Pill Primitive ──
   Sized to align vertically with input rows. Shares the suite's
   color-state vocabulary (hover lightens 15% toward accent, press
   darkens 15% toward black) without inheriting the shrinkage
   `.shape-pill`'s sizing, which targets a denser layout. */

interface PillAttrs {
    active: boolean;
    onclick: () => void;
    flex?: boolean;
    ariaLabel?: string;
    title?: string;
}

const Pill: m.Component<PillAttrs> = {
    view: ({ attrs, children }) =>
        m(`button.pill${attrs.active ? ".active" : ""}${attrs.flex ? ".flex" : ""}`,
            {
                type: "button",
                "aria-pressed": attrs.active ? "true" : "false",
                "aria-label": attrs.ariaLabel,
                title: attrs.title,
                onclick: attrs.onclick,
            },
            children,
        ),
};


/* ── Row 1: Billing + Rounding ──
   Billing (volume / footprint / weight) sits at the top. Rounding
   shares the row as a 2-column grid when it applies (volume and
   footprint bases); weight basis collapses to a single column. The
   selects use the bare `.select` class because chaining `.input.select`
   lets `.input`'s background shorthand wipe the chevron's
   background-image. */

const BasisField: m.Component = {
    view: () => m(".field-group",
        m("label.label", { for: "basis-select" }, "Measurement Method"),
        m("select.select#basis-select",
            {
                value: state.basis,
                onchange: handleBasisChange,
            },
            (Object.keys(BASIS_META) as Array<keyof typeof BASIS_META>).map((basis) =>
                m("option", { key: basis, value: basis }, BASIS_META[basis].label),
            ),
        ),
    ),
};

const RoundingField: m.Component = {
    view: () => m(".field-group",
        m("label.label", { for: "rounding-select" },
            m("span", "Rounding Method"),
            m(Tooltip, {
                label: "rounding",
                text: 'How dimensions are rounded before billing. For a 4.2 × 5.7 × 3.1 piece (74.2 in³ exact): Each Dimension rounds up L, W, H independently to 5 × 6 × 4 = 120 in³, matching the measuring-box convention. Total rounds up the final volume to 75 in³. Nearest Whole rounds without preference to 74 in³. Don\'t Round uses exact decimals.',
            }),
        ),
        m("select.select#rounding-select",
            {
                value: state.rounding,
                onchange: handleRoundingChange,
            },
            ROUNDING_OPTIONS.map((option) =>
                m("option", { key: option.key, value: option.key }, option.label),
            ),
        ),
    ),
};

const BillingRow: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) =>
        m(`.billing-row${derived.showRounding ? ".paired" : ""}`,
            m(BasisField),
            derived.showRounding && m(RoundingField),
        ),
};


/* ── Row 2: Firings + Minimum Height ──
   The firings pill row (chain + Bisque|Glaze + Luster) sits on the
   left. Minimum Height pairs to the right when volume basis applies;
   for footprint and weight the firings row takes the full width. */

const FiringsRow: m.Component = {
    view: () => m(".firings-row",
        m(".firings-row__bundled",
            m(Pill, {
                active: state.bundled,
                onclick: toggleBundled,
                ariaLabel: "Bundle bisque and glaze rates",
                title: "Bundled",
            }, chainLinkIcon(16)),
        ),
        m(".firings-row__group",
            m("span.firings-row__separator", { "aria-hidden": "true" }),
            m(ConnectedPill, {
                connected: state.bundled,
                aActive: state.firingToggles.bisque,
                bActive: state.firingToggles.glaze,
                aLabel: "Bisque",
                bLabel: "Glaze",
                onToggleA: () => toggleFiring("bisque"),
                onToggleB: () => toggleFiring("glaze"),
            }),
            m(Pill, {
                active: state.firingToggles.luster,
                onclick: () => toggleFiring("luster"),
            }, "Luster"),
        ),
    ),
};

// Uses a `<span>` rather than a `<label>` because the field has no
// single input to associate with. The role="group" + aria-label on
// the .field-group handles the labelling for assistive tech.
const FiringsField: m.Component = {
    view: () => m(".field-group", { role: "group", "aria-label": "Firing Types" },
        m("span.label",
            m("span", "Firing Types"),
            m(Tooltip, {
                label: "firings",
                text: "Which firings to charge for. The chain icon bundles bisque and glaze under one shared rate, common at studios that don't track them separately. Toggle a firing to enable or disable it. Each piece can also opt out of any firing it skips.",
            }),
        ),
        m(FiringsRow),
    ),
};

const MinHeightField: m.Component = {
    view: () => m(".field-group",
        m("label.label", { for: "min-height-input" },
            m("span", "Minimum Height"),
            m(Tooltip, {
                label: "minimum height",
                text: "Some studios bill short pieces at a minimum height to reflect the kiln-shelf interval consumed. A piece below the minimum is charged as if it were that tall. Set to 0 to disable.",
            }),
        ),
        m(InputWithSuffix, {
            suffix: state.dimensionUnit,
            inputClass: "numeric",
            id: "min-height-input",
            type: "number",
            inputmode: "decimal",
            step: "0.5",
            min: "0",
            value: state.minHeight,
            oninput: handleMinHeightInput,
        }),
    ),
};

const FiringsAndHeightRow: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) =>
        m(`.firings-row-wrap${derived.showMinHeight ? ".paired" : ""}`,
            m(FiringsField),
            derived.showMinHeight && m(MinHeightField),
        ),
};


/* ── Row 3: Firing Rates ──
   Section-labeled group containing the rate inputs. Slot count is
   stable for a given bundled state (2 if bundled, 3 if not), so toggling
   an individual firing dims its slot rather than reflowing the row.
   The unit toggle inlines with the section label because units determine
   the rate suffix (¢/in³ vs $/lb) and the dimension-input placeholders
   on each piece. The unit-change hint sits between the label row and
   the inputs when active. */

interface RateField {
    key: string;
    label: string;
    value: string;
    placeholder: string;
    onInput: (event: Event) => void;
    disabled: boolean;
}

// Cap a rate display value at 2 decimals and strip both trailing zeros
// and floating-point artifacts. The cents conversion (× 100) introduces
// noise like 0.035 → 3.5000000000000004, which would otherwise render
// in the input as a ten-digit string. Examples:
//   3.5000000000000004 → "3.5"
//   3.25               → "3.25"
//   8                  → "8"
const formatRateNumber = (value: number): string =>
    Number(value.toFixed(2)).toString();

// Stored 0 is rendered as an empty string so the input shows its
// placeholder rather than a literal "0" — the placeholder reads as
// "we'd suggest 4 here," whereas "0" reads as "you've entered zero."
const formatRateValue = (stored: number, basis: string): string =>
    stored === 0 ? "" : formatRateNumber(toDisplayRate(stored, basis as never));

// Placeholder text shows the BASIS_META default for that firing in the
// active basis' display unit (cents for volume/footprint, dollars for
// weight).
const formatPlaceholder = (defaultDollars: number, basis: string): string =>
    formatRateNumber(toDisplayRate(defaultDollars, basis as never));

const collectRateFields = (basis: string): RateField[] => {
    const defaults = BASIS_META[basis as never] as { defaults: typeof state.firingRates };
    const fields: RateField[] = [];
    if (state.bundled) {
        // Bundled rate is shared between bisque and glaze. The slot
        // stays active as long as either firing is on. Placeholder uses
        // the bisque default since most studios price bundled near bisque.
        fields.push({
            key: "bundled",
            label: "Bundled",
            value: formatRateValue(state.bundledRate, basis),
            placeholder: formatPlaceholder(defaults.defaults.bisque, basis),
            onInput: handleBundledRateInput,
            disabled: !state.firingToggles.bisque && !state.firingToggles.glaze,
        });
    } else {
        (["bisque", "glaze"] as const).forEach((key) => {
            fields.push({
                key,
                label: key === "bisque" ? "Bisque" : "Glaze",
                value: formatRateValue(state.firingRates[key], basis),
                placeholder: formatPlaceholder(defaults.defaults[key], basis),
                onInput: (event: Event) => handleFiringRateInput(key, event),
                disabled: !state.firingToggles[key],
            });
        });
    }
    fields.push({
        key: "luster",
        label: "Luster",
        value: formatRateValue(state.firingRates.luster, basis),
        placeholder: formatPlaceholder(defaults.defaults.luster, basis),
        onInput: (event: Event) => handleFiringRateInput("luster", event),
        disabled: !state.firingToggles.luster,
    });
    return fields;
};

/* ── Rate Inputs (FLIP-animated) ──
   Bundled toggle reshapes the row from 2 columns (Bundled, Luster) to
   3 columns (Bisque, Glaze, Luster) and back. Without animation the
   inputs pop in and out, which reads as a layout glitch. This component
   uses FLIP (First, Last, Invert, Play) for the layout transition:
     1. Before each redraw, snapshot every rendered cell's bounding box.
     2. Let Mithril update the DOM into its new layout.
     3. For each cell that survived, compute the (old − new) delta and
        snap it back to its old position with `transform`, then in the
        next frame transition the transform to identity. The cell
        slides smoothly to its new home.
     4. Cells that are leaving (Mithril's onbeforeremove) lift to
        absolute positioning so the surrounding grid can collapse around
        them, then fade out before the DOM removal completes. The
        `.rate-inputs` wrapper has `position: relative` so the absolute
        children stay in their visual position rather than jumping to
        viewport coordinates.
   The pulse animation on the rate inputs themselves is driven separately
   by InputWithSuffix's `pulseKey` prop (state.bundlePulseKey), so new
   and surviving bisque/glaze/bundled inputs flash on every toggle.
   Luster never receives the prop and stays calm.
   Honors prefers-reduced-motion: the snapshot/play logic is skipped
   entirely under that media query (see CSS). */

const PREFERS_REDUCED_MOTION =
    typeof window !== "undefined"
        && window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface RateInputsState {
    snapshot: Map<string, DOMRect> | null;
}

const RateInputs: m.Component<{ derived: Derived; fields: RateField[] }, RateInputsState> = {
    onbeforeupdate(vnode) {
        const dom = (vnode as m.VnodeDOM<{ derived: Derived; fields: RateField[] }, RateInputsState>).dom;
        if (PREFERS_REDUCED_MOTION || !dom) return true;
        const snapshot = new Map<string, DOMRect>();
        for (const child of Array.from(dom.children) as HTMLElement[]) {
            const key = child.dataset.flipKey;
            if (key) snapshot.set(key, child.getBoundingClientRect());
        }
        vnode.state.snapshot = snapshot;
        return true;
    },
    onupdate(vnode) {
        const snapshot = vnode.state.snapshot;
        vnode.state.snapshot = null;
        if (!snapshot || PREFERS_REDUCED_MOTION) return;
        for (const child of Array.from(vnode.dom.children) as HTMLElement[]) {
            const key = child.dataset.flipKey;
            if (!key) continue;
            const previous = snapshot.get(key);
            const current = child.getBoundingClientRect();
            if (previous) {
                const dx = previous.left - current.left;
                const dy = previous.top - current.top;
                if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
                child.style.transition = "none";
                child.style.transform = `translate(${dx}px, ${dy}px)`;
                requestAnimationFrame(() => {
                    child.style.transition = "transform 0.25s ease-out";
                    child.style.transform = "";
                });
            }
            // New cells need no special treatment here. Their pulse fires
            // via InputWithSuffix's oncreate hook (gated on pulseKey > 0).
        }
    },
    view: ({ attrs: { derived, fields } }) =>
        m(`.rate-inputs.columns-${fields.length}`,
            fields.map((field) => m(`.field-group${field.disabled ? ".disabled" : ""}`, {
                key: field.key,
                "data-flip-key": field.key,
                onbeforeremove(removingVnode: m.VnodeDOM) {
                    if (PREFERS_REDUCED_MOTION) return;
                    const element = removingVnode.dom as HTMLElement;
                    const parent = element.parentElement;
                    if (!parent) return;
                    const rect = element.getBoundingClientRect();
                    const parentRect = parent.getBoundingClientRect();
                    // Lift out of flow so the surviving cells can reflow
                    // to the new column count without waiting for fade-out.
                    element.style.position = "absolute";
                    element.style.left = `${rect.left - parentRect.left}px`;
                    element.style.top = `${rect.top - parentRect.top}px`;
                    element.style.width = `${rect.width}px`;
                    element.style.transition = "opacity 0.2s ease-out";
                    return new Promise<void>((resolve) => {
                        requestAnimationFrame(() => {
                            element.style.opacity = "0";
                            setTimeout(resolve, 200);
                        });
                    });
                },
            },
                m("label.input-label", { for: `rate-${field.key}` }, field.label),
                m(InputWithSuffix, {
                    suffix: derived.rateUnit,
                    inputClass: "numeric",
                    // Luster is unaffected by the bundled toggle, so it
                    // doesn't get a pulseKey and never pulses on toggle.
                    pulseKey: field.key === "luster" ? undefined : state.bundlePulseKey,
                    id: `rate-${field.key}`,
                    type: "number",
                    inputmode: "decimal",
                    step: derived.rateStep,
                    min: "0",
                    placeholder: field.placeholder,
                    value: field.value,
                    oninput: field.onInput,
                    disabled: field.disabled,
                }),
            )),
        ),
};

const FiringRatesSection: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        const fields = collectRateFields(state.basis);
        const allDisabled = fields.every((field) => field.disabled);
        return m(".section", { role: "group", "aria-label": "Firing rates" },
            m(".section-label",
                m("span", "Firing Rates"),
                m(UnitToggle, {
                    units: derived.activeUnitSet,
                    active: derived.activeUnit,
                    onSelect: (unit) => derived.setActiveUnit(unit as never),
                    ariaLabels: UNIT_ARIA_LABELS,
                }),
            ),
            m(RateInputs, { derived, fields }),
            allDisabled && m("span.ghost-hint", "Turn on a firing above to set rates."),
        );
    },
};


/* ── Section Export ──
   No wrapping card. Three rows: billing+rounding, firings+min-height,
   firing-rates. */

export const ControlsSection: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".controls-section",
        m(BillingRow, { derived }),
        m(FiringsAndHeightRow, { derived }),
        m(FiringRatesSection, { derived }),
    ),
};
