import m from "mithril";
import { formatNumber } from "../../components/locale";
import { state } from "./state";
import type { Derived } from "./derived";


// Per-dimension results with delta and optional volumetric shrinkage
export const ResultsCard: m.Component<{ derived: Derived }> = {
    view: ({ attrs: { derived } }) => {
        const showVolume = derived.volumeShrink !== null && derived.shape.id !== "single";
        return m(".results-card",
            m(".results-header",
                `${state.direction === "wet-to-fired" ? "Fired" : "Wet"} dimensions`,
            ),
            m(`.results-grid${showVolume ? "" : ".no-volume"}`,
                derived.shape.fields.map((field, fieldIndex) =>
                    m(ResultItem, { key: field, derived, field, fieldIndex }),
                ),
            ),
            showVolume && m(".volume-section",
                m("span.results-header.inline", "Volumetric shrinkage"),
                m("span.volume-value", { "aria-live": "polite", "aria-atomic": "true" }, `${formatNumber(derived.volumeShrink)}%`),
                m("p.volume-body",
                    "Clay doesn't shrink evenly in all directions. Particle orientation",
                    " from forming causes shrinkage to differ by axis, especially for plates",
                    " and flat work. This calculator applies uniform shrinkage as an approximation.",
                ),
            ),
        );
    },
};

// Single dimension row: value with unit, and delta from the entered dimension
const ResultItem: m.Component<{ derived: Derived; field: string; fieldIndex: number }> = {
    view: ({ attrs: { derived, field, fieldIndex } }) => {
        if (!derived.firedResults) return null;
        const result = derived.firedResults[fieldIndex];
        return m(".result-item",
            m("span.result-label", field),
            result !== null
                ? m("span.result-value-row", { "aria-live": "polite", "aria-atomic": "true" },
                    m("span.result-value",
                        formatNumber(result),
                        m("span.result-unit", ` ${state.unit}`),
                    ),
                    m("span.result-delta",
                        `(${state.direction === "wet-to-fired" ? "−" : "+"}${formatNumber(Math.abs(result - derived.parsedDimensions[fieldIndex]))})`,
                    ),
                )
                : m("span.result-value.empty", { "aria-live": "polite", "aria-atomic": "true" }, "—"),
        );
    },
};
