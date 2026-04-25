import m from "mithril";
import { Tooltip } from "../../components/tooltip";
import { ConnectedPill } from "../../components/connected-pill";
import {
    state, BASIS_META, ROUNDING_OPTIONS, toDisplayRate,
    handleBasisChange, handleRoundingChange, handleMinHeightInput,
    handleFiringRateInput, handleBundledRateInput,
    toggleFiring, toggleBundled,
} from "./state";
import type { Derived, FiringKey } from "./state";


/* ── Local Icon ──
   Lucide link icon, transcribed for Mithril. Chain glyph signals the
   Bundled state without text — the icon alone is enough to read as
   "different class" from the firing pills next to it. */

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
   The firing-calculator pill is sized to align vertically with input rows
   (10px-equivalent vertical padding, 14px font). The shrinkage calc's
   `.shape-pill` has different sizing (8px / 13px) for its denser layout, so
   this is intentionally separate styling. Both follow the same color and
   interaction-state conventions. */

interface PillAttrs {
    active: boolean;
    onclick: () => void;
    flex?: boolean;                  // grow to share row width with siblings
    ariaLabel?: string;
    title?: string;
}

const Pill: m.Component<PillAttrs> = {
    view: ({ attrs, children }) =>
        m(`button.pill${attrs.active ? ".active" : ""}${attrs.flex ? ".flex" : ""}`,
            {
                type: "button",
                "aria-pressed": attrs.active,
                "aria-label": attrs.ariaLabel,
                title: attrs.title,
                onclick: attrs.onclick,
            },
            children,
        ),
};


/* ── Top Fields ── */

