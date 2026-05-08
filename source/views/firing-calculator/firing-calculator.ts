import m from "mithril";
import "@css/views/firing-calculator.css";
import { computeDerived } from "./derived";
import { ControlsSection } from "./controls";
import { PiecesSection } from "./pieces";
import { CostSummary } from "./total";


// Composes the input sections, divider, cost summary, and disclaimer.
// computeDerived runs once per render and threads through to children so
// derived data stays consistent within a single draw cycle. The
// document.title for this route is set by the route resolver in
// `index.ts`, not in this component, so back/forward navigation across
// tools updates the title every time.
export const FiringCalculatorView: m.Component = {
    view: () => {
        const derived = computeDerived();
        // The cost summary is only meaningful with multiple pieces (a
        // single-piece run gets its price in the piece card itself).
        // Hidden in single-piece mode.
        const showTotal = derived.pieces.length > 1;
        const hasAnyPrice = derived.pieces.some((computed) => computed.result.price > 0);
        return m(".firing-calculator",
            m(".container",
                m("h1.title", "Firing Calculator"),
                m("p.subtitle",
                    "Estimate firing costs based on piece dimensions and configurable rates."),
                m(ControlsSection, { derived }),
                m("hr.divider"),
                m(PiecesSection, { derived }),
                showTotal && m(CostSummary, { derived }),
                hasAnyPrice && m("p.disclaimer", "Estimates only. Actual billing may differ."),
            ),
        );
    },
};
