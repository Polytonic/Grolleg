import m from "mithril";
import "@css/views/firing-calculator.css";
import { computeDerived } from "./derived";
import { ControlsSection } from "./controls";
import { PiecesSection } from "./pieces";
import { CostSummary } from "./total";


// Firing Calculator View
// FiringCalculatorView should compute derived data once per render and thread
// it through children so the draw cycle stays consistent.
export const FiringCalculatorView: m.Component = {
    view: () => {
        const derived = computeDerived();
        // Cost summary should stay hidden for single-piece runs because the
        // piece card already shows that price.
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
