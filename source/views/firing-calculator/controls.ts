import m from "mithril";
import { Tooltip } from "../../components/tooltip";
import { ConnectedPill } from "../../components/connected-pill";
import { flipSnapshot, flipPlay, flipLeave } from "../../components/flip";
import { chainLinkIcon } from "../../components/icons";
import { InputWithSuffix } from "../../components/input-with-suffix";
import { TogglePill } from "../../components/toggle-pill";
import { UnitToggle } from "../../components/unit-toggle";
import { expandUnit, UNIT_VERBOSE } from "../../components/locale";
import { BASIS_META, ROUNDING_OPTIONS } from "./types";
import type { Basis, DimensionUnit, WeightUnit, FiringKey } from "./types";
import { toDisplayRate, toPositive } from "./pricing";
import {
    state,
    handleBasisChange, handleRoundingChange, handleMinHeightInput,
    handleFiringRateInput, handleBundledRateInput,
    toggleFiring, toggleBundled,
} from "./state";
import type { Derived } from "./derived";


// Rate Unit Text
// expandRateUnit should give screen readers the long form of the visible rate
// suffix, such as cents per cubic inch.
const singularize = (word: string): string => {
    if (word === "inches") return "inch";
    if (word === "ounces") return "ounce";
    return word.endsWith("s") ? word.slice(0, -1) : word;
};

const expandRateUnit = (basis: Basis, dimensionUnit: DimensionUnit, weightUnit: WeightUnit): string => {
    if (basis === "volume")    return `cents per cubic ${singularize(expandUnit(dimensionUnit))}`;
    if (basis === "footprint") return `cents per square ${singularize(expandUnit(dimensionUnit))}`;
    return `dollars per ${singularize(expandUnit(weightUnit))}`;
};
// Billing and Rounding Row
// Billing should sit first. Rounding pairs beside it only for volume and
// footprint. Selects use bare `.select` so `.input` does not wipe the chevron.

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
        m("span.label",
            m("label", { for: "rounding-select" }, "Rounding"),
            m(Tooltip, {
                label: "rounding",
                text: 'How dimensions are rounded before billing. For a 4.2 × 5.7 × 3.1 piece: Per Dimension bills 5 × 6 × 4 = 120 in³. Total bills 75 in³. Nearest Whole bills 74 in³. Don\'t Round keeps decimals.',
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
        m(".billing-row", { class: derived.showRounding ? "paired" : "" },
            m(BasisField),
            derived.showRounding && m(RoundingField),
        ),
};


// Firings and Minimum Height Row
// Firings should take the full row except when volume basis adds Minimum Height.

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

// FiringsField should use a span label because the field has no single input.
// The group label supplies the accessible name.
const FiringsField: m.Component = {
    view: () => m(".field-group", { role: "group", "aria-label": "Firing Types" },
        m("span.label",
            m("span", "Firing Types"),
            m(Tooltip, {
                label: "firings",
                text: "Which firings to charge. The chain bundles bisque and glaze under one shared studio rate. Each piece can still opt out of firings it skips.",
            }),
        ),
        m(FiringsRow),
    ),
};

const MinHeightField: m.Component = {
    view: () => m(".field-group",
        m("span.label",
            m("label", { for: "min-height-input" }, "Minimum Height"),
            m(Tooltip, {
                label: "minimum height",
                text: "Bills short pieces as if they reached this height. Use 0 to disable.",
            }),
        ),
        m(InputWithSuffix, {
            suffix: state.dimensionUnit,
            suffixSr: expandUnit(state.dimensionUnit),
            modifiers: ["numeric"],
            id: "min-height-input",
            type: "text",
            inputmode: "decimal",
            value: state.minHeight,
            oninput: handleMinHeightInput,
        }),
    ),
};

const FiringsAndHeightRow: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) =>
        m(".firings-row-wrap", { class: derived.showMinHeight ? "paired" : "" },
            m(FiringsField),
            derived.showMinHeight && m(MinHeightField),
        ),
};


// Firing Rates Row
// Rate input slots should stay stable for a bundled state, so toggling an
// individual firing dims its slot instead of reflowing the row.

interface RateField {
    key: FiringKey | "bundled";
    label: string;
    value: string;
    placeholder: string;
    onInput: (event: Event) => void;
    disabled: boolean;
}

