import m from "mithril";
import { Tooltip } from "../../components/tooltip";
import { ConnectedPill } from "../../components/connected-pill";
import { flipSnapshot, flipPlay, flipLeave, prefersReducedMotion } from "../../components/flip";
import { chainLinkIcon } from "../../components/icons";
import { InputWithSuffix } from "../../components/input-with-suffix";
import { TogglePill } from "../../components/toggle-pill";
import { UnitToggle } from "../../components/unit-toggle";
import {
    state, BASIS_META, ROUNDING_OPTIONS, toDisplayRate, toPositive,
    expandUnit, UNIT_VERBOSE,
    handleBasisChange, handleRoundingChange, handleMinHeightInput,
    handleFiringRateInput, handleBundledRateInput,
    toggleFiring, toggleBundled,
} from "./state";
import type { Basis } from "./state";
import type { Derived } from "./derived";


/* Verbose rate-unit string used by screen readers via aria-describedby.
   Mirrors the short suffix shown next to the input ("¢/in³" → "cents
   per cubic inch"). Falls back to the raw rateUnit string for any
   shape not anticipated. */
const singularize = (word: string): string => {
    if (word === "inches") return "inch";
    if (word === "ounces") return "ounce";
    return word.endsWith("s") ? word.slice(0, -1) : word;
};

const expandRateUnit = (basis: Basis, dimensionUnit: string, weightUnit: string): string => {
    if (basis === "volume")    return `cents per cubic ${singularize(expandUnit(dimensionUnit))}`;
    if (basis === "footprint") return `cents per square ${singularize(expandUnit(dimensionUnit))}`;
    return `dollars per ${singularize(expandUnit(weightUnit))}`;
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
            m("span", "Rounding"),
            m(Tooltip, {
                label: "rounding",
                text: 'How dimensions are rounded before billing. For a 4.2 × 5.7 × 3.1 piece (74.2 in³ exact): Per Dimension rounds up L, W, H independently to 5 × 6 × 4 = 120 in³, matching the measuring-box convention. Total rounds up the final volume to 75 in³. Nearest Whole rounds without preference to 74 in³. Don\'t Round uses exact decimals.',
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
            m(TogglePill, {
                className: "pill",
                active: state.bundled,
                onclick: toggleBundled,
                ariaLabel: "Bundle bisque and glaze under one shared rate",
                title: "Bundle bisque and glaze under one shared rate",
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
            m(TogglePill, {
                className: "pill",
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
            suffixSr: expandUnit(state.dimensionUnit),
            modifiers: ["numeric"],
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
   on each piece. */

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
// in the input as a ten-digit string. toPositive guards against NaN /
// non-finite slipping through if a stored rate ever gets corrupted.
// Examples:
//   3.5000000000000004 → "3.5"
//   3.25               → "3.25"
//   8                  → "8"
//   NaN                → "0"
// .toFixed(2) is intentional: rate inputs are type="number" and need
// a plain decimal string, not a locale-formatted one with group separators.
const formatRateNumber = (value: number): string =>
    Number(toPositive(value).toFixed(2)).toString();

// Stored 0 is rendered as an empty string so the input shows its
// placeholder rather than a literal "0". The placeholder reads as
// a suggested value, whereas "0" reads as a deliberate entry.
const formatRateValue = (stored: number, basis: Basis): string =>
    stored === 0 ? "" : formatRateNumber(toDisplayRate(stored, basis));

// Placeholder text shows the BASIS_META default for that firing in the
// active basis' display unit (cents for volume/footprint, dollars for
// weight).
const formatPlaceholder = (defaultDollars: number, basis: Basis): string =>
    formatRateNumber(toDisplayRate(defaultDollars, basis));

const collectRateFields = (basis: Basis): RateField[] => {
    const defaults = BASIS_META[basis];
    const fields: RateField[] = [];
    if (state.bundled) {
        // Bundled rate is shared between bisque and glaze. The slot
        // stays active as long as either firing is on.
        fields.push({
            key: "bundled",
            label: "Bundled",
            value: formatRateValue(state.firingRates.bundled, basis),
            placeholder: formatPlaceholder(defaults.defaults.bundled, basis),
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

/* ── Rate Inputs ──
   Bundled toggle reshapes the row from 2 columns (Bundled, Luster)
   to 3 columns (Bisque, Glaze, Luster) and back. FLIP utilities
   from components/flip handle the layout transition; InputWithSuffix's
   pulseKey drives the flash on bisque/glaze/bundled rate inputs
   (luster stays calm). */

interface RateInputsState {
    snapshot: Map<string, DOMRect> | null;
}

const RateInputs: m.Component<{ derived: Derived; fields: RateField[] }, RateInputsState> = {
    onbeforeupdate(vnode) {
        const dom = (vnode as m.VnodeDOM<{ derived: Derived; fields: RateField[] }, RateInputsState>).dom;
        vnode.state.snapshot = flipSnapshot(dom);
        return true;
    },
    onupdate(vnode) {
        flipPlay(vnode.dom, vnode.state.snapshot);
        vnode.state.snapshot = null;
    },
    view: ({ attrs: { derived, fields } }) =>
        m(`.rate-inputs.columns-${fields.length}`,
            fields.map((field) => m(`.field-group${field.disabled ? ".disabled" : ""}`, {
                key: field.key,
                "data-flip-key": field.key,
                onbeforeremove: flipLeave,
            },
                m("label.input-label", { for: `rate-${field.key}` }, field.label),
                m(InputWithSuffix, {
                    suffix: derived.rateUnit,
                    suffixSr: expandRateUnit(derived.studio.basis, derived.studio.dimensionUnit, derived.studio.weightUnit),
                    modifiers: ["numeric"],
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
                    onSelect: derived.setActiveUnit,
                    ariaLabels: UNIT_VERBOSE,
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
        // Anchors SR navigation between the page <h1> and the per-piece
        // h3 badges below. Visually hidden because the row labels
        // (Measurement Method, Rounding, Firing Types) already orient sighted users.
        m("h2.sr-only", "Controls"),
        m(BillingRow, { derived }),
        m(FiringsAndHeightRow, { derived }),
        m(FiringRatesSection, { derived }),
    ),
};