const BasisField: m.Component = {
    view: () => m(".field",
        m("label.field-label", { for: "basis-select" }, "Pricing Basis"),
        m("select.input.select#basis-select",
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

const UnitsField: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".field",
        m("span.field-label", "Units"),
        m(".unit-pills",
            derived.activeUnitSet.map((unit) =>
                m(Pill, {
                    key: unit,
                    active: derived.activeUnit === unit,
                    onclick: () => derived.setActiveUnit(unit),
                    flex: true,
                    ariaLabel: `Set units to ${unit}`,
                }, unit),
            ),
        ),
        state.unitHintVisible && m(".unit-hint", { role: "status", "aria-live": "polite" },
            "Changing units does not convert existing values.",
        ),
    ),
};


/* ── Firings Row ──
   Bundled chain meta-pill on the left, then a separator, then the
   Bisque|Glaze ConnectedPill and the Luster pill. Two containers wrap
   independently — the chain can break to its own line on narrow viewports
   while the firings group stays attached to the separator. */

const FiringsLabel: m.Component = {
    view: () => m(".firings-label",
        m("span", "Firings"),
        m(Tooltip, {
            label: "firings",
            text: "Which firings to charge for. Tap the chain icon to bundle bisque and glaze under one shared rate (common at studios that don't track them separately). Tap a firing to enable or disable it. Each piece can declare which firings it goes through, so pieces that skip a firing aren't charged for it.",
        }),
    ),
};

const FiringsRow: m.Component = {
    view: () => m(".firings-row",
        m(".firings-row__bundled",
            m(Pill, {
                active: state.bundled,
                onclick: toggleBundled,
                ariaLabel: "Bundled (share one rate for bisque and glaze)",
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


/* ── Rate Inputs ──
   Renders one column per active firing. When bundled is on and either
   bisque or glaze is on, they collapse into a single Bundled Rate field
   (pair-toggle keeps them in lockstep so they're always either both on or
   both off in bundled mode). When zero firings are active, a ghost
   placeholder occupies the same vertical footprint to prevent reflow when
   toggling. */

interface RateField {
    key: string;
    label: string;
    value: number;
    onInput: (event: Event) => void;
}

const RateInputs: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        const fields: RateField[] = [];

        if (state.bundled) {
            if (state.firingToggles.bisque || state.firingToggles.glaze) {
                fields.push({
                    key: "bundled",
                    label: "Bundled Rate",
                    value: toDisplayRate(state.bundledRate, state.basis),
                    onInput: handleBundledRateInput,
                });
            }
        } else {
            (["bisque", "glaze"] as FiringKey[]).forEach((key) => {
                if (!state.firingToggles[key]) return;
                fields.push({
                    key,
                    label: `${key === "bisque" ? "Bisque" : "Glaze"} Rate`,
                    value: toDisplayRate(state.firingRates[key], state.basis),
                    onInput: (event: Event) => handleFiringRateInput(key, event),
                });
            });
        }
        if (state.firingToggles.luster) {
            fields.push({
                key: "luster",
                label: "Luster Rate",
                value: toDisplayRate(state.firingRates.luster, state.basis),
                onInput: (event: Event) => handleFiringRateInput("luster", event),
            });
        }

        if (fields.length === 0) {
            return m(GhostRate, { derived });
        }

        // Column count matches field count, capped at 2 on narrow viewports
        // (CSS handles the cap via @media; columns="N" attribute is read by
        // CSS-only logic that constrains beyond a breakpoint).
        return m(`.rate-inputs.cols-${fields.length}`,
            fields.map((field) => m(".field", { key: field.key },
                m("label.field-label", { for: `rate-${field.key}` }, field.label),
                m(".input-with-suffix",
                    m("input.input.numeric.with-suffix", {
                        id: `rate-${field.key}`,
                        type: "number",
                        inputmode: "decimal",
                        step: derived.rateStep,
                        min: "0",
                        value: field.value,
                        oninput: field.onInput,
                    }),
                    m("span.input-suffix", derived.rateUnit),
                ),
            )),
        );
    },
};

// Read-only ghost placeholder shown when no firings are active. Visually
// matches a real rate input (same label, same input shape, same vertical
// rhythm) so the card doesn't reflow when toggling from one firing to none.
const GhostRate: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".field",
        m("span.field-label", "Firing Rate"),
        m(".input-with-suffix.ghost",
            m("span.ghost-input", `e.g. ${derived.ghostSampleDisplay}`),
            m("span.input-suffix", derived.rateUnit),
        ),
        m("span.ghost-hint", "Toggle a firing above to set rates."),
    ),
};


/* ── Adjustments Row ──
   Rounding (visible for volume + footprint) and Minimum Height (visible
   for volume only). Hidden entirely when basis = weight since neither
   modifier applies to a per-pound charge. */

const AdjustmentsRow: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        if (!derived.showRounding && !derived.showMinHeight) return null;
        const cls = derived.showRounding && derived.showMinHeight
            ? "adjustments-row both"
            : "adjustments-row";
        return m(`.${cls}`,
            derived.showRounding && m(".field",
                m("label.field-label", { for: "rounding-select" },
                    m("span", "Rounding"),
                    m(Tooltip, {
                        label: "rounding",
                        text: 'How dimensions are rounded before billing. "Round up each measurement" matches the measuring-box convention by ceiling each L, W, and H independently. "Round up the total" rounds the final volume after multiplication. "Round to the nearest whole" rounds without preference. "Don\'t round" uses exact decimals.',
                    }),
                ),
                m("select.input.select#rounding-select",
                    {
                        value: state.rounding,
                        onchange: handleRoundingChange,
                    },
                    ROUNDING_OPTIONS.map((option) =>
                        m("option", { key: option.key, value: option.key }, option.label),
                    ),
                ),
            ),
            derived.showMinHeight && m(".field",
                m("label.field-label", { for: "min-height-input" },
                    m("span", "Minimum Height"),
                    m(Tooltip, {
                        label: "minimum height",
                        text: "Some studios bill short pieces at a minimum height to reflect the kiln-shelf interval consumed. A 1″ piece at a 2″ minimum is charged as if it were 2″ tall. Set to 0 to disable.",
                    }),
                ),
                m(".input-with-suffix",
                    m("input.input.numeric.with-suffix#min-height-input", {
                        type: "number",
                        inputmode: "decimal",
                        step: "0.5",
                        min: "0",
                        value: state.minHeight,
                        oninput: handleMinHeightInput,
                    }),
                    m("span.input-suffix", state.dimensionUnit),
                ),
            ),
        );
    },
};


/* ── Card Export ── */

export const ControlsCard: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m("section.card",
        m(".controls-grid",
            m(BasisField),
            m(UnitsField, { derived }),
        ),
        m(FiringsLabel),
        m(FiringsRow),
        m(RateInputs, { derived }),
        m(AdjustmentsRow, { derived }),
    ),
};