// formatRateNumber should strip trailing zeros and floating-point artifacts
// from display rates before they reach text inputs.
// Examples:
//   3.5000000000000004 → "3.5"
//   3.25               → "3.25"
//   8                  → "8"
//   NaN                → "0"
// .toFixed(2) should keep input values as plain decimals, not locale strings.
const formatRateNumber = (value: number): string =>
    Number(toPositive(value).toFixed(2)).toString();

// Stored zero should render as an empty string so the placeholder reads as the
// suggested value.
const formatRateValue = (stored: number, basis: Basis): string =>
    stored === 0 ? "" : formatRateNumber(toDisplayRate(stored, basis));

// Placeholder text should show the basis default in the active display unit.
const formatPlaceholder = (defaultDollars: number, basis: Basis): string =>
    formatRateNumber(toDisplayRate(defaultDollars, basis));

// collectRateFieldsFromState should read the current firing toggles and rates
// once per render so disabled slots, values, and placeholders stay aligned.
const collectRateFieldsFromState = (basis: Basis): RateField[] => {
    const defaults = BASIS_META[basis];
    const primaryFields: RateField[] = state.bundled
        ? [{
            key: "bundled",
            label: "Bundled",
            value: formatRateValue(state.firingRates.bundled, basis),
            placeholder: formatPlaceholder(defaults.defaults.bundled, basis),
            onInput: handleBundledRateInput,
            disabled: !state.firingToggles.bisque && !state.firingToggles.glaze,
        }]
        : (["bisque", "glaze"] as const).map((key) => ({
            key,
            label: key === "bisque" ? "Bisque" : "Glaze",
            value: formatRateValue(state.firingRates[key], basis),
            placeholder: formatPlaceholder(defaults.defaults[key], basis),
            onInput: (event: Event) => handleFiringRateInput(key, event),
            disabled: !state.firingToggles[key],
        }));
    const lusterField: RateField = {
        key: "luster",
        label: "Luster",
        value: formatRateValue(state.firingRates.luster, basis),
        placeholder: formatPlaceholder(defaults.defaults.luster, basis),
        onInput: (event: Event) => handleFiringRateInput("luster", event),
        disabled: !state.firingToggles.luster,
    };
    return [...primaryFields, lusterField];
};

// Rate Inputs
// RateInputs should let FLIP handle layout transitions when Bundled changes
// the visible column set.

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
        m(".rate-inputs", { class: `columns-${fields.length}` },
            fields.map((field) => m(".field-group", {
                class: field.disabled ? "disabled" : "",
                key: field.key,
                "data-flip-key": field.key,
                onbeforeremove: flipLeave,
            },
                m("label.input-label", { for: `rate-${field.key}` }, field.label),
                m(InputWithSuffix, {
                    suffix: derived.rateUnit,
                    suffixSr: expandRateUnit(derived.studio.basis, derived.studio.dimensionUnit, derived.studio.weightUnit),
                    modifiers: ["numeric"],
                    pulseKey: field.disabled || field.key === "luster" ? undefined : state.bundlePulseKey,
                    id: `rate-${field.key}`,
                    type: "text",
                    inputmode: "decimal",
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
        const fields = collectRateFieldsFromState(state.basis);
        const allDisabled = fields.every((field) => field.disabled);
        return m(".section", { role: "group", "aria-label": "Firing rates" },
            m(".section-label",
                m("span", "Firing Rates"),
                m(UnitToggle, {
                    units: derived.activeUnitSet,
                    active: derived.activeUnit,
                    onSelect: derived.setActiveUnit,
                    ariaLabels: UNIT_VERBOSE,
                    ariaLabel: "Rate unit",
                }),
            ),
            m(RateInputs, { derived, fields }),
            allDisabled && m("span.ghost-hint", "Turn on a firing above to set rates."),
        );
    },
};


// Section Export
// ControlsSection should render the three calculator-control rows without a
// wrapping card.

export const ControlsSection: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => m(".controls-section",
        // The hidden h2 should anchor screen-reader navigation between the
        // page h1 and the per-piece h3 badges.
        m("h2.sr-only", "Controls"),
        m(BillingRow, { derived }),
        m(FiringsAndHeightRow, { derived }),
        m(FiringRatesSection, { derived }),
    ),
};
